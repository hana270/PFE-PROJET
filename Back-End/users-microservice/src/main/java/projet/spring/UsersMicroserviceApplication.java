package projet.spring;

import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import jakarta.annotation.PostConstruct;
import projet.spring.entities.*;
import projet.spring.repos.RoleRepository;
import projet.spring.service.UserService;
import projet.spring.service.register.RegistrationRequest;
@SpringBootApplication
public class UsersMicroserviceApplication {

    public static void main(String[] args) {
        SpringApplication.run(UsersMicroserviceApplication.class, args);
    }

    @Autowired
    private UserService userService;

    @Autowired
    private RoleRepository roleRep;

    
    @Autowired
    private BCryptPasswordEncoder bCryptPasswordEncoder;
   
    /*
    @PostConstruct
    void init_users() {
        if (userService.findUserByUsername("admin") == null) {
            // Créer les rôles si nécessaire
            Optional<Role> adminRoleOptional = roleRep.findByRole("ADMIN");
            if (adminRoleOptional.isEmpty()) {
                roleRep.save(new Role(null, "ADMIN"));
            }

            Optional<Role> userRoleOptional = roleRep.findByRole("USER");
            if (userRoleOptional.isEmpty()) {
                roleRep.save(new Role(null, "USER"));
            }

            // Créer l'utilisateur "admin"
            RegistrationRequest adminRequest = new RegistrationRequest();
            adminRequest.setUsername("admin");

            // Hacher le mot de passe et l'afficher pour débogage
            String encodedPassword = bCryptPasswordEncoder.encode("admin123");
            System.out.println("Encoded password (init_users): " + encodedPassword); // À supprimer après débogage
            adminRequest.setPassword(encodedPassword);

            adminRequest.setEmail("admin@gmail.com");

            // Enregistrer l'utilisateur
            User adminUser = userService.registerUser(adminRequest);
            adminUser.setEnabled(true);
            userService.saveUser(adminUser);

            userService.addRoleToUser("admin", "ADMIN");
      
            System.out.println("Admin user 'admin' created successfully.");
        } else {
            System.out.println("User 'admin' already exists.");
        }
    }*/
  
    
    /* 
    @PostConstruct
    void resetAdminPassword() {
        User adminUser = userService.findUserByUsername("admin");
        if (adminUser != null) {
            String newEncodedPassword = bCryptPasswordEncoder.encode("123456"); // Remplacez par le mot de passe souhaité
            adminUser.setPassword(newEncodedPassword);
            userService.saveUser(adminUser);
            System.out.println("Admin password reset successfully.");
        } else {
            System.out.println("Admin user not found.");
        }
    }*/
}