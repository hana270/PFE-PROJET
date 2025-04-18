package com.example.gestionbassins.projections;

import com.example.gestionbassins.entities.Promotion;

public interface BassinPromotionInfo {
    Promotion getPromotion();
    boolean isPromotionActive();
    Double getPrixPromo();
    Double getPrixPromotionnel(); 
}