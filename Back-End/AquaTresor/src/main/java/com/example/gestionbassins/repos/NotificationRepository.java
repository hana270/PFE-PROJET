package com.example.gestionbassins.repos;

import com.example.gestionbassins.entities.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByReadFalse(); // Récupérer les notifications non lues

    List<Notification> findByReadTrue();  // Récupérer les notifications lues
}