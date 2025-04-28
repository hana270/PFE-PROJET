package com.example.orders_microservice.service;

import com.example.orders_microservice.dto.BassinPersonnaliseDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

@FeignClient(name = "aquatresor", url = "http://localhost:8089/aquatresor")
public interface BassinPersonnaliseClient {
    
    @GetMapping("/api/bassinpersonnalise/getBassinPersonnaliseByBassin/{idBassin}")
    BassinPersonnaliseDTO getBassinPersonnaliseByBassinId(@PathVariable("idBassin") Long idBassin);
    
    @GetMapping("/api/bassinpersonnalise/detailBassinPersonnalise/{idBassin}")
    BassinPersonnaliseDTO getDetailBassinPersonnalise(@PathVariable("idBassin") Long idBassin);
}
