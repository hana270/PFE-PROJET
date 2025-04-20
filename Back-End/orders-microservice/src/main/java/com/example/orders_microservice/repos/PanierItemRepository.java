package com.example.orders_microservice.repos;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.orders_microservice.entities.PanierItem;

@Repository
public interface PanierItemRepository extends JpaRepository<PanierItem, Long> {
    @Modifying
    @Query("DELETE FROM PanierItem pi WHERE pi.panier.id = :panierId")
    void deleteByPanierId(@Param("panierId") Long panierId);

    @Query("SELECT pi FROM PanierItem pi WHERE pi.id = :itemId AND pi.panier.id = :panierId")
    Optional<PanierItem> findByIdAndPanierId(@Param("itemId") Long itemId, @Param("panierId") Long panierId);
    }