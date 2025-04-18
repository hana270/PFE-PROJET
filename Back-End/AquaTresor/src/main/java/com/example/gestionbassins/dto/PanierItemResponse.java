package com.example.gestionbassins.dto;

import lombok.Data;
import java.util.Map;

@Data
public class PanierItemResponse {
    private Long id;
    private int quantity;
    private BassinDTO bassin; 
    private Long bassinPersonnaliseId;
    private Long bassinId;  // Ajout du champ bassinId
    
    // Customization fields
    private String materiau;
    private String dimension;
    private String couleur;
    private String accessoires;
    
    // Price information
    private Double prixOriginal;
    private Double prixPromo;
    private Double customPrice;
    private Double effectivePrice;
    
    // Promotion information
    private Boolean promotionActive;
    private String nomPromotion;
    private Double tauxReduction;
    
    // Additional product info
    private String imageUrl;
    private String nomBassin;
    
    // Subtotal for this item
    private Double subtotal;
    
    // Accessories for custom products
    private Map<String, Object> accessoiresDetails;
    
    
 // In PanierItemResponse.java
    private Integer stock;
    private String description;

    public Integer getStock() {
        return stock;
    }

    public void setStock(Integer stock) {
        this.stock = stock;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }
    
    // Ajout du setter pour bassinId
    public void setBassinId(Long bassinId) {
        this.bassinId = bassinId;
    }
}