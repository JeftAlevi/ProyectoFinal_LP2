package pe.edu.upeu.bomerp.administracion.service;

import java.util.LinkedHashMap;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.upeu.bomerp.administracion.model.Permiso;
import pe.edu.upeu.bomerp.administracion.model.Rol;
import pe.edu.upeu.bomerp.administracion.repository.PermisoRepository;
import pe.edu.upeu.bomerp.administracion.repository.RolRepository;

@Component
@RequiredArgsConstructor
public class RolesIniciales implements CommandLineRunner {
    private final RolRepository roles;
    private final PermisoRepository permisos;

    @Override
    @Transactional
    public void run(String... args) {
        var mapa = new LinkedHashMap<String, Permiso>();
        for (var modulo : List.of(Permiso.Modulo.ADMINISTRACION, Permiso.Modulo.COMPRAS,
                Permiso.Modulo.INVENTARIO, Permiso.Modulo.PRODUCCION, Permiso.Modulo.VENTAS)) {
            String nombre = "OPERAR_" + modulo;
            var permiso = permisos.findByNombre(nombre).orElseGet(() -> {
                var nuevo = new Permiso();
                nuevo.setNombre(nombre);
                nuevo.setModulo(modulo);
                nuevo.setDescripcion("Acceso al módulo " + modulo);
                return permisos.save(nuevo);
            });
            mapa.put(modulo.name(), permiso);
        }
        for (String nombre : List.of("ADMIN", "COMPRADOR", "ALMACENERO", "OPERARIO_PLANTA", "VENDEDOR")) {
            if (roles.findByNombre(nombre).isPresent()) continue; // No cambiar permisos editados por el usuario.
            var rol = new Rol();
            rol.setNombre(nombre);
            rol.setDescripcion("Rol inicial del ERP");
            String modulo = switch (nombre) {
                case "COMPRADOR" -> "COMPRAS";
                case "ALMACENERO" -> "INVENTARIO";
                case "OPERARIO_PLANTA" -> "PRODUCCION";
                case "VENDEDOR" -> "VENTAS";
                default -> "ADMINISTRACION";
            };
            rol.getPermisos().add(mapa.get(modulo));
            roles.save(rol);
        }
    }
}
