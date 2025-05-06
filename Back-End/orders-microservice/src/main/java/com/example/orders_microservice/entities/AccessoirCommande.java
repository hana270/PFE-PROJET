package com.example.orders_microservice.entities;


import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
public class AccessoirCommande {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private Long accessoireId;
    private String nomAccessoire;
    private Double prixAccessoire;
    private String imageUrl;
}

