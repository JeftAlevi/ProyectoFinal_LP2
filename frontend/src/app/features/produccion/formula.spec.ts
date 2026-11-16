import {TestBed, ComponentFixture} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {provideRouter} from '@angular/router';
import {afterEach,beforeEach,it,expect} from 'vitest';
import {FormulaForm} from './formula';
let fixture:ComponentFixture<FormulaForm>,component:FormulaForm,http:HttpTestingController;
beforeEach(()=>{
 TestBed.configureTestingModule({imports:[FormulaForm],providers:[provideRouter([]),provideHttpClient(),provideHttpClientTesting()]});
 http=TestBed.inject(HttpTestingController);fixture=TestBed.createComponent(FormulaForm);component=fixture.componentInstance;
 http.expectOne('/api/articulos').flush([{id:1,codigo:'MAIZ',nombre:'Maíz',activo:true,unidadMedida:{codigo:'KG'}},{id:2,codigo:'PUR',nombre:'Purina',activo:true,tipoArticulo:'PRODUCTO_TERMINADO',unidadMedida:{codigo:'KG'}}]);
 fixture.detectChanges();
});
afterEach(()=>http.verify());
it('no envía una fórmula que repite el mismo insumo',()=>{
 component.form.patchValue({nombre:'Receta',codigoProductoTerminado:'PUR'});component.agregar();
 for(const fila of component.filas.controls)fila.patchValue({codigoArticulo:'MAIZ',cantidadPorUnidad:0.5,unidadMedida:'KG'});
 component.guardar();expect(component.error()).toContain('una sola vez');http.expectNone(r=>r.method==='POST');
});
it('conserva las líneas al rechazar el servidor para corregirlas',()=>{
 component.form.patchValue({nombre:'Receta',codigoProductoTerminado:'PUR'});component.filas.at(0).patchValue({codigoArticulo:'MAIZ',cantidadPorUnidad:0.5});component.unidad(0);
 component.guardar();const req=http.expectOne('/api/produccion/formulas');expect(req.request.body.detalles[0].unidadMedida).toBe('KG');
 req.flush({message:'Producto inactivo'},{status:400,statusText:'Bad Request'});
 expect(component.ocupado()).toBe(false);expect(component.error()).toBe('Producto inactivo');expect(component.filas.length).toBe(1);
});
