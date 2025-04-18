package com.example.gestionbassins.projections;

import java.util.Date;

public interface BassinMetadata {
    boolean isArchive();
    int getQuantity();
    Boolean isFavorite();
    Date getDateAjout();
    Date getDateDerniereModification();
}
