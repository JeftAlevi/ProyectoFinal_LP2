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
@RequestMapping("/api/gestion/permisos")
@RequiredArgsConstructor
@Transactional
public class PermisoCrud {

  private final PermisoRepository repo;

  @GetMapping
  public List<Permiso> listar() {
    return repo.findAll();
  }

  @GetMapping("/{id}")
  public Permiso obtener(@PathVariable Long id) {
    return repo.findById(id).orElseThrow(() -> new IllegalArgumentException("Registro no encontrado"));
  }

  @PostMapping
  @PreAuthorize("hasRole('ADMIN')")
  public Permiso crear(@Valid @RequestBody Permiso r) {
    var e = new Permiso();
    e.setNombre(r.getNombre());
    e.setModulo(r.getModulo());
    e.setDescripcion(r.getDescripcion());
    return repo.save(e);
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasRole('ADMIN')")
  public Permiso actualizar(@PathVariable Long id, @Valid @RequestBody Permiso r) {
    var e = obtener(id);
    e.setNombre(r.getNombre());
    e.setModulo(r.getModulo());
    e.setDescripcion(r.getDescripcion());
    return repo.save(e);
  }

  @DeleteMapping("/{id}")
  @PreAuthorize("hasRole('ADMIN')")
  public void eliminar(@PathVariable Long id) {
    repo.delete(obtener(id));
    repo.flush();
  }
}
