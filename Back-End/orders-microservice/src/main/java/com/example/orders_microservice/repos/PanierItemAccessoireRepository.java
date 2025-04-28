package com.example.orders_microservice.repos;

import com.example.orders_microservice.entities.PanierItemAccessoire;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface PanierItemAccessoireRepository extends JpaRepository<PanierItemAccessoire, Long> {
    List<PanierItemAccessoire> findByPanierItemId(Long panierItemId);
    
    @Transactional
    @Modifying
    @Query("DELETE FROM PanierItemAccessoire p WHERE p.panierItem.id = :panierItemId")
    void deleteByPanierItemId(Long panierItemId);
}