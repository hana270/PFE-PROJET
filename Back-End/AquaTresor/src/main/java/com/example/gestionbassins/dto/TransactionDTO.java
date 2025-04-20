package com.example.gestionbassins.dto;

import lombok.Data;
import java.util.Date;

@Data
public class TransactionDTO {
    private Long bassinId;
    private int quantite;
    private String typeOperation; // "ENTREE", "SORTIE", "CORRECTION"
    private String raison;
    private Date date;
   
    private String utilisateur;
}