package com.example.gestionbassins.entities;

import jakarta.persistence.*;
import lombok.Data;
@Entity
@Table(name = "app_user") // Avoid using reserved word "user"
@Data
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long userId; // Consistent naming (camelCase)
    
    @Column(unique = true)
    private String username;
    
    private String email;
    private String password;
    private Boolean enabled;
    private String profileImage;
    private String resetToken;
    private String validationCode;
    
    @Transient // This shouldn't be persisted
    private String jwtToken;
}