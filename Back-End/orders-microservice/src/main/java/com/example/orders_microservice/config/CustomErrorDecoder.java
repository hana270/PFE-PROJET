// File: CustomErrorDecoder.java
package com.example.orders_microservice.config;

import feign.Response;
import feign.codec.ErrorDecoder;
import feign.FeignException;

public class CustomErrorDecoder implements ErrorDecoder {
    @Override
    public Exception decode(String methodKey, Response response) {
        // Use FeignException.errorStatus to properly create the exception
        return FeignException.errorStatus(methodKey, response);
    }
}