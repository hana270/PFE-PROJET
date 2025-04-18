import { Component, Input, HostListener, Output, EventEmitter, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { AuthService } from '../../../core/authentication/auth.service';

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css'],
})
export class LayoutComponent implements OnInit{
  @Input() pageTitle: string = '';
  @Output() searchQueryChange = new EventEmitter<string>();

  isSidebarOpen: boolean = true;
  isMobile: boolean = false;
  isSearchActive: boolean = false;
  searchQuery: string = '';

  constructor(private authService: AuthService, private router: Router) {
    this.checkIfMobile();
  }

  ngOnInit() {
    // Restaurer l'état du sidebar depuis le localStorage
    const savedState = localStorage.getItem('sidebarState');
    if (savedState) {
      this.isSidebarOpen = savedState === 'open';
    }

    // Synchroniser l'état sur les changements de route
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.adjustLayout();
      }
    });
  }
  
  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.checkIfMobile();
    this.adjustLayout();
  }

  checkIfMobile() {
    this.isMobile = window.innerWidth <= 768;
    if (this.isMobile) {
      this.isSidebarOpen = false; // Fermer le sidebar par défaut sur mobile
    }
  }

  adjustLayout() {
    if (this.isMobile) {
      this.isSidebarOpen = false;
    }
    // Forcer la mise à jour du layout
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 100);
  }

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
    // Sauvegarder l'état dans le localStorage
    localStorage.setItem('sidebarState', this.isSidebarOpen ? 'open' : 'closed');
    this.adjustLayout();
  }

  toggleSearch(): void {
    this.isSearchActive = !this.isSearchActive;
    if (!this.isSearchActive) {
      this.searchQuery = '';
      this.onSearchInput();
    }
  }

  onSearchInput(): void {
    this.searchQueryChange.emit(this.searchQuery);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/admin/signin']);
  }
}