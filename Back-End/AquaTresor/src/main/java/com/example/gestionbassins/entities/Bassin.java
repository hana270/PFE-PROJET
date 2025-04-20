package com.example.gestionbassins.entities;

import java.math.BigDecimal;
import java.util.Calendar;
import java.util.Comparator;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import com.example.gestionbassins.projections.BassinBase;
import com.example.gestionbassins.projections.BassinMetadata;
import com.example.gestionbassins.projections.BassinPromotionInfo;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonManagedReference;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.Lob;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@Entity
@JsonIgnoreProperties(ignoreUnknown = true)
public class Bassin implements BassinBase, BassinMetadata, BassinPromotionInfo {

    // Attributs de base (BassinBase)
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idBassin;

    private String nomBassin;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "prix", nullable = false)
    private Double prix;

    private String materiau; 
    private String couleur;
    private String dimensions; 

    private boolean disponible; 

    private int stock;

    @ManyToOne
    private Categorie categorie;

    @OneToMany(mappedBy = "bassin", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ImageBassin> imagesBassin;

    @Column(name = "image_path")
    private String imagePath;

    @Column(name = "image_3d_path")
    private String image3DPath;
    
    // Metadata (BassinMetadata)
    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean archive;
    private int quantity;
    
    @Column(name = "is_favorite")
    private Boolean favorite;
    
    private Date dateAjout;
    private Date dateDerniereModification;

    // Promotion fields
    @ManyToOne
    @JoinColumn(name = "id_promotion")
    private Promotion promotion;

    @Column(name = "promotion_active")
    private boolean promotionActive;

    private Double prixPromo;

    
    @Column(name = "taux_reduction", nullable = true)
    private Double tauxReduction;
    
    @Column(name = "statut")
    private String statut = "DISPONIBLE"; 
    
    // Constructeur
    public Bassin(String nomBassin, String description, double prix, String materiau, 
                 String couleur, String dimensions, boolean disponible, 
                 int stock, Categorie categorie) {
        this.nomBassin = nomBassin;
        this.description = description;
        this.prix = prix;
        this.materiau = materiau;
        this.couleur = couleur;
        this.dimensions = dimensions;
        this.disponible = disponible;
        this.stock = stock;
        this.categorie = categorie;
    }

    @Override
    public String toString() {
        return "Bassin{" + "idBassin=" + idBassin + ", nomBassin='" + nomBassin + '\'' + 
               ", description='" + description + '\'' + ", prix=" + prix + 
               ", materiau='" + materiau + '\'' + ", couleur='" + couleur + '\'' +
               ", dimensions='" + dimensions + '\'' + ", disponible=" + disponible + 
               ", stock=" + stock + ", categorie=" + 
               (categorie != null ? categorie.getIdCategorie() : null) + 
               ", imagePath='" + imagePath + '\'' + ", image3DPath='" + image3DPath + '\'' + '}';
    }
    
    // Implémentation de BassinMetadata
    @Override
    public Boolean isFavorite() {
        return favorite;
    }

    public void setFavorite(Boolean favorite) {
        this.favorite = favorite;
    }

    // Implémentation de BassinPromotionInfo
    @Override
    public boolean isPromotionActive() {
        return this.promotionActive;
    }

    /* 
     * Implémentation EXACTE de la méthode de l'interface BassinPromotionInfo
     * Notez que l'annotation @Override est cruciale
     */
    
    @Override
    public Double getPrixPromotionnel() {
        if (!hasActivePromotion()) {
            return this.prix; // Retourne le prix normal si pas de promotion active
        }
        return this.prix * (1 - (this.promotion.getTauxReduction() / 100));
    }

    // Méthodes utilitaires
    public boolean hasActivePromotion() {
        if (promotion == null) return false;
        Date now = new Date();
        return promotionActive && 
               promotion.getDateDebut() != null &&
               promotion.getDateFin() != null &&
               promotion.getDateDebut().before(now) && 
               promotion.getDateFin().after(now);
    }

    public boolean isEnPromotion() {
        return hasActivePromotion();
    }

    public Promotion getPromotionForCart() {
        if (!hasActivePromotion() || this.promotion == null) {
            return null;
        }
        
        Promotion cartPromo = new Promotion();
        cartPromo.setIdPromotion(this.promotion.getIdPromotion());
        cartPromo.setNomPromotion(this.promotion.getNomPromotion());
        cartPromo.setTauxReduction(this.promotion.getTauxReduction());
        cartPromo.setDateDebut(this.promotion.getDateDebut());
        cartPromo.setDateFin(this.promotion.getDateFin());
        
        return cartPromo;
    }

    // Getters supplémentaires
    public boolean getPromotionActive() {
        return this.promotionActive;
    }

    public Promotion getPromotion() {
        return this.promotion;
    }
    
    
 // hana ************
    
    public String getMainImagePath() {
        if (imagesBassin != null && !imagesBassin.isEmpty()) {
            return imagesBassin.get(0).getImagePath();
        }
        return imagePath; // fallback to the simple imagePath field
    }


    @ManyToMany
    @JoinTable(
        name = "bassin_promotion",
        joinColumns = @JoinColumn(name = "id_bassin"),
        inverseJoinColumns = @JoinColumn(name = "id_promotion"))
    private Set<Promotion> promotions = new HashSet<>();

    public Promotion getActivePromotion() {
        if (promotions == null) return null;
        return promotions.stream()
            .filter(Promotion::isActive)
            .max(Comparator.comparing(Promotion::getTauxReduction))
            .orElse(null);
    }

    public Double getCurrentPrice() {
        Promotion activePromo = getActivePromotion();
        if (activePromo != null) {
            return prix * (1 - (activePromo.getTauxReduction() / 100));
        }
        return prix;
    }
    
    
    
    
    
    @Column(name = "sur_commande")
    private Boolean surCommande = false;
    

    // Getters et setters
    public boolean isSurCommande() {
        return surCommande;
    }

    public void setSurCommande(boolean surCommande) {
        this.surCommande = surCommande;
    }

    public Integer getDureeFabricationJours() {
        return dureeFabricationJours;
    }

    /************/
 // Supprimer dateDisponibilitePrevue et modifier la gestion de la durée
    @Column(name = "duree_fabrication_jours")
    private Integer dureeFabricationJours;

    @Column(name = "duree_fabrication_jours_min")
    private Integer dureeFabricationJoursMin = 3; // Valeur par défaut

    @Column(name = "duree_fabrication_jours_max")
    private Integer dureeFabricationJoursMax = 15; // Valeur par défaut

    public String getDureeFabricationDisplay() {
        if (dureeFabricationJours != null) {
            return dureeFabricationJours + " jours";
        } else if (dureeFabricationJoursMin != null && dureeFabricationJoursMax != null) {
            if (dureeFabricationJoursMin.equals(dureeFabricationJoursMax)) {
                return dureeFabricationJoursMin + " jours";
            }
            return "Entre " + dureeFabricationJoursMin + " et " + dureeFabricationJoursMax + " jours";
        }
        return "Entre 3 et 15 jours (par défaut)";
    }
    // Getters et setters
    public Integer getDureeFabricationJoursMin() {
        return dureeFabricationJoursMin;
    }

    public void setDureeFabricationJoursMin(Integer dureeMin) {
        this.dureeFabricationJoursMin = dureeMin;
        // Validation pour s'assurer que min <= max
        if (dureeFabricationJoursMax != null && dureeMin != null && dureeMin > dureeFabricationJoursMax) {
            this.dureeFabricationJoursMax = dureeMin;
        }
    }

    public Integer getDureeFabricationJoursMax() {
        return dureeFabricationJoursMax;
    }

    public void setDureeFabricationJoursMax(Integer dureeMax) {
        this.dureeFabricationJoursMax = dureeMax;
        // Validation pour s'assurer que min <= max
        if (dureeFabricationJoursMin != null && dureeMax != null && dureeMax < dureeFabricationJoursMin) {
            this.dureeFabricationJoursMin = dureeMax;
        }
    }

    // Méthode pour obtenir la durée moyenne
    public Integer getDureeFabricationMoyenne() {
        if (dureeFabricationJoursMin == null || dureeFabricationJoursMax == null) {
            return null;
        }
        return (dureeFabricationJoursMin + dureeFabricationJoursMax) / 2;
    }



}