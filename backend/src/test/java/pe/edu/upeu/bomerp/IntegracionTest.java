package pe.edu.upeu.bomerp;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.math.BigDecimal;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.upeu.bomerp.administracion.model.*;
import pe.edu.upeu.bomerp.administracion.repository.*;
import pe.edu.upeu.bomerp.articulo.model.*;
import pe.edu.upeu.bomerp.articulo.repository.*;
import pe.edu.upeu.bomerp.compras.ordencompra.dto.*;
import pe.edu.upeu.bomerp.compras.ordencompra.service.OrdenCompraService;
import pe.edu.upeu.bomerp.inventario.model.*;
import pe.edu.upeu.bomerp.inventario.service.*;
import pe.edu.upeu.bomerp.personas.persona.entity.*;
import pe.edu.upeu.bomerp.personas.persona.repository.PersonaRepository;
import pe.edu.upeu.bomerp.produccion.model.*;
import pe.edu.upeu.bomerp.produccion.service.*;
import pe.edu.upeu.bomerp.ventas.repository.PedidoRepository;
import pe.edu.upeu.bomerp.ventas.service.CotizacionVentaService;
import pe.edu.upeu.bomerp.ventas.service.PedidoService;
import pe.edu.upeu.bomerp.ventas.web.dto.ConvertirCotizacionRequest;
import pe.edu.upeu.bomerp.ventas.web.dto.CrearCotizacionRequest;
import pe.edu.upeu.bomerp.ventas.web.dto.EntregaPedidoRequest;
import pe.edu.upeu.bomerp.ventas.web.dto.PedidoRequest;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class IntegracionTest {

  @Autowired
  MockMvc mvc;

  @Autowired
  EmpresaRepository empresas;

  @Autowired
  SucursalRepository sucursales;

  @Autowired
  AlmacenRepository almacenes;

  @Autowired
  UnidadMedidaRepository unidades;

  @Autowired
  ArticuloRepository articulos;

  @Autowired
  PersonaRepository personas;

  @Autowired
  FormulaService formulas;

  @Autowired
  OrdenProduccionService produccion;

  @Autowired
  InventarioService inventario;

  @Autowired
  OrdenCompraService compras;

  @Autowired
  PedidoService ventas;

  @Autowired
  CotizacionVentaService cotizaciones;

  @Autowired
  RolRepository roles;

  Long almacen;
  Articulo maiz, terminado;
  pe.edu.upeu.bomerp.personas.persona.entity.Persona proveedor, cliente;
  Formula formula;

  @BeforeEach
  void datos() {
    var e = new Empresa();
    e.setRuc("20111111111");
    e.setRazonSocial("Prueba");
    empresas.save(e);
    var s = new Sucursal();
    s.setEmpresa(e);
    s.setNombre("Planta");
    sucursales.save(s);
    var a = new Almacen();
    a.setSucursal(s);
    a.setNombre("General");
    a.setTipo(Almacen.TipoAlmacen.GENERAL);
    almacen = almacenes.save(a).getId();
    var u = new UnidadMedida();
    u.setCodigo("KG");
    u.setNombre("Kilogramo");
    unidades.save(u);
    maiz = articulo("MAIZ", Articulo.TipoArticulo.MATERIA_PRIMA, u);
    terminado = articulo("PURINA", Articulo.TipoArticulo.PRODUCTO_TERMINADO, u);
    proveedor = persona("111", RolPersona.PROVEEDOR);
    cliente = persona("222", RolPersona.CLIENTE);
    var f = new Formula();
    f.setNombre("Receta");
    f.setCodigoProductoTerminado("PURINA");
    var d = new FormulaDetalle();
    d.setCodigoArticulo("MAIZ");
    d.setUnidadMedida("KG");
    d.setCantidadPorUnidad(BigDecimal.ONE);
    f.agregarDetalle(d);
    formula = formulas.crear(f);
  }

  Articulo articulo(String codigo, Articulo.TipoArticulo tipo, UnidadMedida u) {
    var a = new Articulo();
    a.setCodigo(codigo);
    a.setNombre(codigo);
    a.setUnidadMedida(u);
    a.setTipoArticulo(tipo);
    a.setCostoReferencial(new BigDecimal("2.50"));
    return articulos.save(a);
  }

  pe.edu.upeu.bomerp.personas.persona.entity.Persona persona(String doc, RolPersona rol) {
    var p = new pe.edu.upeu.bomerp.personas.persona.entity.Persona();
    p.setTipoDocumento(TipoDocumento.RUC);
    p.setNumeroDocumento(doc);
    p.setNombreORazonSocial(rol.name());
    p.setRoles(Set.of(rol));
    return personas.save(p);
  }

  MovimientoInventario recepcion() {
    var c = compras.crearOrden(
      new OrdenCompraRequest(proveedor.getId(), "Contado", List.of(new DetalleOrdenRequest(maiz.getId(), 100))),
      "subject-real"
    );
    var d = new DetalleMovimiento();
    d.setCodigoArticulo("MAIZ");
    d.setCantidad(new BigDecimal("100"));
    d.setUnidadMedida("KG");
    return inventario.registrarRecepcion(
      almacen,
      c.getId(),
      new BigDecimal("100"),
      BigDecimal.ZERO,
      BigDecimal.ZERO,
      "Prueba",
      List.of(d)
    );
  }

  pe.edu.upeu.bomerp.ventas.entity.Pedido pedidoDespachable() {
    var r = recepcion();
    inventario.confirmarRecepcion(r.getId(), true);
    var p = ventas.crear(
      new PedidoRequest(
        cliente.getId(),
        almacen,
        List.of(new PedidoRequest.Linea("MAIZ", BigDecimal.ONE, BigDecimal.TEN, BigDecimal.ZERO))
      ),
      "usuario-sub"
    );
    ventas.registrarPago(p.getId(), p.getTotal(), "EFECTIVO", "Prueba");
    return ventas.aprobar(p.getId());
  }

  EntregaPedidoRequest datosDespacho(String modalidad, String placa) {
    var lote = inventario.listarLotesDisponibles(almacen, "MAIZ").get(0);
    return new EntregaPedidoRequest(
      modalidad,
      placa,
      List.of(new EntregaPedidoRequest.Linea("MAIZ", lote.getId(), BigDecimal.ONE))
    );
  }

  @Test
  void compraProduccionVentaIntegradas() {
    var r = recepcion();
    assertThat(inventario.consultarDisponible(almacen, "MAIZ")).isEqualByComparingTo("0");
    inventario.confirmarRecepcion(r.getId(), true);
    assertThat(inventario.consultarDisponible(almacen, "MAIZ")).isEqualByComparingTo("100");
    var o = produccion.planificar(formula.getId(), almacen, almacen, new BigDecimal("20"));
    produccion.iniciar(o.getId());
    produccion.registrarConsumo(o.getId(), "MAIZ", null, new BigDecimal("20"), "KG");
    produccion.registrarResultado(
      o.getId(),
      ProductoResultante.TipoResultado.TERMINADO,
      "PURINA",
      new BigDecimal("19"),
      "KG",
      null
    );
    produccion.registrarResultado(
      o.getId(),
      ProductoResultante.TipoResultado.MERMA,
      "PURINA",
      BigDecimal.ONE,
      "KG",
      null
    );
    produccion.cerrar(o.getId());
    assertThat(inventario.consultarDisponible(almacen, "MAIZ")).isEqualByComparingTo("80");
    assertThat(inventario.consultarDisponible(almacen, "PURINA")).isEqualByComparingTo("19");
    var p = ventas.crear(
      new PedidoRequest(
        cliente.getId(),
        almacen,
        List.of(new PedidoRequest.Linea("PURINA", new BigDecimal("5"), new BigDecimal("10"), new BigDecimal("10")))
      ),
      "usuario-sub"
    );
    assertThat(p.getTotal()).isEqualByComparingTo("45");
    ventas.registrarPago(p.getId(), p.getTotal(), "EFECTIVO", "Prueba");
    ventas.aprobar(p.getId());
    ventas.entregar(p.getId(), "LOCAL", null);
    assertThat(inventario.consultarDisponible(almacen, "PURINA")).isEqualByComparingTo("14");
  }

  @Test
  void despachoLocalGuardaModalidadYNoGuardaPlaca() {
    var p = pedidoDespachable();
    var despachado = ventas.entregarSeleccion(p.getId(), datosDespacho("LOCAL", null));
    assertThat(despachado.getTipoEntrega()).isEqualTo("LOCAL");
    assertThat(despachado.getVehiculo()).isNull();
    assertThat(inventario.listarMovimientosPedido(p.getId()).get(0).getTipoEntrega()).isEqualTo("LOCAL");
    assertThat(inventario.listarMovimientosPedido(p.getId()).get(0).getVehiculoPlaca()).isNull();
  }

  @Test
  void despachoEnVehiculoNoEstaPermitido() {
    var p = pedidoDespachable();
    assertThatThrownBy(() -> ventas.entregarSeleccion(p.getId(), datosDespacho("VEHICULO", null)))
      .isInstanceOf(IllegalArgumentException.class)
      .hasMessageContaining("Solo se permite la entrega en el mismo local");
  }

  @Test
  void entregaLocalRechazaPlacaDeVehiculo() {
    var p = pedidoDespachable();
    assertThatThrownBy(() -> ventas.entregarSeleccion(p.getId(), datosDespacho("LOCAL", "ABC-123")))
      .isInstanceOf(IllegalArgumentException.class)
      .hasMessageContaining("no debe incluir vehículo");
  }

  @Test
  void noIniciaSinStock() {
    var o = produccion.planificar(formula.getId(), almacen, almacen, BigDecimal.TEN);
    assertThat(produccion.iniciar(o.getId()).getEstado()).isEqualTo(OrdenProduccion.EstadoOrden.EN_ESPERA);
  }

  @Test
  void rechazarRecepcionNoGeneraStock() {
    var r = recepcion();
    inventario.confirmarRecepcion(r.getId(), false);
    assertThat(inventario.consultarDisponible(almacen, "MAIZ")).isEqualByComparingTo("0");
  }

  @Test
  void noDuplicaRecepcion() {
    var r = recepcion();
    inventario.confirmarRecepcion(r.getId(), true);
    assertThatThrownBy(() -> inventario.confirmarRecepcion(r.getId(), true)).isInstanceOf(IllegalStateException.class);
  }

  @Test
  void loteInsuficienteNoPuedeConsumirse() {
    var r = recepcion();
    inventario.confirmarRecepcion(r.getId(), true);
    var o = produccion.planificar(formula.getId(), almacen, almacen, BigDecimal.TEN);
    produccion.iniciar(o.getId());
    assertThatThrownBy(() ->
      produccion.registrarConsumo(o.getId(), "MAIZ", null, new BigDecimal("101"), "KG")
    ).isInstanceOf(IllegalStateException.class);
  }

  @Test
  void apiSegura401y403() throws Exception {
    mvc.perform(get("/api/produccion/ordenes")).andExpect(status().isUnauthorized());
    mvc
      .perform(get("/api/produccion/ordenes").with(jwt().authorities(new SimpleGrantedAuthority("ROLE_VENDEDOR"))))
      .andExpect(status().isForbidden());
    mvc
      .perform(
        get("/api/produccion/ordenes").with(jwt().authorities(new SimpleGrantedAuthority("ROLE_OPERARIO_PLANTA")))
      )
      .andExpect(status().isOk());
    mvc
      .perform(get("/api/articulos/catalogo-publico"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$[0].costoReferencial").doesNotExist());
  }

  @Test
  void relacionesInvalidasDevuelven400() throws Exception {
    mvc
      .perform(
        post("/api/gestion/sucursales")
          .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_ADMIN")))
          .contentType("application/json")
          .content("{\"nombre\":\"Sede\",\"empresa\":{\"id\":999999}}")
      )
      .andExpect(status().isBadRequest());
  }

  @Test
  void serializaCabeceraDetalleSinCiclos() throws Exception {
    var o = produccion.planificar(formula.getId(), almacen, almacen, BigDecimal.TEN);
    mvc
      .perform(
        get("/api/produccion/ordenes/" + o.getId()).with(jwt().authorities(new SimpleGrantedAuthority("ROLE_ADMIN")))
      )
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.formula.detalles[0].codigoArticulo").value("MAIZ"));
  }

  @Test
  void cotizacionAceptadaSeConvierteUnaSolaVezEnPedido() {
    var request = new CrearCotizacionRequest(
      cliente.getId(),
      "TRANSFERENCIA",
      "15_DIAS",
      List.of(
        new CrearCotizacionRequest.Linea("PURINA", new BigDecimal("3"), new BigDecimal("10"), new BigDecimal("10"))
      )
    );
    var cotizacion = cotizaciones.crear(request);
    assertThat(cotizacion.getTotal()).isEqualByComparingTo("27");
    assertThat(cotizacion.getFormaPago()).isEqualTo("TRANSFERENCIA");
    assertThat(cotizacion.getPlazoPago()).isEqualTo("15_DIAS");
    cotizaciones.enviar(cotizacion.getId());
    cotizaciones.aceptar(cotizacion.getId());
    var pedido = cotizaciones.convertirEnPedido(
      cotizacion.getId(),
      new ConvertirCotizacionRequest(almacen),
      "usuario-sub"
    );
    assertThat(pedido.getCotizacionVentaId()).isEqualTo(cotizacion.getId());
    assertThat(pedido.getDetalles()).hasSize(1);
    assertThat(pedido.getTotal()).isEqualByComparingTo("27");
    assertThatThrownBy(() ->
      cotizaciones.convertirEnPedido(cotizacion.getId(), new ConvertirCotizacionRequest(almacen), "usuario-sub")
    ).isInstanceOf(IllegalStateException.class);
  }

  // ---------------------------------------------------------------
  // COMPRAS
  // ---------------------------------------------------------------

  /** La orden toma el costo referencial del artículo y nace como EMITIDA. */
  @Test
  void ordenCompraCalculaTotalConCostoReferencialYQuedaEmitida() {
    var orden = compras.crearOrden(
      new OrdenCompraRequest(proveedor.getId(), "Contado", List.of(new DetalleOrdenRequest(maiz.getId(), 100))),
      "subject-real"
    );
    assertThat(orden.getEstado().name()).isEqualTo("EMITIDA");
    assertThat(orden.getDetalles().get(0).getPrecioUnitario()).isEqualByComparingTo("2.50");
    assertThat(orden.getTotal()).isEqualByComparingTo("250.00");
  }

  /** Una orden se anula una sola vez: después ya no está EMITIDA. */
  @Test
  void soloUnaOrdenEmitidaPuedeAnularse() {
    var orden = compras.crearOrden(
      new OrdenCompraRequest(proveedor.getId(), "Contado", List.of(new DetalleOrdenRequest(maiz.getId(), 10))),
      "subject-real"
    );
    assertThat(compras.anular(orden.getId()).getEstado().name()).isEqualTo("ANULADA");
    assertThatThrownBy(() -> compras.anular(orden.getId()))
      .isInstanceOf(pe.edu.upeu.bomerp.exception.EstadoOrdenException.class)
      .hasMessageContaining("Solo una orden EMITIDA");
  }

  /** Inventario no puede recibir mercancía de una compra anulada. */
  @Test
  void compraAnuladaNoSePuedeRecibirEnInventario() {
    var orden = compras.crearOrden(
      new OrdenCompraRequest(proveedor.getId(), "Contado", List.of(new DetalleOrdenRequest(maiz.getId(), 10))),
      "subject-real"
    );
    compras.anular(orden.getId());
    var d = new DetalleMovimiento();
    d.setCodigoArticulo("MAIZ");
    d.setCantidad(BigDecimal.TEN);
    d.setUnidadMedida("KG");
    assertThatThrownBy(() ->
      inventario.registrarRecepcion(almacen, orden.getId(), BigDecimal.TEN, BigDecimal.ZERO, BigDecimal.ZERO, "Prueba", List.of(d))
    )
      .isInstanceOf(IllegalStateException.class)
      .hasMessageContaining("no está EMITIDA");
  }

  // ---------------------------------------------------------------
  // INVENTARIO
  // ---------------------------------------------------------------

  /** Aceptar la recepción crea el lote y deja la compra como RECIBIDA. */
  @Test
  void recepcionAceptadaCreaLoteYMarcaCompraRecibida() {
    var r = recepcion();
    inventario.confirmarRecepcion(r.getId(), true);
    var lotes = inventario.listarLotesDisponibles(almacen, "MAIZ");
    assertThat(lotes).hasSize(1);
    assertThat(lotes.get(0).getCantidadInicial()).isEqualByComparingTo("100");
    assertThat(compras.obtenerOrden(r.getOrdenCompraId()).getEstado().name()).isEqualTo("RECIBIDA");
  }

  /** Un movimiento en borrador se puede anular; uno confirmado ya no. */
  @Test
  void soloSeAnulaUnMovimientoEnBorrador() {
    var borrador = recepcion();
    assertThat(inventario.anular(borrador.getId()).getEstado())
      .isEqualTo(MovimientoInventario.EstadoMovimiento.ANULADO);
    var confirmado = recepcion();
    inventario.confirmarRecepcion(confirmado.getId(), true);
    assertThatThrownBy(() -> inventario.anular(confirmado.getId()))
      .isInstanceOf(IllegalStateException.class)
      .hasMessageContaining("ya CONFIRMADO");
  }

  /** Línea de recepción para las pruebas de varios artículos. */
  DetalleMovimiento linea(String codigo, String cantidad) {
    var d = new DetalleMovimiento();
    d.setCodigoArticulo(codigo);
    d.setCantidad(new BigDecimal(cantidad));
    d.setUnidadMedida("KG");
    return d;
  }

  /** Compra con dos artículos de distinto tipo (materia prima y producto terminado). */
  OrdenCompraResponse compraDeDosArticulos() {
    return compras.crearOrden(
      new OrdenCompraRequest(
        proveedor.getId(),
        "Contado",
        List.of(new DetalleOrdenRequest(maiz.getId(), 100), new DetalleOrdenRequest(terminado.getId(), 30))
      ),
      "subject-real"
    );
  }

  /** Una compra con varios artículos se recibe completa y genera un lote por cada línea. */
  @Test
  void compraConVariosArticulosGeneraUnLotePorLinea() {
    var compra = compraDeDosArticulos();
    assertThat(compra.getDetalles()).hasSize(2);
    var r = inventario.registrarRecepcion(
      almacen,
      compra.getId(),
      new BigDecimal("130"),
      BigDecimal.ZERO,
      BigDecimal.ZERO,
      "Prueba",
      List.of(linea("MAIZ", "100"), linea("PURINA", "30"))
    );
    assertThat(r.getDetalles()).hasSize(2);
    inventario.confirmarRecepcion(r.getId(), true);
    assertThat(inventario.listarLotesDisponibles(almacen, "MAIZ")).hasSize(1);
    assertThat(inventario.listarLotesDisponibles(almacen, "PURINA")).hasSize(1);
    assertThat(inventario.consultarDisponible(almacen, "MAIZ")).isEqualByComparingTo("100");
    assertThat(inventario.consultarDisponible(almacen, "PURINA")).isEqualByComparingTo("30");
    assertThat(compras.obtenerOrden(compra.getId()).getEstado().name()).isEqualTo("RECIBIDA");
  }

  /** Una compra mixta no se puede recibir en un almacén que solo acepta materias primas. */
  @Test
  void compraMixtaRequiereAlmacenGeneral() {
    var soloMateriaPrima = new Almacen();
    soloMateriaPrima.setSucursal(almacenes.findById(almacen).orElseThrow().getSucursal());
    soloMateriaPrima.setNombre("Solo materias primas");
    soloMateriaPrima.setTipo(Almacen.TipoAlmacen.MATERIA_PRIMA);
    var idMateriaPrima = almacenes.save(soloMateriaPrima).getId();
    var compra = compraDeDosArticulos();
    assertThatThrownBy(() ->
      inventario.registrarRecepcion(
        idMateriaPrima,
        compra.getId(),
        new BigDecimal("130"),
        BigDecimal.ZERO,
        BigDecimal.ZERO,
        "Prueba",
        List.of(linea("MAIZ", "100"), linea("PURINA", "30"))
      )
    )
      .isInstanceOf(IllegalArgumentException.class)
      .hasMessageContaining("requiere un almacén");
  }

  /** No se admite recibir solo una parte de las líneas de la compra. */
  @Test
  void recepcionDebeIncluirTodasLasLineasDeLaCompra() {
    var compra = compraDeDosArticulos();
    assertThatThrownBy(() ->
      inventario.registrarRecepcion(
        almacen,
        compra.getId(),
        new BigDecimal("100"),
        BigDecimal.ZERO,
        BigDecimal.ZERO,
        "Prueba",
        List.of(linea("MAIZ", "100"))
      )
    )
      .isInstanceOf(IllegalArgumentException.class)
      .hasMessageContaining("debe coincidir con las líneas de la compra");
  }

  // ---------------------------------------------------------------
  // VENTAS
  // ---------------------------------------------------------------

  /** Un abono parcial deja el pedido PARCIAL, no se puede pagar de más ni aprobar sin pago completo. */
  @Test
  void pagoParcialNoSuperaSaldoNiPermiteAprobar() {
    var p = ventas.crear(
      new PedidoRequest(
        cliente.getId(),
        almacen,
        List.of(new PedidoRequest.Linea("MAIZ", BigDecimal.ONE, BigDecimal.TEN, BigDecimal.ZERO))
      ),
      "usuario-sub"
    );
    var abonado = ventas.registrarPago(p.getId(), new BigDecimal("4"), "EFECTIVO", "Adelanto");
    assertThat(abonado.getEstadoPago()).isEqualTo("PARCIAL");
    assertThat(abonado.getMontoPagado()).isEqualByComparingTo("4");
    assertThatThrownBy(() -> ventas.registrarPago(p.getId(), new BigDecimal("7"), "EFECTIVO", null))
      .isInstanceOf(IllegalArgumentException.class)
      .hasMessageContaining("supera el saldo");
    assertThatThrownBy(() -> ventas.aprobar(p.getId()))
      .isInstanceOf(IllegalStateException.class)
      .hasMessageContaining("pago completo");
  }

  /** Revertir una venta despachada devuelve el stock al lote y deja el pedido DEVUELTO. */
  @Test
  void revertirVentaDespachadaReingresaStock() {
    var p = pedidoDespachable();
    ventas.entregarSeleccion(p.getId(), datosDespacho("LOCAL", null));
    assertThat(inventario.consultarDisponible(almacen, "MAIZ")).isEqualByComparingTo("99");
    var devuelto = ventas.revertir(p.getId(), "Cliente devolvió el producto");
    assertThat(devuelto.getEstado()).isEqualTo("DEVUELTO");
    assertThat(inventario.consultarDisponible(almacen, "MAIZ")).isEqualByComparingTo("100");
  }

  /** Un pedido ya despachado no se puede anular (se debe revertir). */
  @Test
  void pedidoDespachadoNoSePuedeAnular() {
    var p = pedidoDespachable();
    ventas.entregarSeleccion(p.getId(), datosDespacho("LOCAL", null));
    assertThatThrownBy(() -> ventas.anular(p.getId(), "Error de digitación"))
      .isInstanceOf(IllegalStateException.class)
      .hasMessageContaining("sin despachar");
  }
}
