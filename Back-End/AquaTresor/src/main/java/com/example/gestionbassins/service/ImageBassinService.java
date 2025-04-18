package com.example.gestionbassins.service;

import com.example.gestionbassins.entities.Bassin;
import com.example.gestionbassins.entities.ImageBassin;

import java.io.IOException;
import java.util.List;

import org.springframework.web.multipart.MultipartFile;

public interface ImageBassinService {
    ImageBassin saveImage(ImageBassin imageBassin);
    List<ImageBassin> getImagesByBassin(Long idBassin);
    void deleteImage(Long idImage);
    
    void uploadImages(Bassin bassin, MultipartFile[] files)throws IOException;
}
