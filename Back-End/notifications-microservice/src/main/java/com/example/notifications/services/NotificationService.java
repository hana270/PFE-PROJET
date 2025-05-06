package com.example.notifications.services;

import com.example.notifications.entities.Notification;
import java.util.List;

public interface NotificationService {
    List<Notification> getAllNotifications();
    List<Notification> getUserNotifications(String username);
    Notification createNotification(Notification notification);
    Notification markAsRead(Long id);
    void markAllAsRead();
    void deleteNotification(Long id);
    void sendNotification(String title, String message, String username);


    public void handleCreationCommandeNotification(Long clientId, String numeroCommande);
    public void handlePaiementConfirmeNotification(Long clientId, String numeroCommande);
        
    
    
    }