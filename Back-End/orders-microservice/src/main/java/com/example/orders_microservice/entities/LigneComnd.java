package com.example.orders_microservice.entities;


import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.*;
import jakarta.persistence.OneToMany;
import lombok.Data;

@Entity
@Data
public class LigneComnd {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private Long produitId;
    private String typeProduit; // BASSIN_STANDARD, BASSIN_PERSONNALISE
    
    private String nomProduit;
    private String description;
    private String imageUrl;
    
    private Integer quantite;
    private Double prixUnitaire;
    private Double prixTotal;
    
    // Pour les bassins personnalisés
    private String materiauSelectionne;
    private Double prixMateriau;
    private String dimensionSelectionnee;
    private Double prixDimension;
    private String couleurSelectionnee;
    
    private String statutProduit; // DISPONIBLE, SUR_COMMANDE
    private String delaiFabrication;
    
    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    private List<AccessoirCommande> accessoires = new ArrayList<>();
    
}


