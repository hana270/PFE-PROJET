import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/authentication/auth.service';

@Component({
  selector: 'app-home-page',
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.css']
})
export class HomePageComponent implements OnInit, OnDestroy {
  currentSlide = 0;
  slideCount = 3; // Number of slides
  sliderInterval: any = null;
  
  constructor(
    public authService: AuthService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    // Only access browser APIs in browser environment
    if (isPlatformBrowser(this.platformId)) {
      // Remove preloader if exists
      window.addEventListener("load", () => {
        const preloader = document.getElementById("preloder");
        if (preloader) {
          preloader.style.display = "none";
        }
      });
      
      // Start the slider
      this.startSlider();
    }
  }
  
  ngOnDestroy() {
    // Clean up the interval when component is destroyed
    if (this.sliderInterval) {
      clearInterval(this.sliderInterval);
    }
  }
  
  // Start the automatic slider
  startSlider() {
    this.sliderInterval = setInterval(() => {
      this.nextSlide();
    }, 5000); // Change slide every 5 seconds
  }
  
  // Move to the next slide
  nextSlide() {
    this.currentSlide = (this.currentSlide + 1) % this.slideCount;
    this.updateSlider();
  }
  
  // Show a specific slide when dot is clicked
  showSlide(index: number) {
    // Reset the interval to prevent jumps
    if (this.sliderInterval) {
      clearInterval(this.sliderInterval);
    }
    
    this.currentSlide = index;
    this.updateSlider();
    
    // Restart the interval
    this.startSlider();
  }
  
  // Update the slider position
  private updateSlider() {
    if (isPlatformBrowser(this.platformId)) {
      const slider = document.getElementById('heroSlider');
      if (slider) {
        slider.style.transform = `translateX(-${this.currentSlide * 100}%)`;
      }
    }
  }
  
  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}