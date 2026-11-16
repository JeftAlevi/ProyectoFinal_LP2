import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { filter } from 'rxjs';
import { Auth } from './auth/auth';

/** incluyeSubrutas: también se marca en las rutas hijas (por ejemplo /ventas/pedidos/15). */
interface ItemSubmenu { path: string; nombre: string; query?: Record<string, string>; incluyeSubrutas?: boolean; }
interface ItemMenu { path: string; nombre: string; icon: string; modulo: string; hijos?: ItemSubmenu[]; }

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="app-shell" [class.nav-collapsed]="collapsed()" [class.nav-open]="mobileOpen()">
      <aside class="app-sidebar">
        <a class="brand" routerLink="/panel" (click)="mobileOpen.set(false)">
          <span class="brand-mark">M</span><span class="brand-copy">Maíz ERP<small>Producción y comercialización</small></span>
        </a>
        <p class="nav-label">ESPACIO DE TRABAJO</p>
        <nav aria-label="Navegación principal">
          <a routerLink="/panel" routerLinkActive="selected" title="Resumen" (click)="mobileOpen.set(false)"><span class="nav-icon">⌂</span><span class="nav-copy">Resumen</span></a>
          @for(n of menu;track n.path){@if(auth.puede(n.modulo)||(n.path==='/personas'&&auth.puede('VENTAS'))){
            @if(n.hijos){
              <button class="nav-parent" [class.selected-parent]="estaAbierto(n.path)" [title]="n.nombre" [attr.aria-expanded]="estaAbierto(n.path)" (click)="alternar(n.path)"><span class="nav-icon">{{n.icon}}</span><span class="nav-copy">{{n.nombre}}</span><span class="nav-chevron">{{estaAbierto(n.path)?'⌄':'›'}}</span></button>
              @if(estaAbierto(n.path)){
                <div class="nav-submenu">
                  @for(h of n.hijos;track h.nombre){
                    <a [routerLink]="h.path" [queryParams]="h.query" routerLinkActive="selected" [routerLinkActiveOptions]="h.incluyeSubrutas ? opcionesSubrutas : opcionesActivo" (click)="mobileOpen.set(false)"><span class="submenu-dot">•</span><span class="nav-copy">{{h.nombre}}</span></a>
                  }
                </div>
              }
            }@else{
              <a [routerLink]="n.path" routerLinkActive="selected" [title]="n.nombre" (click)="mobileOpen.set(false)"><span class="nav-icon">{{n.icon}}</span><span class="nav-copy">{{n.nombre}}</span></a>
            }
          }}
          <a routerLink="/" title="Portal público" (click)="mobileOpen.set(false)"><span class="nav-icon">↗</span><span class="nav-copy">Portal público</span></a>
        </nav>
        <div class="sidebar-bottom"><span class="session-role">{{auth.perfil()?.roles?.join(' · ')}}</span><button class="logout-button" (click)="auth.salir()"><span class="nav-icon">⇥</span><span class="nav-copy">Cerrar sesión</span></button></div>
      </aside>
      <button class="nav-backdrop" aria-label="Cerrar menú" (click)="mobileOpen.set(false)"></button>
      <div class="app-workspace">
        <header class="app-topbar">
          <div class="topbar-start"><button class="icon-button menu-toggle" aria-label="Alternar menú" (click)="toggleMenu()">☰</button><span class="topbar-title">Sistema integral de gestión</span></div>
          <div class="topbar-end"><span class="role-pill">{{auth.perfil()?.roles?.join(' · ')}}</span><button class="theme-toggle" [attr.aria-label]="theme()==='dark'?'Cambiar a tema claro':'Cambiar a tema oscuro'" [title]="theme()==='dark'?'Tema claro':'Tema oscuro'" (click)="toggleTheme()"><span>{{theme()==='dark'?'☀':'◐'}}</span><span class="theme-label">{{theme()==='dark'?'Claro':'Oscuro'}}</span></button></div>
        </header>
        <main class="app-content"><router-outlet/></main>
      </div>
    </div>
  `,
})
export class Layout {
  auth = inject(Auth);
  private router = inject(Router);
  collapsed = signal(false);
  mobileOpen = signal(false);
  theme = signal<'light'|'dark'>('light');
  opcionesActivo = { paths: 'exact' as const, queryParams: 'exact' as const, matrixParams: 'ignored' as const, fragment: 'ignored' as const };
  opcionesSubrutas = { paths: 'subset' as const, queryParams: 'subset' as const, matrixParams: 'ignored' as const, fragment: 'ignored' as const };
  menu: ItemMenu[] = [
    { path:'/produccion', nombre:'Producción', icon:'⚙', modulo:'PRODUCCION', hijos:[
      { path:'/produccion', nombre:'Órdenes de producción' },
      { path:'/formulas/nueva', nombre:'Nueva fórmula' },
      { path:'/reportes', nombre:'Reporte de producción' },
    ]},
    { path:'/compras', nombre:'Compras', icon:'⇧', modulo:'COMPRAS', hijos:[
      { path:'/compras/nueva', nombre:'Nueva orden de compra' },
      { path:'/compras', nombre:'Órdenes de compra' },
    ]},
    { path:'/inventario', nombre:'Inventario', icon:'▦', modulo:'INVENTARIO', hijos:[
      { path:'/inventario', query:{ seccion:'recepciones' }, nombre:'Recepciones' },
      { path:'/inventario', query:{ seccion:'existencias' }, nombre:'Existencias y lotes' },
      { path:'/inventario', query:{ seccion:'despachos' }, nombre:'Despachos' },
      { path:'/inventario', query:{ seccion:'historial' }, nombre:'Historial' },
    ]},
    { path:'/ventas', nombre:'Ventas', icon:'▤', modulo:'VENTAS', hijos:[
      { path:'/ventas/vender', nombre:'Nueva venta' },
      { path:'/ventas/cotizaciones', nombre:'Cotizaciones' },
      { path:'/ventas/pedidos', nombre:'Pedidos', incluyeSubrutas: true },
      { path:'/ventas/historial', nombre:'Consultar ventas' },
    ]},
    { path:'/catalogos', nombre:'Artículos y unidades', icon:'◫', modulo:'INVENTARIO', hijos:[
      { path:'/catalogos/articulos', nombre:'Artículos' },
      { path:'/catalogos/categorias', nombre:'Categorías' },
      { path:'/catalogos/unidades', nombre:'Unidades de medida' },
    ]},
    { path:'/personas', nombre:'Personas y proveedores', icon:'♙', modulo:'COMPRAS' },
    { path:'/administracion', nombre:'Administración y roles', icon:'⚑', modulo:'ADMINISTRACION', hijos:[
      { path:'/administracion', nombre:'Permisos y perfiles' },
      { path:'/catalogos/roles', nombre:'Roles' },
      { path:'/catalogos/empresas', nombre:'Empresas' },
      { path:'/catalogos/sucursales', nombre:'Sucursales' },
      { path:'/catalogos/almacenes', nombre:'Almacenes' },
      { path:'/catalogos/tiendas', nombre:'Tiendas' },
    ]},
  ];
  private abiertos = signal<Record<string, boolean>>(this.gruposDeRuta(this.router.url));

  estaAbierto(path: string) { return !!this.abiertos()[path]; }

  alternar(path: string) { this.abiertos.update(a => ({ ...a, [path]: !a[path] })); }

  /** Abre el grupo que contiene la pantalla actual, para que el usuario vea dónde está. */
  private gruposDeRuta(url: string): Record<string, boolean> {
    const ruta = url.split('?')[0];
    const abiertos: Record<string, boolean> = {};
    for (const n of this.menu ?? []) {
      if (n.hijos?.some(h => ruta === h.path || ruta.startsWith(h.path + '/'))) abiertos[n.path] = true;
    }
    return abiertos;
  }

  constructor() {
    // Al cambiar de pantalla: se abre el grupo que la contiene, se cierran los demás
    // y la página nueva empieza arriba. Si solo cambian los parámetros (?seccion=...),
    // como en las pestañas de Inventario, no se mueve el scroll.
    let rutaAnterior = this.router.url.split('?')[0];
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe((e) => {
        this.abiertos.set(this.gruposDeRuta(e.urlAfterRedirects));
        const ruta = e.urlAfterRedirects.split('?')[0];
        if (ruta !== rutaAnterior) window.scrollTo({ top: 0 });
        rutaAnterior = ruta;
      });
    const saved = localStorage.getItem('maiz-erp-theme');
    const initial = saved === 'dark' ? 'dark' : 'light';
    this.theme.set(initial);
    document.documentElement.dataset['theme'] = initial;
  }

  toggleTheme() {
    const next = this.theme() === 'dark' ? 'light' : 'dark';
    this.theme.set(next);
    document.documentElement.dataset['theme'] = next;
    localStorage.setItem('maiz-erp-theme', next);
  }

  toggleMenu() {
    if (window.matchMedia('(max-width: 760px)').matches) this.mobileOpen.update(v => !v);
    else this.collapsed.update(v => !v);
  }
}
