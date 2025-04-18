package com.example.gestionbassins.repos;

import com.example.gestionbassins.entities.Avis;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AvisRepository extends JpaRepository<Avis, Long> {
    List<Avis> findByBassinIdBassin(Long idBassin);
}