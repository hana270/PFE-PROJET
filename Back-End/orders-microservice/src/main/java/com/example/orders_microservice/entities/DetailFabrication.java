package com.example.orders_microservice.entities;

import java.time.LocalDateTime;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.Data;

@Entity
@Data
class DetailFabrication {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private LocalDateTime dateDebutFabrication;
    private LocalDateTime dateFinPrevue;
    private Integer nombrePiecesAFabriquer;
    private String notesFabrication;
}
