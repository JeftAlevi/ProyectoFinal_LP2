package pe.edu.upeu.bomerp.administracion.repository;

import pe.edu.upeu.bomerp.administracion.model.Permiso;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PermisoRepository extends JpaRepository<Permiso, Long> {
    List<Permiso> findByModulo(Permiso.Modulo modulo);
    Optional<Permiso> findByNombre(String nombre);
}
