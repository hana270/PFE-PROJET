package com.example.orders_microservice.dto;

import lombok.Data;

@Data
public class AccessoireCommandeDTO {
    private Long id;
    private Long accessoireId;
    private String nomAccessoire;
    private Double prixAccessoire;
    private String imageUrl;
}
