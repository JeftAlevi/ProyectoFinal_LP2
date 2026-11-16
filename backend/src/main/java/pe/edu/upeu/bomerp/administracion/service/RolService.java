package pe.edu.upeu.bomerp.administracion.service;

import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.upeu.bomerp.administracion.model.Permiso;
import pe.edu.upeu.bomerp.administracion.model.Rol;
import pe.edu.upeu.bomerp.administracion.repository.PermisoRepository;
import pe.edu.upeu.bomerp.administracion.repository.RolRepository;

@Service
@RequiredArgsConstructor
@Transactional
public class RolService {

  private final RolRepository rolRepository;
  private final PermisoRepository permisoRepository;

  private static final Set<String> ROLES_INICIALES = Set.of(
    "ADMIN",
    "COMPRADOR",
    "ALMACENERO",
    "OPERARIO_PLANTA",
    "VENDEDOR"
  );

  public void validarNombre(String nombre) {
    if (nombre == null || !nombre.matches("[A-Z][A-Z0-9_]{1,79}")) {
      throw new IllegalArgumentException(
        "Usa de 2 a 80 caracteres: mayúsculas, números y guion bajo. Debe coincidir con Keycloak."
      );
    }
  }

  public void validarCambioNombre(Rol rol, String nombre) {
    validarNombre(nombre);
    if (ROLES_INICIALES.contains(rol.getNombre()) && !rol.getNombre().equals(nombre)) {
      throw new IllegalArgumentException(
        "No se puede renombrar un rol inicial; sus usuarios están configurados en Keycloak."
      );
    }
  }

  public void validarEliminacion(Rol rol) {
    if (ROLES_INICIALES.contains(rol.getNombre())) {
      throw new IllegalArgumentException(
        "No se puede eliminar un rol inicial. Configura sus permisos para controlar el acceso."
      );
    }
  }

  public Rol crear(Rol rol) {
    validarNombre(rol.getNombre());
    rol.setId(null);
    rol.setPermisos(new java.util.HashSet<>());
    return rolRepository.save(rol);
  }

  @Transactional(readOnly = true)
  public List<Rol> listar() {
    return rolRepository.findAll();
  }

  @Transactional(readOnly = true)
  public Rol obtener(Long id) {
    return rolRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Rol no encontrado: " + id));
  }

  public Rol asignarPermisos(Long rolId, Set<Long> permisoIds) {
    Rol rol = obtener(rolId);
    if (rol.getNombre().equals("ADMIN")) throw new IllegalArgumentException(
      "ADMIN conserva acceso completo al sistema; configura los demás roles."
    );
    if (permisoIds == null) throw new IllegalArgumentException("Selecciona los permisos");
    var encontrados = permisoRepository.findAllById(permisoIds);
    if (encontrados.size() != permisoIds.size()) throw new IllegalArgumentException("Permiso inexistente");
    if (
      !rol.getNombre().equals("ADMIN") &&
      encontrados.stream().anyMatch(p -> p.getModulo() == Permiso.Modulo.ADMINISTRACION)
    ) {
      throw new IllegalArgumentException("El módulo Administración solo corresponde al rol ADMIN");
    }
    rol.setPermisos(new java.util.HashSet<>(encontrados));
    return rolRepository.save(rol);
  }
}
