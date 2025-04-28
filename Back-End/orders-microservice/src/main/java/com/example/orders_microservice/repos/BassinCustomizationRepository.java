package com.example.orders_microservice.repos;


import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.orders_microservice.entities.BassinCustomization;

@Repository
public interface BassinCustomizationRepository extends JpaRepository<BassinCustomization, Long> {
}