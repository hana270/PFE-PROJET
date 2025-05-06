package projet.spring.service.register;


import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;

import jakarta.transaction.Transactional;
import projet.spring.entities.User;

import org.springframework.data.jpa.repository.*;

public interface VerificationTokenRepository extends JpaRepository<VerificationToken, Long> {
    VerificationToken findByToken(String token);
    
    
    @Modifying
    @Query("DELETE FROM VerificationToken vt WHERE vt.user = :user")
    void deleteByUser(@Param("user") User user);
    
}