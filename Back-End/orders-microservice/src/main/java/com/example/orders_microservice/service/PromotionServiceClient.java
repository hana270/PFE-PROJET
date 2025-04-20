package com.example.orders_microservice.service;

import com.example.orders_microservice.dto.PromotionDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "bassins-service", url = "http://localhost:8089/aquatresor")
public interface PromotionServiceClient {
    @GetMapping("/api/promotions/{id}")
    PromotionDTO getPromotionById(@PathVariable Long id);
}