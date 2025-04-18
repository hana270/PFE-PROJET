package com.example.gestionbassins.entities;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.persistence.*;
import lombok.*;
import java.util.*;

@Data
@NoArgsConstructor
@Entity
public class Avis {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idAvis;

    private String nom;
    private String message;
    private int note;

    @ManyToOne
    @JoinColumn(name = "idBassin")
    private Bassin bassin;

    @Column(name = "user_id")
    private Long userId;

    @Temporal(TemporalType.TIMESTAMP)
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
    private Date dateSoumission;

    @Temporal(TemporalType.TIMESTAMP)
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
    private Date dateModification;

    @ElementCollection
    @CollectionTable(name = "historique_messages", joinColumns = @JoinColumn(name = "avis_id"))
    private List<HistoriqueModification> historiqueModifications = new ArrayList<>();
    
    @Embeddable
    @Data
    @NoArgsConstructor
    public static class HistoriqueModification {
        @Temporal(TemporalType.TIMESTAMP)
        @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
        private Date dateModification;
        private Integer ancienneNote; 
        private String ancienMessage; 
        private String ancienNom;
    }
    
    public void addHistoriqueMessage(String message) {
        HistoriqueModification historique = new HistoriqueModification();
        historique.setDateModification(new Date());
        historique.setAncienMessage(message);
        historique.setAncienNom(this.nom);
        historique.setAncienneNote(this.note);
        this.historiqueModifications.add(historique);
    }
    
    public void addHistoriqueModification(int ancienneNote, String ancienMessage, String ancienNom) {
        HistoriqueModification historique = new HistoriqueModification();
        historique.setDateModification(new Date());
        historique.setAncienneNote(ancienneNote);
        historique.setAncienMessage(ancienMessage);
        historique.setAncienNom(ancienNom);
        this.historiqueModifications.add(historique);
    }
}