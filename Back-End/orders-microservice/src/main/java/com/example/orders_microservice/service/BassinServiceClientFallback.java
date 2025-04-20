package com.example.orders_microservice.service;

import com.example.orders_microservice.dto.BassinDTO;
import com.example.orders_microservice.dto.UpdateStockRequest;
import org.springframework.stereotype.Component;

@Component
public class BassinServiceClientFallback implements BassinServiceClient {
    
    @Override
    public BassinDTO getBassinDetails(Long id) {
        // Implement proper fallback logic
        BassinDTO fallbackBassin = new BassinDTO();
        fallbackBassin.setIdBassin(id);
        fallbackBassin.setNomBassin("Service Temporarily Unavailable");
        fallbackBassin.setDescription("Fallback response - bassins service is down");
        return fallbackBassin;
    }
    
    @Override
    public void updateStock(UpdateStockRequest request) {
        // Log the error
        System.err.println("Failed to update stock for bassin: " + request.getBassinId());
        // Consider implementing retry logic here or queue the request for later
    }
}