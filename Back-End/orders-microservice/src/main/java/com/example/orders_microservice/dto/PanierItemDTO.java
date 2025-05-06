package com.example.orders_microservice.dto;

import java.util.*;

import lombok.Data;

@Data
public class PanierItemDTO {
    private Long id;
    private Long bassinId;
    private String nomBassin;
    private String description;
    private String imageUrl;
    private Integer quantity;
    private Double prixOriginal;
    private Double prixPromo;
    private Double effectivePrice;
    private Double subtotal;
    private String status;
    private Boolean isCustomized;
    private Double basePrice;  
    // Promotion fields
    private Boolean promotionActive;
    private String nomPromotion;
    private Double tauxReduction;
    
    // Customization fields
    private String materialSelectionne;
    private String dimensionSelectionnee;
    private String couleurSelectionnee;
    private List<Long> accessoireIds;
    private List<AccessoireDTO> accessoires;
    
    // Pricing for customized items
    private Double prixMateriau;
    private Double prixDimension;
    private Double prixAccessoires;
    private Double prixEstime;
    private Double prixUnitaire;
    private String dureeFabrication;
    
    // Custom properties map
    private Map<String, Object> customProperties;
    private String orderDetails;
    
    // Ajouter les getters manquants
    public String getOrderDetails() {
        return this.orderDetails;
    }
    
    public String getDureeFabrication() {
        return this.dureeFabrication;
    }
    
    public String getNomBassin() {
        return this.nomBassin;
    }
    
    public boolean getIsCustomized() {
        return this.isCustomized;
    }
    

    private String materiauSelectionne;
    
    public Double getBasePrice() {
        return this.basePrice;
    }
}