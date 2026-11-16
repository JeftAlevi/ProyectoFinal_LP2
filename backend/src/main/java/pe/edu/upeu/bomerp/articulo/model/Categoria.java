package pe.edu.upeu.bomerp.articulo.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

/** Categoría opcional de un artículo (por ejemplo: granos, alimento balanceado). */
@Entity
@Table(name = "categoria", schema = "bomerp")
@Getter
@Setter
public class Categoria {

  @Id
  @GeneratedValue(strategy = GenerationType.SEQUENCE)
  private Long id;

  @NotBlank
  @Column(unique = true, nullable = false)
  private String nombre;

  private boolean activo = true;
}
