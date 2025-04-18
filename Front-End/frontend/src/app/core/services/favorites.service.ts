import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';
import { Bassin } from '../models/bassin.models';

@Injectable({
  providedIn: 'root',
})
export class FavoritesService {
  private favoritesKey = 'aquatresor_favorites';
  private favoritesSubject = new BehaviorSubject<Bassin[]>([]);
  favorites$ = this.favoritesSubject.asObservable();

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.loadFavorites();
  }

  private loadFavorites(): void {
    if (isPlatformBrowser(this.platformId)) {
      try {
        const savedFavorites = localStorage.getItem(this.favoritesKey);
        if (savedFavorites) {
          this.favoritesSubject.next(JSON.parse(savedFavorites));
        }
      } catch (error) {
        console.error('Erreur lors du chargement des favoris:', error);
        this.favoritesSubject.next([]);
      }
    }
  }

  private saveFavorites(favorites: Bassin[]): void {
    if (isPlatformBrowser(this.platformId)) {
      try {
        localStorage.setItem(this.favoritesKey, JSON.stringify(favorites));
        this.favoritesSubject.next(favorites);
      } catch (error) {
        console.error('Erreur lors de la sauvegarde des favoris:', error);
      }
    }
  }

  addToFavorites(bassin: Bassin): void {
    const currentFavorites = this.favoritesSubject.value;
    if (!this.isInFavorites(bassin.idBassin)) {
      bassin.isFavorite = true;
      this.saveFavorites([...currentFavorites, bassin]);
    }
  }

  removeFromFavorites(bassinId: number): void {
    const currentFavorites = this.favoritesSubject.value;
    const updatedFavorites = currentFavorites.filter(
      (item) => item.idBassin !== bassinId
    );
    this.saveFavorites(updatedFavorites);
  }

  isInFavorites(bassinId: number): boolean {
    return this.favoritesSubject.value.some((item) => item.idBassin === bassinId);
  }

  getFavorites(): Bassin[] {
    return this.favoritesSubject.value;
  }

  clearFavorites(): void {
    this.saveFavorites([]);
  }
}