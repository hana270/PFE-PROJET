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
    private String email;

    @Column(name = "profile_image")
    private String profileImage; // Assurez-vous que ce champ est correctement mappé

    @Column(name = "reset_token")
    private String resetToken;

    @Column(name = "validation_code")
    private String validationCode;

    @Transient
    private String jwtToken;

    @ManyToMany(cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    @JoinTable(name = "user_role", joinColumns = @JoinColumn(name = "user_id"), inverseJoinColumns = @JoinColumn(name = "role_id"))
    private Set<Role> roles;

    // Getters et setters pour jwtToken
    public String getJwtToken() {
        return jwtToken;
    }

    public void setJwtToken(String jwtToken) {
        this.jwtToken = jwtToken;
    }
}