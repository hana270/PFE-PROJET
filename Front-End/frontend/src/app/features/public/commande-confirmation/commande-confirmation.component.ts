import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Commande, StatutCommande } from '../../../core/models/commande.models';
import { CommandeService } from '../../../core/services/commande.service';
import { CartService } from '../../../core/services/cart.service';

@Component({
  selector: 'app-commande-confirmation',
  templateUrl: './commande-confirmation.component.html',
  styleUrls: ['./commande-confirmation.component.scss']
})
export class CommandeConfirmationComponent implements OnInit {
  commande: Commande | null = null;
  loading = true;
  error = '';
  numeroCommande: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private commandeService: CommandeService,
    private cartService: CartService
  ) { }

  ngOnInit(): void {
    // Get order number from route parameter
    this.route.paramMap.subscribe(params => {
      const numero = params.get('numero');
      if (numero) {
        this.numeroCommande = numero;
        this.loadOrderDetails(numero);
        
        // Clear the cart when order is confirmed
        this.cartService.clearCart().subscribe(
          () => console.log('Cart cleared successfully'),
          error => console.error('Error clearing cart:', error)
        );
      } else {
        this.error = 'Numéro de commande non trouvé dans les paramètres de route';
        this.loading = false;
      }
    });
  }

  loadOrderDetails(numero: string): void {
    this.loading = true;
    this.error = ''; // Reset error message
    
    console.log(`Loading order details for: ${numero}`);
    
    this.commandeService.getCommande(numero).subscribe({
      next: (commande) => {
        this.commande = commande;
        this.loading = false;
        
        // Check if order status is valid
        if (commande.statut !== StatutCommande.VALIDEE) {
          console.warn(`Order status may be invalid: ${commande.statut}. Expected: ${StatutCommande.VALIDEE}`);
        }
      },
      error: (err) => {
        console.error('Error loading order details:', err);
        
        // Handle specific error types
        if (err.errorCode === 'ORDER_NOT_FOUND' || err.status === 404) {
          this.error = `La commande "${numero}" n'a pas été trouvée. Veuillez vérifier le numéro de commande.`;
        } else if (err.errorCode === 'NETWORK_ERROR' || err.status === 0) {
          this.error = `Impossible de se connecter au serveur. Veuillez vérifier votre connexion internet.`;
        } else {
          this.error = `Erreur lors du chargement de la commande: ${err.userMessage || err.message || 'Erreur inconnue'}`;
        }
        
        this.loading = false;
      }
    });
  }

  retourAccueil(): void {
    this.router.navigate(['/']);
  }

  // Method to retry loading the order
  retryLoading(): void {
    if (this.numeroCommande) {
      this.loadOrderDetails(this.numeroCommande);
    }
  }
}