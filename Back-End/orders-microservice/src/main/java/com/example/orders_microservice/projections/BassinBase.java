package com.example.orders_microservice.projections;


import com.example.orders_microservice.dto.BassinDTO;
import com.example.orders_microservice.dto.BassinDTO.CategorieDTO;

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
    CategorieDTO getCategorie();
    String getImage3DPath();
}
