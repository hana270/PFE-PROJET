package com.example.orders_microservice.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.util.List;

@Data
public class PanierItemRequest {
	private Long bassinId;
	private String nomBassin;
	private String description;
	private String imageUrl;

	@NotNull(message = "La quantité est requise")
	@Min(value = 1, message = "La quantité minimale est 1")
	private Integer quantity;

	private Double prixOriginal;
	private Double prixUnitaire;
	private String status;
	private Boolean isCustomized = false;

	// Champs pour les bassins personnalisés
	private String materiauSelectionne;
	private Double prixMateriau;
	private String dimensionSelectionnee;
	private Double prixDimension;
	private String couleurSelectionnee;
	private Double prixAccessoires;
	private Double prixEstime;

	// Correction: S'assurer que la durée de fabrication est un Integer
	private Integer dureeFabrication;

	private List<Long> accessoireIds;

	private Boolean promotionActive;
	private Double prixPromo;

	private Long promotionId;
	private Double tauxReduction;
	private String nomPromotion;

	private String customizationId;

	// Méthode de validation pour les bassins personnalisés
	public void validateForCustomBassin() {
		if (Boolean.TRUE.equals(isCustomized)) {
			if (materiauSelectionne == null || materiauSelectionne.isEmpty()) {
				throw new IllegalArgumentException("Le matériau sélectionné est requis pour un bassin personnalisé.");
			}
			if (dimensionSelectionnee == null || dimensionSelectionnee.isEmpty()) {
				throw new IllegalArgumentException(
						"La dimension sélectionnée est requise pour un bassin personnalisé.");
			}
			if (couleurSelectionnee == null || couleurSelectionnee.isEmpty()) {
				throw new IllegalArgumentException("La couleur sélectionnée est requise pour un bassin personnalisé.");
			}
			// Validation optionnelle pour la durée de fabrication
			if (dureeFabrication == null || dureeFabrication <= 0) {
				throw new IllegalArgumentException(
						"La durée de fabrication doit être positive pour un bassin personnalisé.");
			}
		}
	}

	public Boolean getPromotionActive() {
		return promotionActive;
	}

	public void setPromotionActive(Boolean promotionActive) {
		this.promotionActive = promotionActive;
	}

	public Double getPrixPromo() {
		return prixPromo;
	}

	public void setPrixPromo(Double prixPromo) {
		this.prixPromo = prixPromo;
	}

}