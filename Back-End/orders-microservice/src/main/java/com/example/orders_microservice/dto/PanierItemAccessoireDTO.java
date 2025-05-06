package com.example.orders_microservice.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PanierItemAccessoireDTO {
    private Long accessoireId;
    private String nomAccessoire;
    private Double prixAccessoire;
    private String imageUrl;
}