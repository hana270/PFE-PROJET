package com.example.orders_microservice.entities;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Entity
@Table(name = "panier_items")
@Data
@NoArgsConstructor
public class PanierItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne
    @JoinColumn(name = "panier_id")
    private Panier panier;
    
    private Long bassinId;
    private String nomBassin;
    private String description;
    private String imageUrl;
    private Integer quantity;
    private Double prixOriginal;
    private Double prixPromo;
    private Double prixUnitaire;
    
    @Column(nullable = false)
    private Double effectivePrice = 0.0;
    
    private Double subtotal;
    private String status;
    private LocalDateTime addedAt;
    private Boolean isCustomized = false;
    
    // Champs pour les bassins personnalisés
    private String materiauSelectionne;
    private Double prixMateriau;
    private String dimensionSelectionnee;
    private Double prixDimension;
    private String couleurSelectionnee;
    private Double prixAccessoires;
    private Double prixEstime;
    
    // S'assurer que la durée de fabrication est cohérente avec les autres méthodes
    private String dureeFabrication;
    
    @OneToOne(mappedBy = "panierItem", cascade = CascadeType.ALL, orphanRemoval = true)
    private BassinCustomization customization;
    
    @OneToMany(mappedBy = "panierItem", cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    private List<PanierItemAccessoire> accessoires;
    
    
    // Propriétés pour la promotion
    private Boolean promotionActive = false; 
    private String nomPromotion;
    private Double tauxReduction;
    
    private String customizationId;

    
    public Boolean getPromotionActive() {
        return this.promotionActive;
    }

    public void setPromotionActive(Boolean promotionActive) {
        this.promotionActive = promotionActive != null ? promotionActive : false;
    }

    // Keep this for compatibility with existing code
    public boolean isPromotionActive() {
        return Boolean.TRUE.equals(this.promotionActive);
    }
    
    public String getCustomizationId() {
        return customizationId;
    }
    
    public void setCustomizationId(String customizationId) {
        this.customizationId = customizationId;
    }
    
    public String getMateriauSelectionne() {
        return this.materiauSelectionne;
    }

    public String getDimensionSelectionnee() {
        return this.dimensionSelectionnee;
    }

    public String getCouleurSelectionnee() {
        return this.couleurSelectionnee;
    }

    public String getDureeFabrication() {
        return this.dureeFabrication;
    }

    // Méthode pour obtenir les IDs des accessoires
    public List<Long> getAccessoireIds() {
        if (accessoires == null) {
            return null;
        }
        return accessoires.stream()
                .map(PanierItemAccessoire::getAccessoireId)
                .collect(Collectors.toList());
    }

    
    private String orderDetails;

    public String getOrderDetails() {
        return this.orderDetails;
    }

    public void setOrderDetails(String orderDetails) {
        this.orderDetails = orderDetails;
    }
    
    
    
    public void setEffectivePrice(Double effectivePrice) {
        this.effectivePrice = effectivePrice != null ? effectivePrice : 0.0;
    }
    
    // Add this method to calculate effective price if not set
    public Double getEffectivePrice() {
        if (this.effectivePrice == null) {
            this.effectivePrice = calculateEffectivePrice();
        }
        return this.effectivePrice;
    }
    
    private Double calculateEffectivePrice() {
        if (this.isCustomized) {
            return (this.prixOriginal != null ? this.prixOriginal : 0.0) 
                 + (this.prixMateriau != null ? this.prixMateriau : 0.0)
                 + (this.prixDimension != null ? this.prixDimension : 0.0)
                 + (this.prixAccessoires != null ? this.prixAccessoires : 0.0);
        } else if (this.promotionActive && this.tauxReduction != null) {
            return this.prixOriginal * (1 - (this.tauxReduction / 100));
        } else {
            return this.prixOriginal != null ? this.prixOriginal : 0.0;
        }
    }
    
}