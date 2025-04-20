package com.example.orders_microservice.repos;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.example.orders_microservice.entities.Panier;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PanierRepository extends JpaRepository<Panier, Long> {
	 Optional<Panier> findByUserId(Long userId);
	    Optional<Panier> findBySessionId(String sessionId);
	    
	    @Query("SELECT p FROM Panier p WHERE p.userId IS NULL AND p.lastUpdated < :cutoffTime")
	    List<Panier> findExpiredSessionCarts(@Param("cutoffTime") LocalDateTime cutoffTime);
	    
	    
    Optional<Panier> findFirstByUserId(Long userId);
    Optional<Panier> findFirstBySessionId(String sessionId);
    
    // Trouver paniers inactifs pour nettoyage
    List<Panier> findByUserIdIsNullAndLastUpdatedBefore(LocalDateTime cutoffTime);
    
    // Trouver paniers près d'expirer mais pas encore notifiés
    @Query("SELECT p FROM Panier p WHERE p.userId IS NULL AND p.lastUpdated < :warningTime " +
           "AND p.expirationWarningSent = false AND p.userEmail IS NOT NULL")
    List<Panier> findNearExpirationPaniersForWarning(@Param("warningTime") LocalDateTime warningTime);
    
    // Trouver paniers avec emails pour rappels
    @Query("SELECT p FROM Panier p WHERE p.userId IS NOT NULL AND p.userEmail IS NOT NULL " +
           "AND p.lastUpdated < :reminderTime AND SIZE(p.items) > 0")
    List<Panier> findPaniersForReminders(@Param("reminderTime") LocalDateTime reminderTime);

    List<Panier> findByUserIdIsNotNullAndLastUpdatedBefore(LocalDateTime dateTime);

    // Ajoutez ces nouvelles méthodes
    List<Panier> findByLastUpdatedBeforeAndExpirationWarningSentFalse(LocalDateTime dateTime);
    
    @Query("SELECT p FROM Panier p WHERE p.lastUpdated < :dateTime AND SIZE(p.items) > 0")
    List<Panier> findByLastUpdatedBeforeAndItemsIsNotEmpty(@Param("dateTime") LocalDateTime dateTime);

    @Query("SELECT p FROM Panier p WHERE p.userId = :userId")
    List<Panier> findAllByUserId(@Param("userId") Long userId);

}