// bassins-microservice/src/main/java/com/example/gestionbassins/dto/UpdateStockRequest.java
package com.example.gestionbassins.dto;

import lombok.Data;

@Data
public class UpdateStockRequest {
    private Long bassinId;
    private int quantityDelta; // +n ou -n
}