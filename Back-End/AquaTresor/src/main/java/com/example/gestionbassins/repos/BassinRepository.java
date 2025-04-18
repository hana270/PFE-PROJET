package com.example.gestionbassins.repos;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.rest.core.annotation.RepositoryRestResource;

import com.example.gestionbassins.entities.Bassin;
import com.example.gestionbassins.entities.Categorie;


@RepositoryRestResource(path= "rest")
public interface BassinRepository extends JpaRepository<Bassin, Long> {
	
	List<Bassin> findByNomBassin(String nom);
	
	// spring va comprendre que spring cherche les participants ont le nom ...
	List<Bassin> findByNomBassinContains(String nom);
	
	
	
	//les paramètres nommées @param
	@Query("select b from Bassin b where b.nomBassin like %:nom% and b.prix > :prix")
	List<Bassin> findByNomPrix(@Param("nom") String nom, @Param("prix") Double prix);

	//Ecrire des requêtes @Query en passant des entités en paramètre
	@Query("select b from Bassin b where b.categorie= ?1")
	List<Bassin> findByCategorie(Categorie categorie);
	

	List<Bassin> findByCategorieIdCategorie(Long idCategorie);
	
	//ASC= ordre croissant 
	List<Bassin> findByOrderByNomBassinAsc();
	
	//DESC décroissant
	@Query("select b from Bassin b order by b.nomBassin ASC, b.prix DESC")
	List<Bassin> trierBassinNomPrix();
	
	//code image
	/*@Query("SELECT b FROM Bassin b LEFT JOIN FETCH b.images WHERE b.idBassin = :id")
    Optional<Bassin> findByIdWithImages(@Param("id") Long id);*/
	
	@Query("SELECT b FROM Bassin b LEFT JOIN FETCH b.imagesBassin WHERE b.idBassin = :id")
	Optional<Bassin> findByIdWithImages(@Param("id") Long id);
	
	 List<Bassin> findByArchiveFalse(); // Récupérer les bassins non archivés
	 List<Bassin> findByArchiveTrue(); 
}

