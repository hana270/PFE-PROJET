package com.example.orders_microservice.dto;

import java.util.List;
import java.util.stream.Collectors;

public class BassinDTO {
    private Long idBassin;
    private String nomBassin;
    private String description;
    private Double prix;
    private Double prixPromo;
    private Integer stock;
    private String materiau;
    private String couleur;
    private String dimensions;
    private List<BassinImageDTO> imagesBassin;
    private String imagePath;
    private String image3dPath;
    private boolean disponible;
    private boolean promotionActive;
    private boolean isFavorite;
    private boolean archive;
    private Long promotionId;
    private Double tauxReduction;
    private Integer quantity;
    private String dateAjout;
    private String dateDerniereModification;
    private CategorieDTO categorie;
    private List<PromotionDTO> promotions;

    public static class CategorieDTO {
        private Long idCategorie;
        private String nomCategorie;
        private String description;

        // Getters and Setters
        public Long getIdCategorie() {
            return idCategorie;
        }

        public void setIdCategorie(Long idCategorie) {
            this.idCategorie = idCategorie;
        }

        public String getNomCategorie() {
            return nomCategorie;
        }

        public void setNomCategorie(String nomCategorie) {
            this.nomCategorie = nomCategorie;
        }
        
        public String getDescription() {
            return description;
        }

        public void setDescription(String description) {
            this.description = description;
        }
    }

    // Getters and Setters for all fields
    public Long getIdBassin() {
        return idBassin;
    }

    public void setIdBassin(Long idBassin) {
        this.idBassin = idBassin;
    }

    public String getNomBassin() {
        return nomBassin;
    }

    public void setNomBassin(String nomBassin) {
        this.nomBassin = nomBassin;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Double getPrix() {
        return prix;
    }

    public void setPrix(Double prix) {
        this.prix = prix;
    }

    public Double getPrixPromo() {
        return prixPromo;
    }

    public void setPrixPromo(Double prixPromo) {
        this.prixPromo = prixPromo;
    }

    public Integer getStock() {
        return stock;
    }

    public void setStock(Integer stock) {
        this.stock = stock;
    }

    public String getMateriau() {
        return materiau;
    }

    public void setMateriau(String materiau) {
        this.materiau = materiau;
    }

    public String getCouleur() {
        return couleur;
    }

    public void setCouleur(String couleur) {
        this.couleur = couleur;
    }

    public String getDimensions() {
        return dimensions;
    }

    public void setDimensions(String  dimensions) {
        this.dimensions = dimensions;
    }

    public List<BassinImageDTO> getImagesBassin() {
        return imagesBassin;
    }

    public void setImagesBassin(List<BassinImageDTO> imagesBassin) {
        this.imagesBassin = imagesBassin;
    }

    public String getImagePath() {
        return imagePath;
    }

    public void setImagePath(String imagePath) {
        this.imagePath = imagePath;
    }

    public String getImage3dPath() {
        return image3dPath;
    }

    public void setImage3dPath(String image3dPath) {
        this.image3dPath = image3dPath;
    }

    public boolean isDisponible() {
        return disponible;
    }

    public void setDisponible(boolean disponible) {
        this.disponible = disponible;
    }

    public boolean isPromotionActive() {
        return promotionActive;
    }

    public void setPromotionActive(boolean promotionActive) {
        this.promotionActive = promotionActive;
    }

    public boolean isFavorite() {
        return isFavorite;
    }

    public void setFavorite(boolean favorite) {
        isFavorite = favorite;
    }

    public boolean isArchive() {
        return archive;
    }

    public void setArchive(boolean archive) {
        this.archive = archive;
    }

    public Long getPromotionId() {
        return promotionId;
    }

    public void setPromotionId(Long promotionId) {
        this.promotionId = promotionId;
    }

    public Double getTauxReduction() {
        return tauxReduction;
    }

    public void setTauxReduction(Double tauxReduction) {
        this.tauxReduction = tauxReduction;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }

    public String getDateAjout() {
        return dateAjout;
    }

    public void setDateAjout(String dateAjout) {
        this.dateAjout = dateAjout;
    }

    public String getDateDerniereModification() {
        return dateDerniereModification;
    }

    public void setDateDerniereModification(String dateDerniereModification) {
        this.dateDerniereModification = dateDerniereModification;
    }

    public CategorieDTO getCategorie() {
        return categorie;
    }

    public void setCategorie(CategorieDTO categorie) {
        this.categorie = categorie;
    }
   
    // Helper method to get images as strings if needed
    public List<String> getImagesBassinAsStrings() {
        if (imagesBassin == null) return null;
        return imagesBassin.stream()
            .map(Object::toString)
            .collect(Collectors.toList());
    }
}