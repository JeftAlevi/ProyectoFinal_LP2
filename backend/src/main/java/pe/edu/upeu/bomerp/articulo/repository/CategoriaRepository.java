package pe.edu.upeu.bomerp.articulo.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.edu.upeu.bomerp.articulo.model.Categoria;

public interface CategoriaRepository extends JpaRepository<Categoria, Long> {}
