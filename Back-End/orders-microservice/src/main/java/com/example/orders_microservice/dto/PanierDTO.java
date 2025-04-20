package com.example.orders_microservice.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;


@Data
public class PanierDTO {
    private Long idPanier;
    private String sessionId;
    private Long userId;
    private List<PanierItemDTO> items = new ArrayList<>();
}