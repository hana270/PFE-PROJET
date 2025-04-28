package com.example.orders_microservice.dto;

import lombok.Data;

@Data
public class AccessoireDTO {
    private Long id;
    private String nomAccessoire;
    private Double prixAccessoire;
    private String imageUrl;
    
    // Ajoutez ces setters si vous utilisez Lombok @Data ils seront générés automatiquement
    // Mais si vous avez besoin de les définir manuellement :
    public void setIdAccessoire(Long id) {
        this.id = id;
    }
    
    public void setImagePath(String imageUrl) {
        this.imageUrl = imageUrl;
    }
}