import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpInterceptorFn } from '@angular/common/http';
import { Router, CanActivateFn } from '@angular/router';
import { from, catchError, switchMap, throwError, firstValueFrom } from 'rxjs';
import { Sesion, TokenKeycloak } from '../../api-tipos';

// Sesión con Keycloak usando Authorization Code + PKCE.
// Los tokens se guardan SOLO en memoria (signals); al recargar la página se pierden
// y Keycloak vuelve a iniciar la sesión (SSO) sin pedir otra vez la contraseña.

/** Dirección del realm de Keycloak y cliente público de esta SPA. */
const issuer = 'http://localhost:8180/realms/maiz-erp';
const client = 'maiz-spa';
/** Base64 "URL-safe" sin relleno, el formato que exige PKCE. */
const base64 = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
@Injectable({ providedIn: 'root' })
export class Auth {
  private http = inject(HttpClient);
  token = signal('');
  perfil = signal<Sesion | null>(null);
  private refreshToken = '';
  private idToken = '';
  /** Renovación en curso; evita pedir dos tokens nuevos a la vez. */
  private pendiente: Promise<void> | null = null;

  /** ¿El usuario tiene alguno de estos roles de Keycloak? */
  es(...roles: string[]) {
    return this.perfil()?.roles?.some((r: string) => roles.includes(r)) ?? false;
  }
  /** ¿Su rol tiene permiso para este módulo? (lo decide el backend en /api/sesion) */
  puede(m: string) {
    return this.perfil()?.modulos?.includes(m) ?? false;
  }
  /** Nombre para mostrar, leído del id_token (la parte central del JWT). */
  nombreUsuario() {
    try {
      const token = this.idToken.split('.')[1];
      const binary = atob(token.replace(/-/g, '+').replace(/_/g, '/'));
      const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
      const claims = JSON.parse(new TextDecoder().decode(bytes));
      return (
        claims.name ||
        claims.preferred_username ||
        claims.email ||
        claims.sub ||
        'Usuario autenticado'
      );
    } catch {
      return this.perfil()?.sub || 'Usuario autenticado';
    }
  }
  /**
   * Paso 1 de PKCE: genera un "verifier" secreto y envía a Keycloak solo su hash (challenge).
   * state protege contra respuestas falsificadas y nonce contra tokens reutilizados.
   * Se guardan en sessionStorage solo hasta volver del login (no es el token).
   */
  async login(destino = '/panel') {
    const verifier = base64(crypto.getRandomValues(new Uint8Array(32)));
    const state = base64(crypto.getRandomValues(new Uint8Array(24)));
    const nonce = base64(crypto.getRandomValues(new Uint8Array(24)));
    const challenge = base64(
      new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))),
    );
    sessionStorage.setItem('erp-pkce', JSON.stringify({ verifier, state, nonce, destino }));
    const q = new URLSearchParams({
      client_id: client,
      redirect_uri: location.origin + '/auth/callback',
      response_type: 'code',
      scope: 'openid profile email',
      state,
      nonce,
      code_challenge: challenge,
      code_challenge_method: 'S256',
    });
    location.assign(issuer + '/protocol/openid-connect/auth?' + q);
  }
  /**
   * Paso 2 de PKCE: Keycloak vuelve con un "code". Se valida state, se canjea el code
   * junto con el verifier por los tokens, se valida nonce y se carga el perfil.
   * Devuelve la ruta a la que el usuario quería ir (solo rutas internas).
   */
  async callback() {
    const q = new URLSearchParams(location.search);
    const pending = JSON.parse(sessionStorage.getItem('erp-pkce') || 'null');
    sessionStorage.removeItem('erp-pkce');
    if (!pending || q.get('state') !== pending.state || !q.get('code'))
      throw Error('Respuesta de acceso inválida o cancelada');
    const r = await this.exchange({
      grant_type: 'authorization_code',
      code: q.get('code')!,
      code_verifier: pending.verifier,
      redirect_uri: location.origin + '/auth/callback',
    });
    const claims = JSON.parse(
      atob(r.id_token!.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')),
    );
    if (claims.nonce !== pending.nonce) throw Error('No coincide la verificación de sesión');
    this.guardar(r);
    await this.cargarPerfil();
    return typeof pending.destino === 'string' &&
      pending.destino.startsWith('/') &&
      !pending.destino.startsWith('//')
      ? pending.destino
      : '/panel';
  }
  /** Llama al endpoint de tokens de Keycloak (canje del code o renovación). */
  private async exchange(body: Record<string, string>) {
    const res = await fetch(issuer + '/protocol/openid-connect/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ ...body, client_id: client }),
    });
    if (!res.ok) throw Error('No se pudo validar la sesión con Keycloak');
    return res.json() as Promise<TokenKeycloak>;
  }
  private guardar(r: TokenKeycloak) {
    this.token.set(r.access_token);
    this.refreshToken = r.refresh_token;
    this.idToken = r.id_token || this.idToken;
  }
  /** Pide al backend los roles y módulos permitidos del usuario. */
  async cargarPerfil() {
    this.perfil.set(await firstValueFrom(this.http.get<Sesion>('/api/sesion')));
  }
  /**
   * Renueva el access token con el refresh token. Si ya no se puede,
   * limpia la sesión y manda al login recordando la página actual.
   */
  refrescar() {
    if (!this.pendiente)
      this.pendiente = (async () => {
        try {
          if (!this.refreshToken) throw Error('Sesión finalizada');
          this.guardar(
            await this.exchange({ grant_type: 'refresh_token', refresh_token: this.refreshToken }),
          );
        } catch (e) {
          this.limpiar();
          await this.login(location.pathname + location.search);
          throw Error('La sesión finalizó. Vuelve a ingresar para continuar.');
        } finally {
          this.pendiente = null;
        }
      })();
    return this.pendiente;
  }
  private limpiar() {
    this.token.set('');
    this.refreshToken = '';
    this.perfil.set(null);
  }
  /** Cierra la sesión local y también en Keycloak. */
  salir() {
    const id = this.idToken;
    this.limpiar();
    this.idToken = '';
    location.assign(
      issuer +
        '/protocol/openid-connect/logout?' +
        new URLSearchParams({
          client_id: client,
          id_token_hint: id,
          post_logout_redirect_uri: location.origin + '/',
        }),
    );
  }
}
/**
 * Agrega "Authorization: Bearer <token>" a cada llamada a /api/.
 * Ante un 401 renueva el token UNA vez y reintenta; un 403 (sin permiso) no se reintenta.
 */
export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(Auth);
  if (!req.url.startsWith('/api/')) return next(req);
  const trace = crypto.randomUUID();
  const headers: Record<string, string> = { 'X-Trace-ID': trace };
  if (auth.token()) headers['Authorization'] = 'Bearer ' + auth.token();
  return next(req.clone({ setHeaders: headers })).pipe(
    catchError((e) => {
      if (e.status !== 401 || !auth.token()) return throwError(() => e);
      return from(auth.refrescar()).pipe(
        switchMap(() =>
          next(
            req.clone({
              setHeaders: { 'X-Trace-ID': trace, Authorization: 'Bearer ' + auth.token() },
            }),
          ),
        ),
      );
    }),
  );
};
/** Guard: sin token, manda al login de Keycloak. */
export const autenticado: CanActivateFn = (_, s) => {
  const a = inject(Auth);
  if (a.token()) return true;
  void a.login(s.url);
  return false;
};
/** Guard: solo entra si el rol tiene el módulo indicado en data.modulo de la ruta. */
export const porModulo: CanActivateFn = (r) => {
  const a = inject(Auth);
  return a.puede(r.data['modulo']) ? true : inject(Router).createUrlTree(['/sin-acceso']);
};
