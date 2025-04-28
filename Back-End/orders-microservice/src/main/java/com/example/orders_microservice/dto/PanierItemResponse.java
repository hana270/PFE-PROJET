package com.example.orders_microservice.dto;

import lombok.Data;
import java.util.List;

@Data
public class PanierItemResponse {
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
    
    private CustomizationDetailsDTO customization;
    private List<AccessoireDTO> accessoires;
    
    private Boolean promotionActive;
    private String nomPromotion;
    private Double tauxReduction;
}