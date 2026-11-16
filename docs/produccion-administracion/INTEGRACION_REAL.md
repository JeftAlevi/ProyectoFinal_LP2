# Prueba real con Oracle y Keycloak — 4 de noviembre de 2026

## Entorno

- Oracle Database 23, `jdbc:oracle:thin:@localhost:1522/FREEPDB1`, esquema `BOMERP`.
- Keycloak en `localhost:8180`, realm `maiz-erp`, cliente público `maiz-spa`, audiencia `maiz-api`.
- Backend de esta rama en `localhost:8080`; Angular de esta misma copia en `localhost:4200`.
- No se sustituyeron JWT por tokens simulados ni Oracle por H2 para esta prueba.

## Corrección encontrada durante la integración

El formulario de Keycloak devolvía HTTP 500. El tema `maiz` tenía su descriptor en `login/resources/theme.properties`. Se movió a `login/theme.properties`, conservando su contenido, mensajes y CSS. Después del cambio se comprobó el login PKCE por HTTP y desde la pantalla de Angular.

## Comprobaciones terminadas

1. `admin`, `produccion`, `compras`, `almacen` y `ventas` iniciaron sesión con Authorization Code + PKCE. El backend aceptó sus JWT reales de Keycloak.
2. OPERARIO_PLANTA accedió a Producción y recibió 403 en Administración. Los demás roles no administrativos recibieron 403 en ambos módulos salvo su acceso correspondiente; ADMIN accedió a ambos.
3. Se retiraron temporalmente los permisos de OPERARIO_PLANTA: `/api/sesion` devolvió módulos vacíos y Producción devolvió 403. Se restauraron exactamente los permisos originales y el acceso volvió a funcionar.
4. Un rol temporal compartió PRODUCCIÓN con OPERARIO_PLANTA y tuvo además COMPRAS. Se eliminó el rol temporal y se conservaron los permisos.
5. Se crearon y editaron empresa, sucursal, almacén y tienda temporales. Borrar la empresa con dependencias devolvió 409. Después se eliminaron los registros temporales de hijos a padres y se verificó su ausencia.
6. Se crearon dos fórmulas: 60/40 y 50/50, ambas con MAIZ-01 y SOYA-01 y cantidades independientes.
7. Una orden de 10 unidades pasó a EN_ESPERA sin stock. Una compra y su recepción aportaron 6 KG de maíz y 4 KG de soya en un almacén exclusivo de pruebas.
8. Se rechazó consumir 7 KG de maíz cuando solo había 6 KG. Una consulta posterior confirmó que el intento fallido no descontó stock.
9. Se registraron 6 KG de maíz, 9 KG terminados y 1 KG de merma. Se bloqueó el cierre porque aún faltaba la soya; no apareció stock terminado por ese cierre fallido.
10. Tras consumir los 4 KG de soya, la orden cerró y generó exactamente 9 KG de PUR-001. Se rechazó el segundo cierre y las existencias continuaron en 9 KG.
11. Otra orden se canceló sin consumos y su reinicio fue rechazado.
12. El reporte y el CSV mostraron 6/4 KG planificados y reales, desviación cero y 9 KG producidos.
13. JDBC confirmó en Oracle que las dos fórmulas comparten MAIZ-01, que la clave foránea de FORMULA_DETALLE a ARTICULO está habilitada y que existe la restricción única UK_FORMULA_ARTICULO.
14. Se esperó la expiración real del token y la tolerancia de reloj del backend: el token vencido recibió 401. Keycloak aceptó el refresh token, emitió un token nuevo y `/api/sesion` respondió 200. No se modificaron tiempos de expiración ni se deshabilitó la verificación de JWT.

## Datos que permanecen como evidencia

Los registros administrativos temporales y el rol temporal se eliminaron. Se conservaron las dos fórmulas QA, los dos almacenes QA, la compra/recepción y las órdenes de prueba para trazabilidad y demostración. Los identificadores exactos y el resultado de la renovación de sesión están en `evidencias/integracion-real.json`.

## Evidencias

- `roles-keycloak-oracle.png`: pantalla de permisos con datos de Oracle.
- `produccion-oracle-muchos-a-muchos.png`: orden cerrada y fórmulas que comparten insumos.
- `reporte-oracle-real.png` y `reporte-oracle-real.csv`: cantidades verificadas.
- `integracion-real.json`: resultados sin contraseñas, códigos de autorización ni tokens.
- `oracle-relaciones.txt`: resultado de las consultas JDBC.

Los dos problemas heredados ajenos al alcance (prueba de Ventas sin pago y presupuesto de estilos del portal para build de producción) siguen documentados en VALIDACION.md.
