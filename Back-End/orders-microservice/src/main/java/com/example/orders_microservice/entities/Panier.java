package com.example.orders_microservice.entities;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Entity
@Table(name = "panier", uniqueConstraints = @UniqueConstraint(columnNames = "user_id"))
public class Panier {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	private Long userId;
	private String sessionId;

	@Column(name = "last_updated")
	private LocalDateTime lastUpdated = LocalDateTime.now();

	@Column(name = "user_email")
	private String userEmail;

	@Column(name = "expiration_warning_sent")
	private boolean expirationWarningSent = false;

	@OneToMany(mappedBy = "panier", cascade = CascadeType.ALL, fetch = FetchType.EAGER)
	private List<PanierItem> items;
	
	private Double totalPrice = 0.0;

	// Constructors, getters, and setters
	// (Lombok @Data should handle these, but you can add custom ones if needed)

	public void addItem(PanierItem item) {
		items.add(item);
		item.setPanier(this);
		this.setLastUpdated(LocalDateTime.now());
	}

	public void removeItem(PanierItem item) {
		items.remove(item);
		item.setPanier(null);
		this.setLastUpdated(LocalDateTime.now());
	}

	public void clearItems() {
		items.clear();
	}
}