package com.example.orders_microservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PaymentResponseDTO {
    private boolean success;
    private String transactionId;
    private String message;
    private String commandeId;
    public PaymentResponseDTO(boolean success, String message) {
        this.success = success;
        this.message = message;
        this.transactionId = null; // Or some default value
        this.commandeId = null;    // Or some default value
    }

    // Existing constructor (you might want to keep this if it's used elsewhere)
    public PaymentResponseDTO(boolean success, String transactionId, String message) {
        this.success = success;
        this.transactionId = transactionId;
        this.message = message;
    }
}