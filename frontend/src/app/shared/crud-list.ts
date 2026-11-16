import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { catalogos, Campo, Catalogo } from './catalogos';
import { mensaje } from '../api';
import { Auth } from '../auth';
import { RegistroCatalogo } from '../api-tipos';
@Component({ imports: [RouterLink, FormsModule], templateUrl: './crud-list.html' })
export class CrudList {
  http = inject(HttpClient);
  route = inject(ActivatedRoute);
  auth = inject(Auth);
  tipo = '';
  config!: Catalogo;
  rows = signal<RegistroCatalogo[]>([]);
  error = signal('');
  cargando = signal(false);
  pendiente = signal<RegistroCatalogo | null>(null);
  busqueda = '';
  constructor() {
    this.route.paramMap.subscribe((p) => {
      this.tipo = p.get('tipo')!;
      this.config = catalogos[this.tipo];
      this.cargar();
    });
  }
  cargar() {
    this.cargando.set(true);
    this.http.get<RegistroCatalogo[]>(this.config.api).subscribe({
      next: (r) => {
        this.rows.set(r.filter((x) => x.activo !== false));
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(mensaje(e));
        this.cargando.set(false);
      },
    });
  }
  filtrar() {
    return this.rows().filter((r) =>
      JSON.stringify(r).toLowerCase().includes(this.busqueda.toLowerCase()),
    );
  }
  valor(r: RegistroCatalogo, c: Campo) {
    const v = r[c.key];
    return c.relation ? (v as RegistroCatalogo | null)?.[c.display || 'nombre'] : v;
  }
  eliminar(id: number) {
    this.http.delete(this.config.api + '/' + id).subscribe({
      next: () => {
        this.pendiente.set(null);
        this.cargar();
      },
      error: (e) => this.error.set(mensaje(e)),
    });
  }
}
