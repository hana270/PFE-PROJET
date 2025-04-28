package com.example.orders_microservice.entities;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import org.hibernate.annotations.CreationTimestamp;


@Entity
@Table(name = "panier_items")
@Data
public class PanierItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    @CreationTimestamp
    private LocalDateTime addedAt;
    
    @ManyToOne
    @JoinColumn(name = "panier_id")
    private Panier panier;
    
    private String nomBassin;
    private String description;
    private String imageUrl;
    
    // Order info
    private Integer quantity;
    private Double prixPromo;
    private Double effectivePrice;  // Added persistent field
    private Double subtotal;       // Added persistent field

    // Customization fields
    
    @Column(name = "is_customized")
    private Boolean isCustomized;
    
    @ManyToOne
    @JoinColumn(name = "customization_id")
    private BassinCustomization customization;
    
    // Quick-access fields
    @Column(name = "materiau_selectionne")
    private String materiauSelectionne;
    
    @Column(name = "dimension_selectionnee")
    private String dimensionSelectionnee;
    
    @Column(name = "couleur_selectionnee")
    private String couleurSelectionnee;
    
    @Column(name = "prix_unitaire")
    private Double prixUnitaire;
    
    @Column(name = "duree_fabrication")
    private String dureeFabrication;
    
    @Column(name = "status")
    private String status;
    
    @Column(name = "bassin_id")
    private Long bassinId;
    
    // Promotion fields
    private Boolean promotionActive;
    private Double tauxReduction;
    private String nomPromotion;
    private Boolean isPromotionActive; 
    
    @Column(name = "customization_id_value")  // Different from the FK column
    private String customizationId;
    
 // Pricing
    private Double prixOriginal;
    private Double prixMateriau;
    private Double prixDimension;
    private Double prixAccessoires;
    private Double prixEstime;
    
    
   
    private List<Long> accessoireIds;
    
    // Accessories
    @OneToMany(mappedBy = "panierItem", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PanierItemAccessoire> accessoires;
    


    // Methods for calculated fields
    public Double getEffectivePrice() {
        if (this.promotionActive != null && this.promotionActive && this.prixPromo != null) {
            return this.prixPromo;
        }
        return this.prixOriginal != null ? this.prixOriginal : 0.0;
    }
    
    public void setEffectivePrice(Double effectivePrice) {
        this.effectivePrice = effectivePrice;
    }
    
    public Double getSubtotal() {
        return getEffectivePrice() * (quantity != null ? quantity : 0);
    }
    
    public void setSubtotal(Double subtotal) {
        this.subtotal = subtotal;
    }
    
    public Boolean isPromotionActive() {
        return this.promotionActive != null ? this.promotionActive : false;
    }
    
    public String getCustomizationId() {
        return this.customizationId;
    }

    public void setCustomizationId(String customizationId) {
        this.customizationId = customizationId;
    }

   public String getFormattedFabricationTime() {
        if (isCustomized || "SUR_COMMANDE".equalsIgnoreCase(status)) {
            return dureeFabrication;
        }
        return null;
    }
}