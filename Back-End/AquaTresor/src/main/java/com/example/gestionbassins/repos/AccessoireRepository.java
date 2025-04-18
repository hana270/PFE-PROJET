package com.example.gestionbassins.repos;

import com.example.gestionbassins.entities.Accessoire;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AccessoireRepository extends JpaRepository<Accessoire, Long> {
}