# Logística de Maíz — ERP de producción y comercialización

Proyecto integrador universitario (LP2, Unidad II). Es un sistema web para una molinera de maíz: compra materia prima, la recibe en almacén, la convierte en producto terminado y la vende.

- **Backend:** un solo proceso Spring Boot 4.0.7 con Java 21 y Maven (`backend/`). Está organizado por módulos (paquetes), no son microservicios.
- **Frontend:** Angular 22 (`frontend/`), con carpetas `core` (sesión y menú), `shared` (CRUD reutilizable) y `features` (pantallas del negocio).
- **Base de datos:** Oracle Free 23 en Docker, esquema `BOMERP`. Hibernate crea las tablas a partir de las entidades JPA.
- **Seguridad:** Keycloak 26 en Docker, con login Authorization Code + PKCE. El token se guarda solo en memoria.

---

## 1. Cómo levantar el proyecto

**Requisitos:** Docker Desktop, JDK 21 y Node compatible con Angular 22 (se desarrolló con Node 26.1 y npm 11.13). Maven no hace falta: el backend trae `mvnw.cmd`.

### Paso 1: Oracle y Keycloak

Abre Docker Desktop. En la raíz del proyecto ejecuta:

```cmd
INICIAR_ORACLE_KEYCLOAK.cmd
```

El script ejecuta `docker compose up -d` y espera hasta tres minutos a que respondan Oracle y Keycloak. También puedes hacerlo a mano:

```powershell
docker compose up -d
docker compose logs -f oracle
```

`Ctrl+C` solo cierra la vista del log; el contenedor sigue funcionando. Para revisar los servicios sin iniciarlos: `powershell -NoProfile -File comprobar-servicios.ps1`.

### Paso 2: backend (primera terminal)

```powershell
cd backend
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=demo"
```

Espera el mensaje `Started BomerpBackendApplication` (puerto 8080). Si la base está vacía, el perfil `demo` crea una empresa, una sucursal, tres almacenes (materias primas, productos terminados y uno general), los artículos `MAIZ-01`, `SOYA-01` y `PUR-001`, un proveedor, un cliente y la fórmula "Purina de engorde 60/40". **No crea stock**: el stock entra al recibir una compra en Inventario.

Atajo: `iniciar-backend.ps1`.

### Paso 3: frontend (segunda terminal)

```powershell
cd frontend
npm.cmd ci
npm.cmd start
```

Abre http://localhost:4200 y entra por **Acceso del personal**. Atajo: `iniciar-frontend.ps1`.

Si el puerto 8080 o el 4200 ya está ocupado, revisa primero si ya tienes una instancia del proyecto corriendo.

---

## 2. Usuarios de demostración

Realm de Keycloak: `maiz-erp`. Cliente SPA: `maiz-spa`. Audiencia de la API: `maiz-api`.

| Usuario | Contraseña | Rol |
|---|---|---|
| admin | Demo2026! | ADMIN |
| compras | Demo2026! | COMPRADOR |
| almacen | Demo2026! | ALMACENERO |
| produccion | Demo2026! | OPERARIO_PLANTA |
| ventas | Demo2026! | VENDEDOR |

Otros accesos locales (solo para desarrollo):

| Servicio | Dirección | Usuario / contraseña |
|---|---|---|
| Consola de Keycloak | http://localhost:8180 | `admin` / `keycloak_local_2026` (no es el `admin` del realm) |
| Oracle, usuario de la app | `localhost:1522`, servicio `FREEPDB1` | `bomerp` / `bomerp_local_2026` |
| Oracle, administrador | igual | `system` / `oracle_local_2026` |

Los roles se asignan en Keycloak. En Administración se elige qué módulos puede usar cada rol. Vincular un perfil institucional no crea cuentas en Keycloak.

La pantalla de login es el tema `maiz` de Keycloak (`infra/keycloak-themes/maiz/login`): `css/login.css` cambia la apariencia y `js/acceso.js` agrega el fondo animado y el saludo. El formulario y el flujo PKCE son los de Keycloak. Si cambias el tema y no lo ves, ejecuta `docker compose restart keycloak` (no borra usuarios).

Si el realm `maiz-erp` ya existía antes de agregar el tema de login: en la consola de Keycloak, entra al realm, ve a **Realm settings → Themes → Login theme**, elige `maiz` y guarda.

---

## 3. Módulos

| Módulo | Qué hace |
|---|---|
| **Administración** | Empresa → Sucursal → Almacén / Tienda. Roles y permisos por módulo (Rol ↔ Permiso es muchos a muchos). ADMIN tiene acceso completo fijo y es el único con acceso a Administración. Vincula personas con su usuario y `sub` de Keycloak. |
| **Personas** | Registro único de clientes y proveedores. Puede autocompletar DNI/RUC con API Perú (ver sección 6). |
| **Catálogo** | Artículos, unidades de medida y categorías. La unidad es obligatoria; la categoría es opcional. |
| **Compras** | Órdenes de compra con detalle. El precio sale del costo referencial del artículo. Una orden nace EMITIDA y se puede anular solo mientras siga EMITIDA. |
| **Inventario** | Recepción de compras con pesaje, humedad e impurezas. Si se acepta, se crean lotes y la compra pasa a RECIBIDA; si se rechaza, no entra stock. Muestra existencias por lote y almacén. Despacho de pedidos aprobados eligiendo lotes y cantidades exactas. |
| **Producción** | Fórmulas con insumos por unidad producida. Orden: planificar → iniciar (si falta stock queda EN_ESPERA) → registrar consumos reales → registrar terminado / merma / subproducto → cerrar. El cierre genera el lote una sola vez. Se puede cancelar solo si no tiene consumos. |
| **Ventas** | Cotizaciones (borrador → enviada → aceptada → pedido, una sola vez), pedidos con descuentos, pagos parciales, aprobación solo con pago completo, venta rápida de mostrador (cobra y despacha en un paso), anulación de pedidos no despachados y reversión de ventas despachadas (devuelve el stock). **La entrega es siempre en el mismo local; no se registra vehículo.** |
| **Portal** | Página pública con catálogo (sin costos ni stock) y formulario de contacto. Las solicitudes se ven en Ventas. |
| **Reportes** | Producción: consumo planificado contra real y desviación por insumo, con filtros y exportación CSV. Ventas: totales despachados, devueltos y por producto. |

### Recorrido sugerido para la demo

1. Entra como `admin` y revisa empresa, sucursal y almacenes.
2. Crea una orden de compra con 60 KG de `MAIZ-01` y 40 KG de `SOYA-01`.
3. En Inventario, registra la recepción en el almacén de materias primas y acéptala. Revisa los lotes.
4. En Producción, planifica 100 unidades de la fórmula 60/40, elige los almacenes e inicia la orden.
5. Registra los consumos (60 KG de maíz y 40 KG de soya), luego 98 KG de `PUR-001` como terminado y 2 KG como merma. Cierra la orden.
6. Revisa el reporte de producción y las existencias de `PUR-001`.
7. En Ventas, crea un pedido para el cliente, registra el pago completo y apruébalo. Despáchalo desde Inventario (entrega en el local).
8. Entra como `produccion` e intenta abrir Administración: debe aparecer acceso denegado.

---

## 4. Scripts SQL (`docs/bd/`)

| Archivo | Para qué sirve |
|---|---|
| `01_esquema.sql` | Esquema completo: 31 tablas, 22 llaves foráneas y 26 secuencias, ordenado por módulo y con nombres de restricción legibles. Sale del esquema real que crea Hibernate. Requiere Oracle 23 (usa `BOOLEAN`). |
| `02_indices_y_vistas.sql` | **Propuesta** (no existe todavía en la base): índices para llaves foráneas y búsquedas frecuentes, y 4 vistas de reporte (stock por almacén, ventas por cliente, compras por proveedor, rendimiento de producción). Se ejecuta después de `01`. |
| `probar_inicio.sql` / `probar_fin.sql` | Prueban `01` y `02` en un usuario temporal `PRUEBA_BD` y lo borran al terminar. No tocan `BOMERP`. |
| `extraer_esquema.sql` | Vuelve a extraer el DDL real de `BOMERP` con `DBMS_METADATA`. |
| `esquema_oracle.sql` | Resultado de `extraer_esquema.sql` (archivo generado, no se edita a mano). |

Otro script útil: `docs/produccion-administracion/verificar_relaciones.sql`, que busca códigos huérfanos o duplicados en una base existente antes de aplicar restricciones. Solo consulta; no borra nada.

**Probar los scripts** (PowerShell, desde `docs\bd`, con Oracle encendido):

```powershell
'probar_inicio.sql','01_esquema.sql','02_indices_y_vistas.sql','probar_fin.sql' | ForEach-Object { Get-Content $_ -Encoding UTF8 } | docker compose -f ..\..\compose.yml exec -T oracle sqlplus -s system/oracle_local_2026@FREEPDB1
```

Resultado esperado: ningún `ORA-`, 31 tablas, 4 vistas, 22 FK y "Objetos con error: 0". Las 29 secuencias que aparecen son las 26 del script más 3 internas de Oracle para las columnas `IDENTITY`. El aviso `SP2-0734` de la primera línea es inofensivo: lo causa la marca BOM del archivo.

**Extraer el esquema real** (desde la raíz):

```powershell
Get-Content .\docs\bd\extraer_esquema.sql | docker compose exec -T oracle sqlplus -s bomerp/bomerp_local_2026@FREEPDB1
docker compose cp oracle:/tmp/esquema_oracle.sql .\docs\bd\esquema_oracle.sql
```

---

## 5. Pruebas

```powershell
cd backend;  .\mvnw.cmd test                 # 36 pruebas (H2 en modo Oracle y JWT simulados)
cd frontend; npx ng test --watch=false       # 22 pruebas
cd frontend; npx ng build                    # build de producción
```

- `IntegracionTest`: flujo compra → recepción → producción → venta, y reglas de Compras, Inventario y Ventas (anulación, recepción de compras con varios artículos —un lote por línea—, pagos parciales, reversión, entrega local).
- `ProduccionAdministracionTest`: fórmulas, órdenes de producción, roles, permisos y CRUD institucional.

Las pruebas automáticas no reemplazan la prueba con Oracle y Keycloak reales. Esa prueba se hizo el 4 de noviembre de 2026 (login PKCE de los cinco usuarios, permisos, CRUD institucional, producción completa y renovación de token) y está detallada en `docs/produccion-administracion/INTEGRACION_REAL.md`, con capturas en `docs/produccion-administracion/evidencias/`.

El build de producción muestra un aviso (no un error) porque los estilos de `portal.ts` pesan unos 10 kB y el límite de aviso es 6 kB.

---

## 6. Consulta de DNI/RUC (opcional)

El formulario de Personas consulta API Perú al salir del campo documento (8 dígitos para DNI, 11 para RUC) y completa nombre y dirección. Para activarlo, coloca tu token en `backend/application-local.yml` (`consulta-documento.token`), que está excluido de Git, o define la variable de entorno `API_PERU_TOKEN`, que tiene prioridad. El token se queda en el backend y nunca llega al navegador. Sin token se puede registrar a mano. Planes y límites: https://docs.apiperu.pe/

---

## 7. Pendientes conocidos

- Recepción solo completa (sin entregas parciales). Las cantidades de compra son números enteros. Una compra que mezcla tipos de artículo (por ejemplo materia prima y producto terminado) se recibe en un almacén de tipo General.
- No hay facturación electrónica ni módulo de finanzas; los pedidos guardan importes y pagos.
- Todo está en un solo esquema `BOMERP`; falta coordinar con BD2 si se requieren esquemas separados.
- Los límites entre módulos con Spring Modulith están abiertos para integrar el código heredado; falta afinarlos.
- Algunos endpoints devuelven la entidad JPA directamente en lugar de un DTO (pedidos, cotizaciones, almacenes, lotes, movimientos).
- El trabajo se preparó con ayuda de IA: cada integrante debe revisar y saber explicar su parte antes de la sustentación.

## 8. Procedencia

El proyecto une tres entregas: `bomerp-modules.zip` (Administración y Producción), `diego-standalone.zip` (Inventario y Artículos) y `logistica-maiz-u2.zip` (Compras, Personas y la base del frontend). Ventas y Portal se agregaron durante la integración. Las guías anteriores (`LEEME_PRIMERO.md`, `LEEME_MIS_MODULOS.md`, `lp2-demo.md`, `inventario-diego.md` y las de cada entrega en `origen/`) se guardaron en `docs/historico/`. Son históricas: algunas instrucciones ya no aplican, y este README las reemplaza.
