package com.example.orders_microservice.dto;

public class BassinImageDTO {
    private Long idImage;
    private String name;
    private String type;
    private String imagePath;
    private byte[] image;
    
    // getters and setters
    public Long getIdImage() {
        return idImage;
    }
    
    public void setIdImage(Long idImage) {
        this.idImage = idImage;
    }
    
    public String getName() {
        return name;
    }
    
    public void setName(String name) {
        this.name = name;
    }
    
    public String getType() {
        return type;
    }
    
    public void setType(String type) {
        this.type = type;
    }
    
    public String getImagePath() {
        return imagePath;
    }
    
    public void setImagePath(String imagePath) {
        this.imagePath = imagePath;
    }
    
    public byte[] getImage() {
        return image;
    }
    
    public void setImage(byte[] image) {
        this.image = image;
    }
}