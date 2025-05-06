package com.example.orders_microservice.dto;

import lombok.Data;

@Data
public class AccessoireDTO {
    private Long accessoireId;  // Changed from 'id' to 'accessoireId'
    private String nomAccessoire;
    private Double prixAccessoire;
    private String imageUrl;
    
    // Keep existing methods but ensure they match the field names
    public void setIdAccessoire(Long accessoireId) {
        this.accessoireId = accessoireId;
    }
    
    public void setImagePath(String imageUrl) {
        this.imageUrl = imageUrl;
    }
    
    // Add explicit getter if needed
    public Long getAccessoireId() {
        return this.accessoireId;
    }
}