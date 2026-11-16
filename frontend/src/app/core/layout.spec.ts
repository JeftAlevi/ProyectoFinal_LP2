import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { expect, it } from 'vitest';
import { Layout } from './layout';
import { Auth } from './auth/auth';

@Component({ template: '' })
class Vacia {}

/** Texto de los enlaces del menú que están marcados como seleccionados. */
function marcados(el: HTMLElement) {
  return [...el.querySelectorAll('a.selected')].map(a => a.textContent?.trim());
}

it('en el detalle de un pedido el menú marca "Pedidos"', async () => {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'ventas/pedidos', component: Vacia },
        { path: 'ventas/pedidos/:id', component: Vacia },
      ]),
      { provide: Auth, useValue: { puede: () => true, es: () => false, perfil: () => null, salir: () => {} } },
    ],
  });
  await TestBed.inject(Router).navigateByUrl('/ventas/pedidos/15');
  const fixture = TestBed.createComponent(Layout);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  const enlaces = marcados(fixture.nativeElement);
  expect(enlaces.some(t => t?.includes('Pedidos'))).toBe(true);
  expect(enlaces.some(t => t?.includes('Nueva venta'))).toBe(false);
});
