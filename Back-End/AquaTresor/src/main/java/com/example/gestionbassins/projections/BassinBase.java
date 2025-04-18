package com.example.gestionbassins.projections;

import com.example.gestionbassins.entities.Categorie;

public interface BassinBase {
    Long getIdBassin();
    String getNomBassin();
    String getDescription();
    Double getPrix();
    String getMateriau();
    String getCouleur();
    String getDimensions();
    boolean isDisponible();
    int getStock();
    Categorie getCategorie();
    String getImage3DPath();
}