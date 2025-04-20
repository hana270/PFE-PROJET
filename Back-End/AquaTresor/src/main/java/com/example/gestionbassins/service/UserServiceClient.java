package com.example.gestionbassins.service;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import com.example.gestionbassins.entities.User;

@FeignClient(name = "users-microservice", url = "http://localhost:8002")
public interface UserServiceClient {
    @GetMapping("/users/username/{username}")
    User getUserByUsername(@PathVariable String username);
}
