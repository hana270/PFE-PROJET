package com.example.gestionbassins.entities;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.stream.Collectors;

@Data
@NoArgsConstructor
@Entity
public class PanierItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne
    @JoinColumn(name = "bassin_id")
    private Bassin bassin;
    
    private Long bassinPersonnaliseId;
    private int quantity;
    
    // Customization fields
    @Column(columnDefinition = "TEXT")
    private String materiauSelectionne;
    
    @Column(columnDefinition = "TEXT")
    private String dimensionSelectionnee;
    
    @Column(columnDefinition = "TEXT")
    private String couleurSelectionnee;
    
    @Column(columnDefinition = "TEXT")
    private String accessoiresSelectionnes; // JSON string
    
    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean isCustomized = false;
    
    // Price fields
    private Double prixOriginal;
    private Double prixPromo;
    private Double customPrice;
    
    // Promotion fields
    private String nomPromotion;
    private Double tauxReduction;
    private Boolean promotionActive = false;
    
    // Expiration fields
    private LocalDateTime createdAt;
    private LocalDateTime expiresAt;
    
    @ManyToOne
    @JoinColumn(name = "panier_id")
    @JsonBackReference
    private Panier panier;

    
    @ElementCollection
    @CollectionTable(name = "panier_item_properties", joinColumns = @JoinColumn(name = "panier_item_id"))
    @MapKeyColumn(name = "property_key")
    @Column(name = "property_value", columnDefinition = "TEXT")
    private Map<String, String> customProperties;

  

    // For Map<String, String> input
    public void setCustomProperties(Map<String, String> stringMap) {
        this.customProperties = stringMap;
    }
    

    // Getter et setter standard
    public Map<String, String> getCustomProperties() {
        return customProperties;
    }
    
    public void setCustomPropertiesFromObjects(Map<String, Object> objectMap) {
        if (objectMap != null) {
            this.customProperties = objectMap.entrySet().stream()
                .collect(Collectors.toMap(
                    Map.Entry::getKey,
                    e -> e.getValue() != null ? e.getValue().toString() : null
                ));
        }
    }
    
    @PrePersist
    protected void onPersist() {
        this.createdAt = LocalDateTime.now();
        if (panier != null && panier.getUserId() == null) {
            this.expiresAt = LocalDateTime.now().plusHours(2);
        }
        
        if (this.bassin != null && this.quantity > this.bassin.getStock()) {
            throw new IllegalStateException("Quantité demandée supérieure au stock disponible");
        }
    }

    // Constructor for standard bassin
    public PanierItem(Bassin bassin, int quantity) {
        this.bassin = bassin;
        this.quantity = quantity;
        this.prixOriginal = bassin.getPrix();
        if (bassin.getPromotionActive() && bassin.getPromotion() != null) {
            this.promotionActive = true;
            this.nomPromotion = bassin.getPromotion().getNomPromotion();
            this.tauxReduction = bassin.getPromotion().getTauxReduction();
            this.prixPromo = bassin.getPrix() * (1 - bassin.getPromotion().getTauxReduction() / 100);
        }
    }

    public PanierItem(Long bassinPersonnaliseId, int quantity, Double prixOriginal, 
                     String materiau, String dimension, String couleur, 
                     String accessoires, Promotion promotion) {
        this.bassinPersonnaliseId = bassinPersonnaliseId;
        this.quantity = quantity;
        this.prixOriginal = prixOriginal;
        this.isCustomized = true;
        this.materiauSelectionne = materiau;
        this.dimensionSelectionnee = dimension;
        this.couleurSelectionnee = couleur;
        this.accessoiresSelectionnes = accessoires;
        
        if (promotion != null) {
            this.promotionActive = true;
            this.nomPromotion = promotion.getNomPromotion();
            this.tauxReduction = promotion.getTauxReduction();
            this.prixPromo = prixOriginal * (1 - promotion.getTauxReduction() / 100);
        }
    }

    public Double getSubtotal() {
        if (isCustomized && customPrice != null) {
            return (promotionActive && prixPromo != null) ? prixPromo * quantity : customPrice * quantity;
        }
        return (promotionActive && prixPromo != null) ? prixPromo * quantity : prixOriginal * quantity;
    }

    public Double getEffectivePrice() {
        if (isCustomized && customPrice != null) {
            return (promotionActive && prixPromo != null) ? prixPromo : customPrice;
        }
        return (promotionActive && prixPromo != null) ? prixPromo : prixOriginal;
    }
    
    public boolean isExpired() {
        return expiresAt != null && LocalDateTime.now().isAfter(expiresAt);
    }

    public void validateStock() {
        if (this.bassin != null && this.quantity > this.bassin.getStock()) {
            throw new IllegalStateException("Quantité demandée supérieure au stock disponible");
        }
    }

    public boolean isAvailable() {
        if (bassin != null) {
            return bassin.isDisponible() && bassin.getStock() >= quantity;
        }
        return true; // Pour les bassins personnalisés, on suppose toujours disponible
    }
    
    /*********/
    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean customized = false;

    @Column(nullable = false, columnDefinition = "double precision default 0.0")
    private double effectivePrice = 0.0;

    @Column(nullable = false, columnDefinition = "double precision default 0.0")
    private double subtotal = 0.0;
   
   
    public boolean isPromotionActive() {
        return promotionActive;
    }
    
    public void setEffectivePrice(double effectivePrice) {
        this.effectivePrice = effectivePrice;
    }
}