import {TestBed, ComponentFixture} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting, HttpTestingController} from '@angular/common/http/testing';
import {provideRouter} from '@angular/router';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {Administracion} from './administracion';
import {Auth} from '../auth';
import {Permiso} from '../api-tipos';
let fixture:ComponentFixture<Administracion>,component:Administracion,http:HttpTestingController;
const ps:Permiso[]=[{id:1,nombre:'OPERAR_ADMINISTRACION',modulo:'ADMINISTRACION',descripcion:null},{id:2,nombre:'OPERAR_PRODUCCION',modulo:'PRODUCCION',descripcion:null},{id:3,nombre:'OPERAR_COMPRAS',modulo:'COMPRAS',descripcion:null}];
const rs=[{id:1,nombre:'ADMIN',permisos:[ps[0]]},{id:2,nombre:'OPERARIO_PLANTA',permisos:[ps[1]]},{id:3,nombre:'SUPERVISOR',permisos:[ps[1],ps[2]]}];
function cargar(){http.expectOne('/api/gestion/roles').flush(rs);http.expectOne('/api/gestion/permisos').flush(ps);http.expectOne('/api/administracion/usuarios').flush([]);http.expectOne('/api/v1/personas').flush([]);}
beforeEach(()=>{TestBed.configureTestingModule({imports:[Administracion],providers:[provideRouter([]),provideHttpClient(),provideHttpClientTesting(),{provide:Auth,useValue:{cargarPerfil:vi.fn(async()=>{})}}]});http=TestBed.inject(HttpTestingController);fixture=TestBed.createComponent(Administracion);component=fixture.componentInstance;cargar();fixture.detectChanges();});
afterEach(()=>http.verify());
it('ADMIN muestra acceso fijo y no permite guardar una configuración engañosa',()=>{
 component.rolId=1;component.cambiar();fixture.detectChanges();expect(component.seleccion).toEqual([1,2,3]);
 component.guardar();http.expectNone(r=>r.method==='PUT');expect(fixture.nativeElement.textContent).toContain('acceso completo fijo');
});
it('un mismo permiso muestra los distintos roles que lo utilizan',()=>{
 expect(component.rolesDelPermiso(2)).toContain('OPERARIO_PLANTA');expect(component.rolesDelPermiso(2)).toContain('SUPERVISOR');
 component.rolId=2;component.cambiar();component.check(ps[0]);expect(component.seleccion).toEqual([2]);
});
it('retirar un permiso envía la selección vacía y confirma el guardado',()=>{
 component.rolId=2;component.cambiar();component.check(ps[1]);component.guardar();
 const req=http.expectOne('/api/administracion/roles/2/permisos');expect(req.request.body).toEqual({permisoIds:[]});req.flush({});cargar();
 expect(component.estado()).toContain('Permisos guardados');expect(component.ocupado()).toBe(false);
});
it('un error al guardar no informa éxito ni pierde la selección',()=>{
 component.rolId=2;component.cambiar();component.guardar();http.expectOne('/api/administracion/roles/2/permisos').flush({message:'Error de prueba'},{status:409,statusText:'Conflict'});
 expect(component.estado()).toBe('');expect(component.error()).toBe('Error de prueba');expect(component.seleccion).toEqual([2]);
});
