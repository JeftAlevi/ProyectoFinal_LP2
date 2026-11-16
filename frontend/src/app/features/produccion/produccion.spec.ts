import {TestBed, ComponentFixture} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting, HttpTestingController} from '@angular/common/http/testing';
import {provideRouter} from '@angular/router';
import {afterEach, beforeEach, expect, it} from 'vitest';
import {Produccion} from './produccion';
import {Auth} from '../../auth';
import {OrdenProduccion} from '../../api-tipos';

let fixture: ComponentFixture<Produccion>, component: Produccion, http: HttpTestingController;
const formula={id:1,nombre:'Mezcla',activo:true,codigoProductoTerminado:'PUR',detalles:[{id:1,codigoArticulo:'MAIZ',cantidadPorUnidad:0.6,unidadMedida:'KG'},{id:2,codigoArticulo:'SOYA',cantidadPorUnidad:0.4,unidadMedida:'KG'}]};
// Orden de prueba con solo los campos que usa la pantalla.
const orden={id:5,formula,estado:'EN_PROCESO',cantidadPlanificada:10,almacenOrigenId:1,consumos:[],resultados:[]} as unknown as OrdenProduccion;
function cargar(orders:unknown[]=[]){
  http.expectOne('/api/produccion/ordenes').flush(orders);
  http.expectOne('/api/produccion/formulas').flush([formula]);
  http.expectOne('/api/gestion/almacenes').flush([{id:1,nombre:'MP',activo:true}]);
  http.expectOne('/api/articulos').flush([{id:1,codigo:'MAIZ',nombre:'Maíz',activo:true,unidadMedida:{codigo:'KG'}},{id:2,codigo:'PUR',nombre:'Purina',activo:true,unidadMedida:{codigo:'KG'}}]);
  http.expectOne('/api/reportes/stock').flush([{codigoArticulo:'MAIZ',almacenId:1,cantidadDisponible:4,estado:'DISPONIBLE'}, {codigoArticulo:'MAIZ',almacenId:1,cantidadDisponible:50,estado:'BLOQUEADO'}]);
}
beforeEach(()=>{
 TestBed.configureTestingModule({imports:[Produccion],providers:[provideRouter([]),provideHttpClient(),provideHttpClientTesting(),{provide:Auth,useValue:{puede:()=>false}}]});
 http=TestBed.inject(HttpTestingController);fixture=TestBed.createComponent(Produccion);component=fixture.componentInstance;cargar();fixture.detectChanges();
});
afterEach(()=>http.verify());
it('muestra el plan y las existencias sin descontar stock',()=>{
 component.form.patchValue({formulaId:1,cantidadPlanificada:10,almacenOrigenId:1,almacenDestinoId:1});fixture.detectChanges();
 expect(component.plan()[0].total).toBe(6);expect(component.plan()[0].disponible).toBe(4);
 expect(fixture.nativeElement.textContent).toContain('Falta stock para iniciar.');
 http.expectNone(r=>r.method==='POST');
});
it('al planificar abre la orden y explica el paso siguiente',()=>{
 component.form.patchValue({formulaId:1,cantidadPlanificada:10,almacenOrigenId:1,almacenDestinoId:1});component.crear();
 const req=http.expectOne('/api/produccion/ordenes');expect(req.request.body.cantidadPlanificada).toBe(10);
 req.flush({...orden,estado:'PLANIFICADA'});cargar([{...orden,estado:'PLANIFICADA'}]);fixture.detectChanges();
 expect(component.seleccion()?.id).toBe(5);expect(fixture.nativeElement.textContent).toContain('Pulsa Iniciar');
});
it('un error de consumo conserva los datos y permite corregir sin reenviar automáticamente',()=>{
 component.abrir(orden);component.consumo.cantidadConsumida=6;component.guardarConsumo();
 http.expectOne('/api/produccion/ordenes/5/consumos').flush({message:'Stock insuficiente'},{status:409,statusText:'Conflict'});
 expect(component.error()).toBe('Stock insuficiente');expect(component.ocupado()).toBe(false);expect(component.consumo.cantidadConsumida).toBe(6);
});
it('un consumo correcto limpia la cantidad para impedir repetirlo por accidente',()=>{
 component.abrir(orden);component.guardarConsumo();
 const updated={...orden,consumos:[{id:1,codigoArticulo:'MAIZ',cantidadConsumida:6,unidadMedida:'KG'}]};
 http.expectOne('/api/produccion/ordenes/5/consumos').flush(updated);cargar([updated]);
 expect(component.consumo.cantidadConsumida).toBe(0);component.guardarConsumo();http.expectNone('/api/produccion/ordenes/5/consumos');
});
it('la espera indica abastecer la misma orden sin planificar otra',()=>{
 expect(component.siguiente({...orden,estado:'EN_ESPERA'})).toContain('misma orden');
 component.abrir({...orden,estado:'CERRADA'});fixture.detectChanges();
 expect(fixture.nativeElement.textContent).toContain('Proceso finalizado');
 expect(fixture.nativeElement.textContent).not.toContain('Registrar consumo');
});
