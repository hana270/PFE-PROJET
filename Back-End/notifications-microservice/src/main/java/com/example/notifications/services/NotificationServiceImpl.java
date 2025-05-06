package com.example.notifications.services;

import com.example.notifications.entities.Notification;
import com.example.notifications.repos.NotificationRepository;
import org.springframework.stereotype.Service;

import java.util.Date;
import java.util.List;

@Service
public class NotificationServiceImpl implements NotificationService {
    
    private final NotificationRepository notificationRepository;

    public NotificationServiceImpl(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    @Override
    public List<Notification> getAllNotifications() {
        return notificationRepository.findAll();
    }

    @Override
    public List<Notification> getUserNotifications(String username) {
        return notificationRepository.findByUsername(username);
    }

    @Override
    public Notification createNotification(Notification notification) {
        if (notification.getType() == null) {
            notification.setType("info");
        }
        return notificationRepository.save(notification);
    }

    @Override
    public Notification markAsRead(Long id) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Notification not found"));
        notification.setRead(true);
        return notificationRepository.save(notification);
    }
    
    public void markAllAsRead() {
        List<Notification> notifications = notificationRepository.findAll();
        notifications.forEach(notification -> notification.setRead(true));
        notificationRepository.saveAll(notifications);
    }

    @Override
    public void deleteNotification(Long id) {
        notificationRepository.deleteById(id);
    }

    @Override
    public void sendNotification(String title, String message, String username) {
        Notification notification = new Notification();
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setDate(new Date());
        notification.setRead(false);
        notification.setUsername(username);
        notification.setType("info");
        
        notificationRepository.save(notification);
        System.out.println("Notification sent to user: {}"+ username);

    }
    
    
    
    public void handleCreationCommandeNotification(Long clientId, String numeroCommande) {
        String title = "Nouvelle commande créée";
        String message = "Votre commande #" + numeroCommande + " a été créée avec succès";
        sendNotification(title, message, clientId.toString());
    }

    public void handlePaiementConfirmeNotification(Long clientId, String numeroCommande) {
        String title = "Paiement confirmé";
        String message = "Le paiement pour votre commande #" + numeroCommande + " a été confirmé";
        sendNotification(title, message, clientId.toString());
    }
}