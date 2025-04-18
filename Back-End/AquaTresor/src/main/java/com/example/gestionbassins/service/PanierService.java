package com.example.gestionbassins.service;

import com.example.gestionbassins.dto.PanierItemRequest;
import com.example.gestionbassins.entities.*;
import com.example.gestionbassins.exceptions.InsufficientStockException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface PanierService {
    Panier getOrCreatePanier(Long userId, String sessionId);
    Optional<Panier> checkSessionCartExists(String sessionId);
    Panier getPanierBySessionId(String sessionId);
    Panier getPanierByUserId(Long userId);
    PanierItem addItemToPanier(Long userId, String sessionId, PanierItemRequest itemRequest) throws InsufficientStockException;
    void updatePanierTotals(Panier panier);
    PanierItem updateItemQuantity(Long userId, String sessionId, Long itemId, int newQuantity) throws InsufficientStockException;
    void removeItemFromPanier(Long userId, String sessionId, Long itemId);
    void clearPanier(Long userId, String sessionId);
    Panier migrateSessionCartToUserCart(Long userId, String sessionId);
    Panier setUserEmailForPanier(Long userId, String sessionId, String email);
    void cleanupExpiredCarts();
    List<PanierItem> addMultipleItemsToPanier(Long userId, String sessionId, List<PanierItemRequest> itemRequests);
    Panier mergeCarts(Panier primaryCart, Panier secondaryCart);

    class PartialAdditionException extends RuntimeException {
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
}