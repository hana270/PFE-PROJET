package com.example.orders_microservice.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PaymentMethodDTO {
    private Long id;
    private String nom;
    private String description;
    private String imageUrl;
    private String type;
}
