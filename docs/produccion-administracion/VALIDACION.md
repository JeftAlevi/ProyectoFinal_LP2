# Validación de la integración — 4 de noviembre de 2026

Base del repositorio de Merry: `cbb2edd`.

| Comprobación | Resultado |
|---|---|
| Backend: `ProduccionAdministracionTest` | 13 pruebas aprobadas, sin fallos ni errores |
| Frontend: suite completa con configuración serial | 21 pruebas aprobadas en 6 archivos |
| Compilación Angular de desarrollo | Aprobada |
| Suite backend completa (`mvnw test`) | Aprobada el 6 de noviembre de 2026. La prueba de Ventas `compraProduccionVentaIntegradas` ahora registra el pago antes de aprobar el pedido, como exige la regla del negocio |
| Compilación Angular de producción | Aprobada el 6 de noviembre de 2026. Se ajustó el presupuesto de estilos por componente en `angular.json` (aviso 6 kB, error 12 kB); el portal queda con un aviso, no con error |
| Oracle / Keycloak reales con esta versión | Login PKCE de cinco usuarios, permisos, CRUD institucional y producción completa verificados el 4 de noviembre de 2026; detalle en INTEGRACION_REAL.md |

## Casos cubiertos de tus módulos

- Dos fórmulas persisten los mismos artículos con cantidades independientes; se recargan desde la base y se comprueba la relación JPA.
- Dos roles comparten un permiso. Retirarlo elimina acceso al menú y a la API; devolverlo lo habilita. El inicializador no repone permisos revocados.
- ADMIN y los nombres de roles iniciales están protegidos. Un rol personalizado puede crearse, editarse, recibir varios permisos y eliminarse.
- CRUD completo de empresa, sucursal, almacén y tienda mediante la API, conservando sus relaciones.
- OPERARIO_PLANTA puede leer fórmulas, almacenes, artículos, stock y reportes; no puede escribir catálogos administrativos.
- Orden sin stock pasa a espera; con stock inicia, consume 60/40, registra 98 de terminado y 2 de merma y cierra sin duplicar lotes.
- Bloqueo de cierre con un insumo pendiente, bloqueo de cancelación tras consumir y bloqueo de reinicio de una cancelada.
- Validación de fórmula vacía, insumo duplicado, unidad incorrecta y artículo inactivo.
- Reporte filtrado por estado y rechazo de rango de fechas invertido.
- Pantallas: plan/cantidad/stock, instrucciones según estado, apertura automática del detalle, errores sin pérdida de datos y prevención de envío repetido accidental.
- Renovación de sesión rechazada: limpieza de credenciales y regreso al acceso conservando la ruta.

Las pruebas automáticas con H2 y JWT simulados son independientes de la prueba real descrita en `INTEGRACION_REAL.md`. Esta última sí utilizó Oracle 23 y Keycloak locales. Se conservaron las credenciales de desarrollo.

## Archivos externos a tus módulos

No se cambiaron fuentes de Ventas, Inventario, Compras, Personas, Artículos, el portal, configuración de base de datos, Docker ni las pruebas originales de Merry. Se añadió una prueba separada del backend y pruebas separadas del frontend. Los ajustes compartidos necesarios para autenticación son el manejo de una sesión que ya no puede renovarse y la ubicación correcta del descriptor del tema de login de Keycloak: de `login/resources/theme.properties` a `login/theme.properties`. Sin ese descriptor en su lugar, el formulario devolvía HTTP 500; después del cambio el login real funcionó.
