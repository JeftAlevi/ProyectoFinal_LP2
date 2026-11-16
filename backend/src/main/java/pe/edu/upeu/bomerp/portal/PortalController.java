package pe.edu.upeu.bomerp.portal;

import jakarta.validation.Valid;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/** Portal público: recibe solicitudes de contacto y se las muestra a Ventas. */
@RestController
@RequiredArgsConstructor
public class PortalController {

  private final ContactoRepository repo;

  /** Público (sin login): guarda el mensaje del visitante. El id y la fecha los pone el servidor. */
  @PostMapping("/api/portal/contacto")
  public Map<String, String> contacto(@Valid @RequestBody Contacto r) {
    r.setId(null);
    r.setFecha(LocalDateTime.now());
    repo.save(r);
    return Map.of("message", "Solicitud enviada al equipo de ventas");
  }

  /** Solo usuarios con el módulo VENTAS ven las solicitudes. */
  @GetMapping("/api/ventas/contactos")
  @PreAuthorize("@acceso.permite(authentication,'VENTAS')")
  public List<Contacto> listar() {
    return repo.findAll();
  }
}
