package com.example.orders_microservice.service;

import com.example.orders_microservice.dto.PanierItemRequest;
import com.example.orders_microservice.entities.Panier;
import com.example.orders_microservice.entities.PanierItem;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface PanierService {
    Panier getOrCreatePanier(Long userId, String sessionId);
    PanierItem addItemToPanier(Long userId, String sessionId, PanierItemRequest itemRequest);
    List<PanierItem> addMultipleItemsToPanier(Long userId, String sessionId, List<PanierItemRequest> itemRequests);
    public Panier getPanierByUserId(Long userId);
    public Panier getPanierBySessionId(String sessionId) ;
    public Optional<Panier> checkSessionCartExists(String sessionId);
    public Panier mergeCarts(Panier primaryCart, Panier secondaryCart);
    public void cleanupExpiredCarts();
    public Panier setUserEmailForPanier(Long userId, String sessionId, String email) ;
    public Panier migrateSessionCartToUserCart(Long userId, String sessionId);
    public void clearPanier(Long userId, String sessionId);
    public void removeItemFromPanier(Long userId, String sessionId, Long itemId) ;
    public PanierItem updateItemQuantity(Long userId, String sessionId, Long itemId, int newQuantity) ;
    public void updatePanierTotals(Panier panier);
    
}