package com.example.gestionbassins.repos;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.gestionbassins.entities.ImageBassin;

import java.util.List;

public interface ImageBassinRepository extends JpaRepository<ImageBassin, Long> {
    List<ImageBassin> findByBassinIdBassin(Long idBassin);
    
    @Query("SELECT MAX(CAST(SUBSTRING(i.imagePath, LOCATE('_', i.imagePath) + 1, LOCATE('.', i.imagePath) - LOCATE('_', i.imagePath) - 1) AS int)) " +
    	       "FROM ImageBassin i WHERE i.bassin.idBassin = :idBassin")
    Integer findLastImageIdByBassin(@Param("idBassin") Long idBassin);


    
}
