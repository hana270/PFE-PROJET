package com.example.gestionbassins.service;

import org.springframework.stereotype.Component;

import com.example.gestionbassins.entities.User;

@Component
public class UserServiceClientFallback implements UserServiceClient {
    @Override
    public User getUserByUsername(String username) {
        // Return a default user or handle the error appropriately
        return null;
    }
}
