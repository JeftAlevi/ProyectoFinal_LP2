package pe.edu.upeu.bomerp.administracion.service;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.upeu.bomerp.administracion.model.Rol;
import pe.edu.upeu.bomerp.administracion.repository.RolRepository;

@Service("acceso")
@RequiredArgsConstructor
public class Acceso {
    private static final List<String> MODULOS_DEL_SISTEMA =
            List.of("ADMINISTRACION", "PRODUCCION", "INVENTARIO", "COMPRAS", "VENTAS");

    private final RolRepository roles;

    @Transactional(readOnly = true)
    public List<String> modulos(Authentication autenticacion) {
        if (autenticacion == null || !autenticacion.isAuthenticated()) return List.of();
        Set<String> nombres = new LinkedHashSet<>();
        autenticacion.getAuthorities().forEach(autoridad -> {
            String valor = autoridad.getAuthority();
            if (valor.startsWith("ROLE_")) nombres.add(valor.substring(5));
        });
        if (nombres.contains("ADMIN")) return MODULOS_DEL_SISTEMA;

        Set<String> permitidos = new LinkedHashSet<>();
        for (Rol rol : roles.findAll()) {
            if (!rol.isActivo() || !nombres.contains(rol.getNombre())) continue;
            rol.getPermisos().forEach(permiso -> {
                String modulo = permiso.getModulo().name();
                // La administracion de usuarios y permisos se reserva al rol ADMIN.
                if (!modulo.equals("ADMINISTRACION") && MODULOS_DEL_SISTEMA.contains(modulo)) {
                    permitidos.add(modulo);
                }
            });
        }
        return List.copyOf(permitidos);
    }

    @Transactional(readOnly = true)
    public boolean permite(Authentication autenticacion, String modulo) {
        return modulos(autenticacion).contains(modulo);
    }

    public boolean admin(Authentication autenticacion) {
        return autenticacion != null && autenticacion.getAuthorities().stream()
                .anyMatch(autoridad -> autoridad.getAuthority().equals("ROLE_ADMIN"));
    }
}
