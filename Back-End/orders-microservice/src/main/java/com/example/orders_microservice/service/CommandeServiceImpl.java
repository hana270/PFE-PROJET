package com.example.orders_microservice.service;

import com.example.orders_microservice.service.*;

import com.example.orders_microservice.dto.*;
import com.example.orders_microservice.entities.*;
import com.example.orders_microservice.exceptions.CommandeException;
import com.example.orders_microservice.repos.CommandeRepository;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class CommandeServiceImpl implements CommandeService {

	private final CommandeRepository commandeRepository;
	private final PanierService panierService;
	private final BassinServiceClient bassinClient;
	private final NotificationServiceClient notificationClient;

	private static final Logger logger = LoggerFactory.getLogger(CommandeServiceImpl.class);

	@Autowired
	public CommandeServiceImpl(CommandeRepository commandeRepository, PanierService panierService,
			BassinServiceClient bassinClient, NotificationServiceClient notificationClient) {
		this.commandeRepository = commandeRepository;
		this.panierService = panierService;
		this.bassinClient = bassinClient;
		this.notificationClient = notificationClient;
	}

	@Transactional
	public CommandeDTO creerCommande(CreationCommandeRequest request) {

		logger.info("Création de commande - client: {}, items: {}", request.getClientId(),
				request.getItems() != null ? request.getItems().size() : 0);

		// Si panierId est 0 ou null, créer un nouveau panier à partir des items
		Panier panier = (request.getPanierId() == null || request.getPanierId() <= 0)
				? createPanierFromItems(request.getItems(), request.getClientId())
				: panierService.getPanierById(request.getPanierId());

		// Make sure to work with the existing collection
		if (panier.getItems() == null) {
			panier.setItems(new ArrayList<>());
		}

		// Valider le panier
		if (panier.getItems().isEmpty()) {
			if (request.getItems() != null && !request.getItems().isEmpty()) {
				// Properly add items to existing collection
				panier.getItems().addAll(
						request.getItems().stream().map(this::convertDTOToPanierItem).collect(Collectors.toList()));
			} else {
				throw new CommandeException("Le panier est vide et aucun article fourni");
			}
		}

		// Créer la commande
		Commande commande = new Commande();
		commande.setNumeroCommande(genererNumeroCommande());
		commande.setClientId(Long.parseLong(request.getClientId()));
		// Ajouter les infos client
		commande.setClientNom(request.getClientNom());
		commande.setClientPrenom(request.getClientPrenom());
		commande.setClientEmail(request.getClientEmail());
		commande.setClientTelephone(request.getClientTelephone());

		commande.setEmailClient(panier.getUserEmail());
		commande.setStatut(StatutCommande.EN_ATTENTE);
		commande.setDateCreation(LocalDateTime.now());
		commande.setCommentaires(request.getCommentaires());

		// Convertir les items du panier en lignes de commande
		List<LigneComnd> lignes = panier.getItems().stream().map(this::convertirEnLigneCommande)
				.collect(Collectors.toList());
		commande.setLignesCommande(lignes);

		// Calculer les totaux
		calculerTotauxCommande(commande);

		// Définir les informations de livraison
		commande.setAdresseLivraison(request.getAdresseLivraison());
		commande.setCodePostal(request.getCodePostal());
		commande.setVille(request.getVille());
		commande.setRegion(request.getRegion());
		commande.setModeLivraison(ModeLivraison.valueOf(request.getModeLivraison()));
		commande.setFraisLivraison(20.0);
		commande.setMontantTotalTTC(commande.getMontantTotalTTC() + commande.getFraisLivraison());

		// Enregistrer la commande
		Commande savedCommande = commandeRepository.save(commande);

		// Retourner toutes les infos nécessaires
		CommandeDTO dto = convertirEnDTO(savedCommande);
		dto.setId(savedCommande.getId());

		// Vider le panier s'il était persistant - modified to use proper collection
		// clearing
		if (request.getPanierId() != null) {
			panierService.clearPanierProperly(panier.getId()); // Implement this method in PanierService
		}

		// Envoyer une notification
		try {
			notificationClient.envoyerNotificationCreationCommande(savedCommande.getClientId(),
					savedCommande.getNumeroCommande());
		} catch (Exception e) {
			logger.error("Erreur lors de l'envoi de la notification de création de commande", e);
		}

		return convertirEnDTO(savedCommande);
	}

	private Panier createPanierFromItems(List<PanierItemDTO> items, String clientId) {
		Panier panier = new Panier();
		panier.setUserId(Long.parseLong(clientId));
		panier.setUserEmail(""); // À remplir si disponible

		List<PanierItem> panierItems = items.stream().map(this::convertDTOToPanierItem).collect(Collectors.toList());

		panier.setItems(panierItems);
		return panier;
	}

	public LigneComnd convertirEnLigneCommande(PanierItem item) {
		LigneComnd ligne = new LigneComnd();

		ligne.setProduitId(item.getBassinId());
		ligne.setTypeProduit(item.getIsCustomized() ? "BASSIN_PERSONNALISE" : "BASSIN_STANDARD");
		ligne.setNomProduit(item.getNomBassin());
		ligne.setDescription(item.getDescription());
		ligne.setImageUrl(item.getImageUrl());
		ligne.setQuantite(item.getQuantity());
		ligne.setPrixUnitaire(item.getEffectivePrice());
		ligne.setPrixTotal(item.getEffectivePrice() * item.getQuantity());

		if (item.getIsCustomized()) {
			ligne.setMateriauSelectionne(item.getMateriauSelectionne());
			ligne.setPrixMateriau(item.getPrixMateriau());
			ligne.setDimensionSelectionnee(item.getDimensionSelectionnee());
			ligne.setPrixDimension(item.getPrixDimension());
			ligne.setCouleurSelectionnee(item.getCouleurSelectionnee());
			ligne.setStatutProduit("SUR_COMMANDE");
			ligne.setDelaiFabrication(item.getDureeFabrication());
		} else {
			ligne.setStatutProduit(item.getStatus());
		}

		ligne.setAccessoires(new ArrayList<>());

		if (item.getAccessoires() != null && !item.getAccessoires().isEmpty()) {
			List<AccessoirCommande> accessoires = item.getAccessoires().stream().map(this::convertirAccessoire)
					.collect(Collectors.toList());
			ligne.setAccessoires(accessoires);
		}

		return ligne;
	}

	public AccessoirCommande convertirAccessoire(PanierItemAccessoire accessoire) {
		AccessoirCommande ac = new AccessoirCommande();
		ac.setAccessoireId(accessoire.getAccessoireId());
		ac.setNomAccessoire(accessoire.getNomAccessoire());
		ac.setPrixAccessoire(accessoire.getPrixAccessoire());
		ac.setImageUrl(accessoire.getImageUrl());
		return ac;
	}

	public void calculerTotauxCommande(Commande commande) {
		double total = commande.getLignesCommande().stream().mapToDouble(LigneComnd::getPrixTotal).sum();

		commande.setMontantTotal(total);

		// Calculer la TVA (19%)
		double tva = total * 0.19;
		commande.setMontantTVA(tva);

		commande.setMontantTotalTTC(total + tva);
	}

	public String genererNumeroCommande() {
		String datePart = LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd"));
		String randomPart = UUID.randomUUID().toString().substring(0, 5).toUpperCase();
		return "CMD-" + datePart + "-" + randomPart;
	}

	public CommandeDTO getCommandeByNumero(String numeroCommande) {
		Commande commande = commandeRepository.findByNumeroCommande(numeroCommande)
				.orElseThrow(() -> new CommandeException("Commande non trouvée avec le numéro: " + numeroCommande));
		return convertirEnDTO(commande);
	}

	public List<CommandeDTO> getCommandesByClient(Long clientId) {
		return commandeRepository.findByClientId(clientId).stream().map(this::convertirEnDTO)
				.collect(Collectors.toList());
	}

	@Transactional
	public void traiterPaiement(PaymentRequest request) {
		Commande commande = commandeRepository.findByNumeroCommande(request.getCommandeId())
				.orElseThrow(() -> new CommandeException("Commande non trouvée"));

		// Simuler le paiement (dans un vrai projet, intégrer un service de paiement)
		simulerPaiement(commande, request);

		commande.setModePaiement(ModePaiement.valueOf(request.getModePaiement()));
		commande.setPaiementConfirme(true);
		commande.setDatePaiement(LocalDateTime.now());
		commande.setStatut(StatutCommande.VALIDEE);

		commandeRepository.save(commande);

		// Notifier le client
		notificationClient.envoyerNotificationPaiementConfirme(commande.getClientId(), commande.getNumeroCommande());

		// Mettre à jour les stocks pour les produits disponibles
		mettreAJourStocks(commande);
	}

	public void simulerPaiement(Commande commande, PaymentRequest request) {
		// Simulation de paiement - dans un vrai projet, utiliser un service comme
		// Stripe, PayPal, etc.
		try {
			// Simuler un délai de traitement
			Thread.sleep(2000);

			// Simuler une réussite de paiement dans 95% des cas
			if (Math.random() > 0.95) {
				throw new CommandeException("Paiement refusé par la banque");
			}
		} catch (InterruptedException e) {
			Thread.currentThread().interrupt();
			throw new CommandeException("Erreur lors du traitement du paiement");
		}
	}

	@Override
	public void mettreAJourStocks(Commande commande) {
		commande.getLignesCommande().stream().filter(l -> "DISPONIBLE".equals(l.getStatutProduit())).forEach(l -> {
			try {
				bassinClient.mettreAJourStock(l.getProduitId(), -l.getQuantite());
			} catch (Exception e) {
				System.err.println("Erreur mise à jour stock pour produit " + l.getProduitId());
			}
		});
	}

	/************************/

	public CommandeDTO convertirEnDTO(Commande commande) {
		CommandeDTO dto = new CommandeDTO();
		dto.setId(commande.getId());
		dto.setNumeroCommande(commande.getNumeroCommande());
		dto.setClientId(commande.getClientId());
		dto.setEmailClient(commande.getEmailClient());
		dto.setStatut(commande.getStatut().name());
		dto.setMontantTotal(commande.getMontantTotal());
		dto.setMontantTVA(commande.getMontantTVA());
		dto.setMontantTotalTTC(commande.getMontantTotalTTC());
		dto.setModeLivraison(commande.getModeLivraison().name());
		dto.setModePaiement(commande.getModePaiement() != null ? commande.getModePaiement().name() : null);
		dto.setPaiementConfirme(commande.getPaiementConfirme());
		dto.setDateCreation(commande.getDateCreation());
		dto.setDatePaiement(commande.getDatePaiement());
		dto.setAdresseLivraison(commande.getAdresseLivraison());
		dto.setCodePostal(commande.getCodePostal());
		dto.setVille(commande.getVille());
		dto.setPays(commande.getRegion());

		dto.setClientNom(commande.getClientNom());
		dto.setClientPrenom(commande.getClientPrenom());
		dto.setClientEmail(commande.getClientEmail());
		dto.setClientTelephone(commande.getClientTelephone());

		// Convertir les lignes de commande
		List<LigneCommandeDTO> lignesDTO = commande.getLignesCommande().stream().map(this::convertirLigneEnDTO)
				.collect(Collectors.toList());
		dto.setLignesCommande(lignesDTO);

		return dto;
	}

	public LigneCommandeDTO convertirLigneEnDTO(LigneComnd ligne) {
		LigneCommandeDTO dto = new LigneCommandeDTO();
		dto.setId(ligne.getId());
		dto.setProduitId(ligne.getProduitId());
		dto.setTypeProduit(ligne.getTypeProduit());
		dto.setNomProduit(ligne.getNomProduit());
		dto.setDescription(ligne.getDescription());
		dto.setImageUrl(ligne.getImageUrl());
		dto.setQuantite(ligne.getQuantite());
		dto.setPrixUnitaire(ligne.getPrixUnitaire());
		dto.setPrixTotal(ligne.getPrixTotal());
		dto.setMateriauSelectionne(ligne.getMateriauSelectionne());
		dto.setPrixMateriau(ligne.getPrixMateriau());
		dto.setDimensionSelectionnee(ligne.getDimensionSelectionnee());
		dto.setPrixDimension(ligne.getPrixDimension());
		dto.setCouleurSelectionnee(ligne.getCouleurSelectionnee());
		dto.setStatutProduit(ligne.getStatutProduit());
		dto.setDelaiFabrication(ligne.getDelaiFabrication());

		// Convertir les accessoires
		List<AccessoireCommandeDTO> accessoiresDTO = ligne.getAccessoires().stream().map(this::convertirAccessoireEnDTO)
				.collect(Collectors.toList());
		dto.setAccessoires(accessoiresDTO);

		return dto;
	}

	public AccessoireCommandeDTO convertirAccessoireEnDTO(AccessoirCommande accessoire) {
		AccessoireCommandeDTO dto = new AccessoireCommandeDTO();
		dto.setId(accessoire.getId());
		dto.setNomAccessoire(accessoire.getNomAccessoire());
		dto.setPrixAccessoire(accessoire.getPrixAccessoire());
		dto.setImageUrl(accessoire.getImageUrl());
		return dto;
	}

	@Override
	@Transactional
	public void updateCommandeAfterPayment(String numeroCommande) {
		Commande commande = commandeRepository.findByNumeroCommande(numeroCommande)
				.orElseThrow(() -> new CommandeException("Commande non trouvée"));

		commande.setPaiementConfirme(true);
		commande.setDatePaiement(LocalDateTime.now());
		commande.setStatut(StatutCommande.VALIDEE);

		commandeRepository.save(commande);

		// Notifier le client
		notificationClient.envoyerNotificationPaiementConfirme(commande.getClientId(), commande.getNumeroCommande());

		// Mettre à jour les stocks pour les produits disponibles
		mettreAJourStocks(commande);
	}

	@Transactional
	public PaymentResponseDTO processPaymentAndCreateOrder(PaymentRequestDTO request) {
		// 1. Valider les détails de paiement
		validatePayment(request);

		// 2. Créer la requête de commande
		CreationCommandeRequest commandeRequest = new CreationCommandeRequest();
		commandeRequest.setClientId(request.getClientId().toString());

		// Convertir le panierId en Long si nécessaire
		if (request.getPanierId() != null) {
			try {
				// Plus besoin de conversion, c'est déjà un Long
				commandeRequest.setPanierId(request.getPanierId());
			} catch (NumberFormatException e) {
				throw new CommandeException("Format d'ID de panier invalide");
			}
		}
		// Vider le panier s'il était persistant
		if (request.getPanierId() != null) {
			panierService.clearPanierProperly(request.getPanierId());
		}
		if (request.getDeliveryInfo() != null) {
			commandeRequest.setAdresseLivraison(request.getDeliveryInfo().getAdresseLivraison());
			commandeRequest.setCodePostal(request.getDeliveryInfo().getCodePostal());
			commandeRequest.setVille(request.getDeliveryInfo().getVille());
			commandeRequest.setRegion(request.getDeliveryInfo().getRegion());
			commandeRequest.setCommentaires(request.getDeliveryInfo().getCommentaires());
		}
		commandeRequest.setItems(request.getCartItems());
		commandeRequest.setModeLivraison(ModeLivraison.STANDARD.name()); // Définir un mode de livraison par défaut

		// 3. Créer la commande
		CommandeDTO commande = creerCommande(commandeRequest);

		// 4. Retourner la réponse
		PaymentResponseDTO response = new PaymentResponseDTO();
		response.setSuccess(true);
		response.setCommandeId(commande.getNumeroCommande());
		response.setMessage("Paiement et commande validés avec succès");

		return response;
	}

	private PaymentResponseDTO convertToPaymentResponse(Commande commande) {
		PaymentResponseDTO response = new PaymentResponseDTO();
		response.setSuccess(true);
		response.setCommandeId(commande.getNumeroCommande());
		response.setMessage("Paiement et commande validés avec succès");
		return response;
	}

	private void validatePayment(PaymentRequestDTO request) {
		if (request.getCardNumber() == null || !request.getCardNumber().matches("\\d{16}")) {
			throw new CommandeException("Numéro de carte invalide");
		}

		if (request.getExpiryMonth() == null || !request.getExpiryMonth().matches("\\d{1,2}")) {
			throw new CommandeException("Mois d'expiration invalide");
		}

		String expiryYear = request.getExpiryYear();
		if (expiryYear == null || (!expiryYear.matches("\\d{2}") && !expiryYear.matches("\\d{4}"))) {
			throw new CommandeException("Année d'expiration invalide");
		}

		if (request.getCvv() == null || !request.getCvv().matches("\\d{3}")) {
			throw new CommandeException("Code de sécurité invalide");
		}

		if (request.getCardholderName() == null || request.getCardholderName().trim().isEmpty()) {
			throw new CommandeException("Nom du titulaire requis");
		}
	}

	private void validateBassinDetails(List<PanierItem> items) {
		for (PanierItem item : items) {
			if (item.getIsCustomized()
					&& (item.getDureeFabrication() == null || item.getDureeFabrication().isEmpty())) {
				logger.warn("Bassin personnalisé sans durée de fabrication: {}", item.getNomBassin());
				// On ne bloque plus, juste un warning
			}

			if ("SUR_COMMANDE".equals(item.getStatus())
					&& (item.getOrderDetails() == null || item.getOrderDetails().isEmpty())) {
				logger.warn("Bassin sur commande sans détails: {}", item.getNomBassin());
				// On ne bloque plus, juste un warning
			}
		}
	}

	private Commande createCommandeFromPanier(Panier panier, PaymentRequestDTO request) {
		Commande commande = new Commande();
		commande.setNumeroCommande(genererNumeroCommande());
		commande.setClientId(panier.getUserId());
		commande.setEmailClient(panier.getUserEmail());
		commande.setStatut(StatutCommande.VALIDEE); // Directement validée car paiement OK
		commande.setDateCreation(LocalDateTime.now());
		commande.setDatePaiement(LocalDateTime.now());
		commande.setPaiementConfirme(true);
		commande.setModePaiement(ModePaiement.CARTE_CREDIT);

		// Convertir les items du panier
		List<LigneComnd> lignes = panier.getItems().stream().map(this::convertirEnLigneCommande)
				.collect(Collectors.toList());
		commande.setLignesCommande(lignes);

		// Calculer les totaux
		calculerTotauxCommande(commande);

		// Infos livraison
		if (request.getDeliveryInfo() != null) {
			commande.setAdresseLivraison(request.getDeliveryInfo().getAdresseLivraison());
			commande.setCodePostal(request.getDeliveryInfo().getCodePostal());
			commande.setVille(request.getDeliveryInfo().getVille());
			commande.setRegion(request.getDeliveryInfo().getRegion());
			commande.setCommentaires(request.getDeliveryInfo().getCommentaires());
		}
		commande.setModeLivraison(ModeLivraison.STANDARD);
		commande.setFraisLivraison(20.0); // Valeur par défaut ou à calculer
		commande.setMontantTotalTTC(commande.getMontantTotalTTC() + commande.getFraisLivraison());

		return commande;
	}

	private void sendConfirmation(Long clientId, String numeroCommande) {
		try {
			notificationClient.envoyerNotificationPaiementConfirme(clientId, numeroCommande);
		} catch (Exception e) {
			logger.error("Erreur lors de l'envoi de la confirmation", e);
		}
	}

	@Override
	@Transactional
	public CommandeDTO createCommandeFromPayment(PaymentRequestDTO paymentRequestDTO) {
		// Récupérer le panier si un panierId est fourni
		Panier panier = null;
		if (paymentRequestDTO.getPanierId() != null) {
			try {
				// Plus besoin de conversion, c'est déjà un Long
				Long panierId = paymentRequestDTO.getPanierId();
				panier = panierService.getPanierById(panierId);
			} catch (NumberFormatException e) {
				throw new CommandeException("Format d'ID de panier invalide: " + paymentRequestDTO.getPanierId());
			}
		} else if (paymentRequestDTO.getCartItems() != null && !paymentRequestDTO.getCartItems().isEmpty()) {
			// Créer un panier temporaire à partir des cartItems
			panier = new Panier();
			panier.setUserId(paymentRequestDTO.getClientId());
			panier.setUserEmail(paymentRequestDTO.getEmail());

			List<PanierItem> items = paymentRequestDTO.getCartItems().stream().map(this::convertDTOToPanierItem)
					.collect(Collectors.toList());
			panier.setItems(items);
		} else {
			throw new CommandeException("Aucune information de panier ou d'articles fournie");
		}

		if (panier.getItems() == null || panier.getItems().isEmpty()) {
			throw new CommandeException("Le panier est vide");
		}

		// Créer la commande
		Commande commande = new Commande();
		commande.setNumeroCommande(genererNumeroCommande());
		commande.setClientId(panier.getUserId());
		commande.setEmailClient(panier.getUserEmail());
		commande.setStatut(StatutCommande.VALIDEE);
		commande.setDateCreation(LocalDateTime.now());
		commande.setDatePaiement(LocalDateTime.now());
		commande.setPaiementConfirme(true);
		commande.setModePaiement(ModePaiement.CARTE_CREDIT);

		// Convertir les items du panier
		List<LigneComnd> lignes = panier.getItems().stream().map(this::convertirEnLigneCommande)
				.collect(Collectors.toList());
		commande.setLignesCommande(lignes);

		// Calculer les totaux
		calculerTotauxCommande(commande);

		// Définir les informations de livraison
		if (paymentRequestDTO.getDeliveryInfo() != null) {
			DeliveryInfoDTO deliveryInfo = paymentRequestDTO.getDeliveryInfo();
			commande.setAdresseLivraison(deliveryInfo.getAdresseLivraison());
			commande.setCodePostal(deliveryInfo.getCodePostal());
			commande.setVille(deliveryInfo.getVille());
			commande.setRegion(deliveryInfo.getRegion());
			commande.setCommentaires(deliveryInfo.getCommentaires());
		}

		// Frais de livraison
		commande.setFraisLivraison(20.0);
		commande.setMontantTotalTTC(commande.getMontantTotalTTC() + commande.getFraisLivraison());
		commande.setModeLivraison(ModeLivraison.STANDARD);

		// Enregistrer la commande
		Commande savedCommande = commandeRepository.save(commande);

		// Vider le panier si persisté
		if (paymentRequestDTO.getPanierId() != null) {
			panierService.clearPanier(panier.getUserId(), panier.getSessionId());
		}

		// Notifier le client
		try {
			notificationClient.envoyerNotificationPaiementConfirme(commande.getClientId(),
					commande.getNumeroCommande());
		} catch (Exception e) {
			logger.error("Erreur lors de l'envoi de la notification de confirmation de paiement", e);
		}

		// Mettre à jour les stocks
		mettreAJourStocks(savedCommande);

		return convertirEnDTO(savedCommande);
	}

	// Méthode utilitaire pour convertir un DTO en PanierItem
	private PanierItem convertDTOToPanierItem(PanierItemDTO dto) {
		PanierItem item = new PanierItem();
		item.setBassinId(dto.getBassinId());
		item.setNomBassin(dto.getNomBassin());
		item.setDescription(dto.getDescription());
		item.setImageUrl(dto.getImageUrl());
		item.setQuantity(dto.getQuantity());
		item.setPrixOriginal(dto.getPrixOriginal());

		item.setEffectivePrice(dto.getEffectivePrice());
		item.setIsCustomized(dto.getIsCustomized());
		item.setStatus(dto.getStatus());
		item.setMateriauSelectionne(dto.getMateriauSelectionne());
		item.setPrixMateriau(dto.getPrixMateriau());
		item.setDimensionSelectionnee(dto.getDimensionSelectionnee());
		item.setPrixDimension(dto.getPrixDimension());
		item.setCouleurSelectionnee(dto.getCouleurSelectionnee());
		item.setDureeFabrication(dto.getDureeFabrication());
		item.setOrderDetails(dto.getOrderDetails());

		// Convertir les accessoires si présents
		if (dto.getAccessoires() != null && !dto.getAccessoires().isEmpty()) {
			List<PanierItemAccessoire> accessoires = dto.getAccessoires().stream().map(accDTO -> {
				PanierItemAccessoire acc = new PanierItemAccessoire();
				acc.setAccessoireId(accDTO.getAccessoireId());
				acc.setNomAccessoire(accDTO.getNomAccessoire());
				acc.setPrixAccessoire(accDTO.getPrixAccessoire());
				acc.setImageUrl(accDTO.getImageUrl());
				return acc;
			}).collect(Collectors.toList());
			item.setAccessoires(accessoires);
		}

		return item;
	}

	@Override
	@Transactional
	public CommandeDTO getCommandeById(Long commandeId) {
	    // Use a fetch join to load the lignesCommande collection eagerly
	    Commande commande = commandeRepository.findByIdWithLignesCommande(commandeId)
	            .orElseThrow(() -> new CommandeException("Commande non trouvée avec l'ID: " + commandeId));
	    
	    return convertirEnDTO(commande);
	}

	private Commande convertToEntity(CommandeDTO dto) {
		Commande commande = new Commande();

		// Mappez les champs de base
		commande.setId(dto.getId());
		commande.setNumeroCommande(dto.getNumeroCommande());
		commande.setClientId(dto.getClientId());
		commande.setEmailClient(dto.getEmailClient());
		commande.setStatut(StatutCommande.valueOf(dto.getStatut()));
		commande.setMontantTotal(dto.getMontantTotal());
		commande.setMontantTVA(dto.getMontantTVA());
		commande.setMontantTotalTTC(dto.getMontantTotalTTC());
		commande.setModeLivraison(ModeLivraison.valueOf(dto.getModeLivraison()));
		commande.setModePaiement(dto.getModePaiement() != null ? ModePaiement.valueOf(dto.getModePaiement()) : null);
		commande.setPaiementConfirme(dto.getPaiementConfirme());
		commande.setDateCreation(dto.getDateCreation());
		commande.setDatePaiement(dto.getDatePaiement());
		commande.setAdresseLivraison(dto.getAdresseLivraison());
		commande.setCodePostal(dto.getCodePostal());
		commande.setVille(dto.getVille());
		commande.setRegion(dto.getPays());

		// Mappez les infos client
		commande.setClientNom(dto.getClientNom());
		commande.setClientPrenom(dto.getClientPrenom());
		commande.setClientEmail(dto.getClientEmail());
		commande.setClientTelephone(dto.getClientTelephone());

		// Mappez les lignes de commande
		if (dto.getLignesCommande() != null) {
			List<LigneComnd> lignes = dto.getLignesCommande().stream().map(this::convertLigneDTOToEntity)
					.collect(Collectors.toList());
			commande.setLignesCommande(lignes);
		}

		return commande;
	}

	private LigneComnd convertLigneDTOToEntity(LigneCommandeDTO dto) {
		LigneComnd ligne = new LigneComnd();

		ligne.setId(dto.getId());
		ligne.setProduitId(dto.getProduitId());
		ligne.setTypeProduit(dto.getTypeProduit());
		ligne.setNomProduit(dto.getNomProduit());
		ligne.setDescription(dto.getDescription());
		ligne.setImageUrl(dto.getImageUrl());
		ligne.setQuantite(dto.getQuantite());
		ligne.setPrixUnitaire(dto.getPrixUnitaire());
		ligne.setPrixTotal(dto.getPrixTotal());
		ligne.setMateriauSelectionne(dto.getMateriauSelectionne());
		ligne.setPrixMateriau(dto.getPrixMateriau());
		ligne.setDimensionSelectionnee(dto.getDimensionSelectionnee());
		ligne.setPrixDimension(dto.getPrixDimension());
		ligne.setCouleurSelectionnee(dto.getCouleurSelectionnee());
		ligne.setStatutProduit(dto.getStatutProduit());
		ligne.setDelaiFabrication(dto.getDelaiFabrication());

		// Mappez les accessoires
		if (dto.getAccessoires() != null) {
			List<AccessoirCommande> accessoires = dto.getAccessoires().stream().map(this::convertAccessoireDTOToEntity)
					.collect(Collectors.toList());
			ligne.setAccessoires(accessoires);
		}

		return ligne;
	}

	private AccessoirCommande convertAccessoireDTOToEntity(AccessoireCommandeDTO dto) {
		AccessoirCommande accessoire = new AccessoirCommande();

		accessoire.setId(dto.getId());
		accessoire.setAccessoireId(dto.getAccessoireId());
		accessoire.setNomAccessoire(dto.getNomAccessoire());
		accessoire.setPrixAccessoire(dto.getPrixAccessoire());
		accessoire.setImageUrl(dto.getImageUrl());

		return accessoire;
	}

	public void updateCommandeStatus(String numeroCommande, String newStatus) {
		try {
			CommandeDTO commande = getCommandeByNumero(numeroCommande);
			if (commande != null) {
				commande.setStatut(newStatus);
				// Implémentez la méthode saveCommande dans votre repository
				commandeRepository.save(convertToEntity(commande));
			}
		} catch (Exception e) {
			logger.error("Erreur lors de la mise à jour du statut de la commande", e);
			throw new RuntimeException("Erreur lors de la mise à jour du statut");
		}
	}
}