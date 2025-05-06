import { Component, OnInit } from '@angular/core';
import { CommandeService } from '../../../core/services/commande.service';
import { Commande } from '../../../core/models/commande.models';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-mes-commandes',
  templateUrl: './mes-commandes.component.html',
  styleUrls: ['./mes-commandes.component.css']
})
export class MesCommandesComponent implements OnInit {
  commandes: Commande[] = [];
  isLoading = true;

  constructor(
    private commandeService: CommandeService,
    private authStateService: AuthStateService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    const clientId = this.authStateService.currentUserId;
    if (clientId) {
      this.loadCommandes(clientId);
    } else {
      this.toastService.showError('Vous devez être connecté pour voir vos commandes');
      this.isLoading = false;
    }
  }

  loadCommandes(clientId: number): void {
    this.commandeService.getCommandesClient(clientId).subscribe({
      next: (commandes) => {
        this.commandes = commandes;
        this.isLoading = false;
      },
      error: (err) => {
        this.toastService.showError('Erreur lors du chargement des commandes');
        this.isLoading = false;
      }
    });
  }

  getStatusClass(statut: string): string {
    switch (statut) {
      case 'EN_ATTENTE': return 'bg-warning';
      case 'VALIDEE': return 'bg-success';
      case 'EN_PREPARATION': return 'bg-info';
      case 'EXPEDIEE': return 'bg-primary';
      case 'LIVREE': return 'bg-secondary';
      case 'ANNULEE': return 'bg-danger';
      default: return 'bg-light text-dark';
    }
  }
}