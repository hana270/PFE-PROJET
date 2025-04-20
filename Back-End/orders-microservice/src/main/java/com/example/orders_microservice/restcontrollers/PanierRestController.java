package com.example.orders_microservice.restcontrollers;

import com.example.orders_microservice.dto.*;
import com.example.orders_microservice.entities.*;
import com.example.orders_microservice.exceptions.*;
import com.example.orders_microservice.security.CustomUserDetails;
import com.example.orders_microservice.service.*;
import com.example.orders_microservice.service.PanierServiceImpl.PartialAdditionException;

import jakarta.persistence.EntityNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/panier")
@CrossOrigin(origins = {"http://localhost:4200"}, 
    allowedHeaders = {"Authorization", "Content-Type", "X-Requested-With", "Accept", "Origin", "X-Session-ID"},
    exposedHeaders = {"Authorization", "X-Session-ID"},
    methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE, RequestMethod.OPTIONS},
    allowCredentials = "true",
    maxAge = 3600)
public class PanierRestController {
    
    private static final Logger logger = LoggerFactory.getLogger(PanierRestController.class);
    private static final int SESSION_CART_EXPIRATION_HOURS = 48;
    
    private final PanierService panierService;
    private final BassinServiceClient bassinClient;
    private final PromotionServiceClient promotionClient;

    public PanierRestController(PanierService panierService, 
                              BassinServiceClient bassinClient,
                              PromotionServiceClient promotionClient) {
        this.panierService = panierService;
        this.bassinClient = bassinClient;
        this.promotionClient = promotionClient;
    }

    @GetMapping
    public ResponseEntity<PanierResponse> getPanier(
            @RequestHeader(value = "X-Session-ID", required = false) String sessionId,
            HttpServletRequest request) {
        
        Long userId = getCurrentUserId();
        if (userId != null) {
            sessionId = null; // Clear session ID for authenticated users
        }
        
        logger.info("Getting cart for userId: {}, sessionId: {}", userId, sessionId);
        
        Panier panier = panierService.getOrCreatePanier(userId, sessionId);
        
        if (userId == null && isCartExpired(panier)) {
            logger.info("Clearing expired session cart: {}", sessionId);
            panierService.clearPanier(null, sessionId);
            panier = panierService.getOrCreatePanier(null, sessionId);
        }
        
        PanierResponse panierResponse = mapToPanierResponse(panier);
        HttpHeaders headers = new HttpHeaders();
        
        if (userId == null) {
            headers.add("X-Session-ID", panier.getSessionId());
        }
        
        return new ResponseEntity<>(panierResponse, headers, HttpStatus.OK);
    }

    @PostMapping("/items")
    public ResponseEntity<?> addItemToCart(
            @RequestBody PanierItemRequest itemRequest,
            @RequestHeader(value = "X-Session-ID", required = false) String sessionId,
            HttpServletResponse response) {
        
        try {
            if (itemRequest.getBassinId() == null && !itemRequest.isCustomized()) {
                return badRequest("Un bassin ou des propriétés personnalisées sont requis");
            }

            Long userId = getCurrentUserId();
            
            if (userId == null) {
                if (sessionId == null || sessionId.isEmpty()) {
                    sessionId = UUID.randomUUID().toString();
                    logger.info("Generated new session ID: {}", sessionId);
                }
                response.setHeader("X-Session-ID", sessionId);
            }

            PanierItem item = panierService.addItemToPanier(userId, sessionId, itemRequest);
            Panier panier = panierService.getOrCreatePanier(userId, sessionId);
            
            Map<String, Object> responseBody = new HashMap<>();
            responseBody.put("success", true);
            responseBody.put("message", "Article ajouté au panier");
            responseBody.put("item", convertToItemResponse(item));
            responseBody.put("cart", mapToPanierResponse(panier));

            HttpHeaders headers = new HttpHeaders();
            if (userId == null) {
                headers.add("X-Session-ID", panier.getSessionId());
            }
            
            return new ResponseEntity<>(responseBody, headers, HttpStatus.OK);
                
        } catch (InsufficientStockException e) {
            return conflict(e.getMessage(), Map.of("availableStock", e.getAvailableStock()));
        } catch (Exception e) {
            logger.error("Error adding item to cart", e);
            return badRequest(e.getMessage());
        }
    }

    @PutMapping("/items/{itemId}")
    public ResponseEntity<?> updateItemQuantity(
            @PathVariable Long itemId,
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
            
            return ResponseEntity.ok(successResponse(
                "Quantité mise à jour", 
                Map.of(
                    "item", convertToItemResponse(item),
                    "cart", mapToPanierResponse(updatedPanier)
                )
            ));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            logger.error("Error updating item quantity", e);
            return badRequest(e.getMessage());
        }
    }

    @DeleteMapping("/items/{itemId}")
    public ResponseEntity<?> removeItem(
            @PathVariable Long itemId,
            @RequestHeader(value = "X-Session-ID", required = false) String sessionId) {
        
        try {
            Long userId = getCurrentUserId();
            panierService.removeItemFromPanier(userId, sessionId, itemId);
            Panier updatedPanier = panierService.getOrCreatePanier(userId, sessionId);
            
            return ResponseEntity.ok(successResponse(
                "Article supprimé du panier",
                Map.of("cart", mapToPanierResponse(updatedPanier))
            ));
        } catch (Exception e) {
            logger.error("Error removing item from cart", e);
            return badRequest(e.getMessage());
        }
    }

    @DeleteMapping
    public ResponseEntity<?> clearPanier(
            @RequestHeader(value = "X-Session-ID", required = false) String sessionId) {
        
        try {
            Long userId = getCurrentUserId();
            panierService.clearPanier(userId, sessionId);
            Panier emptyPanier = panierService.getOrCreatePanier(userId, sessionId);
            
            return ResponseEntity.ok(successResponse(
                "Panier vidé avec succès",
                Map.of("cart", mapToPanierResponse(emptyPanier))
            ));
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
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(
                    Map.of("success", false, "message", "Vous devez être connecté"));
            }
            
            if (sessionId == null || sessionId.isEmpty()) {
                return badRequest("Session ID manquant");
            }
            
            Panier migratedCart = panierService.migrateSessionCartToUserCart(userId, sessionId);
            
            return ResponseEntity.ok(successResponse(
                "Panier récupéré avec succès",
                Map.of("panier", mapToPanierResponse(migratedCart))
            ));
        } catch (Exception e) {
            logger.error("Error migrating cart", e);
            return badRequest("Erreur lors de la récupération du panier: " + e.getMessage());
        }
    }
    @PostMapping("/email")
    public ResponseEntity<?> setUserEmail(
            @RequestBody Map<String, String> emailRequest,
            @RequestHeader(value = "X-Session-ID", required = false) String sessionId) {
        
        try {
            String email = emailRequest.get("email");
            if (email == null || email.isEmpty()) {
                return badRequest("L'adresse email est requise");
            }
            
            Long userId = getCurrentUserId();
            panierService.setUserEmailForPanier(userId, sessionId, email);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Email enregistré pour les notifications"
            ));
        } catch (Exception e) {
            logger.error("Error setting user email", e);
            return badRequest(e.getMessage());
        }
    }

    // Helper methods
    private boolean isCartExpired(Panier panier) {
        if (panier.getUserId() != null) return false;
        if (panier.getLastUpdated() == null) return false;
        return panier.getLastUpdated().isBefore(LocalDateTime.now().minusHours(SESSION_CART_EXPIRATION_HOURS));
    }

    private PanierItemResponse convertToItemResponse(PanierItem item) {
        PanierItemResponse response = new PanierItemResponse();
        response.setId(item.getId());
        response.setQuantity(item.getQuantity());
        response.setCustomized(item.isCustomized());
        
        // Price info
        response.setPrixOriginal(item.getPrixOriginal());
        response.setPrixPromo(item.getPrixPromo());
        response.setEffectivePrice(item.getEffectivePrice());
        response.setSubtotal(item.getSubtotal());
        
        // Promotion info
        response.setPromotionActive(item.isPromotionActive());
        response.setNomPromotion(item.getNomPromotion());
        response.setTauxReduction(item.getTauxReduction());
        
        if (item.getBassinId() != null) {
            response.setBassinId(item.getBassinId());
            
            // Get bassin details from bassins-microservice
            BassinDTO bassin = bassinClient.getBassinDetails(item.getBassinId());
            response.setNomBassin(bassin.getNomBassin());
            response.setDescription(bassin.getDescription());
            response.setStock(bassin.getStock());
            response.setImageUrl(bassin.getImagePath());
        }
        
        if (item.isCustomized()) {
            response.setMateriau(item.getMateriauSelectionne());
            response.setDimension(item.getDimensionSelectionnee());
            response.setCouleur(item.getCouleurSelectionnee());
            response.setCustomProperties(item.getCustomProperties());
        }
        
        return response;
    }

    private PanierResponse mapToPanierResponse(Panier panier) {
        PanierResponse response = new PanierResponse();
        response.setId(panier.getId());
        response.setUserId(panier.getUserId());
        response.setSessionId(panier.getSessionId());
        response.setTotalPrice(panier.getTotalPrice());
        response.setLastUpdated(panier.getLastUpdated());

        response.setItems(panier.getItems() != null ? 
            panier.getItems().stream()
                .map(this::convertToItemResponse)
                .collect(Collectors.toList()) : 
            Collections.emptyList());

        return response;
    }

    private Long getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated() && 
            authentication.getPrincipal() instanceof CustomUserDetails) {
            return ((CustomUserDetails) authentication.getPrincipal()).getUserId();
        }
        return null;
    }

    // Exception handlers
    @ExceptionHandler(InsufficientStockException.class)
    public ResponseEntity<?> handleInsufficientStock(InsufficientStockException ex) {
        return conflict(ex.getMessage(), Map.of(
            "type", "INSUFFICIENT_STOCK",
            "availableStock", ex.getAvailableStock()
        ));
    }

    @ExceptionHandler(PartialAdditionException.class)
    public ResponseEntity<?> handlePartialAddition(PartialAdditionException ex) {
        return ResponseEntity.status(HttpStatus.PARTIAL_CONTENT)
            .body(Map.of(
                "success", true,
                "message", ex.getMessage(),
                "type", "PARTIAL_ADDITION",
                "affectedItems", ex.getAffectedItems()
            ));
    }

    // Response helpers
    private ResponseEntity<?> badRequest(String message) {
        return ResponseEntity.badRequest().body(Map.of(
            "success", false, 
            "message", message
        ));
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
}