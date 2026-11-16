import {Component, inject, signal} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {FormsModule, NgForm} from '@angular/forms';
import {RouterLink} from '@angular/router';
import {forkJoin} from 'rxjs';
import {mensaje} from '../api';
import {Auth} from '../auth';
import {Persona} from '../models';
import {Permiso, Rol, UsuarioApi} from '../api-tipos';

@Component({imports: [FormsModule, RouterLink], templateUrl: './administracion.html'})
export class Administracion {
  http = inject(HttpClient);
  auth = inject(Auth);
  roles = signal<Rol[]>([]);
  permisos = signal<Permiso[]>([]);
  personas = signal<Persona[]>([]);
  usuarios = signal<UsuarioApi[]>([]);
  error = signal('');
  estado = signal('');
  ocupado = signal(false);
  rolId = 0;
  seleccion: number[] = [];
  usuario = {personaId: 0, rolId: 0, username: '', keycloakSub: ''};
  links = ['empresas', 'sucursales', 'almacenes', 'tiendas', 'roles'];

  constructor() { this.cargar(); }
  cargar() {
    forkJoin({r: this.http.get<Rol[]>('/api/gestion/roles'), p: this.http.get<Permiso[]>('/api/gestion/permisos'),
      u: this.http.get<UsuarioApi[]>('/api/administracion/usuarios'), c: this.http.get<Persona[]>('/api/v1/personas')})
      .subscribe({next: x => {
        this.roles.set(x.r); this.permisos.set(x.p); this.usuarios.set(x.u); this.personas.set(x.c);
        this.cambiar(false);
      }, error: e => this.error.set(mensaje(e))});
  }
  rolActual() { return this.roles().find(r => r.id === +this.rolId); }
  esAdmin() { return this.rolActual()?.nombre === 'ADMIN'; }
  cambiar(limpiar = true) {
    if (limpiar) { this.error.set(''); this.estado.set(''); }
    this.seleccion = this.esAdmin() ? this.permisos().map(p => p.id)
      : (this.rolActual()?.permisos || []).map((p) => p.id);
  }
  bloqueado(p: Permiso) { return !this.rolId || this.esAdmin() || p.modulo === 'ADMINISTRACION' || this.ocupado(); }
  check(p: Permiso) {
    if (this.bloqueado(p)) return;
    this.seleccion = this.seleccion.includes(p.id) ? this.seleccion.filter(x => x !== p.id) : [...this.seleccion, p.id];
  }
  guardar() {
    if (!this.rolId || this.esAdmin() || this.ocupado()) return;
    this.ocupado.set(true); this.error.set(''); this.estado.set('');
    this.http.put('/api/administracion/roles/' + this.rolId + '/permisos', {permisoIds: this.seleccion}).subscribe({
      next: () => {
        this.ocupado.set(false); this.estado.set('Permisos guardados. Se aplican en la próxima consulta del usuario.');
        this.cargar(); void this.auth.cargarPerfil().catch(() => this.error.set('Se guardaron los permisos, pero debes volver a ingresar para actualizar tu sesión.'));
      }, error: e => { this.ocupado.set(false); this.error.set(mensaje(e)); }
    });
  }
  rolesDelPermiso(id: number) {
    return this.roles().filter(r => r.nombre === 'ADMIN' || r.permisos?.some((p) => p.id === id)).map(r => r.nombre).join(', ') || 'Sin roles asignados';
  }
  crearUsuario(form: NgForm) {
    if (this.ocupado()) return;
    if (form.invalid || !this.usuario.personaId || !this.usuario.rolId || !this.usuario.username.trim() || !this.usuario.keycloakSub.trim()) {
      this.error.set('Selecciona persona y rol e indica el usuario y su ID (sub) de Keycloak.'); return;
    }
    this.ocupado.set(true); this.error.set(''); this.estado.set('');
    this.http.post('/api/administracion/usuarios', {...this.usuario, username: this.usuario.username.trim(), keycloakSub: this.usuario.keycloakSub.trim()}).subscribe({
      next: () => {
        this.ocupado.set(false); this.estado.set('Perfil institucional vinculado. La cuenta y sus roles de acceso se gestionan en Keycloak.');
        this.usuario = {personaId: 0, rolId: 0, username: '', keycloakSub: ''}; this.cargar();
      }, error: e => { this.ocupado.set(false); this.error.set(mensaje(e)); }
    });
  }
}
