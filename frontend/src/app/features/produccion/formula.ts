import {Component, inject, signal} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {FormBuilder, ReactiveFormsModule, Validators, FormArray, FormGroup} from '@angular/forms';
import {Router, RouterLink} from '@angular/router';
import {mensaje} from '../../api';
import {ArticuloApi} from '../../api-tipos';

@Component({imports: [ReactiveFormsModule, RouterLink], templateUrl: './formula.html'})
export class FormulaForm {
  http=inject(HttpClient); fb=inject(FormBuilder); router=inject(Router);
  articulos=signal<ArticuloApi[]>([]); error=signal(''); ocupado=signal(false);
  form=this.fb.group({nombre:['',[Validators.required,Validators.maxLength(150)]],codigoProductoTerminado:['',Validators.required],
    version:[1,Validators.min(1)],detalles:new FormArray<FormGroup>([],Validators.required)});
  get filas(){return this.form.controls.detalles;}
  constructor(){this.agregar();this.http.get<ArticuloApi[]>('/api/articulos').subscribe({next:r=>this.articulos.set(r.filter(a=>a.activo)),error:e=>this.error.set(mensaje(e))});}
  agregar(){this.filas.push(this.fb.group({codigoArticulo:['',Validators.required],cantidadPorUnidad:[1,[Validators.required,Validators.min(0.0001)]],unidadMedida:['',Validators.required]}));}
  unidad(i:number){const codigo=this.filas.at(i).value.codigoArticulo;this.filas.at(i).patchValue({unidadMedida:this.articulos().find(a=>a.codigo===codigo)?.unidadMedida.codigo||''});}
  guardar(){
    if(this.ocupado())return;
    if(this.form.invalid||!this.filas.length){this.error.set('Completa nombre, producto y al menos un insumo con cantidad positiva.');return;}
    const codigos=this.filas.controls.map(f=>f.value.codigoArticulo);
    if(new Set(codigos).size!==codigos.length){this.error.set('Cada insumo debe aparecer una sola vez en esta fórmula. Puedes utilizarlo en otras fórmulas.');return;}
    this.ocupado.set(true);this.error.set('');
    this.http.post('/api/produccion/formulas',this.form.getRawValue()).subscribe({next:()=>this.router.navigate(['/produccion']),error:e=>{this.error.set(mensaje(e));this.ocupado.set(false);}});
  }
}
