package com.example.gestionbassins.projections;

import org.springframework.data.rest.core.config.Projection;

import com.example.gestionbassins.entities.Bassin;

@Projection(name="nomBassin", types= {Bassin.class})
public interface BassinProjection {
	public String getNomBassin();
}
