package com.example.orders_microservice.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonFormat;

@Data
public class PanierResponse {
    private Long id;
    private Long userId;
    private String sessionId;
    private Double totalPrice;
    private List<PanierItemResponse> items;
 
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime lastUpdated;
 
}