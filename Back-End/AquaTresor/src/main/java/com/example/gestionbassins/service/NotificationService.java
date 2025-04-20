package com.example.gestionbassins.service;

import com.example.gestionbassins.entities.Notification;

import java.util.List;

public interface NotificationService {
    List<Notification> getNotifications();
    Notification markAsRead(Long id);
    void markAllAsRead();
    public void deleteNotification(Long id) ;
    public Notification createNotification(Notification notification);
    public void sendNotification(String title, String message, String username) ;
    
}