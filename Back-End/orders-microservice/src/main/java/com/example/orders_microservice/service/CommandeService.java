package com.example.orders_microservice.service;

import com.example.orders_microservice.dto.*;
import com.example.orders_microservice.entities.Commande;
import java.util.List;

public interface CommandeService {

    /**
     * Crée une nouvelle commande
     */
    CommandeDTO creerCommande(CreationCommandeRequest request);

    /**
     * Récupère une commande par son numéro
     */
    CommandeDTO getCommandeByNumero(String numeroCommande);

    /**
     * Récupère toutes les commandes d'un client
     */
    List<CommandeDTO> getCommandesByClient(Long clientId);

    /**
     * Traite le paiement d'une commande
     */
    void traiterPaiement(PaymentRequest request);

    /**
     * Met à jour le statut d'une commande après paiement validé
     */
    void updateCommandeAfterPayment(String commandeId);

    /**
     * Met à jour les stocks après validation d'une commande
     */
    void mettreAJourStocks(Commande commande);

    /**
     * Crée une commande à partir des informations de paiement
     */
    CommandeDTO createCommandeFromPayment(PaymentRequestDTO paymentRequestDTO);
    public CommandeDTO getCommandeById(Long commandeId);
    
    public void updateCommandeStatus(String numeroCommande, String newStatus);
}