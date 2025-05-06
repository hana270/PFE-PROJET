package com.example.orders_microservice.restcontrollers;

import com.example.orders_microservice.dto.*;
import com.example.orders_microservice.entities.*;
import com.example.orders_microservice.exceptions.*;
import com.example.orders_microservice.security.CustomUserDetails;
import com.example.orders_microservice.service.*;
import com.example.orders_microservice.service.PanierServiceImpl.PartialAdditionException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.persistence.EntityNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/panier")
@CrossOrigin(origins = { "http://localhost:4200" }, 
allowedHeaders = { "Authorization", "Content-Type", "X-Requested-With", "Accept", "Origin", "X-Session-ID" }, 
exposedHeaders = { "Authorization", "X-Session-ID" }, 
methods = { RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE, RequestMethod.OPTIONS }, 
allowCredentials = "true", 
maxAge = 3600)
public class PanierRestController {

	private static final Logger logger = LoggerFactory.getLogger(PanierRestController.class);
	private static final int SESSION_CART_EXPIRATION_HOURS = 48;

	private final PanierService panierService;
	private final BassinServiceClient bassinClient;
	private final PromotionServiceClient promotionClient;
	private final AccessoireServiceClient accessoireServiceClient;

	public PanierRestController(PanierService panierService, BassinServiceClient bassinClient,
			PromotionServiceClient promotionClient, AccessoireServiceClient a) {
		this.panierService = panierService;
		this.bassinClient = bassinClient;
		this.promotionClient = promotionClient;
		this.accessoireServiceClient = a;
	}



    @GetMapping
    public ResponseEntity<?> getPanier(
            @RequestHeader(value = "X-Session-ID", required = false) String sessionId,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            HttpServletRequest request) {
        
        try {
            // Vérifier l'authentification
            boolean isAuthenticated = authHeader != null && authHeader.startsWith("Bearer ");
            Long userId = isAuthenticated ? getCurrentUserId() : null;
            
            // Si utilisateur authentifié, ignorer le sessionId
            if (userId != null) {
                sessionId = null;
            }
            
            logger.info("Getting cart for userId: {}, sessionId: {}", userId, sessionId);
            
            // Récupérer ou créer le panier en fonction de l'utilisateur ou de la session
            Panier panier = panierService.getOrCreatePanier(userId, sessionId);
            
            // Vérifier si le panier anonyme est expiré
            if (userId == null && isCartExpired(panier)) {
                logger.info("Clearing expired session cart: {}", sessionId);
                panierService.clearPanier(null, sessionId);
                panier = panierService.getOrCreatePanier(null, sessionId);
            }
            
            // Convertir le panier en réponse
            PanierResponse response = mapToPanierResponse(panier);
            
            // Préparer les en-têtes HTTP
            HttpHeaders headers = new HttpHeaders();
            if (userId == null && panier.getSessionId() != null) {
                // Renvoyer l'ID de session dans les en-têtes pour les utilisateurs anonymes
                headers.add("X-Session-ID", panier.getSessionId());
            }
            
            return new ResponseEntity<>(response, headers, HttpStatus.OK);
        } catch (Exception e) {
            logger.error("Erreur lors de la récupération du panier", e);
            
            // Ajouter des détails techniques pour faciliter le débogage
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Erreur lors de la récupération du panier: " + e.getMessage());
            errorResponse.put("errorType", e.getClass().getName());
            
            // En cas d'erreur IncorrectResultSizeDataAccessException spécifique
            if (e instanceof org.springframework.dao.IncorrectResultSizeDataAccessException) {
                errorResponse.put("suggestion", "Problème de relation entre Panier et PanierItem. " +
                        "Vérifiez les mappings JPA et assurez-vous d'utiliser getResultList() au lieu de getSingleResult().");
            }
            
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }}

	
	@PostMapping("/items")
public ResponseEntity<?> addItemToCart(@Valid @RequestBody PanierItemRequest request,
        @RequestHeader(value = "X-Session-ID", required = false) String sessionId,
        @RequestHeader(value = "Authorization", required = false) String authHeader) {
    
    try {
        logger.info("Received status: {}", request.getStatus());
        
        // Validate request
        if (request == null) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "Request body is required"
            ));
        }

        // Check authentication state
        boolean isAuthenticated = authHeader != null && authHeader.startsWith("Bearer ");
        Long userId = isAuthenticated ? getCurrentUserId() : null;

        // Additional validation for customized items
        if (request.getIsCustomized()) {
            if (request.getPrixEstime() == null || request.getPrixEstime() <= 0) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Estimated price must be positive for customized items"
                ));
            }
            request.validateForCustomBassin();
        }

        // Stock check for standard items
        if (!request.getIsCustomized() && request.getBassinId() != null) {
            BassinDTO bassin = bassinClient.getBassinDetails(request.getBassinId());
            if ("DISPONIBLE".equals(bassin.getStatus()) && bassin.getStock() < request.getQuantity()) {
                throw new InsufficientStockException("Stock insuffisant. Disponible: " + bassin.getStock(),
                        bassin.getStock());
            }
        }
        
        // Validation du statut
        if (request.getStatus() == null) {
            if (Boolean.TRUE.equals(request.getIsCustomized())) {
                request.setStatus("SUR_COMMANDE");
            } else {
                // Récupérer le statut depuis le bassin
                BassinDTO bassin = bassinClient.getBassinDetails(request.getBassinId());
                request.setStatus(bassin.getStatus());
            }
        }

        PanierItem item = panierService.addItemToPanier(userId, sessionId, request);
        PanierResponse response = mapToPanierResponse(panierService.getOrCreatePanier(userId, sessionId));

        return ResponseEntity.ok(Map.of(
            "success", true, 
            "cart", response, 
            "message", "Article ajouté au panier",
            "item", convertToResponse(item)
        ));
    } catch (InsufficientStockException e) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of(
                    "success", false, 
                    "message", e.getMessage(), 
                    "availableStock", e.getAvailableStock()
                ));
    } catch (IllegalArgumentException e) {
        return ResponseEntity.badRequest().body(Map.of(
            "success", false, 
            "message", e.getMessage()
        ));
    } catch (Exception e) {
        logger.error("Error adding item to cart", e);
        return ResponseEntity.internalServerError()
                .body(Map.of(
                    "success", false, 
                    "message", "Erreur lors de l'ajout au panier: " + e.getMessage()
                ));
    }
}
	
	
	public ResponseEntity<?> updateItemQuantity(@PathVariable Long itemId,
			@RequestBody Map<String, Integer> quantityMap,
			@RequestHeader(value = "X-Session-ID", required = false) String sessionId) {

		Integer newQuantity = quantityMap.get("quantity");
		if (newQuantity == null || newQuantity <= 0) {
			return badRequest("Quantité invalide");
		}

		try {
			Long userId = getCurrentUserId();
			PanierItem item = panierService.updateItemQuantity(userId, sessionId, itemId, newQuantity);
			Panier updatedPanier = panierService.getOrCreatePanier(userId, sessionId);

			return ResponseEntity.ok(successResponse("Quantité mise à jour", Map.of("item", convertToResponse(item), // Changé
																														// de
																														// convertToItemResponse
																														// à
																														// convertToResponse
					"cart", mapToPanierResponse(updatedPanier))));
		} catch (EntityNotFoundException e) {
			return ResponseEntity.notFound().build();
		} catch (Exception e) {
			logger.error("Error updating item quantity", e);
			return badRequest(e.getMessage());
		}
	}

	@DeleteMapping("/items/{itemId}")
	public ResponseEntity<?> removeItem(@PathVariable Long itemId,
			@RequestHeader(value = "X-Session-ID", required = false) String sessionId) {

		try {
			Long userId = getCurrentUserId();
			panierService.removeItemFromPanier(userId, sessionId, itemId);
			Panier updatedPanier = panierService.getOrCreatePanier(userId, sessionId);

			return ResponseEntity.ok(
					successResponse("Article supprimé du panier", Map.of("cart", mapToPanierResponse(updatedPanier))));
		} catch (Exception e) {
			logger.error("Error removing item from cart", e);
			return badRequest(e.getMessage());
		}
	}

	@DeleteMapping
	public ResponseEntity<?> clearPanier(@RequestHeader(value = "X-Session-ID", required = false) String sessionId) {

		try {
			Long userId = getCurrentUserId();
			panierService.clearPanier(userId, sessionId);
			Panier emptyPanier = panierService.getOrCreatePanier(userId, sessionId);

			return ResponseEntity
					.ok(successResponse("Panier vidé avec succès", Map.of("cart", mapToPanierResponse(emptyPanier))));
		} catch (Exception e) {
			logger.error("Error clearing cart", e);
			return badRequest(e.getMessage());
		}
	}

	@PostMapping("/migrate")
	public ResponseEntity<?> migrateSessionCartToUserCart(
			@RequestHeader(value = "X-Session-ID", required = false) String sessionId) {

		try {
			Long userId = getCurrentUserId();
			if (userId == null) {
				return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
						.body(Map.of("success", false, "message", "Vous devez être connecté"));
			}

			if (sessionId == null || sessionId.isEmpty()) {
				return badRequest("Session ID manquant");
			}

			Panier migratedCart = panierService.migrateSessionCartToUserCart(userId, sessionId);

			return ResponseEntity.ok(successResponse("Panier récupéré avec succès",
					Map.of("panier", mapToPanierResponse(migratedCart))));
		} catch (Exception e) {
			logger.error("Error migrating cart", e);
			return badRequest("Erreur lors de la récupération du panier: " + e.getMessage());
		}
	}

	@PostMapping("/email")
	public ResponseEntity<?> setUserEmail(@RequestBody Map<String, String> emailRequest,
			@RequestHeader(value = "X-Session-ID", required = false) String sessionId) {

		try {
			String email = emailRequest.get("email");
			if (email == null || email.isEmpty()) {
				return badRequest("L'adresse email est requise");
			}

			Long userId = getCurrentUserId();
			panierService.setUserEmailForPanier(userId, sessionId, email);

			return ResponseEntity.ok(Map.of("success", true, "message", "Email enregistré pour les notifications"));
		} catch (Exception e) {
			logger.error("Error setting user email", e);
			return badRequest(e.getMessage());
		}
	}

	// Helper methods
	private boolean isCartExpired(Panier panier) {
		if (panier.getUserId() != null)
			return false;
		if (panier.getLastUpdated() == null)
			return false;
		return panier.getLastUpdated().isBefore(LocalDateTime.now().minusHours(SESSION_CART_EXPIRATION_HOURS));
	}

private PanierItemResponse convertToResponse(PanierItem item) {
    PanierItemResponse response = new PanierItemResponse();
    response.setId(item.getId());
    response.setBassinId(item.getBassinId());
    response.setNomBassin(item.getNomBassin());
    response.setDescription(item.getDescription());
    response.setImageUrl(item.getImageUrl());
    response.setQuantity(item.getQuantity());
    response.setPrixOriginal(item.getPrixOriginal());
    response.setPrixPromo(item.getPrixPromo());
    response.setEffectivePrice(item.getEffectivePrice());
    response.setSubtotal(item.getSubtotal());
    response.setStatus(item.getStatus());
    response.setIsCustomized(item.getIsCustomized());
    
    // Customization details
    if (Boolean.TRUE.equals(item.getIsCustomized())) {
        CustomizationDetailsDTO customization = new CustomizationDetailsDTO();
        customization.setMateriauSelectionne(item.getMateriauSelectionne());
        customization.setDimensionSelectionnee(item.getDimensionSelectionnee());
        customization.setCouleurSelectionnee(item.getCouleurSelectionnee());
        customization.setPrixMateriau(item.getPrixMateriau());
        customization.setPrixDimension(item.getPrixDimension());
        customization.setPrixEstime(item.getPrixEstime());
        customization.setDureeFabrication(item.getDureeFabrication());
        response.setCustomization(customization);
    }
    
    // Accessories
    if (item.getAccessoires() != null) {
        List<AccessoireDTO> accessoires = item.getAccessoires().stream()
            .map(acc -> {
                AccessoireDTO accDto = new AccessoireDTO();
                accDto.setAccessoireId(acc.getAccessoireId());
                accDto.setNomAccessoire(acc.getNomAccessoire());
                accDto.setPrixAccessoire(acc.getPrixAccessoire());
                accDto.setImageUrl(acc.getImageUrl());
                return accDto;
            })
            .collect(Collectors.toList());
        response.setAccessoires(accessoires);
    }
    
    // Promotion fields
    response.setPromotionActive(item.isPromotionActive());
    response.setNomPromotion(item.getNomPromotion());
    response.setTauxReduction(item.getTauxReduction());
    
    return response;
}

public PanierItem createCustomizedItem(PanierItemRequest request) {
    PanierItem item = new PanierItem();
    // Set required fields
    item.setAddedAt(LocalDateTime.now()); // This is critical
    item.setBassinId(request.getBassinId());
    item.setNomBassin(request.getNomBassin());
    item.setImageUrl(request.getImageUrl());
    item.setQuantity(request.getQuantity());
    item.setPrixOriginal(request.getPrixOriginal());
    item.setStatus(request.getStatus());
    item.setIsCustomized(true);
    
    // Set customization prices
    item.setPrixMateriau(request.getPrixMateriau());
    item.setPrixDimension(request.getPrixDimension());
    item.setPrixAccessoires(request.getPrixAccessoires());
    item.setPrixEstime(request.getPrixEstime());
    item.setPrixUnitaire(request.getPrixEstime()); // Set unit price same as estimated price
    item.setSubtotal(request.getPrixEstime() * request.getQuantity());
    
    // Set customization details
    item.setMateriauSelectionne(request.getMateriauSelectionne());
    item.setDimensionSelectionnee(request.getDimensionSelectionnee());
    item.setCouleurSelectionnee(request.getCouleurSelectionnee());
    item.setDureeFabrication(request.getDureeFabrication().toString());
    
    // Create customization entity
    BassinCustomization customization = new BassinCustomization();
    customization.setMateriauSelectionne(request.getMateriauSelectionne());
    customization.setPrixMateriau(request.getPrixMateriau());
    customization.setDimensionSelectionnee(request.getDimensionSelectionnee());
    customization.setPrixDimension(request.getPrixDimension());
    customization.setCouleurSelectionnee(request.getCouleurSelectionnee());
    customization.setPrixEstime(request.getPrixEstime());
    customization.setDureeFabrication(request.getDureeFabrication().toString());
    
    item.setCustomization(customization);
    
    // Create accessories if any
    if (request.getAccessoireIds() != null && !request.getAccessoireIds().isEmpty()) {
        List<PanierItemAccessoire> accessoires = request.getAccessoireIds().stream().map(accId -> {
            AccessoireDTO accDetails = accessoireServiceClient.getAccessoireDetails(accId);
            
            PanierItemAccessoire accessoire = new PanierItemAccessoire();
            accessoire.setAccessoireId(accId);
            accessoire.setNomAccessoire(accDetails.getNomAccessoire());
            accessoire.setPrixAccessoire(accDetails.getPrixAccessoire());
            accessoire.setImageUrl(accDetails.getImageUrl());
            accessoire.setPanierItem(item);
            
            return accessoire;
        }).collect(Collectors.toList());
        
        item.setAccessoires(accessoires);
    }
    
    return item;
}
private PanierResponse mapToPanierResponse(Panier panier) {
    PanierResponse response = new PanierResponse();
    response.setId(panier.getId());
    response.setUserId(panier.getUserId());
    response.setSessionId(panier.getSessionId());
    response.setTotalPrice(panier.getTotalPrice());
    response.setLastUpdated(panier.getLastUpdated());

    response.setItems(panier.getItems() != null 
        ? panier.getItems().stream()
            .map(this::convertToResponse) // Utilise convertToResponse au lieu de convertToDTO
            .collect(Collectors.toList()) 
        : Collections.emptyList());

    return response;
}

private Long getCurrentUserId() {
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
		if (authentication != null && authentication.isAuthenticated()
				&& authentication.getPrincipal() instanceof CustomUserDetails) {
			return ((CustomUserDetails) authentication.getPrincipal()).getUserId();
		}
		return null;
	}

	// Exception handlers
	@ExceptionHandler(InsufficientStockException.class)
	public ResponseEntity<?> handleInsufficientStock(InsufficientStockException ex) {
		return conflict(ex.getMessage(),
				Map.of("type", "INSUFFICIENT_STOCK", "availableStock", ex.getAvailableStock()));
	}

	@ExceptionHandler(PartialAdditionException.class)
	public ResponseEntity<?> handlePartialAddition(PartialAdditionException ex) {
		return ResponseEntity.status(HttpStatus.PARTIAL_CONTENT).body(Map.of("success", true, "message",
				ex.getMessage(), "type", "PARTIAL_ADDITION", "affectedItems", ex.getAffectedItems()));
	}

	// Response helpers
	private ResponseEntity<?> badRequest(String message) {
		return ResponseEntity.badRequest().body(Map.of("success", false, "message", message));
	}

	private ResponseEntity<?> conflict(String message, Map<String, Object> additionalData) {
		Map<String, Object> response = new HashMap<>();
		response.put("success", false);
		response.put("message", message);
		response.putAll(additionalData);
		return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
	}

	private Map<String, Object> successResponse(String message, Map<String, Object> data) {
		Map<String, Object> response = new HashMap<>();
		response.put("success", true);
		response.put("message", message);
		response.putAll(data);
		return response;
	}
	
private PanierItemDTO convertToDTO(PanierItem item) {
    PanierItemDTO dto = new PanierItemDTO();
    // Mappage des propriétés standard
    dto.setId(item.getId());
    dto.setBassinId(item.getBassinId());
    dto.setNomBassin(item.getNomBassin());
    dto.setDescription(item.getDescription());
    dto.setImageUrl(item.getImageUrl());
    dto.setQuantity(item.getQuantity());
    dto.setPrixOriginal(item.getPrixOriginal());
    dto.setPrixPromo(item.getPrixPromo());
    dto.setEffectivePrice(item.getEffectivePrice());
    dto.setSubtotal(item.getSubtotal());
    dto.setStatus(item.getStatus());
    dto.setIsCustomized(item.getIsCustomized());
    
    // Pour les bassins personnalisés, conservez toutes les propriétés de personnalisation
    if (Boolean.TRUE.equals(item.getIsCustomized())) {
        dto.setMaterialSelectionne(item.getMateriauSelectionne());
        dto.setDimensionSelectionnee(item.getDimensionSelectionnee());
        dto.setCouleurSelectionnee(item.getCouleurSelectionnee());
        dto.setAccessoireIds(item.getAccessoireIds());
        dto.setDureeFabrication(item.getDureeFabrication());
        
        // Important: Utiliser le prix estimé calculé comme prix effectif
        dto.setPrixOriginal(item.getPrixOriginal());
        dto.setPrixMateriau(item.getPrixMateriau());
        dto.setPrixDimension(item.getPrixDimension());
        dto.setPrixAccessoires(item.getPrixAccessoires());
        dto.setPrixEstime(item.getPrixEstime());
        dto.setEffectivePrice(item.getPrixEstime());
        dto.setPrixUnitaire(item.getPrixEstime());
        
        // Pour garantir que ces propriétés sont transmises au frontend
        Map<String, Object> customProps = new HashMap<>();
        customProps.put("materiauSelectionne", item.getMateriauSelectionne());
        customProps.put("dimensionSelectionnee", item.getDimensionSelectionnee());
        customProps.put("couleurSelectionnee", item.getCouleurSelectionnee());
        customProps.put("materiauPrice", item.getPrixMateriau());
        customProps.put("dimensionPrice", item.getPrixDimension());
        customProps.put("accessoiresPrice", item.getPrixAccessoires());
        customProps.put("basePrice", item.getPrixOriginal());
        customProps.put("prixEstime", item.getPrixEstime());
        customProps.put("dureeFabrication", item.getDureeFabrication());
        dto.setCustomProperties(customProps);
    }
    
    // Convertir les accessoires
    if (item.getAccessoires() != null) {
        List<AccessoireDTO> accessoires = item.getAccessoires().stream()
            .map(acc -> {
                AccessoireDTO accDto = new AccessoireDTO();
                accDto.setIdAccessoire(acc.getAccessoireId());
                accDto.setNomAccessoire(acc.getNomAccessoire());
                accDto.setPrixAccessoire(acc.getPrixAccessoire());
                accDto.setImagePath(acc.getImageUrl());
                return accDto;
            })
            .collect(Collectors.toList());
        dto.setAccessoires(accessoires);
    }
    
    return dto;
}



}