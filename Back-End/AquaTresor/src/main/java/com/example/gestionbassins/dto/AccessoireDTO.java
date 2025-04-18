package com.example.gestionbassins.dto;


public class AccessoireDTO {
    private Long idAccessoire;
    private String nomAccessoire;
    private Double prixAccessoire;
    private String imagePath;
    private Long idBassinPersonnalise; // Seulement l'ID de BassinPersonnalise

    // Getters et setters
    public Long getIdAccessoire() {
        return idAccessoire;
    }

    public void setIdAccessoire(Long idAccessoire) {
        this.idAccessoire = idAccessoire;
    }

    public String getNomAccessoire() {
        return nomAccessoire;
    }

    public void setNomAccessoire(String nomAccessoire) {
        this.nomAccessoire = nomAccessoire;
    }

    public Double getPrixAccessoire() {
        return prixAccessoire;
    }

    public void setPrixAccessoire(Double prixAccessoire) {
        this.prixAccessoire = prixAccessoire;
    }

    public String getImagePath() {
        return imagePath;
    }

    public void setImagePath(String imagePath) {
        this.imagePath = imagePath;
    }

    public Long getIdBassinPersonnalise() {
        return idBassinPersonnalise;
    }

    public void setIdBassinPersonnalise(Long idBassinPersonnalise) {
        this.idBassinPersonnalise = idBassinPersonnalise;
    }
}