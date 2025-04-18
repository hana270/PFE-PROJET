package com.example.gestionbassins.dto;

import com.example.gestionbassins.entities.Bassin;
import lombok.Data;

@Data
public class PanierItemDTO {
    private Long id;
    private Long bassinId;
    private Long bassinPersonnaliseId;
    private int quantity;
    
    // New fields for pricing
    private Double originalPrice;
    private Double promotionalPrice;
    private Double customPrice;
    
    private String nomBassin;
    private String imageStr;
    private String imagePath;
    private String dimensions;
    private String couleur;
    private String materiau;
    private String options;
    private Bassin bassin;

    // Getter for effective price
    public Double getEffectivePrice() {
        if (promotionalPrice != null) {
            return promotionalPrice;
        }
        if (customPrice != null) {
            return customPrice;
        }
        return bassin != null ? bassin.getPrix() : null;
    }
    // Getter pour bassinId
    public Long getBassinId() {
        return bassin != null ? bassin.getIdBassin() : null;
    }

    // Getter pour l'URL de l'image
    public String getImageUrl() {
        if (bassin != null && bassin.getImagesBassin() != null && !bassin.getImagesBassin().isEmpty()) {
            return "/api/imagesBassin/getFS/" + bassin.getImagesBassin().get(0).getImagePath();
        }
        return imageStr != null ? imageStr : "assets/default-image.webp"; // Image par défaut
    }
}