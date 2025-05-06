package com.example.orders_microservice.exceptions;

public class PanierNotFoundException  extends RuntimeException {
	  public PanierNotFoundException(String message) {
	        super(message);
	    }
}
