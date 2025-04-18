package com.example.gestionbassins.security;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;

public class CustomUserDetails implements UserDetails {
	   private Long userId;
	    private String username;
	    private String email;
	    private String profileImage;
	    private Collection<? extends GrantedAuthority> authorities;
	    private String password;
	    private boolean enabled = true;

	    public CustomUserDetails(Long userId, String username, String email, 
                Collection<? extends GrantedAuthority> authorities) {
this.userId = userId;
this.username = username;
this.email = email;
this.authorities = authorities;
}

	    
    public CustomUserDetails(Long userId, String username, String email) {
        this.userId = userId;
        this.username = username;
        this.email = email;
    }

  
    public Long getUserId() {
        return userId;
    }

    public String getEmail() {
        return email;
    }

    public String getProfileImage() {
        return profileImage;
    }

    public void setProfileImage(String profileImage) {
        this.profileImage = profileImage;
    }
    
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public String getUsername() {
        return username;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }
}