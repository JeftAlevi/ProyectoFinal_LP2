import {TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {expect,it,vi} from 'vitest';
import {Auth} from './auth';

it('una renovación rechazada limpia la sesión y conserva la página para volver a ingresar',async()=>{
 TestBed.configureTestingModule({providers:[provideHttpClient()]});
 const auth=TestBed.inject(Auth);auth.token.set('expired-access');auth.perfil.set({sub:'',roles:['ADMIN'],modulos:[]});
 (auth as unknown as {refreshToken:string}).refreshToken='expired-refresh';
 const login=vi.spyOn(auth,'login').mockResolvedValue();
 const request=vi.spyOn(globalThis,'fetch').mockResolvedValue({ok:false} as Response);
 try {
  await expect(auth.refrescar()).rejects.toThrow('La sesión finalizó');
  expect(auth.token()).toBe('');expect(auth.perfil()).toBeNull();
  expect(login).toHaveBeenCalledExactlyOnceWith(location.pathname+location.search);
 } finally { request.mockRestore(); }
});
