package com.example.orders_microservice.dto;

import lombok.Data;
import java.util.Map;

@Data
public class PanierItemResponse {
    private Long id;
    private int quantity;
    private Long bassinId;
    private boolean customized; // Ajout du champ customized
    
    // Customization fields
    private String materiau;
    private String dimension;
    private String couleur;
    private Map<String, Object> customProperties; // Renommage pour cohérence
    
    // Product info
    private String nomBassin;
    private String description;
    private Integer stock;
    private String imageUrl;
    
    // Price information
    private Double prixOriginal;
    private Double prixPromo;
    private Double effectivePrice;
    private Double subtotal;
    
    // Promotion information
    private Boolean promotionActive;
    private String nomPromotion;
    private Double tauxReduction;
}