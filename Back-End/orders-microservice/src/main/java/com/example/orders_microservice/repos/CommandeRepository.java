package com.example.orders_microservice.repos;

import com.example.orders_microservice.entities.Commande;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface CommandeRepository extends JpaRepository<Commande, Long> {
    List<Commande> findByClientId(Long clientId);
    
    @Query("SELECT c FROM Commande c WHERE c.emailClient = :email ORDER BY c.dateCreation DESC")
    List<Commande> findByEmailClient(@Param("email") String email);
    
    
    @Query("SELECT c FROM Commande c WHERE c.statut = 'EN_ATTENTE' AND c.dateCreation < :dateLimite")
    List<Commande> findCommandesEnAttenteExpirees(@Param("dateLimite") LocalDateTime dateLimite);

    @Query("SELECT c FROM Commande c WHERE c.numeroCommande = :numeroCommande")
    Optional<Commande> findByNumeroCommande(@Param("numeroCommande") String numeroCommande);
    
    
    @Query("SELECT c FROM Commande c LEFT JOIN FETCH c.lignesCommande WHERE c.id = :id")
    Optional<Commande> findByIdWithLignesCommande(@Param("id") Long id);
    
}