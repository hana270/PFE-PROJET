package com.example.orders_microservice.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class CommandeDTO {
    private Long id;
    private String numeroCommande;
    private Long clientId;
    private String emailClient;
    private String statut;
    private List<LigneCommandeDTO> lignesCommande;
    private Double montantTotal;
    private Double montantReduction;
    private Double montantTVA;
    private Double montantTotalTTC;
    private String modeLivraison;
    private String modePaiement;
    private String referencePaiement;
    private Boolean paiementConfirme;
    private LocalDateTime dateCreation;
    private LocalDateTime dateModification;
    private LocalDateTime datePaiement;
    private String adresseLivraison;
    private String codePostal;
    private String ville;
    private String pays;
    private String commentaires;
    private String delaiLivraisonEstime;
    
    private String clientNom;
    private String clientPrenom;
    private String clientEmail;
    private String clientTelephone;
}