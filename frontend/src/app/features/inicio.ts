import { Component, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { Auth } from '../auth';
import { Orden } from '../models';
import { MovimientoInventario, OrdenProduccion, Pedido, ReporteVentas } from '../api-tipos';

/** Una cifra del panel. valor es null mientras carga o si no se pudo consultar. */
interface Indicador {
  modulo: string;
  titulo: string;
  detalle: string;
  ruta: string;
  query?: Record<string, string>;
  valor: number | null;
  moneda?: boolean;
}

@Component({
  imports: [RouterLink, CurrencyPipe],
  templateUrl: './inicio.html',
  styles: [
    `
      .panel-stats {
        grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      }
      .panel-stats a {
        display: block;
        color: inherit;
        text-decoration: none;
      }
      .panel-stats article {
        height: 100%;
        transition: border-color 0.15s;
      }
      .panel-stats a:hover article {
        border-color: var(--accent, #21845a);
      }
    `,
  ],
})
export class Inicio {
  auth = inject(Auth);
  private http = inject(HttpClient);

  /** Cifras reales de cada módulo; solo se consultan las de los módulos que el rol puede ver. */
  indicadores = signal<Indicador[]>([]);

  links = [
    {
      path: '/compras',
      m: 'COMPRAS',
      n: '01 / ABASTECIMIENTO',
      title: 'Compras',
      desc: 'Proveedores y órdenes con detalle.',
    },
    {
      path: '/inventario',
      m: 'INVENTARIO',
      n: '02 / ALMACÉN',
      title: 'Inventario',
      desc: 'Recepciones, lotes y control de calidad.',
    },
    {
      path: '/produccion',
      m: 'PRODUCCION',
      n: '03 / PLANTA',
      title: 'Producción',
      desc: 'Fórmulas, consumos y resultados.',
    },
    {
      path: '/ventas',
      m: 'VENTAS',
      n: '04 / COMERCIAL',
      title: 'Ventas',
      desc: 'Pedidos, disponibilidad y despacho.',
    },
    {
      path: '/administracion',
      m: 'ADMINISTRACION',
      n: '05 / ORGANIZACIÓN',
      title: 'Administración',
      desc: 'Empresas, sedes y permisos por rol.',
    },
  ];

  constructor() {
    const inicioMes = new Date();
    inicioMes.setDate(1);
    const desde = inicioMes.toISOString().slice(0, 10);

    this.agregar(
      { modulo: 'COMPRAS', titulo: 'Compras por recibir', detalle: 'Órdenes emitidas sin recepción', ruta: '/compras' },
      this.http.get<Orden[]>('/api/v1/ordenes-compra'),
      (r) => r.filter((o) => o.estado === 'EMITIDA').length,
    );
    this.agregar(
      {
        modulo: 'INVENTARIO',
        titulo: 'Recepciones por revisar',
        detalle: 'Control de calidad pendiente',
        ruta: '/inventario',
        query: { seccion: 'recepciones' },
      },
      this.http.get<MovimientoInventario[]>('/api/inventario/movimientos'),
      (r) => r.filter((m) => m.tipoMovimiento === 'RECEPCION' && m.estado === 'BORRADOR').length,
    );
    this.agregar(
      {
        modulo: 'INVENTARIO',
        titulo: 'Pedidos por despachar',
        detalle: 'Aprobados por Ventas',
        ruta: '/inventario',
        query: { seccion: 'despachos' },
      },
      this.http.get<Pedido[]>('/api/ventas/pedidos'),
      (r) => r.filter((p) => p.estado === 'APROBADO').length,
    );
    this.agregar(
      {
        modulo: 'PRODUCCION',
        titulo: 'Órdenes de producción activas',
        detalle: 'En espera o en proceso',
        ruta: '/produccion',
      },
      this.http.get<OrdenProduccion[]>('/api/produccion/ordenes'),
      (r) => r.filter((o) => o.estado === 'EN_ESPERA' || o.estado === 'EN_PROCESO').length,
    );
    this.agregar(
      {
        modulo: 'VENTAS',
        titulo: 'Ventas netas del mes',
        detalle: 'Despachado menos devuelto',
        ruta: '/ventas/historial',
        moneda: true,
      },
      this.http.get<ReporteVentas>('/api/ventas/reportes', { params: { desde } }),
      (r) => Number(r.totalNeto || 0),
    );
  }

  /** Agrega una tarjeta si el rol tiene el módulo y la completa cuando responde el backend. */
  private agregar<T>(
    base: Omit<Indicador, 'valor'>,
    consulta: Observable<T>,
    calcular: (respuesta: T) => number,
  ) {
    if (!this.auth.puede(base.modulo)) return;
    const indicador: Indicador = { ...base, valor: null };
    this.indicadores.update((lista) => [...lista, indicador]);
    consulta.subscribe({
      next: (r) => this.actualizar(indicador, calcular(r)),
      error: () => this.actualizar(indicador, null),
    });
  }

  private actualizar(indicador: Indicador, valor: number | null) {
    this.indicadores.update((lista) => lista.map((i) => (i === indicador ? { ...i, valor } : i)));
  }
}
