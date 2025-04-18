package com.example.gestionbassins.service;

import com.example.gestionbassins.dto.PanierItemRequest;
import com.example.gestionbassins.entities.*;
import com.example.gestionbassins.exceptions.InsufficientStockException;
import com.example.gestionbassins.repos.BassinRepository;
import com.example.gestionbassins.repos.PanierItemRepository;
import com.example.gestionbassins.repos.PanierRepository;
import com.example.gestionbassins.repos.PromotionRepository;
import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.atomic.AtomicReference;
import java.util.stream.Collectors;

@Service
public class PanierServiceImpl implements PanierService {

    private static final Logger logger = LoggerFactory.getLogger(PanierServiceImpl.class);
    
    private final PanierRepository panierRepository;
    private final PanierItemRepository panierItemRepository;
    private final BassinRepository bassinRepository;
    private final PromotionRepository promotionRepository;
    
    private static final int SESSION_CART_EXPIRATION_HOURS = 48;

    public PanierServiceImpl(
            PanierRepository panierRepository,
            PanierItemRepository panierItemRepository,
            BassinRepository bassinRepository,
            PromotionRepository promotionRepository) {
        this.panierRepository = panierRepository;
        this.panierItemRepository = panierItemRepository;
        this.bassinRepository = bassinRepository;
        this.promotionRepository = promotionRepository;
    }

    @Override
    @Transactional
    public Panier getOrCreatePanier(Long userId, String sessionId) {
        logger.debug("Entering getOrCreatePanier - userId: {}, sessionId: {}", userId, sessionId);
        
        // Always prioritize user cart if userId exists
        if (userId != null) {
        	 logger.debug("Processing authenticated user cart");
             List<Panier> existingCarts = panierRepository.findAllByUserId(userId);
             logger.debug("Found {} existing carts for user {}", existingCarts.size(), userId);
             
            // First try to find existing user cart
            Panier userPanier = panierRepository.findByUserId(userId)
                .orElseGet(() -> {
                    // Create new user cart
                    Panier newPanier = new Panier();
                    newPanier.setUserId(userId);
                    newPanier.setItems(new ArrayList<>());
                    newPanier.setLastUpdated(LocalDateTime.now());
                    logger.info("Creating new cart for user ID: {}", userId);
                    return panierRepository.save(newPanier);
                });

            // If sessionId was provided, merge any session cart into user cart
            if (sessionId != null && !sessionId.isEmpty()) {
                panierRepository.findBySessionId(sessionId).ifPresent(sessionCart -> {
                    if (!sessionCart.getId().equals(userPanier.getId())) {
                        mergeCarts(userPanier, sessionCart);
                    }
                });
            }

            userPanier.setLastUpdated(LocalDateTime.now());
            return panierRepository.save(userPanier);
        }
        
        // Anonymous user logic (existing implementation)
        String effectiveSessionId = (sessionId == null || sessionId.isEmpty()) 
            ? UUID.randomUUID().toString() 
            : sessionId;
                
            Panier sessionPanier = panierRepository.findBySessionId(effectiveSessionId).orElseGet(() -> {
                Panier newPanier = new Panier();
                newPanier.setSessionId(effectiveSessionId);
                newPanier.setItems(new ArrayList<>());
                newPanier.setLastUpdated(LocalDateTime.now());
                logger.info("Creating new session cart with ID: {}", effectiveSessionId);
                return panierRepository.save(newPanier);
            });

            // Vérifier l'expiration du panier anonyme
            if (isCartExpired(sessionPanier)) {
                logger.info("Clearing expired session cart: {}", effectiveSessionId);
                panierRepository.delete(sessionPanier);
                sessionPanier = createNewSessionCart(effectiveSessionId);
            }

            sessionPanier.setLastUpdated(LocalDateTime.now());
            return panierRepository.save(sessionPanier);
        }
    
    private Panier createNewSessionCart(String sessionId) {
        Panier newPanier = new Panier();
        newPanier.setSessionId(sessionId);
        newPanier.setItems(new ArrayList<>());
        newPanier.setLastUpdated(LocalDateTime.now());
        return panierRepository.save(newPanier);
    }

    private boolean isCartExpired(Panier panier) {
        if (panier.getLastUpdated() == null) return false;
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
            // Merge duplicate carts
            Panier mainCart = carts.get(0);
            for (int i = 1; i < carts.size(); i++) {
                mainCart.getItems().addAll(carts.get(i).getItems());
                panierRepository.delete(carts.get(i));
            }
            return panierRepository.save(mainCart);
        }
        return carts.get(0);
    }

    @Override
    @Transactional
    public PanierItem addItemToPanier(Long userId, String sessionId, PanierItemRequest itemRequest) {
        if (itemRequest.getQuantity() <= 0) {
            throw new IllegalArgumentException("Quantity must be positive");
        }
        
        Panier panier = getOrCreatePanier(userId, sessionId);
        
        if (!itemRequest.isCustomized() && itemRequest.getBassinId() != null) {
            Bassin bassin = bassinRepository.findById(itemRequest.getBassinId())
                    .orElseThrow(() -> new EntityNotFoundException("Bassin not found"));
            
            if (bassin.getStock() < itemRequest.getQuantity()) {
                throw new InsufficientStockException("Insufficient stock", bassin.getStock());
            }
        }
        
        Optional<PanierItem> existingItem = findMatchingItem(panier, itemRequest);
        
        if (existingItem.isPresent()) {
            PanierItem item = existingItem.get();
            int newQuantity = item.getQuantity() + itemRequest.getQuantity();
            
            if (!item.isCustomized() && item.getBassin() != null) {
                if (item.getBassin().getStock() < newQuantity) {
                    throw new InsufficientStockException(
                        "Total quantity exceeds available stock", 
                        item.getBassin().getStock()
                    );
                }
            }
            
            item.setQuantity(newQuantity);
            updateItemPromotion(item, itemRequest);
            panierItemRepository.save(item);
            
            updatePanierTotals(panier);
            return item;
        } else {
            return createNewPanierItem(panier, itemRequest);
        }
    }

    private Optional<PanierItem> findMatchingItem(Panier panier, PanierItemRequest request) {
        if (request.isCustomized()) {
            return Optional.empty();
        }
        
        return panier.getItems().stream()
                .filter(item -> !item.isCustomized() && 
                        Objects.equals(item.getBassin().getIdBassin(), request.getBassinId()))
                .findFirst();
    }

    private PanierItem createNewPanierItem(Panier panier, PanierItemRequest request) {
        PanierItem panierItem = new PanierItem();
        panierItem.setPanier(panier);
        panierItem.setQuantity(request.getQuantity());
        panierItem.setPrixOriginal(request.getPrixOriginal());
        panierItem.setCustomized(request.isCustomized());
        
        if (!request.isCustomized() && request.getBassinId() != null) {
            Bassin bassin = bassinRepository.findById(request.getBassinId())
                    .orElseThrow(() -> new EntityNotFoundException("Bassin not found"));
            panierItem.setBassin(bassin);
            
            if (bassin.getPromotion() != null && bassin.getPromotion().isActive()) {
                applyPromotionToItem(panierItem, bassin.getPromotion());
            }
        }
        
        if (request.getPromotionId() != null) {
            Promotion promotion = promotionRepository.findById(request.getPromotionId())
                .orElseThrow(() -> new EntityNotFoundException("Promotion not found"));
            applyPromotionToItem(panierItem, promotion);
        } else if (request.getTauxReduction() != null) {
            panierItem.setPromotionActive(true);
            panierItem.setNomPromotion(request.getNomPromotion());
            panierItem.setTauxReduction(request.getTauxReduction());
            panierItem.setPrixPromo(calculatePromoPrice(panierItem.getPrixOriginal(), request.getTauxReduction()));
        }
        
        if (request.isCustomized()) {
            panierItem.setMateriauSelectionne(request.getMateriauSelectionne());
            panierItem.setDimensionSelectionnee(request.getDimensionSelectionnee());
            panierItem.setCouleurSelectionnee(request.getCouleurSelectionnee());
            
            if (request.getCustomProperties() != null) {
                // Choose the appropriate method based on your input type
                if (request.getCustomProperties() instanceof Map<?,?>) {
                    Map<?,?> properties = (Map<?,?>) request.getCustomProperties();
                    if (!properties.isEmpty()) {
                        // Create a new Map<String, Object> and copy all entries
                        Map<String, Object> convertedMap = new HashMap<>();
                        for (Map.Entry<?,?> entry : properties.entrySet()) {
                            if (entry.getKey() instanceof String) {
                                convertedMap.put((String) entry.getKey(), entry.getValue());
                            }
                        }
                        panierItem.setCustomPropertiesFromObjects(convertedMap);
                    }
                }
            }
        }
        
        panierItem = panierItemRepository.save(panierItem);
        panier.getItems().add(panierItem);
        
        updatePanierTotals(panier);
        return panierItem;
    }

    private void applyPromotionToItem(PanierItem item, Promotion promotion) {
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
            Promotion promotion = promotionRepository.findById(request.getPromotionId())
                .orElseThrow(() -> new EntityNotFoundException("Promotion not found"));
            applyPromotionToItem(item, promotion);
        } else if (request.getTauxReduction() != null) {
            item.setPromotionActive(true);
            item.setNomPromotion(request.getNomPromotion());
            item.setTauxReduction(request.getTauxReduction());
            item.setPrixPromo(calculatePromoPrice(item.getPrixOriginal(), request.getTauxReduction()));
        } else if (!item.isCustomized() && item.getBassin() != null) {
            Promotion bassPromo = item.getBassin().getPromotion();
            if (bassPromo != null && bassPromo.isActive()) {
                applyPromotionToItem(item, bassPromo);
            }
        }
    }

    @Override
    @Transactional
    public void updatePanierTotals(Panier panier) {
        AtomicReference<Double> totalPrice = new AtomicReference<>(0.0);
        
        if (panier.getItems() != null) {
            panier.getItems().forEach(item -> {
                double effectivePrice = item.isPromotionActive() && item.getPrixPromo() != null 
                    ? item.getPrixPromo() 
                    : item.getPrixOriginal();
                
                item.setEffectivePrice(effectivePrice);
                
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
    public PanierItem updateItemQuantity(Long userId, String sessionId, Long itemId, int newQuantity) {
        if (newQuantity <= 0) {
            throw new IllegalArgumentException("Quantity must be positive");
        }
        
        Panier panier = getOrCreatePanier(userId, sessionId);
        PanierItem item = panierItemRepository.findByIdAndPanierId(itemId, panier.getId())
                .orElseThrow(() -> new EntityNotFoundException("Item not found in cart"));
        
        if (!item.isCustomized() && item.getBassin() != null) {
            if (item.getBassin().getStock() < newQuantity) {
                throw new InsufficientStockException("Insufficient stock", item.getBassin().getStock());
            }
        }
        
        item.setQuantity(newQuantity);
        item = panierItemRepository.save(item);
        
        updatePanierTotals(panier);
        return item;
    }

    @Override
    @Transactional
    public void removeItemFromPanier(Long userId, String sessionId, Long itemId) {
        Panier panier = getOrCreatePanier(userId, sessionId);
        PanierItem item = panierItemRepository.findByIdAndPanierId(itemId, panier.getId())
                .orElseThrow(() -> new EntityNotFoundException("Item not found in cart"));
        
        panier.getItems().removeIf(i -> i.getId().equals(itemId));
        panierItemRepository.delete(item);
        
        updatePanierTotals(panier);
    }

    @Override
    @Transactional
    public void clearPanier(Long userId, String sessionId) {
        Panier panier = getOrCreatePanier(userId, sessionId);
        List<PanierItem> items = new ArrayList<>(panier.getItems());
        panier.getItems().clear();
        
        panierItemRepository.deleteAll(items);
        panier.setTotalPrice(0.0);
        panier.setLastUpdated(LocalDateTime.now());
        panierRepository.save(panier);
    }

    @Override
    @Transactional
    public Panier migrateSessionCartToUserCart(Long userId, String sessionId) {
        if (userId == null) {
            throw new IllegalArgumentException("User ID is required");
        }
        
        if (sessionId == null || sessionId.isEmpty()) {
            throw new IllegalArgumentException("Session ID is required");
        }
        
        Panier sessionCart = panierRepository.findBySessionId(sessionId)
                .orElseThrow(() -> new EntityNotFoundException("Session cart not found"));
        
        Panier userCart = panierRepository.findByUserId(userId)
                .orElseGet(() -> {
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
                if (!sessionItem.isCustomized() && sessionItem.getBassin() != null) {
                    Optional<PanierItem> existingItem = userCart.getItems().stream()
                            .filter(i -> !i.isCustomized() && 
                                    i.getBassin() != null && 
                                    i.getBassin().getIdBassin().equals(sessionItem.getBassin().getIdBassin()))
                            .findFirst();
                    
                    if (existingItem.isPresent()) {
                        PanierItem userItem = existingItem.get();
                        int newQuantity = userItem.getQuantity() + sessionItem.getQuantity();
                        
                        if (userItem.getBassin().getStock() < newQuantity) {
                            problematicItems.add(sessionItem);
                            userItem.setQuantity(userItem.getBassin().getStock());
                        } else {
                            userItem.setQuantity(newQuantity);
                        }
                        
                        panierItemRepository.save(userItem);
                        continue;
                    }
                }
                
                PanierItem newItem = new PanierItem();
                newItem.setPanier(userCart);
                newItem.setQuantity(sessionItem.getQuantity());
                newItem.setPrixOriginal(sessionItem.getPrixOriginal());
                newItem.setPrixPromo(sessionItem.getPrixPromo());
                newItem.setEffectivePrice(sessionItem.getEffectivePrice());
                newItem.setPromotionActive(sessionItem.isPromotionActive());
                newItem.setNomPromotion(sessionItem.getNomPromotion());
                newItem.setTauxReduction(sessionItem.getTauxReduction());
                newItem.setCustomized(sessionItem.isCustomized());
                newItem.setBassin(sessionItem.getBassin());
                newItem.setMateriauSelectionne(sessionItem.getMateriauSelectionne());
                newItem.setDimensionSelectionnee(sessionItem.getDimensionSelectionnee());
                newItem.setCouleurSelectionnee(sessionItem.getCouleurSelectionnee());
                newItem.setCustomProperties(sessionItem.getCustomProperties());
                
                userCart.getItems().add(newItem);
                panierItemRepository.save(newItem);
                
            } catch (Exception e) {
                logger.error("Error migrating item: {}", e.getMessage());
                problematicItems.add(sessionItem);
            }
        }
        
        updatePanierTotals(userCart);
        panierRepository.delete(sessionCart);
        
        if (!problematicItems.isEmpty()) {
            logger.warn("{} items had issues during migration", problematicItems.size());
            throw new PartialAdditionException("Some items couldn't be migrated", 
                    problematicItems.get(0), problematicItems.size());
        }
        
        return userCart;
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
    public List<PanierItem> addMultipleItemsToPanier(Long userId, String sessionId, List<PanierItemRequest> itemRequests) {
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
            throw new PartialAdditionException("Some items couldn't be added", 
                    problematicItems.get(0), problematicItems.size());
        }
        
        return addedItems;
    }
    
    private PanierItem createPartialItem(Panier panier, PanierItemRequest request, int availableStock) {
        PanierItem partialItem = new PanierItem();
        partialItem.setPanier(panier);
        partialItem.setQuantity(availableStock);
        partialItem.setPrixOriginal(request.getPrixOriginal());
        
        if (!request.isCustomized() && request.getBassinId() != null) {
            Bassin bassin = bassinRepository.findById(request.getBassinId())
                    .orElse(null);
            partialItem.setBassin(bassin);
        }
        
        return partialItem;
    }
    
    @Override
    @Transactional
    public Panier mergeCarts(Panier primaryCart, Panier secondaryCart) {
        if (primaryCart == null || secondaryCart == null) {
            throw new IllegalArgumentException("Both carts must be non-null");
        }
        
        if (secondaryCart.getItems() == null || secondaryCart.getItems().isEmpty()) {
            return primaryCart;
        }
        
        List<PanierItem> problematicItems = new ArrayList<>();
        
        for (PanierItem secondaryItem : new ArrayList<>(secondaryCart.getItems())) {
            try {
                if (!secondaryItem.isCustomized() && secondaryItem.getBassin() != null) {
                    Optional<PanierItem> existingItem = primaryCart.getItems().stream()
                            .filter(i -> !i.isCustomized() && 
                                    i.getBassin() != null && 
                                    i.getBassin().getIdBassin().equals(secondaryItem.getBassin().getIdBassin()))
                            .findFirst();
                    
                    if (existingItem.isPresent()) {
                        PanierItem primaryItem = existingItem.get();
                        int totalQuantity = primaryItem.getQuantity() + secondaryItem.getQuantity();
                        
                        if (secondaryItem.getBassin().getStock() < totalQuantity) {
                            problematicItems.add(secondaryItem);
                            primaryItem.setQuantity(Math.min(totalQuantity, secondaryItem.getBassin().getStock()));
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
                newItem.setEffectivePrice(secondaryItem.getEffectivePrice());
                newItem.setPromotionActive(secondaryItem.isPromotionActive());
                newItem.setNomPromotion(secondaryItem.getNomPromotion());
                newItem.setTauxReduction(secondaryItem.getTauxReduction());
                newItem.setCustomized(secondaryItem.isCustomized());
                newItem.setBassin(secondaryItem.getBassin());
                newItem.setMateriauSelectionne(secondaryItem.getMateriauSelectionne());
                newItem.setDimensionSelectionnee(secondaryItem.getDimensionSelectionnee());
                newItem.setCouleurSelectionnee(secondaryItem.getCouleurSelectionnee());
                newItem.setCustomProperties(secondaryItem.getCustomProperties());
                
                primaryCart.getItems().add(newItem);
                panierItemRepository.save(newItem);
                
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
}