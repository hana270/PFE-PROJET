package com.example.orders_microservice.entities;

import jakarta.persistence.*;
import lombok.Data;

import java.util.Map;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Data
@Entity
public class PanierItem {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private Long bassinId; // Stocke seulement l'ID du bassin
    
    @ManyToOne
    private Panier panier;
    
    private int quantity;
    private double prixOriginal;
    private Double prixPromo;
    private boolean customized;
    
    // Champs pour la promotion
    private boolean promotionActive;
    private String nomPromotion;
    private Double tauxReduction;
    
    // Customization fields
    private String materiauSelectionne;
    private String dimensionSelectionnee;
    private String couleurSelectionnee;
    
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb") // For PostgreSQL
    private Map<String, Object> customProperties;
    
    // Calculated fields
    private Double effectivePrice;
    private Double subtotal;
}