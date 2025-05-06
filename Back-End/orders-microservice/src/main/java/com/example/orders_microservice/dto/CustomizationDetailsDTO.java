package com.example.orders_microservice.dto;

import lombok.Data;

@Data
public class CustomizationDetailsDTO {
    private String materiauSelectionne;
    private Double prixMateriau;
    private String dimensionSelectionnee;
    private Double prixDimension;
    private String couleurSelectionnee;
    private Double prixEstime;
    
    // Correction: S'assurer que la durée de fabrication est stockée comme String
    // car selon votre code, ça semble être le format utilisé dans PanierItem
    private String dureeFabrication;
}