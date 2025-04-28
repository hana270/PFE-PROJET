package com.example.orders_microservice.repos;

import com.example.orders_microservice.entities.CustomizationAccessoire;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CustomizationAccessoireRepository extends JpaRepository<CustomizationAccessoire, Long> {
}
