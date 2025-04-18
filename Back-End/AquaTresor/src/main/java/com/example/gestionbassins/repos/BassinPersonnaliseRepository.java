package com.example.gestionbassins.repos;

import com.example.gestionbassins.entities.BassinPersonnalise;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BassinPersonnaliseRepository extends JpaRepository<BassinPersonnalise, Long> {
	 @Query("SELECT bp FROM BassinPersonnalise bp JOIN FETCH bp.accessoires WHERE bp.bassin.idBassin = :idBassin")
	    BassinPersonnalise trouverBassinPersonnaliseParIdBassin(@Param("idBassin") Long idBassin);
	 
	// Méthode corrigée pour rechercher un BassinPersonnalise par l'ID du bassin
	    @Query("SELECT bp FROM BassinPersonnalise bp WHERE bp.bassin.idBassin = :idBassin")
	    BassinPersonnalise findByBassinId(@Param("idBassin") Long idBassin);
}