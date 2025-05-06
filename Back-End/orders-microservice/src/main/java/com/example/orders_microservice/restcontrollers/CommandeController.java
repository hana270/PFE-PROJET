package com.example.orders_microservice.restcontrollers;

import com.example.orders_microservice.dto.*;
import com.example.orders_microservice.exceptions.CommandeException;
import com.example.orders_microservice.service.CommandeService;
import com.example.orders_microservice.service.NotificationServiceClient;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.*;

@RestController
@RequestMapping("/api/commandes")
public class CommandeController {

	private final CommandeService commandeService;
	private final NotificationServiceClient notificationService;

	private static final Logger logger = LoggerFactory.getLogger(CommandeController.class);

	@Autowired
	public CommandeController(CommandeService commandeService, NotificationServiceClient notificationService) {
		this.commandeService = commandeService;
		this.notificationService = notificationService;
	}

	@GetMapping("/health")
    public ResponseEntity<String> healthCheck() {
        return ResponseEntity.ok("Service is up and running");
    }
	

    @PostMapping
    public ResponseEntity<?> creerCommande(@RequestBody CreationCommandeRequest request) {
        try {
            logger.info("Création de commande - request: {}", request);
            
            if (request == null) {
                return ResponseEntity.badRequest().body(Map.of(
                    "message", "La requête ne peut pas être nulle",
                    "success", false
                ));
            }
            
            if (!request.isValid()) {
                logger.warn("Requête invalide - panierId ou items manquants");
                return ResponseEntity.badRequest().body(Map.of(
                    "message", "Either panierId or items must be provided",
                    "success", false
                ));
            }
            
            // Add validation for comments
            if (request.getCommentaires() == null) {
                request.setCommentaires(""); // Set default empty string if null
            }
            
            CommandeDTO commande = commandeService.creerCommande(request);
            logger.info("Commande créée avec succès: {}", commande.getNumeroCommande());
            
            return ResponseEntity.ok(commande);
        } catch (Exception e) {
            logger.error("Erreur lors de la création de la commande", e);
            return ResponseEntity.internalServerError()
                    .body("Une erreur est survenue lors de la création de la commande");
        }
    }

    @GetMapping("/{numeroCommande}")
    public ResponseEntity<?> getCommande(@PathVariable String numeroCommande) {
        try {
            CommandeDTO commande = commandeService.getCommandeByNumero(numeroCommande);
            return ResponseEntity.ok(commande);
        } catch (CommandeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of(
                        "error", "Order not found",
                        "message", e.getMessage()
                    ));
        }
    }
    @GetMapping("/by-id/{id}")
    public ResponseEntity<?> getCommandeById(@PathVariable Long id) {
        try {
            CommandeDTO commande = commandeService.getCommandeById(id);
            return ResponseEntity.ok(commande);
        } catch (CommandeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of(
                        "error", "Order not found",
                        "message", e.getMessage()
                    ));
        }
    }

	@GetMapping("/client/{clientId}")
	public ResponseEntity<List<CommandeDTO>> getCommandesClient(@PathVariable Long clientId) {
		List<CommandeDTO> commandes = commandeService.getCommandesByClient(clientId);
		return ResponseEntity.ok(commandes);
	}

	@PostMapping("/paiement")
	public ResponseEntity<Void> traiterPaiement(@RequestBody PaymentRequest request) {
		commandeService.traiterPaiement(request);
		return ResponseEntity.ok().build();
	}

}