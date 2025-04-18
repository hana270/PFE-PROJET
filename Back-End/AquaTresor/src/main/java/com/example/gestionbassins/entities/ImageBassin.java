package com.example.gestionbassins.entities;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@Entity
public class ImageBassin {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idImage;

    @Column(nullable=false)
    private String name;
    
    @Column(nullable=false)
    private String type;
    
    @Lob
    @JdbcTypeCode(SqlTypes.BINARY)  // Use this instead of @Type
    @Column(columnDefinition = "BYTEA")   
    //@JsonBackReference
    private byte[] image;
    
    @Column(name = "image_path")
    private String imagePath;


    @ManyToOne
    @JoinColumn(name = "id_bassin")
    @JsonIgnore
    @JsonBackReference
    private Bassin bassin;
    
    public ImageBassin(String name, String type, byte[] image, String imagePath) {
        this.name = name;
        this.type = type;
        this.image = image;
        this.imagePath = imagePath;
    }
   
}
