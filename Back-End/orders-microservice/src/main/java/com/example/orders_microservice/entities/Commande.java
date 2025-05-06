package com.example.orders_microservice.entities;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Data
public class Commande {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String numeroCommande; // Format: CMD-YYYYMMDD-XXXXX
    private Long clientId;
    private String emailClient;
    
    @Enumerated(EnumType.STRING)
    private StatutCommande statut; // EN_ATTENTE, VALIDEE, EN_PREPARATION, EXPEDIEE, LIVREE, ANNULEE
    
    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    private List<LigneComnd> lignesCommande;
    
    private Double montantTotal;
    private Double montantReduction;
    private Double montantTVA;
    private Double montantTotalTTC;
    
    @Enumerated(EnumType.STRING)
    private ModeLivraison modeLivraison; // STANDARD, EXPRESS
    
    @Enumerated(EnumType.STRING)
    private ModePaiement modePaiement; // CARTE_CREDIT, VIREMENT, PAYPAL
    
    private String referencePaiement;
    private Boolean paiementConfirme;
    private LocalDateTime datePaiement;
    
    private LocalDateTime dateCreation;
    private LocalDateTime dateModification;
    
    private String adresseLivraison;
    private String codePostal;
    private String ville;
    private String region;
    
    private String clientNom;
    private String clientPrenom;
    private String clientEmail;
    private String clientTelephone;
    
    @Column(nullable = true)
    private double fraisLivraison;
    
    private String commentaires;
    
    @OneToOne(cascade = CascadeType.ALL)
    private DetailFabrication detailsFabrication;




}
