-- =====================================================================
-- LOGÍSTICA DE MAÍZ - ESQUEMA DE BASE DE DATOS (Oracle 23ai / Oracle Free 23)
-- Generado a partir del esquema real BOMERP (creado por Hibernate desde las
-- entidades JPA del backend). Extraído con DBMS_METADATA el 6 de noviembre de 2026.
-- Cambios respecto al original solo de presentación: tablas ordenadas por módulo,
-- nombres de restricción legibles (pk_, uk_, ck_, fk_) en lugar de los generados.
-- Requiere Oracle 23ai o superior: usa el tipo BOOLEAN.
-- Contenido: 31 tablas, 22 llaves foráneas, 26 secuencias.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. SECUENCIAS (Hibernate las usa para generar los ID)
-- ---------------------------------------------------------------------
CREATE SEQUENCE almacen_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE articulo_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE auditoria_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE catalogo_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE categoria_seq START WITH 1 INCREMENT BY 50;
CREATE SEQUENCE consumo_insumo_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE cotizacion_venta_seq START WITH 1 INCREMENT BY 50;
CREATE SEQUENCE detalle_cotizacion_venta_seq START WITH 1 INCREMENT BY 50;
CREATE SEQUENCE detalle_movimiento_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE detalle_pedido_seq START WITH 1 INCREMENT BY 50;
CREATE SEQUENCE empresa_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE formula_detalle_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE formula_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE lote_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE movimiento_inventario_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE orden_produccion_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE pago_pedido_seq START WITH 1 INCREMENT BY 50;
CREATE SEQUENCE pedido_seq START WITH 1 INCREMENT BY 50;
CREATE SEQUENCE permiso_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE producto_resultante_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE rol_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE solicitud_contacto_seq START WITH 1 INCREMENT BY 50;
CREATE SEQUENCE sucursal_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE tienda_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE unidad_medida_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE usuario_seq START WITH 1 INCREMENT BY 1;

-- ---------------------------------------------------------------------
-- 2. MÓDULO ADMINISTRACION: Empresa, sedes, almacenes, seguridad y auditoría
-- ---------------------------------------------------------------------
CREATE TABLE empresa (
    id NUMBER(19,0) NOT NULL,
    activo BOOLEAN NOT NULL,
    nombre_comercial VARCHAR2(200 CHAR),
    razon_social VARCHAR2(200 CHAR) NOT NULL,
    ruc VARCHAR2(20 CHAR) NOT NULL,
    CONSTRAINT pk_empresa PRIMARY KEY (id),
    CONSTRAINT uk_empresa_ruc UNIQUE (ruc)
);

CREATE TABLE sucursal (
    id NUMBER(19,0) NOT NULL,
    activo BOOLEAN NOT NULL,
    direccion VARCHAR2(250 CHAR),
    nombre VARCHAR2(150 CHAR) NOT NULL,
    empresa_id NUMBER(19,0) NOT NULL,
    CONSTRAINT pk_sucursal PRIMARY KEY (id)
);

CREATE TABLE almacen (
    id NUMBER(19,0) NOT NULL,
    activo BOOLEAN NOT NULL,
    nombre VARCHAR2(150 CHAR) NOT NULL,
    tipo VARCHAR2(30 CHAR) NOT NULL,
    sucursal_id NUMBER(19,0) NOT NULL,
    CONSTRAINT ck_almacen_tipo CHECK (tipo IN ('MATERIA_PRIMA','PRODUCTO_TERMINADO','INSUMOS','EMPAQUE','GENERAL')),
    CONSTRAINT pk_almacen PRIMARY KEY (id)
);

CREATE TABLE tienda (
    id NUMBER(19,0) NOT NULL,
    activo BOOLEAN NOT NULL,
    nombre VARCHAR2(150 CHAR) NOT NULL,
    sucursal_id NUMBER(19,0) NOT NULL,
    CONSTRAINT pk_tienda PRIMARY KEY (id)
);

CREATE TABLE rol (
    id NUMBER(19,0) NOT NULL,
    activo BOOLEAN NOT NULL,
    descripcion VARCHAR2(250 CHAR),
    nombre VARCHAR2(80 CHAR) NOT NULL,
    CONSTRAINT pk_rol PRIMARY KEY (id),
    CONSTRAINT uk_rol_nombre UNIQUE (nombre)
);

CREATE TABLE permiso (
    id NUMBER(19,0) NOT NULL,
    descripcion VARCHAR2(250 CHAR),
    modulo VARCHAR2(30 CHAR) NOT NULL,
    nombre VARCHAR2(80 CHAR) NOT NULL,
    CONSTRAINT ck_permiso_modulo CHECK (modulo IN ('COMPRAS','INVENTARIO','PRODUCCION','VENTAS','FINANZAS','ADMINISTRACION')),
    CONSTRAINT pk_permiso PRIMARY KEY (id),
    CONSTRAINT uk_permiso_nombre UNIQUE (nombre)
);

CREATE TABLE rol_permiso (
    rol_id NUMBER(19,0) NOT NULL,
    permiso_id NUMBER(19,0) NOT NULL,
    CONSTRAINT pk_rol_permiso PRIMARY KEY (rol_id, permiso_id)
);

CREATE TABLE usuario (
    id NUMBER(19,0) NOT NULL,
    activo BOOLEAN NOT NULL,
    keycloak_sub VARCHAR2(255 CHAR),
    password_hash VARCHAR2(255 CHAR),
    username VARCHAR2(60 CHAR) NOT NULL,
    persona_id NUMBER(19,0) NOT NULL,
    rol_id NUMBER(19,0) NOT NULL,
    CONSTRAINT pk_usuario PRIMARY KEY (id),
    CONSTRAINT uk_usuario_keycloak_sub UNIQUE (keycloak_sub),
    CONSTRAINT uk_usuario_username UNIQUE (username),
    CONSTRAINT uk_usuario_persona_id UNIQUE (persona_id)
);

CREATE TABLE auditoria (
    id NUMBER(19,0) NOT NULL,
    accion VARCHAR2(30 CHAR) NOT NULL,
    detalle VARCHAR2(1000 CHAR),
    entidad VARCHAR2(100 CHAR) NOT NULL,
    fecha TIMESTAMP (9) NOT NULL,
    modulo VARCHAR2(30 CHAR) NOT NULL,
    usuario_id NUMBER(19,0) NOT NULL,
    CONSTRAINT ck_auditoria_modulo CHECK (modulo IN ('COMPRAS','INVENTARIO','PRODUCCION','VENTAS','FINANZAS','ADMINISTRACION')),
    CONSTRAINT pk_auditoria PRIMARY KEY (id)
);

CREATE TABLE catalogo_compartido (
    id NUMBER(19,0) NOT NULL,
    activo BOOLEAN NOT NULL,
    codigo VARCHAR2(30 CHAR) NOT NULL,
    descripcion VARCHAR2(150 CHAR) NOT NULL,
    tipo VARCHAR2(50 CHAR) NOT NULL,
    CONSTRAINT pk_catalogo_compartido PRIMARY KEY (id),
    CONSTRAINT uk_catalogo_compartido_tipo_codigo UNIQUE (tipo, codigo)
);


-- ---------------------------------------------------------------------
-- 3. MÓDULO PERSONAS: Clientes y proveedores
-- ---------------------------------------------------------------------
CREATE TABLE personas (
    id NUMBER(19,0) GENERATED BY DEFAULT AS IDENTITY NOT NULL,
    activo BOOLEAN NOT NULL,
    direccion VARCHAR2(200 CHAR),
    email VARCHAR2(120 CHAR),
    nombre_razon_social VARCHAR2(150 CHAR) NOT NULL,
    numero_documento VARCHAR2(20 CHAR) NOT NULL,
    telefono VARCHAR2(20 CHAR),
    tipo_documento VARCHAR2(20 CHAR) NOT NULL,
    CONSTRAINT ck_personas_tipo_documento CHECK (tipo_documento IN ('DNI','RUC','CE','PASAPORTE')),
    CONSTRAINT pk_personas PRIMARY KEY (id),
    CONSTRAINT uk_personas_numero_documento UNIQUE (numero_documento)
);

CREATE TABLE persona_roles (
    id_persona NUMBER(19,0) NOT NULL,
    rol VARCHAR2(20 CHAR) NOT NULL,
    CONSTRAINT ck_persona_roles_rol CHECK (rol IN ('CLIENTE','PROVEEDOR')),
    CONSTRAINT pk_persona_roles PRIMARY KEY (id_persona, rol)
);


-- ---------------------------------------------------------------------
-- 4. MÓDULO ARTICULOS: Catálogo de artículos
-- ---------------------------------------------------------------------
CREATE TABLE unidad_medida (
    id NUMBER(19,0) NOT NULL,
    activo BOOLEAN NOT NULL,
    codigo VARCHAR2(10 CHAR) NOT NULL,
    nombre VARCHAR2(50 CHAR) NOT NULL,
    simbolo VARCHAR2(10 CHAR),
    CONSTRAINT pk_unidad_medida PRIMARY KEY (id),
    CONSTRAINT uk_unidad_medida_codigo UNIQUE (codigo)
);

CREATE TABLE categoria (
    id NUMBER(19,0) NOT NULL,
    activo BOOLEAN NOT NULL,
    nombre VARCHAR2(255 CHAR) NOT NULL,
    CONSTRAINT pk_categoria PRIMARY KEY (id),
    CONSTRAINT uk_categoria_nombre UNIQUE (nombre)
);

CREATE TABLE articulo (
    id NUMBER(19,0) NOT NULL,
    activo BOOLEAN NOT NULL,
    codigo VARCHAR2(30 CHAR) NOT NULL,
    costo_referencial NUMBER(12,4),
    descripcion VARCHAR2(500 CHAR),
    imagen_url VARCHAR2(300 CHAR),
    nombre VARCHAR2(150 CHAR) NOT NULL,
    precio_venta NUMBER(14,4),
    tipo_articulo VARCHAR2(20 CHAR) NOT NULL,
    categoria_id NUMBER(19,0),
    unidad_medida_id NUMBER(19,0) NOT NULL,
    CONSTRAINT ck_articulo_tipo_articulo CHECK (tipo_articulo IN ('MATERIA_PRIMA','INSUMO','EMPAQUE','PRODUCTO_TERMINADO','SUBPRODUCTO')),
    CONSTRAINT pk_articulo PRIMARY KEY (id),
    CONSTRAINT uk_articulo_codigo UNIQUE (codigo)
);


-- ---------------------------------------------------------------------
-- 5. MÓDULO COMPRAS: Órdenes de compra
-- ---------------------------------------------------------------------
CREATE TABLE ordenes_compra (
    id NUMBER(19,0) GENERATED BY DEFAULT AS IDENTITY NOT NULL,
    condiciones_pactadas VARCHAR2(255 CHAR),
    estado VARCHAR2(20 CHAR) NOT NULL,
    fecha TIMESTAMP (9) NOT NULL,
    nombre_proveedor VARCHAR2(150 CHAR) NOT NULL,
    numero_documento_proveedor VARCHAR2(20 CHAR) NOT NULL,
    operador_id VARCHAR2(36 CHAR),
    id_proveedor NUMBER(19,0) NOT NULL,
    total NUMBER(12,2) NOT NULL,
    CONSTRAINT ck_ordenes_compra_estado CHECK (estado IN ('EMITIDA','RECIBIDA','ANULADA')),
    CONSTRAINT pk_ordenes_compra PRIMARY KEY (id)
);

CREATE TABLE detalle_ordenes (
    id NUMBER(19,0) GENERATED BY DEFAULT AS IDENTITY NOT NULL,
    id_articulo NUMBER(19,0) NOT NULL,
    cantidad NUMBER(10,0) NOT NULL,
    descripcion_articulo VARCHAR2(200 CHAR) NOT NULL,
    precio_unitario NUMBER(10,2) NOT NULL,
    subtotal NUMBER(12,2) NOT NULL,
    id_orden_compra NUMBER(19,0) NOT NULL,
    CONSTRAINT pk_detalle_ordenes PRIMARY KEY (id)
);


-- ---------------------------------------------------------------------
-- 6. MÓDULO INVENTARIO: Movimientos, recepciones, despachos y lotes
-- ---------------------------------------------------------------------
CREATE TABLE movimiento_inventario (
    id NUMBER(19,0) NOT NULL,
    aceptado BOOLEAN,
    almacen_id NUMBER(19,0) NOT NULL,
    estado VARCHAR2(15 CHAR) NOT NULL,
    fecha_confirmacion TIMESTAMP (9),
    fecha_registro TIMESTAMP (9) NOT NULL,
    humedad_pct NUMBER(5,2),
    impureza_pct NUMBER(5,2),
    observaciones VARCHAR2(300 CHAR),
    orden_compra_id NUMBER(19,0),
    pedido_venta_id NUMBER(19,0),
    pesaje_kg NUMBER(12,4),
    revision NUMBER(19,0),
    tipo_entrega VARCHAR2(20 CHAR),
    tipo_movimiento VARCHAR2(15 CHAR) NOT NULL,
    vehiculo_placa VARCHAR2(15 CHAR),
    CONSTRAINT ck_movimiento_inventario_estado CHECK (estado IN ('BORRADOR','CONFIRMADO','ANULADO')),
    CONSTRAINT ck_movimiento_inventario_tipo_movimiento CHECK (tipo_movimiento IN ('RECEPCION','DESPACHO','DEVOLUCION')),
    CONSTRAINT pk_movimiento_inventario PRIMARY KEY (id)
);

CREATE TABLE detalle_movimiento (
    id NUMBER(19,0) NOT NULL,
    cantidad NUMBER(12,4) NOT NULL,
    codigo_articulo VARCHAR2(30 CHAR) NOT NULL,
    lote_id NUMBER(19,0),
    unidad_medida VARCHAR2(15 CHAR) NOT NULL,
    movimiento_id NUMBER(19,0) NOT NULL,
    CONSTRAINT pk_detalle_movimiento PRIMARY KEY (id)
);

CREATE TABLE lote (
    id NUMBER(19,0) NOT NULL,
    almacen_id NUMBER(19,0) NOT NULL,
    cantidad_disponible NUMBER(12,4) NOT NULL,
    cantidad_inicial NUMBER(12,4) NOT NULL,
    codigo_articulo VARCHAR2(30 CHAR) NOT NULL,
    estado VARCHAR2(15 CHAR) NOT NULL,
    fecha_ingreso TIMESTAMP (9) NOT NULL,
    movimiento_origen_id NUMBER(19,0),
    revision NUMBER(19,0),
    CONSTRAINT ck_lote_estado CHECK (estado IN ('DISPONIBLE','AGOTADO','BLOQUEADO')),
    CONSTRAINT pk_lote PRIMARY KEY (id)
);


-- ---------------------------------------------------------------------
-- 7. MÓDULO PRODUCCION: Fórmulas y órdenes de producción
-- ---------------------------------------------------------------------
CREATE TABLE formula (
    id NUMBER(19,0) NOT NULL,
    activo BOOLEAN NOT NULL,
    codigo_producto_terminado VARCHAR2(30 CHAR) NOT NULL,
    nombre VARCHAR2(150 CHAR) NOT NULL,
    version NUMBER(10,0) NOT NULL,
    CONSTRAINT ck_formula_version CHECK (version>=1),
    CONSTRAINT pk_formula PRIMARY KEY (id)
);

CREATE TABLE formula_detalle (
    id NUMBER(19,0) NOT NULL,
    cantidad_por_unidad NUMBER(12,4) NOT NULL,
    codigo_articulo VARCHAR2(30 CHAR) NOT NULL,
    unidad_medida VARCHAR2(15 CHAR) NOT NULL,
    formula_id NUMBER(19,0) NOT NULL,
    CONSTRAINT pk_formula_detalle PRIMARY KEY (id),
    CONSTRAINT uk_formula_articulo UNIQUE (formula_id, codigo_articulo)
);

CREATE TABLE orden_produccion (
    id NUMBER(19,0) NOT NULL,
    almacen_destino_id NUMBER(19,0) NOT NULL,
    almacen_origen_id NUMBER(19,0) NOT NULL,
    cantidad_planificada NUMBER(12,4) NOT NULL,
    cantidad_real NUMBER(12,4),
    estado VARCHAR2(20 CHAR) NOT NULL,
    fecha_fin TIMESTAMP (9),
    fecha_inicio TIMESTAMP (9),
    fecha_planificada TIMESTAMP (9) NOT NULL,
    revision NUMBER(19,0),
    formula_id NUMBER(19,0) NOT NULL,
    CONSTRAINT ck_orden_produccion_estado CHECK (estado IN ('PLANIFICADA','EN_ESPERA','EN_PROCESO','CERRADA','CANCELADA')),
    CONSTRAINT pk_orden_produccion PRIMARY KEY (id)
);

CREATE TABLE consumo_insumo (
    id NUMBER(19,0) NOT NULL,
    cantidad_consumida NUMBER(12,4) NOT NULL,
    codigo_articulo VARCHAR2(30 CHAR) NOT NULL,
    lote_id NUMBER(19,0),
    unidad_medida VARCHAR2(15 CHAR) NOT NULL,
    orden_produccion_id NUMBER(19,0) NOT NULL,
    CONSTRAINT pk_consumo_insumo PRIMARY KEY (id)
);

CREATE TABLE producto_resultante (
    id NUMBER(19,0) NOT NULL,
    cantidad NUMBER(12,4) NOT NULL,
    codigo_articulo VARCHAR2(30 CHAR) NOT NULL,
    lote_generado_id NUMBER(19,0),
    tipo VARCHAR2(20 CHAR) NOT NULL,
    unidad_medida VARCHAR2(15 CHAR) NOT NULL,
    orden_produccion_id NUMBER(19,0) NOT NULL,
    CONSTRAINT ck_producto_resultante_tipo CHECK (tipo IN ('TERMINADO','SUBPRODUCTO','MERMA','DESPERDICIO','REPROCESO')),
    CONSTRAINT pk_producto_resultante PRIMARY KEY (id)
);


-- ---------------------------------------------------------------------
-- 8. MÓDULO VENTAS: Cotizaciones, pedidos y pagos
-- ---------------------------------------------------------------------
CREATE TABLE cotizacion_venta (
    id NUMBER(19,0) NOT NULL,
    cliente_id NUMBER(19,0) NOT NULL,
    estado VARCHAR2(20 CHAR) NOT NULL,
    fecha TIMESTAMP (9) NOT NULL,
    forma_pago VARCHAR2(30 CHAR),
    moneda VARCHAR2(3 CHAR) NOT NULL,
    pedido_venta_id NUMBER(19,0),
    plazo_pago VARCHAR2(30 CHAR),
    revision NUMBER(19,0),
    total NUMBER(14,2) NOT NULL,
    CONSTRAINT pk_cotizacion_venta PRIMARY KEY (id)
);

CREATE TABLE detalle_cotizacion_venta (
    id NUMBER(19,0) NOT NULL,
    almacen_id NUMBER(19,0),
    cantidad NUMBER(14,3) NOT NULL,
    codigo_articulo VARCHAR2(40 CHAR) NOT NULL,
    descuento NUMBER(7,4) NOT NULL,
    numero_linea NUMBER(10,0) NOT NULL,
    precio_unitario NUMBER(14,4) NOT NULL,
    subtotal NUMBER(14,2) NOT NULL,
    cotizacion_id NUMBER(19,0) NOT NULL,
    CONSTRAINT pk_detalle_cotizacion_venta PRIMARY KEY (id)
);

CREATE TABLE pedido (
    id NUMBER(19,0) NOT NULL,
    almacen_id NUMBER(19,0) NOT NULL,
    cliente_id NUMBER(19,0) NOT NULL,
    cotizacion_venta_id NUMBER(19,0),
    estado VARCHAR2(20 CHAR),
    estado_pago VARCHAR2(20 CHAR),
    fecha TIMESTAMP (9),
    fecha_emision_voucher TIMESTAMP (9),
    fecha_ultimo_pago TIMESTAMP (9),
    forma_pago_ofrecida VARCHAR2(30 CHAR),
    forma_pago_real VARCHAR2(30 CHAR),
    moneda VARCHAR2(3 CHAR) NOT NULL,
    monto_pagado NUMBER(14,2),
    motivo_anulacion VARCHAR2(300 CHAR),
    motivo_reversion VARCHAR2(300 CHAR),
    operador_sub VARCHAR2(255 CHAR),
    plazo_pago_ofrecido VARCHAR2(30 CHAR),
    revision NUMBER(19,0),
    tipo_entrega VARCHAR2(20 CHAR),
    total NUMBER(14,2) NOT NULL,
    usuario_emision_voucher VARCHAR2(150 CHAR),
    vehiculo VARCHAR2(255 CHAR),
    venta_rapida BOOLEAN,
    CONSTRAINT pk_pedido PRIMARY KEY (id)
);

CREATE TABLE detalle_pedido (
    id NUMBER(19,0) NOT NULL,
    almacen_id NUMBER(19,0),
    cantidad NUMBER(14,3) NOT NULL,
    codigo_articulo VARCHAR2(40 CHAR) NOT NULL,
    descuento NUMBER(7,4) NOT NULL,
    numero_linea NUMBER(10,0) NOT NULL,
    precio NUMBER(14,4) NOT NULL,
    subtotal NUMBER(14,2) NOT NULL,
    pedido_id NUMBER(19,0),
    CONSTRAINT pk_detalle_pedido PRIMARY KEY (id)
);

CREATE TABLE pago_pedido (
    id NUMBER(19,0) NOT NULL,
    fecha TIMESTAMP (9),
    forma_pago VARCHAR2(30 CHAR) NOT NULL,
    monto NUMBER(14,2) NOT NULL,
    referencia VARCHAR2(100 CHAR),
    pedido_id NUMBER(19,0),
    CONSTRAINT pk_pago_pedido PRIMARY KEY (id)
);


-- ---------------------------------------------------------------------
-- 9. MÓDULO PORTAL: Portal público
-- ---------------------------------------------------------------------
CREATE TABLE solicitud_contacto (
    id NUMBER(19,0) NOT NULL,
    email VARCHAR2(255 CHAR) NOT NULL,
    fecha TIMESTAMP (9),
    mensaje VARCHAR2(1000 CHAR) NOT NULL,
    nombre VARCHAR2(120 CHAR) NOT NULL,
    CONSTRAINT pk_solicitud_contacto PRIMARY KEY (id)
);

-- ---------------------------------------------------------------------
-- 10. LLAVES FORÁNEAS
-- ---------------------------------------------------------------------
ALTER TABLE almacen ADD CONSTRAINT fk_almacen_sucursal_id FOREIGN KEY (sucursal_id) REFERENCES sucursal (id);
ALTER TABLE articulo ADD CONSTRAINT fk_articulo_categoria_id FOREIGN KEY (categoria_id) REFERENCES categoria (id);
ALTER TABLE articulo ADD CONSTRAINT fk_articulo_unidad_medida_id FOREIGN KEY (unidad_medida_id) REFERENCES unidad_medida (id);
ALTER TABLE auditoria ADD CONSTRAINT fk_auditoria_usuario_id FOREIGN KEY (usuario_id) REFERENCES usuario (id);
ALTER TABLE consumo_insumo ADD CONSTRAINT fk_consumo_insumo_orden_produccion_id FOREIGN KEY (orden_produccion_id) REFERENCES orden_produccion (id);
ALTER TABLE detalle_cotizacion_venta ADD CONSTRAINT fk_detalle_cotizacion_venta_cotizacion_id FOREIGN KEY (cotizacion_id) REFERENCES cotizacion_venta (id);
ALTER TABLE detalle_movimiento ADD CONSTRAINT fk_detmov_articulo FOREIGN KEY (codigo_articulo) REFERENCES articulo (codigo);
ALTER TABLE detalle_movimiento ADD CONSTRAINT fk_detalle_movimiento_movimiento_id FOREIGN KEY (movimiento_id) REFERENCES movimiento_inventario (id);
ALTER TABLE detalle_ordenes ADD CONSTRAINT fk_detalle_ordenes_id_orden_compra FOREIGN KEY (id_orden_compra) REFERENCES ordenes_compra (id);
ALTER TABLE detalle_pedido ADD CONSTRAINT fk_detalle_pedido_pedido_id FOREIGN KEY (pedido_id) REFERENCES pedido (id);
ALTER TABLE formula_detalle ADD CONSTRAINT fk_formula_detalle_codigo_articulo FOREIGN KEY (codigo_articulo) REFERENCES articulo (codigo);
ALTER TABLE formula_detalle ADD CONSTRAINT fk_formula_detalle_formula_id FOREIGN KEY (formula_id) REFERENCES formula (id);
ALTER TABLE orden_produccion ADD CONSTRAINT fk_orden_produccion_formula_id FOREIGN KEY (formula_id) REFERENCES formula (id);
ALTER TABLE pago_pedido ADD CONSTRAINT fk_pago_pedido_pedido_id FOREIGN KEY (pedido_id) REFERENCES pedido (id);
ALTER TABLE persona_roles ADD CONSTRAINT fk_persona_roles_id_persona FOREIGN KEY (id_persona) REFERENCES personas (id);
ALTER TABLE producto_resultante ADD CONSTRAINT fk_producto_resultante_orden_produccion_id FOREIGN KEY (orden_produccion_id) REFERENCES orden_produccion (id);
ALTER TABLE rol_permiso ADD CONSTRAINT fk_rol_permiso_permiso_id FOREIGN KEY (permiso_id) REFERENCES permiso (id);
ALTER TABLE rol_permiso ADD CONSTRAINT fk_rol_permiso_rol_id FOREIGN KEY (rol_id) REFERENCES rol (id);
ALTER TABLE sucursal ADD CONSTRAINT fk_sucursal_empresa_id FOREIGN KEY (empresa_id) REFERENCES empresa (id);
ALTER TABLE tienda ADD CONSTRAINT fk_tienda_sucursal_id FOREIGN KEY (sucursal_id) REFERENCES sucursal (id);
ALTER TABLE usuario ADD CONSTRAINT fk_usuario_persona_id FOREIGN KEY (persona_id) REFERENCES personas (id);
ALTER TABLE usuario ADD CONSTRAINT fk_usuario_rol_id FOREIGN KEY (rol_id) REFERENCES rol (id);
