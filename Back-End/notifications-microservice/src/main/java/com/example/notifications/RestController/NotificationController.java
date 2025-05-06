package com.example.notifications.RestController;

import com.example.notifications.entities.Notification;
import com.example.notifications.services.NotificationService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {
    
    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public List<Notification> getAllNotifications() {
        return notificationService.getAllNotifications();
    }

    @GetMapping("/user/{username}")
    public List<Notification> getUserNotifications(@PathVariable String username) {
        return notificationService.getUserNotifications(username);
    }

    @PostMapping
    public Notification createNotification(@RequestBody Notification notification) {
        return notificationService.createNotification(notification);
    }

    @PostMapping("/send")
    public void sendNotification(@RequestBody Notification notification) {
        notificationService.sendNotification(
            notification.getTitle(), 
            notification.getMessage(), 
            notification.getUsername()
        );
    }

    @PutMapping("/{id}/read")
    public Notification markAsRead(@PathVariable Long id) {
        return notificationService.markAsRead(id);
    }
    
    @PutMapping("/read-all")
    public void markAllAsRead() {
        notificationService.markAllAsRead();
    }

    @DeleteMapping("/{id}")
    public void deleteNotification(@PathVariable Long id) {
        notificationService.deleteNotification(id);
    }
    
    @PostMapping("/creation-commande")
    public void handleCreationCommandeNotification(
            @RequestParam Long clientId, 
            @RequestParam String numeroCommande) {
        notificationService.handleCreationCommandeNotification(clientId, numeroCommande);
    }

    @PostMapping("/paiement-confirme")
    public void handlePaiementConfirmeNotification(
            @RequestParam Long clientId, 
            @RequestParam String numeroCommande) {
        notificationService.handlePaiementConfirmeNotification(clientId, numeroCommande);
    }
    
    
    
    
}