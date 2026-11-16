// Tipos de las respuestas del backend (copiados de las entidades y DTO de Java).
// BigDecimal llega como number y LocalDateTime como texto ISO.
// Las relaciones LAZY (por ejemplo almacen.sucursal) pueden no venir: por eso son opcionales.

// ----- Sesión -----
/** GET /api/sesion (SesionController.java) */
export interface Sesion {
  sub: string;
  roles: string[];
  modulos: string[];
}
/** Respuesta del endpoint de token de Keycloak */
export interface TokenKeycloak {
  access_token: string;
  refresh_token: string;
  id_token?: string;
}

// ----- Personas -----
/** ConsultaDocumentoResponse.java (consulta DNI/RUC) */
export interface ConsultaDocumento {
  numeroDocumento: string;
  nombreORazonSocial: string;
  direccion: string;
}

// ----- Administración (administracion/model) -----
export interface Empresa {
  id: number;
  ruc: string;
  razonSocial: string;
  nombreComercial: string | null;
  activo: boolean;
}
export interface Sucursal {
  id: number;
  empresa?: Empresa;
  nombre: string;
  direccion: string | null;
  activo: boolean;
}
export type TipoAlmacen = 'MATERIA_PRIMA' | 'PRODUCTO_TERMINADO' | 'INSUMOS' | 'EMPAQUE' | 'GENERAL';
export interface Almacen {
  id: number;
  sucursal?: Sucursal;
  nombre: string;
  tipo: TipoAlmacen;
  activo: boolean;
}
export type Modulo = 'COMPRAS' | 'INVENTARIO' | 'PRODUCCION' | 'VENTAS' | 'FINANZAS' | 'ADMINISTRACION';
export interface Permiso {
  id: number;
  nombre: string;
  modulo: Modulo;
  descripcion: string | null;
}
export interface Rol {
  id: number;
  nombre: string;
  descripcion: string | null;
  permisos?: Permiso[];
  activo: boolean;
}
/** UsuarioResponse.java */
export interface UsuarioApi {
  id: number;
  username: string;
  rol: string;
  persona: string;
  activo: boolean;
}

// ----- Artículos (articulo/model) -----
export type TipoArticulo = 'MATERIA_PRIMA' | 'INSUMO' | 'EMPAQUE' | 'PRODUCTO_TERMINADO' | 'SUBPRODUCTO';
export interface UnidadMedida {
  id: number;
  codigo: string;
  nombre: string;
  simbolo: string | null;
  activo: boolean;
}
export interface Categoria {
  id: number;
  nombre: string;
  activo: boolean;
}
/** Articulo.java tal como lo devuelve GET /api/articulos */
export interface ArticuloApi {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  imagenUrl: string | null;
  tipoArticulo: TipoArticulo;
  unidadMedida: UnidadMedida;
  categoria?: Categoria | null;
  costoReferencial: number | null;
  precioVenta: number | null;
  activo: boolean;
}
/** ArticuloPublicoResponse.java (catálogo del portal) */
export interface ArticuloPublico {
  codigo: string;
  nombre: string;
  descripcion: string | null;
  imagenUrl: string | null;
}

// ----- Inventario (inventario/model) -----
export interface DetalleMovimiento {
  id: number;
  codigoArticulo: string;
  loteId: number | null;
  cantidad: number;
  unidadMedida: string;
}
export interface MovimientoInventario {
  id: number;
  revision: number | null;
  tipoMovimiento: 'RECEPCION' | 'DESPACHO' | 'DEVOLUCION';
  almacenId: number;
  estado: 'BORRADOR' | 'CONFIRMADO' | 'ANULADO';
  fechaRegistro: string;
  fechaConfirmacion: string | null;
  ordenCompraId: number | null;
  pedidoVentaId: number | null;
  vehiculoPlaca: string | null;
  tipoEntrega: string | null;
  pesajeKg: number | null;
  humedadPct: number | null;
  impurezaPct: number | null;
  aceptado: boolean | null;
  observaciones: string | null;
  detalles: DetalleMovimiento[];
}
export interface Lote {
  id: number;
  revision: number | null;
  codigoArticulo: string;
  almacenId: number;
  cantidadInicial: number;
  cantidadDisponible: number;
  movimientoOrigenId: number | null;
  fechaIngreso: string;
  estado: 'DISPONIBLE' | 'AGOTADO' | 'BLOQUEADO';
}
/** StockResponse.java */
export interface Stock {
  almacenId: number;
  codigoArticulo: string;
  cantidadDisponible: number;
}

// ----- Producción (produccion/model) -----
export interface FormulaDetalle {
  id: number;
  codigoArticulo: string;
  cantidadPorUnidad: number;
  unidadMedida: string;
}
export interface Formula {
  id: number;
  codigoProductoTerminado: string;
  nombre: string;
  version: number;
  activo: boolean;
  detalles: FormulaDetalle[];
}
export interface ConsumoInsumo {
  id: number;
  codigoArticulo: string;
  loteId: number | null;
  cantidadConsumida: number;
  unidadMedida: string;
}
export interface ProductoResultante {
  id: number;
  tipo: 'TERMINADO' | 'SUBPRODUCTO' | 'MERMA' | 'DESPERDICIO' | 'REPROCESO';
  codigoArticulo: string;
  cantidad: number;
  unidadMedida: string;
  loteGeneradoId: number | null;
}
export type EstadoOrdenProduccion = 'PLANIFICADA' | 'EN_ESPERA' | 'EN_PROCESO' | 'CERRADA' | 'CANCELADA';
export interface OrdenProduccion {
  id: number;
  revision: number | null;
  formula: Formula;
  almacenOrigenId: number;
  almacenDestinoId: number;
  cantidadPlanificada: number;
  cantidadReal: number | null;
  estado: EstadoOrdenProduccion;
  fechaPlanificada: string;
  fechaInicio: string | null;
  fechaFin: string | null;
  consumos: ConsumoInsumo[];
  resultados: ProductoResultante[];
}
/** Fila de GET /api/reportes/produccion (ReportesController.java) */
export interface ReporteProduccion {
  id: number;
  formula: string;
  estado: EstadoOrdenProduccion;
  planificado: number;
  producido: number;
  insumos: { articulo: string; unidad: string; planificado: number; real: number; desviacion: number }[];
}

// ----- Ventas (ventas/entity) -----
export interface DetallePedido {
  id: number;
  numeroLinea: number;
  codigoArticulo: string;
  almacenId: number | null;
  cantidad: number;
  precio: number;
  descuento: number;
  subtotal: number;
}
export interface PagoPedido {
  id: number;
  monto: number;
  formaPago: string;
  referencia: string | null;
  fecha: string;
}
export interface Pedido {
  id: number;
  revision: number | null;
  clienteId: number;
  almacenId: number;
  cotizacionVentaId: number | null;
  operadorSub: string | null;
  ventaRapida: boolean | null;
  fechaEmisionVoucher: string | null;
  usuarioEmisionVoucher: string | null;
  estado: string;
  vehiculo: string | null;
  tipoEntrega: string | null;
  motivoAnulacion: string | null;
  motivoReversion: string | null;
  fecha: string;
  total: number;
  estadoPago: string;
  montoPagado: number;
  formaPagoReal: string | null;
  formaPagoOfrecida: string | null;
  plazoPagoOfrecido: string | null;
  fechaUltimoPago: string | null;
  moneda: string;
  detalles: DetallePedido[];
  pagos: PagoPedido[];
}
export interface DetalleCotizacion {
  id: number;
  numeroLinea: number;
  codigoArticulo: string;
  almacenId: number | null;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  subtotal: number;
}
export interface CotizacionVenta {
  id: number;
  revision: number | null;
  clienteId: number;
  fecha: string;
  estado: string;
  moneda: string;
  formaPago: string | null;
  plazoPago: string | null;
  total: number;
  pedidoVentaId: number | null;
  detalles: DetalleCotizacion[];
}
/** GET /api/ventas/reportes (VentasReportesController.java) */
export interface ReporteVentas {
  pedidos: number;
  despachados: number;
  devueltos: number;
  anulados: number;
  totalDespachado: number;
  totalDevuelto: number;
  totalNeto: number;
  porProducto: {
    codigoArticulo: string;
    unidades: number;
    totalBruto: number;
    totalDevuelto: number;
    totalNeto: number;
  }[];
}

// ----- Catálogos genéricos (shared/crud-list y crud-form) -----
/** Cualquier registro de catálogo: siempre trae id; los demás campos dependen del catálogo. */
export interface RegistroCatalogo {
  id: number;
  activo?: boolean;
  [campo: string]: unknown;
}

// ----- Portal -----
/** Contacto.java (GET /api/ventas/contactos) */
export interface SolicitudContacto {
  id: number;
  nombre: string;
  email: string;
  mensaje: string;
  fecha: string;
}
