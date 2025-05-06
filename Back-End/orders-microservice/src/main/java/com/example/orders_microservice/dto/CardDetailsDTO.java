package com.example.orders_microservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO pour les détails de la carte bancaire
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CardDetailsDTO {
    private String cardNumber;      // Numéro de carte (16 chiffres)
    private String expiryMonth;     // Mois d'expiration (2 chiffres)
    private String expiryDay;       // Jour d'expiration (2 chiffres)
    private String cvv;             // Code de sécurité (3 chiffres)
    private String cardholderName;  // Nom du titulaire
}