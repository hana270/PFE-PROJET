package com.example.gestionbassins.entities;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.Date;

@Data
@NoArgsConstructor
@Entity
public class Transaction {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idTransaction;

    @ManyToOne
    @JoinColumn(name = "bassin_id_bassin")
    private Bassin bassin;

    private int quantite;
    private String raison; // Ex: "Vente hors site", "Réapprovisionnement"
    private Date dateTransaction;
}