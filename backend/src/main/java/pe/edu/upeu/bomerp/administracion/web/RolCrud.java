package pe.edu.upeu.bomerp.administracion.web;

import jakarta.validation.Valid;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import pe.edu.upeu.bomerp.administracion.model.*;
import pe.edu.upeu.bomerp.administracion.repository.*;

@RestController
@RequestMapping("/api/gestion/roles")
@RequiredArgsConstructor
@Transactional
public class RolCrud {

  private final RolRepository repo;
  private final pe.edu.upeu.bomerp.administracion.service.RolService servicio;

  @GetMapping
  public List<Rol> listar() {
    return repo.findAll();
  }

  @GetMapping("/{id}")
  public Rol obtener(@PathVariable Long id) {
    return repo.findById(id).orElseThrow(() -> new IllegalArgumentException("Registro no encontrado"));
  }

  @PostMapping
  @PreAuthorize("hasRole('ADMIN')")
  public Rol crear(@Valid @RequestBody Rol r) {
    return servicio.crear(r);
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasRole('ADMIN')")
  public Rol actualizar(@PathVariable Long id, @Valid @RequestBody Rol r) {
    var e = obtener(id);
    servicio.validarCambioNombre(e, r.getNombre());
    e.setNombre(r.getNombre());
    e.setDescripcion(r.getDescripcion());
    return repo.save(e);
  }

  @DeleteMapping("/{id}")
  @PreAuthorize("hasRole('ADMIN')")
  public void eliminar(@PathVariable Long id) {
    var e = obtener(id);
    servicio.validarEliminacion(e);
    repo.delete(e);
    repo.flush();
  }
}
