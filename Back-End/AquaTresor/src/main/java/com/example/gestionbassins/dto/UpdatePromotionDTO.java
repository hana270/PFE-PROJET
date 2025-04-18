package com.example.gestionbassins.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.Date;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
@Data
public class UpdatePromotionDTO {
    private Long idPromotion;  // Add this field
    
    @NotNull(message = "Le nom de la promotion est obligatoire")
    private String nomPromotion;

    @NotNull(message = "Le taux de réduction est obligatoire")
    private Double tauxReduction;

    @NotNull(message = "La date de début est obligatoire")
    private Date dateDebut;

    @NotNull(message = "La date de fin est obligatoire")
    private Date dateFin;

    private List<Long> bassins;
    private List<Long> categories;
}