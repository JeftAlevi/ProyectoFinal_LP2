import {Component, inject, signal} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {FormsModule, ReactiveFormsModule, FormBuilder, Validators} from '@angular/forms';
import {RouterLink} from '@angular/router';
import {forkJoin} from 'rxjs';
import {mensaje} from '../../api';
import {Auth} from '../../auth';
import {Almacen, ArticuloApi, Formula, Lote, OrdenProduccion} from '../../api-tipos';

@Component({imports: [FormsModule, ReactiveFormsModule, RouterLink], templateUrl: './produccion.html'})
export class Produccion {
  http = inject(HttpClient); fb = inject(FormBuilder); auth = inject(Auth);
  ordenes = signal<OrdenProduccion[]>([]); formulas = signal<Formula[]>([]); almacenes = signal<Almacen[]>([]);
  articulos = signal<ArticuloApi[]>([]); lotes = signal<Lote[]>([]);
  error = signal(''); estado = signal(''); ocupado = signal(false); seleccion = signal<OrdenProduccion | null>(null);
  form = this.fb.group({formulaId: [null as number|null, Validators.required], almacenOrigenId: [null as number|null, Validators.required],
    almacenDestinoId: [null as number|null, Validators.required], cantidadPlanificada: [100, [Validators.required, Validators.min(0.0001)]]});
  consumo = {codigoArticulo: '', cantidadConsumida: 1, unidadMedida: 'KG', loteId: null};
  resultado = {tipo: 'TERMINADO', codigoArticulo: '', cantidad: 1, unidadMedida: 'KG'};

  constructor() { this.cargar(); }
  cargar() {
    forkJoin({o: this.http.get<OrdenProduccion[]>('/api/produccion/ordenes'), f: this.http.get<Formula[]>('/api/produccion/formulas'),
      a: this.http.get<Almacen[]>('/api/gestion/almacenes'), c: this.http.get<ArticuloApi[]>('/api/articulos'), s: this.http.get<Lote[]>('/api/reportes/stock')})
      .subscribe({next: r => {
        this.ordenes.set(r.o.sort((a,b) => b.id-a.id)); this.formulas.set(r.f.filter(x => x.activo));
        this.almacenes.set(r.a.filter(x => x.activo)); this.articulos.set(r.c.filter(x => x.activo)); this.lotes.set(r.s);
        if (this.seleccion()) this.seleccion.set(r.o.find(x => x.id === this.seleccion()!.id) || null);
      }, error: e => this.error.set(mensaje(e))});
  }
  nombre(codigo: string) { return this.articulos().find(a => a.codigo === codigo)?.nombre || codigo; }
  disponible(codigo: string, almacen: number|null|undefined) {
    return this.lotes().filter(l => l.codigoArticulo === codigo && l.almacenId === almacen && l.estado === 'DISPONIBLE')
      .reduce((s,l) => s+Number(l.cantidadDisponible), 0);
  }
  plan() {
    const f = this.formulas().find(f => f.id === this.form.value.formulaId);
    return (f?.detalles || []).map((d) => ({...d, total: d.cantidadPorUnidad*(this.form.value.cantidadPlanificada || 0),
      disponible: this.disponible(d.codigoArticulo, this.form.value.almacenOrigenId)}));
  }
  crear() {
    if (this.form.invalid) { this.error.set('Selecciona fórmula, ambos almacenes y una cantidad positiva.'); return; }
    this.enviar('/api/produccion/ordenes', this.form.getRawValue(), true);
  }
  enviar(url: string, body: object = {}, abrir = false) {
    if (this.ocupado()) return;
    this.ocupado.set(true); this.error.set(''); this.estado.set('');
    this.http.post<OrdenProduccion>(url, body).subscribe({next: r => {
      this.ocupado.set(false);
      this.estado.set(r.estado === 'EN_ESPERA' ? 'Faltan insumos: la orden permanece en espera. Solicita su recepción en el almacén de origen y vuelve a pulsar Iniciar.'
        : r.estado === 'CERRADA' ? 'Orden cerrada. El producto terminado ya ingresó a Inventario.'
        : r.estado === 'CANCELADA' ? 'Orden cancelada. No se generaron productos ni se descontaron insumos.' : 'Operación registrada.');
      if (abrir) this.abrir(r);
      else if (this.seleccion()?.id === r.id) this.seleccion.set(r);
      if (url.endsWith('/consumos')) this.consumo.cantidadConsumida = 0;
      if (url.endsWith('/resultados')) this.resultado.cantidad = 0;
      this.cargar();
    }, error: e => { this.ocupado.set(false); this.error.set(mensaje(e)); }});
  }
  accion(id: number, accion: string) { this.enviar('/api/produccion/ordenes/'+id+'/'+accion); }
  abrir(o: OrdenProduccion) {
    this.seleccion.set(o);
    this.resultado = {tipo: 'TERMINADO', codigoArticulo: o.formula.codigoProductoTerminado, cantidad: 1,
      unidadMedida: this.articulos().find(a => a.codigo === o.formula.codigoProductoTerminado)?.unidadMedida.codigo || 'KG'};
    const d = o.formula.detalles[0];
    if (d) this.consumo = {codigoArticulo: d.codigoArticulo, cantidadConsumida: Number(d.cantidadPorUnidad)*Number(o.cantidadPlanificada), unidadMedida: d.unidadMedida, loteId: null};
  }
  unidadConsumo() {
    const o = this.seleccion()!, d = o.formula.detalles.find((x) => x.codigoArticulo === this.consumo.codigoArticulo);
    this.consumo.unidadMedida = d?.unidadMedida || '';
    const usado = o.consumos.filter((c) => c.codigoArticulo === d?.codigoArticulo).reduce((s:number,c) => s+Number(c.cantidadConsumida),0);
    this.consumo.cantidadConsumida = Math.max(0, Number(d?.cantidadPorUnidad || 0)*Number(o.cantidadPlanificada)-usado);
  }
  unidadResultado() { this.resultado.unidadMedida = this.articulos().find(a => a.codigo === this.resultado.codigoArticulo)?.unidadMedida.codigo || ''; }
  guardarConsumo() {
    if (!(this.consumo.cantidadConsumida > 0)) { this.error.set('Indica una cantidad de consumo positiva.'); return; }
    this.enviar('/api/produccion/ordenes/'+this.seleccion()!.id+'/consumos', this.consumo);
  }
  guardarResultado() {
    if (!(this.resultado.cantidad > 0)) { this.error.set('Indica una cantidad de resultado positiva.'); return; }
    this.enviar('/api/produccion/ordenes/'+this.seleccion()!.id+'/resultados', this.resultado);
  }
  siguiente(o: OrdenProduccion) {
    switch (o.estado) {
      case 'PLANIFICADA': return 'Pulsa Iniciar para comprobar las existencias.';
      case 'EN_ESPERA': return 'Faltan insumos. Solicita abastecimiento y vuelve a pulsar Iniciar en esta misma orden.';
      case 'EN_PROCESO': return 'Registra cada consumo y los resultados. Después cierra la orden una sola vez.';
      case 'CERRADA': return 'Proceso finalizado. Consulta el lote generado en Inventario y el reporte de consumo.';
      default: return 'Orden cancelada. No admite nuevos consumos ni resultados.';
    }
  }
}
