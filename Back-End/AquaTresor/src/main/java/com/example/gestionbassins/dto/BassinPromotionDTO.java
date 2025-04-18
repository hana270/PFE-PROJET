package com.example.gestionbassins.dto;

import com.example.gestionbassins.entities.Categorie;
import com.example.gestionbassins.entities.Promotion;
import com.example.gestionbassins.projections.BassinBase;
import com.example.gestionbassins.projections.BassinPromotionInfo;

import lombok.Data;

@Data
public class BassinPromotionDTO implements BassinBase, BassinPromotionInfo {
    private Long idBassin;
    private String nomBassin;
    private String description;
    private Double prix;
    private String materiau;
    private String couleur;
    private String dimensions;
    private boolean disponible;
    private int stock;
    private Categorie categorie;
    private String image3DPath;
    private Promotion promotion;
    private boolean promotionActive;
    private Double prixPromo;

    @Override
    public Double getPrixPromotionnel() {
        if (promotionActive && promotion != null) {
            return prix * (1 - (promotion.getTauxReduction() / 100));
        }
        return prix;
    }
}