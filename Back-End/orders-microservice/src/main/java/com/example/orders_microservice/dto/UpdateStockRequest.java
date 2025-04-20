// orders-microservice/src/main/java/com/example/orders_microservice/dto/UpdateStockRequest.java
package com.example.orders_microservice.dto;

import lombok.Data;

@Data
public class UpdateStockRequest {
    private Long bassinId;
    private int quantityDelta; // +n ou -n
}