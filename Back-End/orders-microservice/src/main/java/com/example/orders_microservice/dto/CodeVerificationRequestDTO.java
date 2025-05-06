package com.example.orders_microservice.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CodeVerificationRequestDTO {
    private String transactionId;
    private String verificationCode;
}
