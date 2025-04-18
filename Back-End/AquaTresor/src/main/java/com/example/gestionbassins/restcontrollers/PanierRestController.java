package com.example.gestionbassins.restcontrollers;

import com.example.gestionbassins.dto.*;
import com.example.gestionbassins.entities.*;
import com.example.gestionbassins.exceptions.InsufficientStockException;
import com.example.gestionbassins.security.CustomUserDetails;
import com.example.gestionbassins.service.BassinService;
import com.example.gestionbassins.service.PanierService;
import com.example.gestionbassins.service.PanierServiceImpl.PartialAdditionException;

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
exposedHeaders = {"Authorization", "X-Session-ID", "Content-Disposition"},
methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE, RequestMethod.OPTIONS},
allowCredentials = "true",
maxAge = 3600)
public class PanierRestController {
    
	   
    private final BassinService bassinService;
    private final PanierService panierService;
    private static final Logger logger = LoggerFactory.getLogger(PanierRestController.class);

    private static final int SESSION_CART_EXPIRATION_HOURS = 48; // 48 heures d'expiration
    
    public PanierRestController(PanierService panierService, BassinService bassinService) {
        this.panierService = panierService;
        this.bassinService = bassinService;
    }

    @GetMapping
    public ResponseEntity<PanierResponse> getPanier(
            @RequestHeader(value = "X-Session-ID", required = false) String sessionId,
            HttpServletRequest request) {
        
        Long userId = getCurrentUserId();
        if (userId != null) {
            // Clear any session ID for authenticated users
            sessionId = null;
        }
        
        logger.info("Getting cart for userId: {}, sessionId: {}", userId, sessionId);
        
        Panier panier = panierService.getOrCreatePanier(userId, sessionId);
        
        // Pour les utilisateurs anonymes, vérifier l'expiration
        if (userId == null && isCartExpired(panier)) {
            logger.info("Clearing expired session cart: {}", sessionId);
            panierService.clearPanier(null, sessionId);
            panier = panierService.getOrCreatePanier(null, sessionId);
        }
        
        PanierResponse panierResponse = mapToPanierResponse(panier);
        HttpHeaders headers = new HttpHeaders();
        
        // Pour les utilisateurs anonymes, renvoyer le sessionId
        if (userId == null) {
            headers.add("X-Session-ID", panier.getSessionId());
        }
        
        return new ResponseEntity<>(panierResponse, headers, HttpStatus.OK);
    }

    private boolean isCartExpired(Panier panier) {
        if (panier.getUserId() != null) return false; // Les paniers utilisateurs n'expirent pas
        if (panier.getLastUpdated() == null) return false; // Panier nouvellement créé
        return panier.getLastUpdated().isBefore(LocalDateTime.now().minusHours(SESSION_CART_EXPIRATION_HOURS));
    }

    private String generateSessionId() {
        return UUID.randomUUID().toString();
    }
    
    @PostMapping("/items")
    public ResponseEntity<?> addItemToCart(
            @RequestBody PanierItemRequest itemRequest,
            @RequestHeader(value = "X-Session-ID", required = false) String sessionId,
            HttpServletResponse response) {
        
        try {
            // Validation
            if (itemRequest.getBassinId() == null && !itemRequest.isCustomized()) {
                return ResponseEntity.badRequest().body("Un bassin ou des propriétés personnalisées sont requis");
            }

            Long userId = getCurrentUserId();
            
            // Pour les utilisateurs anonymes, générer un sessionId si nécessaire
            if (userId == null) {
                if (sessionId == null || sessionId.isEmpty()) {
                    sessionId = UUID.randomUUID().toString();
                    logger.info("Generated new session ID: {}", sessionId);
                }
                // Toujours renvoyer le sessionId dans la réponse
                response.setHeader("X-Session-ID", sessionId);
            }

            PanierItem item = panierService.addItemToPanier(userId, sessionId, itemRequest);
            Panier panier = item.getPanier();
            
            // Construction de la réponse
            Map<String, Object> responseBody = new HashMap<>();
            responseBody.put("success", true);
            responseBody.put("message", "Article ajouté au panier");
            responseBody.put("item", convertToItemResponse(item));
            responseBody.put("cart", mapToPanierResponse(panier));

            HttpHeaders headers = new HttpHeaders();
            if (userId == null) {
                headers.add("X-Session-ID", panier.getSessionId());
                logger.debug("Setting session ID in headers: {}", panier.getSessionId());
            }
            
            return new ResponseEntity<>(responseBody, headers, HttpStatus.OK);
                
        } catch (InsufficientStockException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of(
                    "success", false,
                    "message", e.getMessage(),
                    "availableStock", e.getAvailableStock()
                ));
        } catch (Exception e) {
            logger.error("Error adding item to cart", e);
            return ResponseEntity.badRequest()
                .body(Map.of("success", false, "message", e.getMessage()));
        }
    }
/****/
    
    @PutMapping("/items/{itemId}")
    public ResponseEntity<?> updateItemQuantity(
            @PathVariable Long itemId,
            @RequestBody Map<String, Integer> quantityMap,
            @RequestHeader(value = "X-Session-ID", required = false) String sessionId) {
        
        Integer newQuantity = quantityMap.get("quantity");
        if (newQuantity == null || newQuantity <= 0) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "Invalid quantity"
            ));
        }

        try {
            Long userId = getCurrentUserId();
            PanierItem item = panierService.updateItemQuantity(userId, sessionId, itemId, newQuantity);
            
            if (item == null) {
                return ResponseEntity.notFound().build();
            }
            
            // Renvoyer le panier complet pour s'assurer d'avoir toutes les informations à jour
            Panier updatedPanier = item.getPanier();
            PanierResponse panierResponse = mapToPanierResponse(updatedPanier);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Quantity updated successfully",
                "item", convertToItemResponse(item),
                "cart", panierResponse
            ));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            logger.error("Error updating item quantity", e);
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", e.getMessage()
            ));
        }
    }

    @DeleteMapping("/items/{itemId}")
    public ResponseEntity<?> removeItem(
            @PathVariable Long itemId,
            @RequestHeader(value = "X-Session-ID", required = false) String sessionId) {
        
        try {
            Long userId = getCurrentUserId();
            
            // Vérifier si l'article existe avant suppression
            Panier panierBeforeDelete = userId != null 
                ? panierService.getPanierByUserId(userId)
                : panierService.getPanierBySessionId(sessionId);
                
            boolean itemExists = panierBeforeDelete.getItems().stream()
                .anyMatch(item -> item.getId().equals(itemId));
                
            if (!itemExists) {
                return ResponseEntity.notFound().build();
            }
            
            panierService.removeItemFromPanier(userId, sessionId, itemId);
            
            // Récupérer le panier mis à jour
            Panier updatedPanier = userId != null 
                ? panierService.getPanierByUserId(userId)
                : panierService.getPanierBySessionId(sessionId);
                
            PanierResponse panierResponse = mapToPanierResponse(updatedPanier);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Article supprimé du panier",
                "cart", panierResponse
            ));
        } catch (Exception e) {
            logger.error("Error removing item from cart", e);
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", e.getMessage()
            ));
        }
    }

    @DeleteMapping
    public ResponseEntity<?> clearPanier(
            @RequestHeader(value = "X-Session-ID", required = false) String sessionId) {
        
        try {
            Long userId = getCurrentUserId();
            panierService.clearPanier(userId, sessionId);
            
            // Créer un panier vide pour la réponse
            Panier emptyPanier = userId != null 
                ? panierService.getOrCreatePanier(userId, null)
                : panierService.getOrCreatePanier(null, sessionId);
                
            PanierResponse panierResponse = mapToPanierResponse(emptyPanier);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Panier vidé avec succès",
                "cart", panierResponse
            ));
        } catch (Exception e) {
            logger.error("Error clearing cart", e);
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", e.getMessage()
            ));
        }
    }

    private PanierItemResponse convertToItemResponse(PanierItem item) {
        PanierItemResponse response = new PanierItemResponse();
        response.setId(item.getId());
        response.setQuantity(item.getQuantity());
        
        if (item.getBassin() != null) {
            response.setBassinId(item.getBassin().getIdBassin());
            response.setNomBassin(item.getBassin().getNomBassin());
            response.setDescription(item.getBassin().getDescription());
            response.setStock(item.getBassin().getStock());
            
            // Handle image URL
            if (item.getBassin().getImagesBassin() != null && !item.getBassin().getImagesBassin().isEmpty()) {
                response.setImageUrl(item.getBassin().getImagesBassin().get(0).getImagePath());
            } else if (item.getBassin().getImagePath() != null) {
                response.setImageUrl(item.getBassin().getImagePath());
            }
        }
        
        response.setPrixOriginal(item.getPrixOriginal());
        response.setPrixPromo(item.getPrixPromo());
        response.setEffectivePrice(item.getEffectivePrice());
        response.setPromotionActive(item.getPromotionActive());
        response.setNomPromotion(item.getNomPromotion());
        response.setTauxReduction(item.getTauxReduction());
        response.setSubtotal(item.getSubtotal());
        
        if (item.isCustomized()) {
            response.setMateriau(item.getMateriauSelectionne());
            response.setDimension(item.getDimensionSelectionnee());
            response.setCouleur(item.getCouleurSelectionnee());
            if (item.getCustomProperties() != null) {
                // Parse custom properties if stored as JSON
                // response.setCustomProperties(objectMapper.readValue(item.getCustomProperties(), Map.class));
            }
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

        if (panier.getItems() != null) {
            response.setItems(panier.getItems().stream()
                .map(this::convertToItemResponse)
                .collect(Collectors.toList()));
        } else {
            response.setItems(Collections.emptyList());
        }

        return response;
    }

    
    
    // Méthode utilitaire pour obtenir l'ID utilisateur actuel
    private Long getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated()) {
            Object principal = authentication.getPrincipal();
            if (principal instanceof CustomUserDetails) {
                Long userId = ((CustomUserDetails) principal).getUserId();
                logger.info("CurrentUserId method returning: {}", userId);
                return userId;
            }
        }
        logger.warn("No authenticated user found - principal type: {}", 
            authentication != null ? authentication.getPrincipal().getClass().getName() : "null");
        return null;
    }
/****/
    

    @PostMapping("/migrate")
    @CrossOrigin(origins = "http://localhost:4200", 
        allowedHeaders = {"Authorization", "Content-Type", "X-Requested-With", "Accept", "Origin", "X-Session-ID"},
        exposedHeaders = {"Authorization", "X-Session-ID"})
    public ResponseEntity<?> migrateSessionCartToUserCart(
            @RequestHeader(value = "X-Session-ID") String sessionId,
            Authentication authentication) {
        
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        try {
            Long userId = getCurrentUserId();
            logger.info("Migrating cart from session {} to user {}", sessionId, userId);
            
            if (userId == null) {
                logger.warn("Unauthorized migration attempt: no authenticated user");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(
                    Map.of("success", false, "message", "Vous devez être connecté pour récupérer votre panier"));
            }
            
            if (sessionId == null || sessionId.isEmpty()) {
                logger.warn("Invalid migration attempt: no session ID provided");
                return ResponseEntity.badRequest().body(
                    Map.of("success", false, "message", "Identifiant de session invalide"));
            }
            
            // Verify session cart exists
            Optional<Panier> sessionCart = panierService.checkSessionCartExists(sessionId);
            if (!sessionCart.isPresent()) {
                logger.warn("Session cart not found for ID: {}", sessionId);
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(
                    Map.of("success", false, "message", "Panier de session introuvable"));
            }
            
            // Perform migration
            Panier migratedCart = panierService.migrateSessionCartToUserCart(userId, sessionId);
            
            return ResponseEntity.ok()
                .body(Map.of(
                    "success", true,
                    "message", "Panier récupéré avec succès",
                    "panier", mapToPanierResponse(migratedCart)
                ));
                
        } catch (Exception e) {
            logger.error("Error migrating cart", e);
            return ResponseEntity.badRequest().body(
                Map.of("success", false, "message", "Erreur lors de la récupération du panier: " + e.getMessage()));
        }
    }
    
   
    
    @PostMapping("/email")
    public ResponseEntity<?> setUserEmail(
            @RequestBody Map<String, String> emailRequest,
            @RequestHeader(value = "X-Session-ID", required = false) String sessionId) {
        
        try {
            String email = emailRequest.get("email");
            if (email == null || email.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "L'adresse email est requise"
                ));
            }
            
            Long userId = getCurrentUserId();
            Panier panier = panierService.setUserEmailForPanier(userId, sessionId, email);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Email enregistré pour les notifications"
            ));
        } catch (Exception e) {
            logger.error("Error setting user email", e);
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", e.getMessage()
            ));
        }
    }
    
    
    /*************/
    

    private String getCurrentUserEmail() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof CustomUserDetails) {
            return ((CustomUserDetails) authentication.getPrincipal()).getEmail();
        }
        return null;
    }
    @GetMapping("/user-info")
    public ResponseEntity<?> getUserInfo(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        
        Map<String, Object> userInfo = new HashMap<>();
        userInfo.put("userId", userDetails.getUserId());
        userInfo.put("username", userDetails.getUsername());
        userInfo.put("email", userDetails.getEmail());
        userInfo.put("roles", userDetails.getAuthorities().stream()
            .map(GrantedAuthority::getAuthority)
            .collect(Collectors.toList()));
        
        return ResponseEntity.ok(userInfo);
    }
    
    @ExceptionHandler(InsufficientStockException.class)
    public ResponseEntity<?> handleInsufficientStock(InsufficientStockException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of(
                    "success", false,
                    "message", ex.getMessage(),
                    "type", "INSUFFICIENT_STOCK"
                ));
    }

    @ExceptionHandler(PartialAdditionException.class)
    public ResponseEntity<?> handlePartialAddition(PartialAdditionException ex) {
        return ResponseEntity.status(HttpStatus.PARTIAL_CONTENT)
                .body(Map.of(
                    "success", true,
                    "message", ex.getMessage(),
                    "item", convertToItemResponse(ex.getItem()),
                    "type", "PARTIAL_ADDITION"
                ));
    }
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

    private ResponseEntity<?> serverError(String message) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("success", false, "message", message));
    }

    private Map<String, Object> successResponse(String message, Map<String, Object> data) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", message);
        response.putAll(data);
        return response;
    }
}