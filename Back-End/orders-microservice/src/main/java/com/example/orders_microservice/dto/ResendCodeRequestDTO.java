package com.example.orders_microservice.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ResendCodeRequestDTO {
    private String transactionId;
}
