package com.example.orders_microservice.service;

import java.util.Map;

public interface EmailSender {
    void sendEmail(String to, String subject, String templateName, Map<String, Object> variables);
}