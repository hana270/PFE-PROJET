package com.example.gestionbassins.entities;

import jakarta.persistence.*;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import java.util.*;

import com.fasterxml.jackson.annotation.JsonIgnore;

@Data
@NoArgsConstructor
@Entity
public class Promotion {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idPromotion;

    @NotNull(message = "Le nom de la promotion est obligatoire")
    private String nomPromotion;

    @NotNull(message = "Le taux de réduction est obligatoire")
    private Double tauxReduction;

    @NotNull(message = "La date de début est obligatoire")
    private Date dateDebut;

    @NotNull(message = "La date de fin est obligatoire")
    private Date dateFin;

    @ManyToMany
    @JsonIgnore
    @JoinTable(
        name = "promotion_bassin",
        joinColumns = @JoinColumn(name = "idPromotion"),
        inverseJoinColumns = @JoinColumn(name = "idBassin")
    )
    private List<Bassin> bassins;

    @ManyToMany
    @JoinTable(
        name = "promotion_categorie",
        joinColumns = @JoinColumn(name = "idPromotion"),
        inverseJoinColumns = @JoinColumn(name = "idCategorie")
    )
    private List<Categorie> categories;

    // Validation personnalisée pour s'assurer qu'au moins un bassin ou une catégorie est sélectionné
    @AssertTrue(message = "Au moins un bassin ou une catégorie doit être sélectionné")
    public boolean isBassinOrCategorieSelected() {
        return (bassins != null && !bassins.isEmpty()) || (categories != null && !categories.isEmpty());
    }
    
   
    
    // Add this method to maintain bidirectional relationship
    public void addBassin(Bassin bassin) {
        if (bassins == null) {
            bassins = new ArrayList<>();
        }
        bassins.add(bassin);
        bassin.setPromotion(this);
    }

    public boolean isActive() {
        Date now = new Date();
        return now.after(dateDebut) && now.before(dateFin);
    }
    
    @PrePersist
    @PreUpdate
    private void validateDates() {
        if (dateDebut != null && dateFin != null && dateDebut.after(dateFin)) {
            throw new IllegalArgumentException("La date de début doit être avant la date de fin");
        }
    }
}