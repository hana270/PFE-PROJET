package com.example.orders_microservice.entities;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
public class BassinCustomization {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String materiauSelectionne;
    private Double prixMateriau;
    
    private String dimensionSelectionnee;
    private Double prixDimension;
    
    private String couleurSelectionnee;
    
    private Double prixEstime;
    private String dureeFabrication;
    
    @OneToOne(mappedBy = "customization")
    private PanierItem panierItem;
}