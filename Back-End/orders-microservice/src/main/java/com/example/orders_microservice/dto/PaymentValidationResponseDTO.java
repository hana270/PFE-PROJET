package com.example.orders_microservice.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PaymentValidationResponseDTO {
    private boolean success;
    private String message;
    private String commandeId;
    private String referenceTransaction;
    
    public PaymentValidationResponseDTO(boolean success, String message) {
        this.success = success;
        this.message = message;
    }
}