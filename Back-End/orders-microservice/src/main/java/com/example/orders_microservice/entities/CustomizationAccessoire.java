package com.example.orders_microservice.entities;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "customization_accessoire")
@Data
public class CustomizationAccessoire {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne
    @JoinColumn(name = "customization_id")
    private BassinCustomization customization;
    
    @Column(name = "accessoire_id")
    private Long accessoireId;
    private String nomAccessoire;
    

	private Double prixAccessoire;
}