package pe.edu.upeu.bomerp.portal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

/** Mensaje enviado desde el formulario de contacto del portal público. Ventas lo consulta. */
@Entity
@Table(name = "solicitud_contacto", schema = "bomerp")
@Getter
@Setter
public class Contacto {

  @Id
  @GeneratedValue(strategy = GenerationType.SEQUENCE)
  private Long id;

  @NotBlank
  @Size(max = 120)
  private String nombre;

  @NotBlank
  @Email
  private String email;

  @NotBlank
  @Size(max = 1000)
  @Column(length = 1000)
  private String mensaje;

  private LocalDateTime fecha = LocalDateTime.now();
}
