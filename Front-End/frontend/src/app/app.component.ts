import { ChangeDetectorRef, Component, Inject, PLATFORM_ID } from '@angular/core';
import { AuthService } from './core/authentication/auth.service';
import { Router } from '@angular/router';
import { LoadingService } from './core/services/loading.service';
import { Observable, tap } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'frontend';
  isLoading$: Observable<boolean>;

  constructor(
    private authService: AuthService,
    private router: Router,
    private loadingService: LoadingService,
    private cdRef: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isLoading$ = this.loadingService.isLoading$;
    // Remove the cdr.detectChanges() tap
  }
  ngAfterViewChecked() {
    this.cdRef.detectChanges();
  }
  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.authService.logout();
      this.router.navigate(['/admin/signin']);
    }
  }
}