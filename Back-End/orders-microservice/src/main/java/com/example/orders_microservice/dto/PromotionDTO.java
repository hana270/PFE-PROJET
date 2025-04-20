package com.example.orders_microservice.dto;

import java.time.LocalDate;

public class PromotionDTO {
    private Long idPromotion;
    private String nomPromotion;
    private Double tauxReduction;
    private LocalDate dateDebut;
    private LocalDate dateFin;
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

    public LocalDate getDateDebut() {
        return dateDebut;
    }

    public void setDateDebut(LocalDate dateDebut) {
        this.dateDebut = dateDebut;
    }

    public LocalDate getDateFin() {
        return dateFin;
    }

    public void setDateFin(LocalDate dateFin) {
        this.dateFin = dateFin;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }
}