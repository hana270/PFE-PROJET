package com.example.gestionbassins.exceptions;

/**
 * Exception personnalisée pour les erreurs lors de la migration des paniers
 */
public class CartMigrationException extends RuntimeException {

    /**
     * Constructeur avec message d'erreur
     * @param message Le message décrivant l'erreur
     */
    public CartMigrationException(String message) {
        super(message);
    }

    /**
     * Constructeur avec message et cause
     * @param message Le message décrivant l'erreur
     * @param cause L'exception à l'origine de cette exception
     */
    public CartMigrationException(String message, Throwable cause) {
        super(message, cause);
    }

    /**
     * Constructeur avec cause uniquement
     * @param cause L'exception à l'origine de cette exception
     */
    public CartMigrationException(Throwable cause) {
        super(cause);
    }

    /**
     * Constructeur avec message, cause, suppression activée et écriture de la stack trace activée
     * @param message Le message décrivant l'erreur
     * @param cause L'exception à l'origine de cette exception
     * @param enableSuppression Indique si la suppression est activée
     * @param writableStackTrace Indique si l'écriture de la stack trace est activée
     */
    protected CartMigrationException(String message, Throwable cause, 
                                   boolean enableSuppression, 
                                   boolean writableStackTrace) {
        super(message, cause, enableSuppression, writableStackTrace);
    }
}