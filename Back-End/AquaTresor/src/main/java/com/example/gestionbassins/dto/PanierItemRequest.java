package com.example.gestionbassins.dto;

import java.util.Map;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class PanierItemRequest {
	
	 @NotNull(message = "Either bassinId or customized must be true")
	    private Long bassinId;
	    
	    @NotNull(message = "Quantity is required")
	    @Min(value = 1, message = "Quantity must be at least 1")
	    private Integer quantity;
	   
	    private Double prixOriginal;
	    private Long promotionId;
	    private String nomPromotion;
	    private Double tauxReduction;
	    private String sessionId;
	    
	    // Customization fields
	    private String materiauSelectionne;
	    private String dimensionSelectionnee;
	    private String couleurSelectionnee;
	    private Map<String, String> customProperties; 
	    
	    private boolean customized;

	    public Map<String, String> getCustomProperties() {
	        return customProperties;
	    }

	    public void setCustomProperties(Map<String, String> customProperties) {
	        this.customProperties = customProperties;
	    }
	    
	    public boolean isCustomized() {
	        return customized || materiauSelectionne != null || dimensionSelectionnee != null || couleurSelectionnee != null;
	    }
	
    private Long bassinPersonnaliseId;
    

    @JsonIgnoreProperties(ignoreUnknown = true)
    private Long userId;
    
    // Customization fields
    private String materiau;
    private String dimension;
    private String couleur;
    private String accessoires;
    

    private Double prixPromo;

    
    // Email pour notifications 
    private String userEmail;
    

    private String description;

    public String getSessionId() {
        return sessionId;
    }

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }
   
    public void setDescription(String description) {
        this.description = description;
    }
    

    // Validation methods
    public boolean isValid() {
        return (bassinId != null || bassinPersonnaliseId != null) && quantity > 0;
    }
    
    public boolean hasPromotion() {
        return promotionId != null && tauxReduction != null && tauxReduction > 0;
    }
    
 
}