package pe.edu.upeu.bomerp.administracion.web;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.upeu.bomerp.administracion.service.Acceso;

@RestController
@RequiredArgsConstructor
public class SesionController {
    private final Acceso acceso;

    @GetMapping("/api/sesion")
    public Map<String, Object> sesion(Authentication autenticacion) {
        List<String> roles = autenticacion == null ? List.of() : autenticacion.getAuthorities().stream()
                .map(autoridad -> autoridad.getAuthority())
                .filter(nombre -> nombre.startsWith("ROLE_"))
                .map(nombre -> nombre.substring(5))
                .toList();
        String sub = autenticacion == null ? "" : Objects.toString(autenticacion.getName(), "");
        return Map.of("sub", sub, "roles", roles, "modulos", acceso.modulos(autenticacion));
    }
}
