package com.example.gestionbassins.service;

import com.example.gestionbassins.entities.Notification;

import java.util.List;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(name = "notifications-microservice", url = "http://localhost:8082/notifications")public interface NotificationServiceClient {
    
	@PostMapping("/api/notifications")
    Notification createNotification(@RequestBody Notification notification);
    
    @PostMapping("/api/notifications/send")
    void sendNotification(@RequestBody Notification notification);
    
    @GetMapping("/api/notifications/user/{username}")
    List<Notification> getUserNotifications(@PathVariable String username);
    
    @PutMapping("/api/notifications/read-all")
    void markAllAsRead();
}