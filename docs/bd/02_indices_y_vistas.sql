-- =====================================================================
-- LOGÍSTICA DE MAÍZ - ÍNDICES Y VISTAS PROPUESTOS (Base de Datos 2)
-- Se ejecuta después de 01_esquema.sql. Esto NO existe todavía en la base:
-- es una propuesta de mejora sobre el esquema real.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. ÍNDICES
-- Oracle crea índice automático solo para PRIMARY KEY y UNIQUE, no para las
-- llaves foráneas. Estos índices aceleran los JOIN y las búsquedas más usadas.
-- ---------------------------------------------------------------------
-- Llaves foráneas
CREATE INDEX ix_almacen_sucursal ON almacen (sucursal_id);
CREATE INDEX ix_tienda_sucursal ON tienda (sucursal_id);
CREATE INDEX ix_sucursal_empresa ON sucursal (empresa_id);
CREATE INDEX ix_usuario_rol ON usuario (rol_id);
-- usuario.persona_id no necesita índice: ya lo tiene por la restricción uk_usuario_persona_id.
CREATE INDEX ix_auditoria_usuario ON auditoria (usuario_id);
CREATE INDEX ix_rol_permiso_permiso ON rol_permiso (permiso_id);
CREATE INDEX ix_articulo_categoria ON articulo (categoria_id);
CREATE INDEX ix_articulo_unidad ON articulo (unidad_medida_id);
CREATE INDEX ix_detalle_ordenes_orden ON detalle_ordenes (id_orden_compra);
CREATE INDEX ix_detalle_mov_movimiento ON detalle_movimiento (movimiento_id);
CREATE INDEX ix_detalle_mov_articulo ON detalle_movimiento (codigo_articulo);
CREATE INDEX ix_formula_detalle_articulo ON formula_detalle (codigo_articulo);
CREATE INDEX ix_orden_produccion_formula ON orden_produccion (formula_id);
CREATE INDEX ix_consumo_insumo_orden ON consumo_insumo (orden_produccion_id);
CREATE INDEX ix_producto_resultante_orden ON producto_resultante (orden_produccion_id);
CREATE INDEX ix_detalle_cot_cotizacion ON detalle_cotizacion_venta (cotizacion_id);
CREATE INDEX ix_detalle_pedido_pedido ON detalle_pedido (pedido_id);
CREATE INDEX ix_pago_pedido_pedido ON pago_pedido (pedido_id);

-- Búsquedas frecuentes (referencias entre módulos que no tienen llave foránea)
CREATE INDEX ix_lote_almacen_articulo ON lote (almacen_id, codigo_articulo, estado);
CREATE INDEX ix_movimiento_orden_compra ON movimiento_inventario (orden_compra_id);
CREATE INDEX ix_movimiento_pedido ON movimiento_inventario (pedido_venta_id);
CREATE INDEX ix_pedido_cliente ON pedido (cliente_id);
CREATE INDEX ix_pedido_estado_fecha ON pedido (estado, fecha);
CREATE INDEX ix_ordenes_compra_proveedor ON ordenes_compra (id_proveedor);

-- ---------------------------------------------------------------------
-- 2. VISTAS PARA REPORTES
-- ---------------------------------------------------------------------

-- Stock disponible por almacén y artículo (solo lotes DISPONIBLE)
CREATE OR REPLACE VIEW v_stock_por_almacen AS
SELECT a.id                       AS almacen_id,
       a.nombre                   AS almacen,
       ar.codigo                  AS codigo_articulo,
       ar.nombre                  AS articulo,
       um.codigo                  AS unidad,
       COUNT(l.id)                AS lotes,
       SUM(l.cantidad_disponible) AS cantidad_disponible
  FROM lote l
  JOIN almacen a        ON a.id = l.almacen_id
  JOIN articulo ar      ON ar.codigo = l.codigo_articulo
  JOIN unidad_medida um ON um.id = ar.unidad_medida_id
 WHERE l.estado = 'DISPONIBLE'
 GROUP BY a.id, a.nombre, ar.codigo, ar.nombre, um.codigo;

-- Ventas por cliente (pedidos despachados)
CREATE OR REPLACE VIEW v_ventas_por_cliente AS
SELECT c.id                        AS cliente_id,
       c.numero_documento,
       c.nombre_razon_social       AS cliente,
       COUNT(p.id)                 AS pedidos,
       SUM(p.total)                AS total_vendido,
       SUM(NVL(p.monto_pagado, 0)) AS total_pagado,
       MAX(p.fecha)                AS ultima_compra
  FROM pedido p
  JOIN personas c ON c.id = p.cliente_id
 WHERE p.estado = 'DESPACHADO'
 GROUP BY c.id, c.numero_documento, c.nombre_razon_social;

-- Compras por proveedor (sin órdenes anuladas)
CREATE OR REPLACE VIEW v_compras_por_proveedor AS
SELECT oc.id_proveedor               AS proveedor_id,
       oc.numero_documento_proveedor AS numero_documento,
       oc.nombre_proveedor           AS proveedor,
       COUNT(oc.id)                  AS ordenes,
       SUM(oc.total)                 AS total_comprado
  FROM ordenes_compra oc
 WHERE oc.estado <> 'ANULADA'
 GROUP BY oc.id_proveedor, oc.numero_documento_proveedor, oc.nombre_proveedor;

-- Rendimiento de producción: lo planificado frente a lo obtenido
CREATE OR REPLACE VIEW v_rendimiento_produccion AS
SELECT op.id                    AS orden_id,
       f.nombre                 AS formula,
       f.codigo_producto_terminado,
       op.estado,
       op.cantidad_planificada,
       op.cantidad_real,
       ROUND(op.cantidad_real / NULLIF(op.cantidad_planificada, 0) * 100, 2) AS rendimiento_pct,
       (SELECT NVL(SUM(pr.cantidad), 0) FROM producto_resultante pr
         WHERE pr.orden_produccion_id = op.id AND pr.tipo IN ('MERMA', 'DESPERDICIO')) AS merma,
       op.fecha_inicio,
       op.fecha_fin
  FROM orden_produccion op
  JOIN formula f ON f.id = op.formula_id;
