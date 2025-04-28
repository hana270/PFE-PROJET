package com.example.orders_microservice.entities;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
public class PanierItemAccessoire {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne
    @JoinColumn(name = "panier_item_id")
    private PanierItem panierItem;
    
    private Long accessoireId;
    private String nomAccessoire;
    private Double prixAccessoire;
    private String imageUrl;
}