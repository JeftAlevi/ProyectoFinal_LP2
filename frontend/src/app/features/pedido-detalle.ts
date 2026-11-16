import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Persona } from '../models';
import { Almacen, ArticuloApi, Pedido } from '../api-tipos';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  imports: [FormsModule, CurrencyPipe, DatePipe],
  templateUrl: './pedido-detalle.html',
  styles: [
    `
      .cliente-nombre {
        white-space: normal;
        overflow-wrap: anywhere;
        font-size: 20px;
        letter-spacing: -0.3px;
      }
      .codigo {
        display: block;
        color: var(--muted);
        font-size: 11px;
      }
      /* El aviso queda visible arriba aunque el usuario haya bajado por la página. */
      :host {
        display: block;
      }
      :host > .alert {
        position: sticky;
        top: 76px;
        z-index: 20;
        box-shadow: 0 6px 18px rgba(18, 31, 52, 0.12);
      }
      .aprobar-pedido {
        display: flex;
        gap: 16px;
        align-items: center;
        flex-wrap: wrap;
        margin-top: 16px;
      }
    `,
  ],
})
export class PedidoDetalle {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  pedido = signal<Pedido | null>(null);
  clientes = signal<Persona[]>([]);
  almacenes = signal<Almacen[]>([]);
  articulos = signal<ArticuloApi[]>([]);
  cargando = signal(true);
  ocupado = signal(false);
  error = signal('');
  aviso = signal('');
  monto = '';
  formaPago = 'EFECTIVO';
  referencia = '';
  confirmarPagoIncompleto = false;
  paginaPagos = signal(0);
  readonly pagosPorPagina = 10;

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.http.get<Pedido[]>('/api/ventas/pedidos').subscribe({
      next: pedidos => {
        const pedido = pedidos.find(p => Number(p.id) === id);
        if (!pedido) this.error.set(`No se encontró el pedido #${id}.`);
        this.pedido.set(pedido || null);
        if (pedido) this.monto = this.saldoPendiente(pedido).toFixed(2);
        this.cargando.set(false);
      },
      error: e => { this.error.set(this.mensajeError(e)); this.cargando.set(false); },
    });
    this.http.get<Persona[]>('/api/v1/personas').subscribe({ next: r => this.clientes.set(r) });
    // Solo para mostrar nombres en vez de códigos; si fallan, se siguen viendo los códigos.
    this.http.get<Almacen[]>('/api/gestion/almacenes').subscribe({ next: r => this.almacenes.set(r) });
    this.http.get<ArticuloApi[]>('/api/articulos').subscribe({ next: r => this.articulos.set(r) });
  }

  nombreAlmacen(id: number | null) { return this.almacenes().find(a => a.id === id)?.nombre || `Almacén #${id}`; }
  nombreArticulo(codigo: string) { return this.articulos().find(a => a.codigo === codigo)?.nombre || codigo; }
  nombreEstado(e: string) { return ({ BORRADOR: 'Borrador', APROBADO: 'Aprobado', DESPACHADO: 'Despachado', DEVUELTO: 'Devuelto', ANULADO: 'Anulado' } as Record<string, string>)[e] || e; }
  /** Un borrador ya pagado por completo se puede aprobar desde aquí. */
  puedeAprobar(p: Pedido) { return p.estado === 'BORRADOR' && this.saldoPendiente(p) === 0; }
  aprobar() {
    const p = this.pedido();
    if (!p || this.ocupado()) return;
    this.ocupado.set(true); this.error.set(''); this.aviso.set('');
    this.http.post<Pedido>(`/api/ventas/pedidos/${p.id}/aprobar`, {}).subscribe({
      next: r => { this.pedido.set(r); this.aviso.set('Pedido aprobado. Almacén ya puede despacharlo desde Inventario.'); this.ocupado.set(false); },
      error: e => { this.error.set(this.mensajeError(e)); this.ocupado.set(false); },
    });
  }

  nombreCliente(id: number) { return this.clientes().find(p => p.id === id)?.nombreORazonSocial || `Cliente #${id}`; }
  estadoPago(p: Pedido) { return ({ PENDIENTE: 'Pendiente', PARCIAL: 'Pago parcial', PAGADO: 'Pagado' } as Record<string, string>)[p?.estadoPago] || 'Pendiente'; }
  nombreFormaPago(v: string | null) { return ({ CONTADO: 'Contado', EFECTIVO: 'Efectivo', TRANSFERENCIA: 'Transferencia bancaria', YAPE_PLIN: 'Yape o Plin', TARJETA: 'Tarjeta', OTRO: 'Otro', CREDITO: 'Crédito' } as Record<string, string>)[v ?? ''] || v || 'No especificada'; }
  plazoPago(v: string | null) { return ({ INMEDIATO: 'Al confirmar', '7_DIAS': '7 días', '15_DIAS': '15 días', '30_DIAS': '30 días' } as Record<string, string>)[v ?? ''] || v || 'No especificado'; }
  saldoPendiente(p: Pedido) { return Math.max(0, Number(p.total || 0) - Number(p.montoPagado || 0)); }
  pagosOrdenados(p: Pedido) { return [...(p?.pagos || [])].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime() || Number(b.id) - Number(a.id)); }
  pagosPagina(p: Pedido) { const inicio = this.paginaPagos() * this.pagosPorPagina; return this.pagosOrdenados(p).slice(inicio, inicio + this.pagosPorPagina); }
  paginasPagos(p: Pedido) { return Math.max(1, Math.ceil(this.pagosOrdenados(p).length / this.pagosPorPagina)); }
  paginaAnteriorPago() { this.paginaPagos.update(p => Math.max(0, p - 1)); }
  paginaSiguientePago(p: Pedido) { this.paginaPagos.update(i => Math.min(this.paginasPagos(p) - 1, i + 1)); }
  actualizarMonto(valor: string, p: Pedido) { this.monto = valor; if (Number(valor) >= this.saldoPendiente(p)) this.confirmarPagoIncompleto = false; }
  esPagoIncompleto(p: Pedido) { const monto = Number(this.monto); return Number.isFinite(monto) && monto > 0 && monto < this.saldoPendiente(p); }
  registrarPago() {
    const p = this.pedido();
    const monto = Number(this.monto);
    if (!p || !Number.isFinite(monto) || monto <= 0) { this.error.set('Ingresa un monto recibido mayor a cero.'); return; }
    if (monto > this.saldoPendiente(p)) { this.error.set('El monto no puede superar el saldo pendiente.'); return; }
    if (this.esPagoIncompleto(p) && !this.confirmarPagoIncompleto) { this.error.set('Confirma la casilla de pago incompleto para registrar este abono.'); return; }
    this.ocupado.set(true); this.error.set(''); this.aviso.set('');
    this.http.post<Pedido>(`/api/ventas/pedidos/${p.id}/pagos`, { monto, formaPago: this.formaPago, referencia: this.referencia }).subscribe({
      next: r => { this.pedido.set(r); this.monto = this.saldoPendiente(r) > 0 ? this.saldoPendiente(r).toFixed(2) : ''; this.referencia = ''; this.confirmarPagoIncompleto = false; this.aviso.set('Pago registrado. Se actualizó el saldo y el historial del pedido.'); this.ocupado.set(false); },
      error: e => { this.error.set(this.mensajeError(e)); this.ocupado.set(false); },
    });
  }
  volver() { this.router.navigateByUrl('/ventas/pedidos'); }
  private mensajeError(e: HttpErrorResponse) {
    const d = e?.error?.detail || e?.error?.message || '';
    if (e.status === 0) return 'No se pudo conectar con el servidor.';
    if (e.status === 401) return 'La sesión venció. Vuelve a iniciar sesión.';
    if (e.status === 403) return 'Tu rol no tiene permiso para consultar o registrar pagos.';
    return d || 'No se pudo cargar o guardar el pago.';
  }
}
