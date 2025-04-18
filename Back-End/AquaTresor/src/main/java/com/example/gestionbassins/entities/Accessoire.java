package com.example.gestionbassins.entities;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@Entity
public class Accessoire {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idAccessoire;

    private String nomAccessoire;
    private Double prixAccessoire;
    private String imagePath; // Chemin de l'image de l'accessoire

    @ManyToOne
    @JoinColumn(name = "idBassinPersonnalise")
    @JsonIgnore // Ignore la sérialisation de l'objet BassinPersonnalise complet
    private BassinPersonnalise bassinPersonnalise;
    
    public Accessoire(String nomAccessoire,Double prixAccessoire, String imagePath) {
        this.nomAccessoire = nomAccessoire;
        this.prixAccessoire=prixAccessoire;
        this.imagePath = imagePath;
    }
    
    @Override
    public String toString() {
        return "Accessoire{" +
                "idAccessoire=" + idAccessoire +
                ", nomAccessoire='" + nomAccessoire + '\'' +
                ", prixAccessoire=" + prixAccessoire +
                ", imagePath='" + imagePath + '\'' +
                '}';
    }
}