package com.example.gestionbassins.service;

import com.example.gestionbassins.dto.PromotionDTO;
import com.example.gestionbassins.dto.UpdatePromotionDTO;
import com.example.gestionbassins.entities.Promotion;

import java.util.Date;
import java.util.List;

public interface PromotionService {
    Promotion createPromotion(PromotionDTO promotionDTO); // Ajoutez cette méthode
    Promotion applyPromotionToBassins(Long idPromotion, List<Long> bassinIds);
    Promotion applyPromotionToCategorie(Long idPromotion, Long idCategorie);
    List<Promotion> getAllPromotions();
    Promotion getPromotionById(Long id);
    void deletePromotion(Long id);
    public Promotion updatePromotion(Long id, UpdatePromotionDTO promotionDTO);
    // Nouvelles méthodes
    Promotion getActivePromotionForBassin(Long bassinId);
   
    
    List<Promotion> getOverlappingPromotionsForBassin(Long bassinId, Date dateDebut, Date dateFin);
    List<Promotion> getOverlappingPromotionsForCategorie(Long categorieId, Date dateDebut, Date dateFin); 
    }