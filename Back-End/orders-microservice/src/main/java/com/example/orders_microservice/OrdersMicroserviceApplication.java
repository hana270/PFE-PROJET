package com.example.orders_microservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;

@SpringBootApplication
@EnableFeignClients(basePackages = "com.example.orders_microservice.service")
public class OrdersMicroserviceApplication {
    public static void main(String[] args) {
        SpringApplication.run(OrdersMicroserviceApplication.class, args);
    }
}