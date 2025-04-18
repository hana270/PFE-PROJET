package com.example.gestionbassins.entities;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@Entity
public class BassinPersonnalise {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idBassinPersonnalise;

    @ManyToOne
    @JoinColumn(name = "idBassin", nullable = false)
    private Bassin bassin;

    @ElementCollection
    @CollectionTable(name = "bassin_personnalise_materiaux", joinColumns = @JoinColumn(name = "idBassinPersonnalise"))
    @Column(name = "materiau")
    private List<String> materiaux;

    @ElementCollection
    @CollectionTable(name = "bassin_personnalise_dimensions", joinColumns = @JoinColumn(name = "idBassinPersonnalise"))
    @Column(name = "dimension")
    private List<String> dimensions;

    @OneToMany(mappedBy = "bassinPersonnalise", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Accessoire> accessoires;
    
    @Column(nullable = true)
    private Integer dureeFabrication; // en jours


    public BassinPersonnalise(Bassin bassin, List<String> materiaux, List<String> dimensions, List<Accessoire> accessoires, Integer dureeFabrication) {
        this.bassin = bassin;
        this.materiaux = materiaux;
        this.dimensions = dimensions;
        this.dureeFabrication = dureeFabrication;

     // Associer chaque accessoire à ce bassin personnalisé
        if (accessoires != null) {
            for (Accessoire accessoire : accessoires) {
                accessoire.setBassinPersonnalise(this);
            }
        }
    }
    
    
    @Override
    public String toString() {
        return "BassinPersonnalise{" +
                "idBassinPersonnalise=" + idBassinPersonnalise +
                ", bassin=" + (bassin != null ? bassin.getIdBassin() : null) +
                ", materiaux=" + materiaux +
                ", dimensions=" + dimensions +
                '}';
    }
    
    
}