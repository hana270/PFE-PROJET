package com.example.orders_microservice.entities;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "bassin_customization")
@Data
@NoArgsConstructor
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
    
    // Assurez-vous que la durée de fabrication est stockée comme une chaîne
    // ce qui semble être le cas dans votre code
    private String dureeFabrication;
    
    @OneToOne
    @JoinColumn(name = "panier_item_id")
    private PanierItem panierItem;
}
