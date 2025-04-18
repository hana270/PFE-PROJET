import { Injectable } from '@angular/core';
import { ArExperienceService } from './ar-experience.service';

@Injectable({
  providedIn: 'root'
})
export class ArService {

  private arExperience: ArExperienceService | null = null;

  constructor() {}

  // Méthode pour démarrer l'expérience AR
  public startAR(): void {
    this.arExperience = new ArExperienceService(); // Use ArExperienceService instead of ARExperience
    this.arExperience.start();
  }

  // Méthode pour arrêter l'expérience AR
  public stopAR(): void {
    if (this.arExperience) {
      this.arExperience.stop();
      this.arExperience = null;
    }
  }
}
