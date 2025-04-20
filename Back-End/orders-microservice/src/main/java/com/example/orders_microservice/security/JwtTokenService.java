package com.example.orders_microservice.security;

import com.auth0.jwt.JWT;
import com.auth0.jwt.JWTVerifier;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.exceptions.JWTVerificationException;
import com.auth0.jwt.interfaces.DecodedJWT;

import java.util.List;

import org.springframework.stereotype.Service;

@Service
public class JwtTokenService {

    private final Algorithm algorithm;

    public JwtTokenService() {
        this.algorithm = Algorithm.HMAC256(SecParams.SECRET);
    }

   
    public String getUsernameFromToken(String token) {
        try {
            JWTVerifier verifier = JWT.require(algorithm).build();
            DecodedJWT decodedJWT = verifier.verify(token);
            return decodedJWT.getSubject();
        } catch (JWTVerificationException e) {
            throw new IllegalArgumentException("Token invalide", e);
        }
    }

    public List<String> getRolesFromToken(String token) {
        try {
            JWTVerifier verifier = JWT.require(algorithm).build();
            DecodedJWT decodedJWT = verifier.verify(token);
            return decodedJWT.getClaim("roles").asList(String.class);
        } catch (JWTVerificationException e) {
            throw new IllegalArgumentException("Token invalide", e);
        }
    }
    public String getEmailFromToken(String token) {
        try {
            JWTVerifier verifier = JWT.require(algorithm).build();
            DecodedJWT decodedJWT = verifier.verify(token);
            return decodedJWT.getClaim("email").asString();
        } catch (JWTVerificationException e) {
            throw new IllegalArgumentException("Token invalide", e);
        }
    }

    public Long getUserIdFromToken(String token) {
        try {
            JWTVerifier verifier = JWT.require(algorithm).build();
            DecodedJWT decodedJWT = verifier.verify(token);
            return decodedJWT.getClaim("userId").asLong();
        } catch (JWTVerificationException e) {
            throw new IllegalArgumentException("Token invalide", e);
        }
    }

    public String getProfileImageFromToken(String token) {
        try {
            JWTVerifier verifier = JWT.require(algorithm).build();
            DecodedJWT decodedJWT = verifier.verify(token);
            return decodedJWT.getClaim("profileImage").asString();
        } catch (JWTVerificationException e) {
            return null; // Optionnel car l'image de profil peut être null
        }
    }
}