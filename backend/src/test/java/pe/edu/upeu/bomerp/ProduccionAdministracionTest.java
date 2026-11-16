package pe.edu.upeu.bomerp;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.upeu.bomerp.administracion.model.*;
import pe.edu.upeu.bomerp.administracion.repository.*;
import pe.edu.upeu.bomerp.administracion.service.*;
import pe.edu.upeu.bomerp.articulo.model.*;
import pe.edu.upeu.bomerp.articulo.repository.*;
import pe.edu.upeu.bomerp.inventario.service.*;
import pe.edu.upeu.bomerp.produccion.model.*;
import pe.edu.upeu.bomerp.produccion.repository.FormulaRepository;
import pe.edu.upeu.bomerp.produccion.service.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ProduccionAdministracionTest {

  @Autowired
  MockMvc mvc;

  @Autowired
  EntityManager em;

  @Autowired
  EmpresaRepository empresas;

  @Autowired
  SucursalRepository sucursales;

  @Autowired
  AlmacenRepository almacenes;

  @Autowired
  ArticuloRepository articulos;

  @Autowired
  UnidadMedidaRepository unidades;

  @Autowired
  FormulaService formulas;

  @Autowired
  FormulaRepository formulaRepo;

  @Autowired
  OrdenProduccionService ordenes;

  @Autowired
  StockService stock;

  @Autowired
  InventarioService inventario;

  @Autowired
  RolRepository roles;

  @Autowired
  RolService rolService;

  @Autowired
  PermisoRepository permisos;

  @Autowired
  RolesIniciales semilla;

  Long almacen;
  Articulo maiz, soya, producto;
  Formula formula;

  @BeforeEach
  void preparar() {
    var empresa = new Empresa();
    empresa.setRuc("20876543210");
    empresa.setRazonSocial("Prueba de módulos");
    empresas.save(empresa);
    var sucursal = new Sucursal();
    sucursal.setEmpresa(empresa);
    sucursal.setNombre("Planta prueba");
    sucursales.save(sucursal);
    var a = new Almacen();
    a.setSucursal(sucursal);
    a.setNombre("General prueba");
    a.setTipo(Almacen.TipoAlmacen.GENERAL);
    almacen = almacenes.save(a).getId();
    var unidad = new UnidadMedida();
    unidad.setCodigo("KG");
    unidad.setNombre("Kilogramo");
    unidades.save(unidad);
    maiz = articulo("M-TEST", Articulo.TipoArticulo.MATERIA_PRIMA, unidad);
    soya = articulo("S-TEST", Articulo.TipoArticulo.MATERIA_PRIMA, unidad);
    producto = articulo("P-TEST", Articulo.TipoArticulo.PRODUCTO_TERMINADO, unidad);
    formula = formulas.crear(receta("Receta 60/40", "0.6", "0.4"));
  }

  Articulo articulo(String codigo, Articulo.TipoArticulo tipo, UnidadMedida unidad) {
    var a = new Articulo();
    a.setCodigo(codigo);
    a.setNombre(codigo);
    a.setTipoArticulo(tipo);
    a.setUnidadMedida(unidad);
    a.setCostoReferencial(BigDecimal.ONE);
    return articulos.save(a);
  }

  Formula receta(String nombre, String m, String s) {
    var f = new Formula();
    f.setNombre(nombre);
    f.setCodigoProductoTerminado(producto.getCodigo());
    for (var par : List.of(new String[] { maiz.getCodigo(), m }, new String[] { soya.getCodigo(), s })) {
      var d = new FormulaDetalle();
      d.setCodigoArticulo(par[0]);
      d.setCantidadPorUnidad(new BigDecimal(par[1]));
      d.setUnidadMedida("KG");
      f.agregarDetalle(d);
    }
    return f;
  }

  void abastecer() {
    stock.ingresar(almacen, maiz.getCodigo(), new BigDecimal("60"), null);
    stock.ingresar(almacen, soya.getCodigo(), new BigDecimal("40"), null);
  }

  org.springframework.test.web.servlet.request.RequestPostProcessor rol(String nombre) {
    return jwt().authorities(new SimpleGrantedAuthority("ROLE_" + nombre));
  }

  @Test
  void dosFormulasCompartenArticulosConCantidadesIndependientes() {
    var segunda = formulas.crear(receta("Receta 50/50", "0.5", "0.5"));
    Long f1 = formula.getId(),
      f2 = segunda.getId(),
      idMaiz = maiz.getId();
    em.flush();
    em.clear();
    var primera = formulas.obtener(f1);
    var otra = formulas.obtener(f2);
    assertThat(primera.getInsumos()).extracting(Articulo::getId).contains(idMaiz).hasSize(2);
    assertThat(otra.getInsumos()).extracting(Articulo::getId).contains(idMaiz).hasSize(2);
    assertThat(otra.getDetalles().getFirst().getArticulo().getId()).isEqualTo(idMaiz);
    assertThat(primera.getDetalles().getFirst().getCantidadPorUnidad()).isEqualByComparingTo("0.6");
    assertThat(otra.getDetalles().getFirst().getCantidadPorUnidad()).isEqualByComparingTo("0.5");
  }

  @Test
  void unaOrdenEsperaLuegoProduceYNoDuplicaElLote() {
    var o = ordenes.planificar(formula.getId(), almacen, almacen, new BigDecimal("100"));
    assertThat(ordenes.iniciar(o.getId()).getEstado()).isEqualTo(OrdenProduccion.EstadoOrden.EN_ESPERA);
    abastecer();
    assertThat(ordenes.iniciar(o.getId()).getEstado()).isEqualTo(OrdenProduccion.EstadoOrden.EN_PROCESO);
    ordenes.registrarConsumo(o.getId(), maiz.getCodigo(), null, new BigDecimal("60"), "KG");
    ordenes.registrarConsumo(o.getId(), soya.getCodigo(), null, new BigDecimal("40"), "KG");
    ordenes.registrarResultado(
      o.getId(),
      ProductoResultante.TipoResultado.TERMINADO,
      producto.getCodigo(),
      new BigDecimal("98"),
      "KG",
      null
    );
    ordenes.registrarResultado(
      o.getId(),
      ProductoResultante.TipoResultado.MERMA,
      producto.getCodigo(),
      new BigDecimal("2"),
      "KG",
      null
    );
    assertThat(ordenes.cerrar(o.getId()).getCantidadReal()).isEqualByComparingTo("98");
    assertThat(inventario.consultarDisponible(almacen, maiz.getCodigo())).isEqualByComparingTo("0");
    assertThat(inventario.consultarDisponible(almacen, producto.getCodigo())).isEqualByComparingTo("98");
    assertThatThrownBy(() -> ordenes.cerrar(o.getId())).isInstanceOf(IllegalStateException.class);
    assertThat(inventario.consultarDisponible(almacen, producto.getCodigo())).isEqualByComparingTo("98");
  }

  @Test
  void noCierraSiFaltaUnInsumo() {
    abastecer();
    var o = ordenes.planificar(formula.getId(), almacen, almacen, BigDecimal.ONE);
    ordenes.iniciar(o.getId());
    ordenes.registrarConsumo(o.getId(), maiz.getCodigo(), null, new BigDecimal("0.6"), "KG");
    ordenes.registrarResultado(
      o.getId(),
      ProductoResultante.TipoResultado.TERMINADO,
      producto.getCodigo(),
      BigDecimal.ONE,
      "KG",
      null
    );
    assertThatThrownBy(() -> ordenes.cerrar(o.getId()))
      .isInstanceOf(IllegalStateException.class)
      .hasMessageContaining(soya.getCodigo());
  }

  @Test
  void cancelaSinConsumosYBloqueaReinicio() {
    var o = ordenes.planificar(formula.getId(), almacen, almacen, BigDecimal.ONE);
    assertThat(ordenes.cancelar(o.getId()).getEstado()).isEqualTo(OrdenProduccion.EstadoOrden.CANCELADA);
    assertThatThrownBy(() -> ordenes.iniciar(o.getId())).isInstanceOf(IllegalStateException.class);
  }

  @Test
  void noCancelaTrasConsumir() {
    abastecer();
    var o = ordenes.planificar(formula.getId(), almacen, almacen, BigDecimal.ONE);
    ordenes.iniciar(o.getId());
    ordenes.registrarConsumo(o.getId(), maiz.getCodigo(), null, BigDecimal.ONE, "KG");
    assertThatThrownBy(() -> ordenes.cancelar(o.getId()))
      .isInstanceOf(IllegalStateException.class)
      .hasMessageContaining("consumos");
  }

  @Test
  void validaTodosLosInsumosAlPlanificar() {
    soya.setActivo(false);
    assertThatThrownBy(() -> ordenes.planificar(formula.getId(), almacen, almacen, BigDecimal.ONE))
      .isInstanceOf(IllegalArgumentException.class)
      .hasMessageContaining("inactivo");
  }

  @Test
  void rechazaFormulaVaciaDuplicadaYUnidadIncorrecta() {
    var vacia = new Formula();
    vacia.setNombre("Vacía");
    vacia.setCodigoProductoTerminado(producto.getCodigo());
    assertThatThrownBy(() -> formulas.crear(vacia)).isInstanceOf(IllegalArgumentException.class);
    var duplicada = receta("Duplicada", "1", "1");
    duplicada.getDetalles().get(1).setCodigoArticulo(maiz.getCodigo());
    assertThatThrownBy(() -> formulas.crear(duplicada))
      .isInstanceOf(IllegalArgumentException.class)
      .hasMessageContaining("duplicado");
    var unidad = receta("Unidad inválida", "1", "1");
    unidad.getDetalles().getFirst().setUnidadMedida("UND");
    assertThatThrownBy(() -> formulas.crear(unidad))
      .isInstanceOf(IllegalArgumentException.class)
      .hasMessageContaining("Unidad");
  }

  @Test
  void variosRolesCompartenPermisoYRevocarloSiBloqueaMenuYApi() throws Exception {
    var p = permisos.findByNombre("OPERAR_PRODUCCION").orElseThrow();
    var nuevo = new Rol();
    nuevo.setNombre("SUPERVISOR_PRUEBA");
    nuevo = rolService.crear(nuevo);
    rolService.asignarPermisos(nuevo.getId(), Set.of(p.getId()));
    var operador = roles.findByNombre("OPERARIO_PLANTA").orElseThrow();
    assertThat(operador.getPermisos()).extracting(Permiso::getId).contains(p.getId());
    mvc.perform(get("/api/produccion/ordenes").with(rol("SUPERVISOR_PRUEBA"))).andExpect(status().isOk());
    rolService.asignarPermisos(operador.getId(), Set.of());
    mvc
      .perform(get("/api/sesion").with(rol("OPERARIO_PLANTA")))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.modulos").isEmpty());
    mvc.perform(get("/api/produccion/ordenes").with(rol("OPERARIO_PLANTA"))).andExpect(status().isForbidden());
    semilla.run(); // Reiniciar no debe devolver un permiso retirado.
    assertThat(operador.getPermisos()).isEmpty();
    rolService.asignarPermisos(operador.getId(), Set.of(p.getId()));
    mvc.perform(get("/api/produccion/ordenes").with(rol("OPERARIO_PLANTA"))).andExpect(status().isOk());
  }

  @Test
  void adminProtegidoYNoSeAsignaAdministracionAOtroRol() throws Exception {
    var admin = roles.findByNombre("ADMIN").orElseThrow();
    assertThatThrownBy(() -> rolService.validarCambioNombre(admin, "OTRO_ADMIN")).isInstanceOf(
      IllegalArgumentException.class
    );
    assertThatThrownBy(() -> rolService.validarEliminacion(admin)).isInstanceOf(IllegalArgumentException.class);
    assertThatThrownBy(() -> rolService.asignarPermisos(admin.getId(), Set.of())).isInstanceOf(
      IllegalArgumentException.class
    );
    var operador = roles.findByNombre("OPERARIO_PLANTA").orElseThrow();
    var p = permisos.findByNombre("OPERAR_ADMINISTRACION").orElseThrow();
    assertThatThrownBy(() -> rolService.asignarPermisos(operador.getId(), Set.of(p.getId()))).isInstanceOf(
      IllegalArgumentException.class
    );
    mvc.perform(delete("/api/gestion/roles/" + admin.getId()).with(rol("ADMIN"))).andExpect(status().isBadRequest());
  }

  @Test
  void operadorPuedeLeerDependenciasPeroNoAdministrarlas() throws Exception {
    for (String path : List.of(
      "/api/produccion/formulas",
      "/api/produccion/ordenes",
      "/api/gestion/almacenes",
      "/api/articulos",
      "/api/reportes/produccion",
      "/api/reportes/stock"
    ))
      mvc.perform(get(path).with(rol("OPERARIO_PLANTA"))).andExpect(status().isOk());
    mvc.perform(get("/api/administracion/roles").with(rol("OPERARIO_PLANTA"))).andExpect(status().isForbidden());
    mvc
      .perform(
        post("/api/gestion/empresas")
          .with(rol("OPERARIO_PLANTA"))
          .contentType("application/json")
          .content("{\"ruc\":\"20900000001\",\"razonSocial\":\"No autorizado\"}")
      )
      .andExpect(status().isForbidden());
  }

  @Test
  void reporteFiltraEstadosYValidaFechas() throws Exception {
    var o = ordenes.planificar(formula.getId(), almacen, almacen, BigDecimal.ONE);
    ordenes.cancelar(o.getId());
    mvc
      .perform(get("/api/reportes/produccion?estado=CANCELADA").with(rol("OPERARIO_PLANTA")))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$[0].estado").value("CANCELADA"));
    mvc
      .perform(get("/api/reportes/produccion?desde=2026-12-02&hasta=2026-01-01").with(rol("OPERARIO_PLANTA")))
      .andExpect(status().isBadRequest());
  }

  long crearRegistro(String recurso, String body) throws Exception {
    String json = mvc
      .perform(
        post("/api/gestion/" + recurso)
          .with(rol("ADMIN"))
          .contentType("application/json")
          .content(body)
      )
      .andExpect(status().isOk())
      .andReturn()
      .getResponse()
      .getContentAsString();
    return ((Number) com.jayway.jsonpath.JsonPath.read(json, "$.id")).longValue();
  }

  @Test
  void crudInstitucionalCompletoConRelaciones() throws Exception {
    long e = crearRegistro("empresas", "{\"ruc\":\"20987654321\",\"razonSocial\":\"Empresa temporal\"}");
    long s = crearRegistro("sucursales", "{\"nombre\":\"Sucursal temporal\",\"empresa\":{\"id\":" + e + "}}");
    long a = crearRegistro(
      "almacenes",
      "{\"nombre\":\"Almacén temporal\",\"tipo\":\"GENERAL\",\"sucursal\":{\"id\":" + s + "}}"
    );
    long t = crearRegistro("tiendas", "{\"nombre\":\"Tienda temporal\",\"sucursal\":{\"id\":" + s + "}}");
    mvc
      .perform(
        put("/api/gestion/empresas/" + e)
          .with(rol("ADMIN"))
          .contentType("application/json")
          .content("{\"ruc\":\"20987654321\",\"razonSocial\":\"Empresa editada\"}")
      )
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.razonSocial").value("Empresa editada"));
    mvc
      .perform(
        put("/api/gestion/sucursales/" + s)
          .with(rol("ADMIN"))
          .contentType("application/json")
          .content("{\"nombre\":\"Sucursal editada\",\"empresa\":{\"id\":" + e + "}}")
      )
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.empresa.id").value(e));
    mvc
      .perform(
        put("/api/gestion/almacenes/" + a)
          .with(rol("ADMIN"))
          .contentType("application/json")
          .content("{\"nombre\":\"Almacén editado\",\"tipo\":\"INSUMOS\",\"sucursal\":{\"id\":" + s + "}}")
      )
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.tipo").value("INSUMOS"));
    mvc
      .perform(
        put("/api/gestion/tiendas/" + t)
          .with(rol("ADMIN"))
          .contentType("application/json")
          .content("{\"nombre\":\"Tienda editada\",\"sucursal\":{\"id\":" + s + "}}")
      )
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.nombre").value("Tienda editada"));
    for (String path : List.of("tiendas/" + t, "almacenes/" + a, "sucursales/" + s, "empresas/" + e)) {
      mvc.perform(delete("/api/gestion/" + path).with(rol("ADMIN"))).andExpect(status().isOk());
      mvc.perform(get("/api/gestion/" + path).with(rol("ADMIN"))).andExpect(status().isBadRequest());
    }
  }

  @Test
  void rolNuevoPermiteAsignarVariosPermisosEditarYEliminar() throws Exception {
    long id = crearRegistro("roles", "{\"nombre\":\"SUPERVISOR_API\",\"descripcion\":\"Prueba\"}");
    long prod = permisos.findByNombre("OPERAR_PRODUCCION").orElseThrow().getId();
    long compras = permisos.findByNombre("OPERAR_COMPRAS").orElseThrow().getId();
    mvc
      .perform(
        put("/api/administracion/roles/" + id + "/permisos")
          .with(rol("ADMIN"))
          .contentType("application/json")
          .content("{\"permisoIds\":[" + prod + "," + compras + "]}")
      )
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.permisos.length()").value(2));
    mvc
      .perform(
        put("/api/gestion/roles/" + id)
          .with(rol("ADMIN"))
          .contentType("application/json")
          .content("{\"nombre\":\"SUPERVISOR_API\",\"descripcion\":\"Editado\"}")
      )
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.descripcion").value("Editado"));
    mvc.perform(delete("/api/gestion/roles/" + id).with(rol("ADMIN"))).andExpect(status().isOk());
    mvc.perform(get("/api/gestion/roles/" + id).with(rol("ADMIN"))).andExpect(status().isBadRequest());
  }
}
