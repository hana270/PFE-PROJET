package com.example.orders_microservice.service;

import com.example.orders_microservice.dto.BassinPersonnaliseDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "bassins-microservice", url = "http://localhost:8089/aquatresor")
public interface BassinPersonnaliseClient {
    
    @GetMapping("/api/bassinpersonnalise/detailBassinPersonnalise/{idBassin}")
    BassinPersonnaliseDTO getDetailBassinPersonnalise(@PathVariable Long idBassin);
    
    @GetMapping("/api/bassinpersonnalise/getBassinPersonnaliseByBassin/{idBassin}")
    BassinPersonnaliseDTO getBassinPersonnaliseByBassinId(@PathVariable("idBassin") Long idBassin);
    
    // Add this new method to get by bassin ID
    @GetMapping("/api/bassinpersonnalise/by-bassin/{bassinId}")
    BassinPersonnaliseDTO getByBassinId(@PathVariable("bassinId") Long bassinId);
}