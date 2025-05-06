package com.example.orders_microservice.dto;

import lombok.Data;
import java.util.*;


@Data
public class CreationCommandeRequest {
    private String clientId;
    private Long panierId;  // Can be null if creating from items directly
    private String adresseLivraison;
    private String codePostal;
    private String ville;
    private String region;
    private String modeLivraison;
    private String commentaires;
    private List<PanierItemDTO> items;
    
    private String clientNom;
    private String clientPrenom;
    private String clientEmail;
    private String clientTelephone;
    // Add validation if needed
    public boolean isValid() {
        return (panierId != null || (items != null && !items.isEmpty()));
    }
}