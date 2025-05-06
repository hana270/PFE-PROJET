// File: BassinServiceClient.java
package com.example.orders_microservice.service;

import com.example.orders_microservice.config.FeignClientConfig;
import com.example.orders_microservice.config.FeignConfig;
import com.example.orders_microservice.dto.BassinDTO;
import com.example.orders_microservice.dto.UpdateStockRequest;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

@FeignClient(
	    name = "bassins-microservice", 
	    url = "http://localhost:8089/aquatresor",
	    configuration = FeignConfig.class
	)
	public interface BassinServiceClient {
	    
	    @GetMapping("/api/getbyid/{id}")
	    BassinDTO getBassinDetails(@PathVariable Long id);
	    
	    @PostMapping("/api/bassins/update-stock")
	    void updateStock(@RequestBody UpdateStockRequest request);
	    
	    
	    @PutMapping("/api/bassins/{id}/stock")
	    void mettreAJourStock(@PathVariable Long id, @RequestParam int quantite);
	

}