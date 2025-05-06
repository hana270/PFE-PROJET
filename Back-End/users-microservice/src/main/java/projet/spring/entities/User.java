package projet.spring.entities;

import jakarta.persistence.*;
import lombok.*;
import java.util.Set;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long user_id;

    @Column(unique = true)
    private String username;
    private String password;
    private Boolean enabled;
    
    @Column(unique = true)
    private String email;
    
    private String firstName;
    private String lastName;
    private String phone;
    
    @Column(name = "default_address")
    private String defaultAddress; // Adresse principale simple
    
    @Column(name = "profile_image")
    private String profileImage;
    
    @Column(name = "reset_token")
    private String resetToken;
    
    @Column(name = "validation_code")
    private String validationCode;
    
    @Transient
    private String jwtToken;
    
    @ManyToMany(cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    @JoinTable(name = "user_role", 
               joinColumns = @JoinColumn(name = "user_id"), 
               inverseJoinColumns = @JoinColumn(name = "role_id"))
    private Set<Role> roles;
    
    // Getters et setters pour jwtToken
    public String getJwtToken() {
        return jwtToken;
    }
    
    public void setJwtToken(String jwtToken) {
        this.jwtToken = jwtToken;
    }
}