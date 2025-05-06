package com.example.orders_microservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;


@Data
@NoArgsConstructor
@AllArgsConstructor
public class PaymentValidationRequestDTO {
    private String transactionToken;
    private String payerId;
    private String paymentId;
    private String cardNumber;
    private String expiryDate;
    private String cvv;
    private String cardHolderName;
}