import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/authentication/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-users-list',
  templateUrl: './users-list.component.html',
  styleUrls: ['./users-list.component.css']
})
export class UsersListComponent implements OnInit {
  clients: any[] = [];
  installers: any[] = [];
  filteredClients: any[] = [];
  filteredInstallers: any[] = [];
  showOnlineOnly: boolean = false;
  searchQuery: string = '';
  isLoading: boolean = true;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading = true;

    // Charger les clients
    this.authService.getAllClients().subscribe(
      (data) => {
        this.clients = data.filter(user => user.roles.some((role: any) => role.role === 'CLIENT'));
        this.filteredClients = this.clients;
      },
      (error) => {
        console.error('Error fetching clients:', error);
        alert('Failed to load clients. Please try again.');
      }
    );

    // Charger les installateurs
    this.authService.getInstallers().subscribe(
      (data) => {
        this.installers = data;
        this.filteredInstallers = this.installers;
        this.isLoading = false;
      },
      (error) => {
        console.error('Error fetching installers:', error);
        alert('Failed to load installers. Please try again.');
        this.isLoading = false;
      }
    );
  }

  onSearchQueryChange(query: string): void {
    this.searchQuery = query;
    this.filterClientsByName();
    this.filterInstallersByName();
  }

  filterClientsByName(): void {
    this.filteredClients = this.clients.filter(client =>
      (!this.searchQuery || client.username.toLowerCase().includes(this.searchQuery.toLowerCase()))
      && (!this.showOnlineOnly || client.online)
    );
  }

  filterInstallersByName(): void {
    this.filteredInstallers = this.installers.filter(installer =>
      (!this.searchQuery || installer.username.toLowerCase().includes(this.searchQuery.toLowerCase()))
      && (!this.showOnlineOnly || installer.online)
    );
  }

  deactivateInstaller(userId: number): void {
    Swal.fire({
      title: 'Êtes-vous sûr ?',
      text: 'Vous êtes sur le point de désactiver ce compte. Cette action est irréversible.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Oui, désactiver',
      cancelButtonText: 'Annuler',
    }).then((result) => {
      if (result.isConfirmed) {
        this.authService.deactivateUser(userId).subscribe(
          () => {
            Swal.fire('Désactivé !', 'Le compte a été désactivé avec succès.', 'success');
            this.loadUsers(); // Recharger la liste des utilisateurs
          },
          (error) => {
            console.error('Error deactivating user:', error);
            Swal.fire('Erreur', 'Échec de la désactivation du compte.', 'error');
          }
        );
      }
    });
  }

  activateInstaller(userId: number): void {
    Swal.fire({
      title: 'Êtes-vous sûr ?',
      text: 'Vous êtes sur le point de réactiver ce compte.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#28a745',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Oui, activer',
      cancelButtonText: 'Annuler',
    }).then((result) => {
      if (result.isConfirmed) {
        this.authService.activateUser(userId).subscribe(
          () => {
            Swal.fire('Activé !', 'Le compte a été activé avec succès.', 'success');
            this.loadUsers(); // Recharger la liste des utilisateurs
          },
          (error) => {
            console.error('Error activating user:', error);
            Swal.fire('Erreur', 'Échec de l\'activation du compte.', 'error');
          }
        );
      }
    });
  }
}