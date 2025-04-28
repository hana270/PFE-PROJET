package com.example.orders_microservice.service;

import com.example.orders_microservice.dto.AccessoireDTO;
import com.example.orders_microservice.dto.BassinDTO;
import com.example.orders_microservice.dto.BassinPersonnaliseDTO;
import com.example.orders_microservice.dto.PanierItemRequest;
import com.example.orders_microservice.dto.PromotionDTO;
import com.example.orders_microservice.entities.BassinCustomization;
import com.example.orders_microservice.entities.CustomizationAccessoire;
import com.example.orders_microservice.entities.Panier;
import com.example.orders_microservice.entities.PanierItem;
import com.example.orders_microservice.entities.PanierItemAccessoire;
import com.example.orders_microservice.exceptions.InsufficientStockException;
import com.example.orders_microservice.repos.BassinCustomizationRepository;
import com.example.orders_microservice.repos.CustomizationAccessoireRepository;
import com.example.orders_microservice.repos.PanierItemAccessoireRepository;
import com.example.orders_microservice.repos.PanierItemRepository;
import com.example.orders_microservice.repos.PanierRepository;

import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.atomic.AtomicReference;
import java.util.stream.Collectors;

@Service
public class PanierServiceImpl implements PanierService {

	private static final Logger logger = LoggerFactory.getLogger(PanierServiceImpl.class);

	private final PanierItemAccessoireRepository panierItemAccessoireRepository;
	private final PromotionServiceClient promotionClient;
	private final AccessoireServiceClient accessoireClient;

	@Autowired
	private PanierRepository panierRepository;

	@Autowired
	private PanierItemRepository panierItemRepository;

	@Autowired
	private BassinCustomizationRepository customizationRepository;

	@Autowired
	private CustomizationAccessoireRepository customizationAccessoireRepository;

	@Autowired
	private BassinServiceClient bassinClient;
	
	@Autowired
	private BassinPersonnaliseClient bassinPersonnaliseClient;
	
	
	private static final int SESSION_CART_EXPIRATION_HOURS = 48;

	public PanierServiceImpl(PanierRepository panierRepository, PanierItemRepository panierItemRepository,
			PanierItemAccessoireRepository panierItemAccessoireRepository, BassinServiceClient bassinClient,
			PromotionServiceClient promotionClient, AccessoireServiceClient accessoireClient,BassinPersonnaliseClient bassinPersonnaliseClient ) {
		this.panierRepository = panierRepository;
		this.panierItemRepository = panierItemRepository;
		this.panierItemAccessoireRepository = panierItemAccessoireRepository;
		this.bassinClient = bassinClient;
		this.promotionClient = promotionClient;
		this.accessoireClient = accessoireClient;
		this.bassinPersonnaliseClient = bassinPersonnaliseClient;
	}

	
	public BassinPersonnaliseDTO getBassinPersonnaliseDetails(Long bassinId) {
	    if (bassinId == null) {
	        throw new IllegalArgumentException("Basin ID cannot be null");
	    }
	    
	    try {
	        // First try to get detailed personalized basin info
	        BassinPersonnaliseDTO bassinPersonnalise = bassinPersonnaliseClient.getDetailBassinPersonnalise(bassinId);
	        return bassinPersonnalise;
	    } catch (Exception e) {
	        logger.error("Error getting personalized basin details: {}", e.getMessage());
	        
	        // Fallback to getting by ID
	        try {
	            return bassinPersonnaliseClient.getBassinPersonnaliseByBassinId(bassinId);
	        } catch (Exception ex) {
	            logger.error("Error getting personalized basin by ID: {}", ex.getMessage());
	            throw new EntityNotFoundException("Personalized basin not found with ID: " + bassinId);
	        }
	    }
	}
	
@Override
    @Transactional
    public Panier getOrCreatePanier(Long userId, String sessionId) {
        logger.debug("Entering getOrCreatePanier - userId: {}, sessionId: {}", userId, sessionId);
        
        // Cas 1: Utilisateur authentifié
        if (userId != null) {
            logger.debug("Processing authenticated user cart");
            Panier userPanier = panierRepository.findByUserId(userId).orElseGet(() -> {
                Panier newPanier = new Panier();
                newPanier.setUserId(userId);
                newPanier.setItems(new ArrayList<>());
                newPanier.setLastUpdated(LocalDateTime.now());
                logger.info("Creating new cart for user ID: {}", userId);
                return panierRepository.save(newPanier);
            });
            
            // Si un sessionId est fourni, fusionner le panier de session avec celui de l'utilisateur
            if (sessionId != null && !sessionId.isEmpty()) {
                panierRepository.findBySessionId(sessionId).ifPresent(sessionCart -> {
                    if (!sessionCart.getId().equals(userPanier.getId())) {
                        mergeCarts(userPanier, sessionCart);
                        // Supprimer l'ancien panier de session après la fusion
                        panierRepository.delete(sessionCart);
                    }
                });
            }
            
            // Mettre à jour la date de dernière modification
            userPanier.setLastUpdated(LocalDateTime.now());
            return panierRepository.save(userPanier);
        }
        
        // Cas 2: Utilisateur non authentifié avec session
        String effectiveSessionId = (sessionId == null || sessionId.isEmpty()) ? 
                UUID.randomUUID().toString() : sessionId;
                
        Panier sessionPanier = panierRepository.findBySessionId(effectiveSessionId).orElseGet(() -> {
            Panier newPanier = new Panier();
            newPanier.setSessionId(effectiveSessionId);
            newPanier.setItems(new ArrayList<>());
            newPanier.setLastUpdated(LocalDateTime.now());
            logger.info("Creating new session cart with ID: {}", effectiveSessionId);
            return panierRepository.save(newPanier);
        });
        
        // Mettre à jour la date de dernière modification
        sessionPanier.setLastUpdated(LocalDateTime.now());
        return panierRepository.save(sessionPanier);
    }


	private boolean isCartExpired(Panier panier) {
		if (panier.getLastUpdated() == null)
			return false;
		return panier.getLastUpdated().isBefore(LocalDateTime.now().minusHours(SESSION_CART_EXPIRATION_HOURS));
	}

	@Override
	public Optional<Panier> checkSessionCartExists(String sessionId) {
		if (sessionId == null || sessionId.isEmpty()) {
			return Optional.empty();
		}
		return panierRepository.findBySessionId(sessionId);
	}

	@Override
	public Panier getPanierBySessionId(String sessionId) {
		return panierRepository.findBySessionId(sessionId)
				.orElseThrow(() -> new EntityNotFoundException("No cart found for session: " + sessionId));
	}

	@Override
	public Panier getPanierByUserId(Long userId) {
		List<Panier> carts = panierRepository.findAllByUserId(userId);
		if (carts.isEmpty()) {
			return null;
		}
		if (carts.size() > 1) {
			Panier mainCart = carts.get(0);
			for (int i = 1; i < carts.size(); i++) {
				mainCart.getItems().addAll(carts.get(i).getItems());
				panierRepository.delete(carts.get(i));
			}
			return panierRepository.save(mainCart);
		}
		return carts.get(0);
	}

	private Optional<PanierItem> findMatchingItem(Panier panier, PanierItemRequest request) {
		if (request.getIsCustomized()) {
			return Optional.empty();
		}

		return panier.getItems().stream()
				.filter(item -> !item.getIsCustomized() && Objects.equals(item.getBassinId(), request.getBassinId()))
				.findFirst();
	}

	private void applyPromotionToItem(PanierItem item, PromotionDTO promotion) {
		item.setPromotionActive(true);
		item.setNomPromotion(promotion.getNomPromotion());
		item.setTauxReduction(promotion.getTauxReduction());
		item.setPrixPromo(calculatePromoPrice(item.getPrixOriginal(), promotion.getTauxReduction()));
	}

	private double calculatePromoPrice(double originalPrice, double reductionRate) {
		return originalPrice * (1 - (reductionRate / 100.0));
	}

	private void updateItemPromotion(PanierItem item, PanierItemRequest request) {
		if (request.getPromotionId() != null) {
			PromotionDTO promotion = promotionClient.getPromotionById(request.getPromotionId());
			applyPromotionToItem(item, promotion);
		} else if (request.getTauxReduction() != null) {
			item.setPromotionActive(true);
			item.setNomPromotion(request.getNomPromotion());
			item.setTauxReduction(request.getTauxReduction());
			item.setPrixPromo(calculatePromoPrice(item.getPrixOriginal(), request.getTauxReduction()));
		} else if (!item.getIsCustomized() && item.getBassinId() != null) {
			BassinDTO bassin = bassinClient.getBassinDetails(item.getBassinId());
			if (bassin.getPromotionId() != null) {
				PromotionDTO promotion = promotionClient.getPromotionById(bassin.getPromotionId());
				if (promotion.isActive()) {
					applyPromotionToItem(item, promotion);
				}
			}
		}
	}

	@Override
	@Transactional
	public void updatePanierTotals(Panier panier) {
		AtomicReference<Double> totalPrice = new AtomicReference<>(0.0);

		if (panier.getItems() != null) {
			panier.getItems().forEach(item -> {
				// Calcul du prix effectif
				double effectivePrice = item.getEffectivePrice();
				item.setEffectivePrice(effectivePrice);

				// Calcul du sous-total
				double subtotal = effectivePrice * item.getQuantity();
				item.setSubtotal(subtotal);

				totalPrice.updateAndGet(v -> v + subtotal);
			});
		}

		panier.setTotalPrice(totalPrice.get());
		panier.setLastUpdated(LocalDateTime.now());
		panierRepository.save(panier);
	}

	@Override
	@Transactional
	public void removeItemFromPanier(Long userId, String sessionId, Long itemId) {
		Panier panier = getOrCreatePanier(userId, sessionId);
		PanierItem item = panierItemRepository.findByIdAndPanierId(itemId, panier.getId())
				.orElseThrow(() -> new EntityNotFoundException("Item not found in cart"));

		// Supprimer d'abord les accessoires associés
		panierItemAccessoireRepository.deleteByPanierItemId(itemId);

		// Puis supprimer l'item lui-même
		panier.getItems().removeIf(i -> i.getId().equals(itemId));
		panierItemRepository.delete(item);

		updatePanierTotals(panier);
	}
	 
    @Override
    public void clearPanier(Long userId, String sessionId) {
        if (userId != null) {
            panierRepository.findByUserId(userId).ifPresent(panier -> {
                panier.getItems().clear();
                panier.setLastUpdated(LocalDateTime.now());
                panierRepository.save(panier);
            });
        } else if (sessionId != null) {
            panierRepository.findBySessionId(sessionId).ifPresent(panier -> {
                panier.getItems().clear();
                panier.setLastUpdated(LocalDateTime.now());
                panierRepository.save(panier);
            });
        }
    }
    
    private Panier createNewSessionCart(String sessionId) {
        Panier panier = new Panier();
        panier.setSessionId(sessionId);
        panier.setItems(new ArrayList<>());
        panier.setLastUpdated(LocalDateTime.now());
        return panierRepository.save(panier);
    }
	

	public static class PartialAdditionException extends RuntimeException {
		private final PanierItem item;
		private final int affectedItems;

		public PartialAdditionException(String message, PanierItem item, int affectedItems) {
			super(message);
			this.item = item;
			this.affectedItems = affectedItems;
		}

		public PanierItem getItem() {
			return item;
		}

		public int getAffectedItems() {
			return affectedItems;
		}
	}

	@Override
	public Panier setUserEmailForPanier(Long userId, String sessionId, String email) {
		if (email == null || email.isEmpty()) {
			throw new IllegalArgumentException("Email is required");
		}

		Panier panier = getOrCreatePanier(userId, sessionId);
		panier.setUserEmail(email);
		panier.setLastUpdated(LocalDateTime.now());

		return panierRepository.save(panier);
	}

	private String generateSessionId() {
		return UUID.randomUUID().toString();
	}

	@Override
	@Transactional
	public void cleanupExpiredCarts() {
		LocalDateTime expirationThreshold = LocalDateTime.now().minusHours(SESSION_CART_EXPIRATION_HOURS);
		List<Panier> expiredCarts = panierRepository.findExpiredSessionCarts(expirationThreshold);

		logger.info("Found {} expired session carts to clean up", expiredCarts.size());

		for (Panier expiredCart : expiredCarts) {
			try {
				panierItemRepository.deleteAll(expiredCart.getItems());
				panierRepository.delete(expiredCart);
			} catch (Exception e) {
				logger.error("Error deleting expired cart: {}", e.getMessage());
			}
		}
	}

	@Override
	@Transactional
	public List<PanierItem> addMultipleItemsToPanier(Long userId, String sessionId,
			List<PanierItemRequest> itemRequests) {
		if (itemRequests == null || itemRequests.isEmpty()) {
			return Collections.emptyList();
		}

		Panier panier = getOrCreatePanier(userId, sessionId);
		List<PanierItem> addedItems = new ArrayList<>();
		List<PanierItem> problematicItems = new ArrayList<>();

		for (PanierItemRequest request : itemRequests) {
			try {
				PanierItem item = addItemToPanier(userId, sessionId, request);
				addedItems.add(item);
			} catch (InsufficientStockException e) {
				logger.warn("Stock issue during bulk add: {}", e.getMessage());
				problematicItems.add(createPartialItem(panier, request, e.getAvailableStock()));
			} catch (Exception e) {
				logger.error("Error adding item: {}", e.getMessage());
			}
		}

		updatePanierTotals(panier);

		if (!problematicItems.isEmpty()) {
			throw new PartialAdditionException("Some items couldn't be added", problematicItems.get(0),
					problematicItems.size());
		}

		return addedItems;
	}

	private PanierItem createPartialItem(Panier panier, PanierItemRequest request, int availableStock) {
		PanierItem partialItem = new PanierItem();
		partialItem.setPanier(panier);
		partialItem.setQuantity(availableStock);
		partialItem.setPrixOriginal(request.getPrixOriginal());

		if (!request.getIsCustomized() && request.getBassinId() != null) {
			partialItem.setBassinId(request.getBassinId());
		}

		return partialItem;
	}

	private double calculateAccessoiresPrice(List<Long> accessoiresIds) {
		if (accessoiresIds == null || accessoiresIds.isEmpty()) {
			return 0.0;
		}

		try {
			// Get the list of accessories from the bassins microservice
			List<AccessoireDTO> accessoires = accessoireClient.getAccessoiresByIds(accessoiresIds);

			if (accessoires != null) {
				// Calculate the total price by summing up all accessory prices
				return accessoires.stream().mapToDouble(AccessoireDTO::getPrixAccessoire).sum();
			}
		} catch (Exception e) {
			// Log the error and return 0 if there's any issue
			logger.error("Error calculating accessories price: " + e.getMessage());
		}

		return 0.0;
	}

	@Override
	@Transactional
	public PanierItem updateItemQuantity(Long userId, String sessionId, Long itemId, int newQuantity) {
		if (newQuantity <= 0) {
			throw new IllegalArgumentException("Quantity must be positive");
		}

		Panier panier = getOrCreatePanier(userId, sessionId);
		PanierItem item = panierItemRepository.findByIdAndPanierId(itemId, panier.getId())
				.orElseThrow(() -> new EntityNotFoundException("Item not found in cart"));

		// Vérifier le stock uniquement pour les articles DISPONIBLES
		if (!item.getIsCustomized() && item.getBassinId() != null && "DISPONIBLE".equalsIgnoreCase(item.getStatus())) {
			BassinDTO bassin = bassinClient.getBassinDetails(item.getBassinId());
			if (bassin.getStock() < newQuantity) {
				throw new InsufficientStockException("Insufficient stock", bassin.getStock());
			}
		}

		item.setQuantity(newQuantity);
		item = panierItemRepository.save(item);

		updatePanierTotals(panier);
		return item;
	}

	/**************/
	/**
	 * Ajoute un article au panier Pour les bassins personnalisés, utilise toujours
	 * createNewPanierItem
	 */
@Transactional
public PanierItem addItemToPanier(Long userId, String sessionId, PanierItemRequest request) {
    Panier panier = getOrCreatePanier(userId, sessionId);
    
    if (Boolean.TRUE.equals(request.getIsCustomized())) {
        return handleCustomBassin(panier, request);
    } else {
        return handleStandardBassin(panier, request);
    }
}

private PanierItem handleCustomBassin(Panier panier, PanierItemRequest request) {
    // Validation
    if (request.getPrixEstime() == null || request.getPrixEstime() <= 0) {
        throw new IllegalArgumentException("Estimated price must be positive for custom items");
    }
    
    // Add validation
    if (request.getMateriauSelectionne() == null) {
        logger.warn("MateriauSelectionne is null in request!");
    }
    
    PanierItem item = new PanierItem();
    item.setPanier(panier);
    item.setQuantity(request.getQuantity());
    item.setIsCustomized(true);
    item.setStatus("SUR_COMMANDE");
    
    // Set base properties
    item.setBassinId(request.getBassinId());
    item.setNomBassin(request.getNomBassin());
    item.setImageUrl(request.getImageUrl());
    item.setPrixOriginal(request.getPrixOriginal());
    
    // Set customization details
    item.setMateriauSelectionne(request.getMateriauSelectionne() != null ? 
            request.getMateriauSelectionne() : "Non spécifié"); 
    
    item.setPrixMateriau(request.getPrixMateriau());
    item.setDimensionSelectionnee(request.getDimensionSelectionnee());
    item.setPrixDimension(request.getPrixDimension());
    item.setCouleurSelectionnee(request.getCouleurSelectionnee());
    item.setPrixEstime(request.getPrixEstime());
    item.setEffectivePrice(request.getPrixEstime());
    item.setDureeFabrication(request.getDureeFabrication().toString());
    
    // Process accessories
    if (request.getAccessoireIds() != null && !request.getAccessoireIds().isEmpty()) {
        List<AccessoireDTO> accessoires = accessoireClient.getAccessoiresByIds(request.getAccessoireIds());
        List<PanierItemAccessoire> panierAccessoires = accessoires.stream()
            .map(acc -> createPanierItemAccessoire(item, acc))
            .collect(Collectors.toList());
        item.setAccessoires(panierAccessoires);
    }
    
    // Calculate subtotal
    item.setSubtotal(item.getEffectivePrice() * item.getQuantity());
    
    panier.getItems().add(item);
    panierRepository.save(panier);
    updatePanierTotals(panier);
    
    return item;
}

private PanierItemAccessoire createPanierItemAccessoire(PanierItem item, AccessoireDTO accessoire) {
    PanierItemAccessoire panierAccessoire = new PanierItemAccessoire();
    panierAccessoire.setPanierItem(item);
    panierAccessoire.setAccessoireId(accessoire.getId());
    panierAccessoire.setNomAccessoire(accessoire.getNomAccessoire());
    panierAccessoire.setPrixAccessoire(accessoire.getPrixAccessoire());
    panierAccessoire.setImageUrl(accessoire.getImageUrl());
    return panierAccessoire;
}

private PanierItem handleStandardBassin(Panier panier, PanierItemRequest request) {
    if (request.getBassinId() == null) {
        throw new IllegalArgumentException("Basin ID is required for standard items");
    }

    BassinDTO bassin = bassinClient.getBassinDetails(request.getBassinId());
    

    PanierItem item = new PanierItem();
    item.setPanier(panier);
    item.setQuantity(request.getQuantity());
    item.setAddedAt(LocalDateTime.now());
    item.setIsCustomized(false);
    item.setStatus(request.getStatus()); 
    
    
    // Set standard basin properties
    item.setBassinId(bassin.getIdBassin());
    item.setNomBassin(bassin.getNomBassin());
    item.setDescription(bassin.getDescription());
    item.setImageUrl(bassin.getImagesBassin() != null && !bassin.getImagesBassin().isEmpty() ? 
                   bassin.getImagesBassin().get(0).getImagePath() : null);
    item.setStatus(bassin.getStatus());
    item.setPrixOriginal(bassin.getPrix());
    
    // Handle promotion
    if (request.getPromotionId() != null) {
        try {
            PromotionDTO promotion = promotionClient.getPromotionDetails(request.getPromotionId());
            if (promotion != null && promotion.isActive()) {
                item.setPromotionActive(true);
                item.setNomPromotion(promotion.getNomPromotion());
                item.setTauxReduction(promotion.getTauxReduction());
                
                double discountedPrice = Math.round(bassin.getPrix() * (1 - promotion.getTauxReduction() / 100.0) * 100.0) / 100.0;
                
                item.setPrixPromo(discountedPrice);
                item.setEffectivePrice(discountedPrice);
            }
        } catch (Exception e) {
            logger.warn("Could not apply promotion", e);
        }
    }
    
    if (item.getEffectivePrice() == null) {
        item.setEffectivePrice(bassin.getPrix());
    }
    
    // Process accessories
    if (request.getAccessoireIds() != null && !request.getAccessoireIds().isEmpty()) {
        List<PanierItemAccessoire> accessories = new ArrayList<>();
        for (Long accessoireId : request.getAccessoireIds()) {
            try {
                AccessoireDTO accessoireDTO = accessoireClient.getAccessoireDetails(accessoireId);
                if (accessoireDTO != null) {
                    PanierItemAccessoire accessoire = new PanierItemAccessoire();
                    accessoire.setPanierItem(item);
                    accessoire.setAccessoireId(accessoireId);
                    accessoire.setNomAccessoire(accessoireDTO.getNomAccessoire());
                    accessoire.setPrixAccessoire(accessoireDTO.getPrixAccessoire());
                    accessoire.setImageUrl(accessoireDTO.getImageUrl());
                    accessories.add(accessoire);
                }
            } catch (Exception e) {
                logger.warn("Could not retrieve accessory details for ID: {}", accessoireId, e);
            }
        }
        item.setAccessoires(accessories);
    }
    
    // Calculate subtotal
    item.setSubtotal(item.getEffectivePrice() * item.getQuantity());
    
    // Save the item
    panier.getItems().add(item);
    panierRepository.save(panier);
    updatePanierTotals(panier);
    
    return item;
}
	

	/**
	 * Creates a new standard basin item
	 */
	private PanierItem createStandardBassinItem(Panier panier, PanierItemRequest request, BassinDTO bassin) {
		PanierItem item = new PanierItem();
		item.setPanier(panier);
		item.setQuantity(request.getQuantity());
		item.setPrixOriginal(request.getPrixOriginal());
		item.setBassinId(request.getBassinId());
		item.setIsCustomized(false);
		item.setStatus(request.getStatus());

		// Set promotion details if applicable - handle null case
		Boolean isPromotionActive = request.getPromotionActive();
		if (isPromotionActive != null && isPromotionActive) {
			item.setPromotionActive(true);
			item.setNomPromotion(request.getNomPromotion());
			item.setTauxReduction(request.getTauxReduction());
			item.setPrixPromo(request.getPrixPromo());
		} else {
			item.setPromotionActive(false);
		}

		// Set effective price
		if (item.isPromotionActive() && item.getPrixPromo() != null) {
			item.setEffectivePrice(item.getPrixPromo());
		} else {
			item.setEffectivePrice(item.getPrixOriginal());
		}

		// Set subtotal
		item.setSubtotal(item.getEffectivePrice() * item.getQuantity());

		// Set fabrication duration for SUR_COMMANDE items
		if ("SUR_COMMANDE".equalsIgnoreCase(item.getStatus()) && bassin != null) {
			setFabricationDuration(item, bassin);
		}

		// Set bassin name and image from bassin
		if (bassin != null) {
			item.setNomBassin(bassin.getNomBassin());
			item.setImageUrl(bassin.getImagePath());
		}

		return panierItemRepository.save(item);
	}


	/*********************************/
	@Override
	@Transactional
	public Panier migrateSessionCartToUserCart(Long userId, String sessionId) {
		if (userId == null) {
			throw new IllegalArgumentException("User ID is required");
		}

		if (sessionId == null || sessionId.isEmpty()) {
			throw new IllegalArgumentException("Session ID is required");
		}

		// Récupérer le panier de session
		Panier sessionCart = panierRepository.findBySessionId(sessionId)
				.orElseThrow(() -> new EntityNotFoundException("Session cart not found"));

		// Récupérer ou créer le panier utilisateur
		Panier userCart = panierRepository.findByUserId(userId).orElseGet(() -> {
			Panier newCart = new Panier();
			newCart.setUserId(userId);
			newCart.setItems(new ArrayList<>());
			newCart.setLastUpdated(LocalDateTime.now());
			return panierRepository.save(newCart);
		});

		if (sessionCart.getItems() == null || sessionCart.getItems().isEmpty()) {
			return userCart;
		}

		List<PanierItem> problematicItems = new ArrayList<>();

		for (PanierItem sessionItem : new ArrayList<>(sessionCart.getItems())) {
			try {
				if (!sessionItem.getIsCustomized() && sessionItem.getBassinId() != null) {
					// Vérifier le stock via Feign
					BassinDTO bassin = bassinClient.getBassinDetails(sessionItem.getBassinId());

					// Trouver un item existant correspondant
					Optional<PanierItem> existingItem = userCart.getItems().stream().filter(i -> !i.getIsCustomized()
							&& i.getBassinId() != null && i.getBassinId().equals(sessionItem.getBassinId()))
							.findFirst();

					if (existingItem.isPresent()) {
						PanierItem userItem = existingItem.get();
						int newQuantity = userItem.getQuantity() + sessionItem.getQuantity();

						// Vérifier le stock
						if (bassin.getStock() < newQuantity) {
							problematicItems.add(sessionItem);
							userItem.setQuantity(bassin.getStock()); // Ajuster à la quantité max disponible
						} else {
							userItem.setQuantity(newQuantity);
						}

						panierItemRepository.save(userItem);
						continue;
					}
				}

				// Créer un nouvel item dans le panier utilisateur
				PanierItem newItem = new PanierItem();
				newItem.setPanier(userCart);
				newItem.setQuantity(sessionItem.getQuantity());
				newItem.setPrixOriginal(sessionItem.getPrixOriginal());
				newItem.setPrixPromo(sessionItem.getPrixPromo());
				newItem.setPromotionActive(sessionItem.isPromotionActive());
				newItem.setNomPromotion(sessionItem.getNomPromotion());
				newItem.setTauxReduction(sessionItem.getTauxReduction());
				newItem.setIsCustomized(sessionItem.getIsCustomized());
				newItem.setBassinId(sessionItem.getBassinId());
				newItem.setMateriauSelectionne(sessionItem.getMateriauSelectionne());
				newItem.setDimensionSelectionnee(sessionItem.getDimensionSelectionnee());
				newItem.setCouleurSelectionnee(sessionItem.getCouleurSelectionnee());
				newItem.setCustomizationId(sessionItem.getCustomizationId());
				newItem.setStatus(sessionItem.getStatus());
				newItem.setDureeFabrication(sessionItem.getDureeFabrication());
				newItem.setNomBassin(sessionItem.getNomBassin());
				newItem.setDescription(sessionItem.getDescription());
				newItem.setImageUrl(sessionItem.getImageUrl());

				// Copier les accessoires
				if (sessionItem.getAccessoires() != null && !sessionItem.getAccessoires().isEmpty()) {
					List<PanierItemAccessoire> accessoires = sessionItem.getAccessoires().stream().map(acc -> {
						PanierItemAccessoire newAcc = new PanierItemAccessoire();
						newAcc.setPanierItem(newItem);
						newAcc.setAccessoireId(acc.getAccessoireId());
						newAcc.setNomAccessoire(acc.getNomAccessoire());
						newAcc.setPrixAccessoire(acc.getPrixAccessoire());
						newAcc.setImageUrl(acc.getImageUrl());
						return newAcc;
					}).collect(Collectors.toList());
					newItem.setAccessoires(accessoires);
				}

				userCart.getItems().add(newItem);
				panierItemRepository.save(newItem);

				if (newItem.getAccessoires() != null) {
					panierItemAccessoireRepository.saveAll(newItem.getAccessoires());
				}

			} catch (Exception e) {
				logger.error("Error migrating item: {}", e.getMessage());
				problematicItems.add(sessionItem);
			}
		}

		updatePanierTotals(userCart);
		panierRepository.delete(sessionCart);

		if (!problematicItems.isEmpty()) {
			logger.warn("{} items had issues during migration", problematicItems.size());
			throw new PartialAdditionException("Some items couldn't be fully migrated", problematicItems.get(0),
					problematicItems.size());
		}

		return userCart;
	}

	@Override
	@Transactional
	public Panier mergeCarts(Panier primaryCart, Panier secondaryCart) {
		 logger.info("Merging cart {} into cart {}", primaryCart.getId(), secondaryCart.getId());
	        
		 if (primaryCart == null || secondaryCart == null) {
			throw new IllegalArgumentException("Both carts must be non-null");
		}

		if (secondaryCart.getItems() == null || secondaryCart.getItems().isEmpty()) {
			return primaryCart;
		}

		List<PanierItem> problematicItems = new ArrayList<>();

		for (PanierItem secondaryItem : new ArrayList<>(secondaryCart.getItems())) {
			try {
				if (!secondaryItem.getIsCustomized() && secondaryItem.getBassinId() != null) {
					Optional<PanierItem> existingItem = primaryCart.getItems().stream().filter(i -> !i.getIsCustomized()
							&& i.getBassinId() != null && i.getBassinId().equals(secondaryItem.getBassinId()))
							.findFirst();

					if (existingItem.isPresent()) {
						PanierItem primaryItem = existingItem.get();
						int totalQuantity = primaryItem.getQuantity() + secondaryItem.getQuantity();

						// Vérification du stock via Feign Client
						BassinDTO bassin = bassinClient.getBassinDetails(secondaryItem.getBassinId());
						if (bassin.getStock() < totalQuantity) {
							problematicItems.add(secondaryItem);
							primaryItem.setQuantity(Math.min(totalQuantity, bassin.getStock()));
						} else {
							primaryItem.setQuantity(totalQuantity);
						}

						panierItemRepository.save(primaryItem);
						continue;
					}
				}

				PanierItem newItem = new PanierItem();
				newItem.setPanier(primaryCart);
				newItem.setQuantity(secondaryItem.getQuantity());
				newItem.setPrixOriginal(secondaryItem.getPrixOriginal());
				newItem.setPrixPromo(secondaryItem.getPrixPromo());
				newItem.setPromotionActive(secondaryItem.isPromotionActive());
				newItem.setNomPromotion(secondaryItem.getNomPromotion());
				newItem.setTauxReduction(secondaryItem.getTauxReduction());
				newItem.setIsCustomized(secondaryItem.getIsCustomized());
				newItem.setBassinId(secondaryItem.getBassinId());
				newItem.setMateriauSelectionne(secondaryItem.getMateriauSelectionne());
				newItem.setDimensionSelectionnee(secondaryItem.getDimensionSelectionnee());
				newItem.setCouleurSelectionnee(secondaryItem.getCouleurSelectionnee());
				newItem.setCustomizationId(secondaryItem.getCustomizationId());
				newItem.setStatus(secondaryItem.getStatus());
				newItem.setDureeFabrication(secondaryItem.getDureeFabrication());
				newItem.setNomBassin(secondaryItem.getNomBassin());
				newItem.setDescription(secondaryItem.getDescription());
				newItem.setImageUrl(secondaryItem.getImageUrl());

				// Copier les accessoires
				if (secondaryItem.getAccessoires() != null && !secondaryItem.getAccessoires().isEmpty()) {
					List<PanierItemAccessoire> accessoires = secondaryItem.getAccessoires().stream().map(acc -> {
						PanierItemAccessoire newAcc = new PanierItemAccessoire();
						newAcc.setPanierItem(newItem);
						newAcc.setAccessoireId(acc.getAccessoireId());
						newAcc.setNomAccessoire(acc.getNomAccessoire());
						newAcc.setPrixAccessoire(acc.getPrixAccessoire());
						newAcc.setImageUrl(acc.getImageUrl());
						return newAcc;
					}).collect(Collectors.toList());
					newItem.setAccessoires(accessoires);
				}

				primaryCart.getItems().add(newItem);
				panierItemRepository.save(newItem);

				if (newItem.getAccessoires() != null) {
					panierItemAccessoireRepository.saveAll(newItem.getAccessoires());
				}

			} catch (Exception e) {
				logger.error("Error merging item: {}", e.getMessage());
				problematicItems.add(secondaryItem);
			}
		}

		updatePanierTotals(primaryCart);

		try {
			panierItemRepository.deleteAll(secondaryCart.getItems());
			panierRepository.delete(secondaryCart);
		} catch (Exception e) {
			logger.error("Error deleting secondary cart: {}", e.getMessage());
		}

		if (!problematicItems.isEmpty()) {
			logger.warn("{} items had issues during merge", problematicItems.size());
		}

		return primaryCart;
	}

	private PanierItem updateExistingItem(PanierItem item, PanierItemRequest request, BassinDTO bassin) {
		int newQuantity = item.getQuantity() + request.getQuantity();

		// Vérification du stock uniquement pour les articles DISPONIBLES
		if (!item.getIsCustomized() && item.getBassinId() != null && "DISPONIBLE".equalsIgnoreCase(item.getStatus())) {
			if (bassin.getStock() < newQuantity) {
				throw new InsufficientStockException("Stock total insuffisant", bassin.getStock());
			}
		}

		item.setQuantity(newQuantity);
		updateItemPromotion(item, request);

		if (request.getPrixOriginal() != null) {
			item.setPrixOriginal(request.getPrixOriginal());
		}

		// Mise à jour de la durée de fabrication pour les articles personnalisés
		if (item.getIsCustomized() && request.getDureeFabrication() != null) {
			item.setDureeFabrication(request.getDureeFabrication() + " jours");
		}

		panierItemRepository.save(item);
		updatePanierTotals(item.getPanier());
		return item;
	}

private PanierItem createNewPanierItem(Panier panier, PanierItemRequest request, BassinDTO bassin) {
    PanierItem panierItem = new PanierItem();
    panierItem.setPanier(panier);
    panierItem.setQuantity(request.getQuantity());
    panierItem.setPrixOriginal(request.getPrixOriginal());
    panierItem.setIsCustomized(request.getIsCustomized());
   
    // Définir le statut correctement
    if (request.getStatus() != null) {
        panierItem.setStatus(request.getStatus());
    } else if (bassin != null) {
        panierItem.setStatus(bassin.getStatus());
    } else {
        panierItem.setStatus("SUR_COMMANDE"); // Valeur par défaut
    }
    
    if (Boolean.TRUE.equals(request.getIsCustomized())) {
        handleCustomizedItem(panierItem, request, bassin);
    } else {
        handleStandardItem(panierItem, request, bassin);
    }

    handlePromotion(panierItem, request);

    PanierItem savedItem = panierItemRepository.save(panierItem);
    if (panierItem.getAccessoires() != null && !panierItem.getAccessoires().isEmpty()) {
        panierItemAccessoireRepository.saveAll(panierItem.getAccessoires());
    }

    return savedItem;
}

private void handleCustomizedItem(PanierItem panierItem, PanierItemRequest request, BassinDTO bassin) {
    // Set customization ID
    panierItem.setCustomizationId(
            request.getCustomizationId() != null ? request.getCustomizationId() : UUID.randomUUID().toString());
    
    // Set customization details
 // In your mapping code
    panierItem.setMateriauSelectionne(request.getMateriauSelectionne()); 
    
    logger.debug("Returning item with materiau: {}", panierItem.getMateriauSelectionne());
    
    panierItem.setDimensionSelectionnee(request.getDimensionSelectionnee());
    panierItem.setCouleurSelectionnee(request.getCouleurSelectionnee());

    // Set product info
    panierItem.setNomBassin(request.getNomBassin() != null ? request.getNomBassin() : "Bassin personnalisé");
    panierItem.setImageUrl(request.getImageUrl());

    // Handle fabrication duration
    if (request.getDureeFabrication() != null) {
        panierItem.setDureeFabrication(request.getDureeFabrication() + " jours");
    } else if (bassin != null && bassin.getDureeFabricationJours() != null) {
        panierItem.setDureeFabrication(bassin.getDureeFabricationJours() + " jours");
    }

    // Handle accessories
    if (request.getAccessoireIds() != null && !request.getAccessoireIds().isEmpty()) {
        List<AccessoireDTO> accessoires = accessoireClient.getAccessoiresByIds(request.getAccessoireIds());
        List<PanierItemAccessoire> panierAccessoires = accessoires.stream()
            .map(acc -> createPanierItemAccessoire(acc, panierItem))
            .collect(Collectors.toList());
        
        panierItem.setAccessoires(panierAccessoires);
        
        // Calculate total price with accessories
        double accessoriesPrice = accessoires.stream()
            .mapToDouble(AccessoireDTO::getPrixAccessoire)
            .sum();
        
        panierItem.setPrixOriginal(panierItem.getPrixOriginal() + accessoriesPrice);
    }
}

private PanierItemAccessoire createPanierItemAccessoire(AccessoireDTO accessoire, PanierItem panierItem) {
    PanierItemAccessoire pa = new PanierItemAccessoire();
    pa.setPanierItem(panierItem);
    pa.setAccessoireId(accessoire.getId()); // Utilisez getId() au lieu de getIdAccessoire()
    pa.setNomAccessoire(accessoire.getNomAccessoire());
    pa.setPrixAccessoire(accessoire.getPrixAccessoire());
    pa.setImageUrl(accessoire.getImageUrl());
    return pa;
}

private void handleStandardItem(PanierItem panierItem, PanierItemRequest request, BassinDTO bassin) {
    if (bassin != null) {
        panierItem.setNomBassin(bassin.getNomBassin());
        panierItem.setDescription(bassin.getDescription());
        panierItem.setImageUrl(bassin.getImagePath());

        if ("SUR_COMMANDE".equals(bassin.getStatus())) {
            setFabricationDuration(panierItem, bassin);
        }
    }
}

/**
 * Helper method to set fabrication duration based on bassin data
 */

private void setFabricationDuration(PanierItem panierItem, BassinDTO bassin) {
    if (bassin.getDureeFabricationJours() != null) {
        panierItem.setDureeFabrication(bassin.getDureeFabricationJours() + " jours");
    } else if (bassin.getDureeFabricationJoursMin() != null && bassin.getDureeFabricationJoursMax() != null) {
        panierItem.setDureeFabrication(
            bassin.getDureeFabricationJoursMin() + "-" + bassin.getDureeFabricationJoursMax() + " jours");
    }
}

private void handlePromotion(PanierItem panierItem, PanierItemRequest request) {
    if (request.getPromotionId() != null) {
        applyPromotionFromId(panierItem, request);
    } else if (request.getTauxReduction() != null) {
        applyDirectPromotion(panierItem, request);
    }
}

private void applyPromotionFromId(PanierItem panierItem, PanierItemRequest request) {
    PromotionDTO promotion = promotionClient.getPromotionById(request.getPromotionId());
    if (promotion != null && promotion.isActive()) {
        panierItem.setPromotionActive(true);
        panierItem.setNomPromotion(promotion.getNomPromotion());
        panierItem.setTauxReduction(promotion.getTauxReduction());
        panierItem.setPrixPromo(calculateDiscountedPrice(panierItem.getPrixOriginal(), promotion.getTauxReduction()));
    }
}

private void applyDirectPromotion(PanierItem panierItem, PanierItemRequest request) {
    panierItem.setPromotionActive(true);
    panierItem.setNomPromotion(request.getNomPromotion());
    panierItem.setTauxReduction(request.getTauxReduction());
    panierItem.setPrixPromo(calculateDiscountedPrice(panierItem.getPrixOriginal(), request.getTauxReduction()));
}

private double calculateDiscountedPrice(double originalPrice, double discountRate) {
    return originalPrice * (1 - discountRate / 100);
}
	private PanierItem saveItem(PanierItem item) {
	    if (item.getPromotionActive() == null) {
	        item.setPromotionActive(false);
	    }
	    return panierItemRepository.save(item);
	}
}