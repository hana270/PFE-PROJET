package com.example.orders_microservice.dto;

import lombok.Data;

@Data
public class PanierItemDTO {
    private Long id;
    private Long bassinId;
    private Long bassinPersonnaliseId;
    private int quantity;
    
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

  
}