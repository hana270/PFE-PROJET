package com.example.gestionbassins.entities;

import jakarta.persistence.*;
import lombok.Data;

@Data
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long user_id;

    @Column(unique = true)
    private String username;
    
    private String email;

    private String password;
    private Boolean enabled;

    private String profileImage;
    private String resetToken;
    private String validationCode;
    private String jwtToken;
}