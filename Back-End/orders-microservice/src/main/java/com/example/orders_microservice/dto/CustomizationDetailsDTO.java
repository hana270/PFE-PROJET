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
    private String dureeFabrication;
}