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
    @JoinColumn(name = "bassin_id")
    private Bassin bassin;

    private int quantite;
    private String typeOperation;
    private String raison;
    private Date dateTransaction;
    
    @Column(name = "user_id")
    private Long userId;
    
    @Transient
    private User user;
}