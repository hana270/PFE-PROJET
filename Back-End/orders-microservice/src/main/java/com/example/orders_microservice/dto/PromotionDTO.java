package com.example.orders_microservice.dto;

import java.time.LocalDateTime;  // Utiliser LocalDate au lieu de Date

import com.fasterxml.jackson.annotation.JsonFormat;

public class PromotionDTO {
    private Long idPromotion;
    private String nomPromotion;
    private Double tauxReduction;
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss.SSSXXX")
    private LocalDateTime dateDebut;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss.SSSXXX")
    private LocalDateTime dateFin;
    private boolean active;

    // Getters and Setters
    public Long getIdPromotion() {
        return idPromotion;
    }

    public void setIdPromotion(Long idPromotion) {
        this.idPromotion = idPromotion;
    }

    public String getNomPromotion() {
        return nomPromotion;
    }

    public void setNomPromotion(String nomPromotion) {
        this.nomPromotion = nomPromotion;
    }

    public Double getTauxReduction() {
        return tauxReduction;
    }

    public void setTauxReduction(Double tauxReduction) {
        this.tauxReduction = tauxReduction;
    }

    public LocalDateTime getDateDebut() {
        return dateDebut;
    }

    public void setDateDebut(LocalDateTime dateDebut) {
        this.dateDebut = dateDebut;
    }

    public LocalDateTime getDateFin() {
        return dateFin;
    }

    public void setDateFin(LocalDateTime dateFin) {
        this.dateFin = dateFin;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }
}