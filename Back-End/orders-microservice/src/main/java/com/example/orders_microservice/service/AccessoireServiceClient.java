package com.example.orders_microservice.service;

import java.util.List;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.annotation.*;

import com.example.orders_microservice.dto.AccessoireDTO;

@FeignClient(name = "aquatresor", url = "http://localhost:8089/aquatresor")
public interface AccessoireServiceClient {
    @PostMapping("/api/bassinpersonnalise/accessoires/by-ids")
    List<AccessoireDTO> getAccessoiresByIds(@RequestBody List<Long> accessoireIds);

    @GetMapping("/api/bassinpersonnalise/accessoires/{id}")
    AccessoireDTO getAccessoireDetails(@PathVariable Long id);
}