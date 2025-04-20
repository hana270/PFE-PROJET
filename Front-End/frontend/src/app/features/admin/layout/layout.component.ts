import { Component, Input, HostListener, Output, EventEmitter, PLATFORM_ID, Inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/authentication/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css'],
})
export class LayoutComponent {
  @Input() pageTitle: string = '';
  @Output() searchQueryChange = new EventEmitter();
  
  isSidebarOpen: boolean = true;
  isMobile: boolean = false;
  isSearchActive: boolean = false;
  searchQuery: string = '';
  unreadCount: number = 0;
  
  constructor(
    private authService: AuthService,
    private router: Router,
    private notificationService: NotificationService
  
  ,@Inject(PLATFORM_ID) private platformId: Object,
  ) {

 
      this.notificationService.unreadCount$.subscribe(count => {
        this.unreadCount = count;
      });
      if (isPlatformBrowser(this.platformId)) {
        this.checkIfMobile();
        this.adjustSidebarForScreenSize();
      }
  
  }
  
  @HostListener('window:resize', ['$event'])
  onResize() {
    this.checkIfMobile();
    this.adjustSidebarForScreenSize();
  }
  
  checkIfMobile() {
    
    const prevIsMobile = this.isMobile;
    this.isMobile = window.innerWidth <= 768;
    
    // If transitioning between mobile and desktop, adjust sidebar accordingly
    if (prevIsMobile !== this.isMobile) {
      this.adjustSidebarForScreenSize();
    }
  }
  
  adjustSidebarForScreenSize() {
    // On mobile devices, sidebar should be closed by default
    if (this.isMobile) {
      this.isSidebarOpen = false;
    } else {
      this.isSidebarOpen = true;
    }
  }
  
  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }
  
  closeSidebarOnMobile(event: MouseEvent): void {
    // Close the sidebar when clicking outside of it on mobile
    if (this.isMobile && this.isSidebarOpen) {
      const target = event.target as HTMLElement;
      if (!target.closest('.sidebar') && !target.closest('.toggle-btn')) {
        this.isSidebarOpen = false;
      }
    }
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