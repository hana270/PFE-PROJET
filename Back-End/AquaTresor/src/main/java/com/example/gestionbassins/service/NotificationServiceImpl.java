package com.example.gestionbassins.service;

import com.example.gestionbassins.entities.Notification;
import com.example.gestionbassins.repos.NotificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class NotificationServiceImpl implements NotificationService {

	@Autowired
    private NotificationRepository notificationRepository;

    public List<Notification> getNotifications() {
        return notificationRepository.findAll();
    }

    public Notification markAsRead(Long id) {
        Notification notification = notificationRepository.findById(id).orElseThrow(() -> new RuntimeException("Notification not found"));
        notification.setRead(true);
        return notificationRepository.save(notification);
    }

    public void markAllAsRead() {
        List<Notification> notifications = notificationRepository.findAll();
        notifications.forEach(notification -> notification.setRead(true));
        notificationRepository.saveAll(notifications);
    }

    public void deleteNotification(Long id) {
        notificationRepository.deleteById(id);
    }

    public Notification createNotification(Notification notification) {
    	  if (notification.getType() == null) {
    	    notification.setType("info"); // Default type
    	  }
    	  return notificationRepository.save(notification);
    	}
}