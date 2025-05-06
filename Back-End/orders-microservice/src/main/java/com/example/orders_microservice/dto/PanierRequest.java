package com.example.orders_microservice.dto;
import java.util.*;

public class PanierRequest {
    private List<PanierItemRequest> items;
    private String email;
    
    // Getters and setters
    public List<PanierItemRequest> getItems() {
        return items;
    }
    
    public void setItems(List<PanierItemRequest> items) {
        this.items = items;
    }
    
    public String getEmail() {
        return email;
    }
    
    public void setEmail(String email) {
        this.email = email;
    }
}