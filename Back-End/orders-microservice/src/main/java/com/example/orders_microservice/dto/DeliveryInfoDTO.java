package com.example.orders_microservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO pour les informations de livraison
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DeliveryInfoDTO {
    private String adresseLivraison;    // Adresse de livraison
    private String codePostal;          // Code postal
    private String ville;               // Ville
    private String region;                // Pays
    private String telephone;           // Numéro de téléphone
    private String commentaires;        // Commentaires éventuels
    private String modeLivraison;
}