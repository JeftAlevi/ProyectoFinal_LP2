# Producción y Administración institucional / roles

Integración sobre `merry-ali/erp-backend`, base `cbb2edd` (4 de noviembre de 2026).

## Alcance

Cambios en los paquetes de Producción y Administración y sus pantallas. Se conserva el trabajo de Merry en Ventas, Inventario, Compras, Personas y el portal. Los ajustes compartidos de ejecución son el manejo de sesión vencida en `core/auth/auth.ts` y la ubicación correcta del descriptor del tema de login de Keycloak, que antes producía HTTP 500 al abrir el formulario.

## Ejecutar desde CMD

Abre Docker Desktop. En la raíz del proyecto ejecuta `INICIAR_ORACLE_KEYCLOAK.cmd`. El iniciador ejecuta Docker Compose y espera hasta tres minutos a que respondan Oracle y el realm/certificados de Keycloak. Si no responden, muestra cómo consultar sus logs. No borres los volúmenes de tu base existente.

También puedes repetir el diagnóstico sin iniciar contenedores mediante `powershell -NoProfile -File comprobar-servicios.ps1`. Que los puertos respondan es el primer paso: después debe verificarse la conexión JDBC del backend y el login real.

Primera ventana CMD, desde la raíz:

```cmd
cd backend
mvn spring-boot:run "-Dspring-boot.run.profiles=demo"
```

Espera `Tomcat started on port 8080` y `Started BomerpBackendApplication`.

Segunda ventana CMD, desde la raíz:

```cmd
cd frontend
npm.cmd ci
npm.cmd start
```

Abre `http://localhost:4200`. Conserva abiertas ambas ventanas. Si 8080 o 4200 ya está ocupado, comprueba primero si esa instancia del proyecto ya está funcionando; no inicies otra ni cambies el puerto.

Accesos locales de demostración: `admin` y `produccion`, contraseña `Demo2026!`. Keycloak usa el realm `maiz-erp`. Estas cuentas deben existir en el realm importado; no son las credenciales de administración del servidor Keycloak.

## Producción: uso paso a paso

1. Entra como `admin` u `OPERARIO_PLANTA` y abre Producción.
2. Crea una fórmula. Selecciona un producto terminado y agrega insumos. La cantidad de cada línea es **por unidad producida**: 0.6 KG de maíz y 0.4 KG de soya significan 6 KG y 4 KG al planificar 10 unidades.
3. En Producción selecciona fórmula, cantidad y almacenes. La pantalla compara lo necesario con las existencias actuales. Planificar no descuenta stock.
4. Pulsa **Planificar nueva orden**. Se abre el detalle de la orden creada.
5. Pulsa **Iniciar** en esa orden. Si falta stock queda EN_ESPERA. Solicita abastecimiento mediante Compras/Inventario y vuelve a iniciar **la misma orden**.
6. En EN_PROCESO registra los consumos reales uno por uno. Cada registro descuenta stock. La cantidad se limpia después del éxito para prevenir una repetición accidental.
7. Registra TERMINADO y, si corresponde, MERMA/SUBPRODUCTO/etc. El artículo de TERMINADO debe coincidir con el producto de la fórmula.
8. Cierra la orden. Se exige consumo de todos los insumos y al menos un resultado terminado. Se genera el lote de terminado/subproducto una sola vez.
9. Revisa Inventario y el Reporte de producción. El reporte y su CSV conservan los endpoints originales.

Una orden sin consumos se puede cancelar. Después de consumir o cerrar no se permite cancelarla; tampoco se puede reiniciar una cancelada ni cerrar dos veces.

## Administración y permisos

1. Entra como `admin`. Organiza Empresa → Sucursal → Almacén/Tienda desde los catálogos institucionales.
2. En **Permisos por rol**, selecciona un rol, marca sus módulos y guarda. Un permiso retirado se deja de autorizar en la próxima consulta al servidor, incluso si la página de otro usuario todavía tiene un menú anterior en memoria.
3. **ADMIN tiene acceso completo fijo** y Administración está reservado a ADMIN. La interfaz y la API impiden configuraciones que aparenten limitar o transferir ese acceso.
4. Los nombres de roles nuevos deben usar mayúsculas, números y guion bajo, empezando por una letra. Deben coincidir exactamente con Keycloak. Los roles iniciales están protegidos de eliminación y cambio de nombre para no romper los accesos existentes.
5. Para un rol nuevo, créalo también en Keycloak y asígnalo a su cuenta. El ERP no usa la API administrativa de Keycloak ni crea cuentas automáticamente.
6. **Vincular perfil institucional** relaciona una persona con su username, rol de negocio y `sub` de Keycloak. No crea credenciales ni cambia sus roles de identidad. El `sub` no es una contraseña.

## Muchos a muchos: dónde verlo

### Rol ↔ Permiso

`administracion/model/Rol.java` utiliza `@ManyToMany` y `rol_permiso`. Un rol puede tener varios permisos y un permiso puede pertenecer a varios roles. En Administración despliega **Ver qué roles utilizan cada permiso**. ADMIN se muestra como acceso global; para los demás roles la lista procede de las asociaciones persistidas.

### Fórmula ↔ Artículo/insumo

`produccion/model/Formula.java` tiene una colección `insumos` con `@ManyToMany` sobre `formula_detalle`. Esa colección es una **vista de consulta inmutable**; las filas se crean mediante `FormulaDetalle` porque contienen cantidad y unidad. No se duplican vínculos en una segunda tabla.

`FormulaDetalle.articulo` es una relación `@ManyToOne` que utiliza el código único de Artículo con clave foránea. La combinación fórmula/artículo es única. El formulario conserva `codigoArticulo` para ser compatible con las pantallas y contratos existentes.

En **Fórmulas e insumos compartidos**, abre dos fórmulas que contengan el mismo artículo: verás que cada una conserva su propia cantidad por unidad. La prueba `dosFormulasCompartenArticulosConCantidadesIndependientes` vuelve a leer ambos vínculos desde la base.

## Comprobaciones reproducibles

Desde `backend`:

```cmd
mvn -Dtest=ProduccionAdministracionTest test
```

Desde `frontend`:

```cmd
npm.cmd test -- --watch=false --runner-config=vitest.modulos.config.mts
npm.cmd run build -- --configuration development
```

Las pruebas de backend usan H2 con modo Oracle y JWT simulados; las de frontend usan HttpTestingController y componentes Angular. Además, el 4 de noviembre se ejecutó la integración real de esta versión con Oracle 23 y Keycloak: cinco usuarios, revocación/restauración de permisos, CRUD institucional, dos fórmulas con insumos compartidos y una orden completa con compra/recepción/consumos/cierre. Consulta `docs/produccion-administracion/INTEGRACION_REAL.md` y sus evidencias para el alcance exacto.

## Hallazgos ajenos a estos cambios

Se reprodujeron en una copia intacta del commit original:

- `IntegracionTest.compraProduccionVentaIntegradas` falla porque el flujo nuevo de Ventas exige pago completo antes de aprobar, pero la prueba heredada no lo registra.
- `npm run build` (producción) falla por el límite de 8 KB de estilos del portal; ese componente genera aproximadamente 10.43 KB. La compilación de desarrollo sí pasa. No se modificó el portal ni se aumentaron sus presupuestos para ocultar el fallo.

Estos hallazgos se mantienen fuera del alcance solicitado. No debe afirmarse que la suite global del equipo pasa al 100 %.

Para una base existente, ejecuta primero las consultas de `docs/produccion-administracion/verificar_relaciones.sql`. Si hay códigos huérfanos o duplicados, corrige los datos con el equipo antes de aplicar restricciones; no se incluyen borrados ni conversiones destructivas.
