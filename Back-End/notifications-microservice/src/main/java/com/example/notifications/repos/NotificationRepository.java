package com.example.notifications.repos;

import com.example.notifications.entities.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByReadFalse();
    List<Notification> findByReadTrue();
    List<Notification> findByUsername(String username);
}