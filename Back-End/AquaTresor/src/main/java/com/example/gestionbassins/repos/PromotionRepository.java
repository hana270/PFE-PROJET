package com.example.gestionbassins.repos;

import com.example.gestionbassins.entities.Promotion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import com.example.gestionbassins.entities.Promotion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Date;
import java.util.List;

@Repository 
public interface PromotionRepository extends JpaRepository<Promotion, Long> {
    
    // Trouver les promotions qui se chevauchent pour un bassin spécifique
    @Query("SELECT p FROM Promotion p JOIN p.bassins b WHERE b.idBassin = :bassinId " +
           "AND ((p.dateDebut <= :dateFin AND p.dateFin >= :dateDebut) " +
           "OR (p.dateDebut >= :dateDebut AND p.dateDebut <= :dateFin)) " +
           "AND (:promotionId IS NULL OR p.idPromotion != :promotionId)")
    List<Promotion> findOverlappingPromotionsForBassin(
        @Param("bassinId") Long bassinId, 
        @Param("dateDebut") Date dateDebut, 
        @Param("dateFin") Date dateFin,
        @Param("promotionId") Long promotionId);
        
    // Trouver les promotions qui se chevauchent pour une catégorie spécifique
    @Query("SELECT p FROM Promotion p JOIN p.categories c WHERE c.idCategorie = :categorieId " +
           "AND ((p.dateDebut <= :dateFin AND p.dateFin >= :dateDebut) " +
           "OR (p.dateDebut >= :dateDebut AND p.dateDebut <= :dateFin)) " +
           "AND (:promotionId IS NULL OR p.idPromotion != :promotionId)")
    List<Promotion> findOverlappingPromotionsForCategorie(
        @Param("categorieId") Long categorieId, 
        @Param("dateDebut") Date dateDebut, 
        @Param("dateFin") Date dateFin,
        @Param("promotionId") Long promotionId);



    @Query("SELECT p FROM Promotion p " +
            "JOIN p.bassins b " +
            "WHERE b.idBassin = :bassinId " +
            "AND p.dateDebut <= CURRENT_TIMESTAMP " +
            "AND p.dateFin >= CURRENT_TIMESTAMP")
     List<Promotion> findActivPromotionsForBassin(@Param("bassinId") Long bassinId);
 
    
    @Query("SELECT p FROM Promotion p JOIN p.bassins b WHERE b.idBassin = :bassinId " +
            "AND p.dateDebut <= :now AND p.dateFin >= :now")
     List<Promotion> findActivePromotionsForBassin(@Param("bassinId") Long bassinId, @Param("now") Date now);

    /********************/
    @Query("SELECT p FROM Promotion p " +
            "JOIN p.bassins b " +
            "WHERE b.idBassin = :bassinId " +
            "AND p.dateDebut <= :now " +
            "AND p.dateFin >= :now")
     Promotion findActivePromotionForBassin(@Param("bassinId") Long bassinId, @Param("now") Date now);
     @Query("SELECT p FROM Promotion p " +
            "JOIN p.bassins b " +
            "WHERE b.idBassin = :bassinId " +
            "AND ((p.dateDebut BETWEEN :dateDebut AND :dateFin) " +
            "OR (p.dateFin BETWEEN :dateDebut AND :dateFin) " +
            "OR (p.dateDebut <= :dateDebut AND p.dateFin >= :dateFin))")
     List<Promotion> findOverlappingPromotionsForBassin(
         @Param("bassinId") Long bassinId, 
         @Param("dateDebut") Date dateDebut,
         @Param("dateFin") Date dateFin);

     @Query("SELECT p FROM Promotion p " +
            "JOIN p.categories c " +
            "WHERE c.idCategorie = :categorieId " +
            "AND ((p.dateDebut BETWEEN :dateDebut AND :dateFin) " +
            "OR (p.dateFin BETWEEN :dateDebut AND :dateFin) " +
            "OR (p.dateDebut <= :dateDebut AND p.dateFin >= :dateFin))")
     List<Promotion> findOverlappingPromotionsForCategorie(
         @Param("categorieId") Long categorieId, 
         @Param("dateDebut") Date dateDebut,
         @Param("dateFin") Date dateFin);
    


}