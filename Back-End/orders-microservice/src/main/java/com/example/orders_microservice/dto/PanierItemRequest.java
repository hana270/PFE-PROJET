package com.example.orders_microservice.dto;

import lombok.Data;
import org.apache.commons.lang3.Validate;
import java.util.ArrayList;
import java.util.List;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.*;

@Data
public class PanierItemRequest {
    private Long bassinId;
    private Long bassinPersonnaliseId; 
   
    @Min(1)
    private Integer quantity;
    
    // Customization fields
    private Boolean isCustomized;  // Added this field
   
    @NotBlank(message = "La sélection du matériau est obligatoire pour les bassins personnalisés", 
            groups = CustomValidationGroup.class)
    private String materiauSelectionne;
    
    @NotBlank(message = "La sélection des dimensions est obligatoire pour les bassins personnalisés", 
            groups = CustomValidationGroup.class)
    private String dimensionSelectionnee;
    
    private String couleurSelectionnee;
    private List<Long> accessoireIds;
    private Integer dureeFabrication;
    
    // Promotion fields
    private Long promotionId;
    private String nomPromotion;
    private Double tauxReduction;
    private Boolean promotionActive;
    private Double prixPromo;
    
    // Pricing
    @NotNull
    @Positive
    private Double prixOriginal;
    
    @PositiveOrZero
    private Double prixMateriau;
    
    @PositiveOrZero
    private Double prixDimension;
    
    @PositiveOrZero
    private Double prixAccessoires;

    @NotNull(message = "Le prix estimé est obligatoire pour les bassins personnalisés", 
            groups = CustomValidationGroup.class)
    @Positive(message = "Le prix estimé doit être positif", 
              groups = CustomValidationGroup.class)
    private Double prixEstime;
    
    // Bassin info
    @NotBlank
    private String nomBassin;
    private String imageUrl;
    private String status;
    
    // Bassin base info (for custom items)
    private BassinBaseInfo bassinBase;
    
    // Customization ID
    private String customizationId;  // Added this field
    
    @Data
    public static class BassinBaseInfo {
        private Long id;
        private String nom;
        private String imageUrl;
        private Double prix;
    }
    
    public void validateForCustomBassin() {
        if (isCustomized) {
            if (materiauSelectionne == null || materiauSelectionne.trim().isEmpty()) {
                throw new IllegalArgumentException("Material selection is required for customized items");
            }
            if (dimensionSelectionnee == null || dimensionSelectionnee.trim().isEmpty()) {
                throw new IllegalArgumentException("Dimension selection is required for customized items");
            }
            if (prixEstime == null) {
                throw new IllegalArgumentException("Estimated price is required for customized items");
            }
            if (prixEstime <= 0) {
                throw new IllegalArgumentException("Estimated price must be positive for customized items");
            }
        }
    }
    
    public interface CustomValidationGroup {}
    
    // Getters for the new fields
    public Boolean getIsCustomized() {
        return isCustomized;
    }
    
    public String getCustomizationId() {
        return customizationId;
    }
}