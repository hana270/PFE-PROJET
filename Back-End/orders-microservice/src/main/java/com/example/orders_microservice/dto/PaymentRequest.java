package com.example.orders_microservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO pour la requête de paiement d'une commande existante
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PaymentRequest {
    private String commandeId;
    private String modePaiement;
    private String referenceTransaction;
    private CardDetailsDTO cardDetails;
}