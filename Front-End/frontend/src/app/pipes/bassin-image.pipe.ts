import { Pipe, PipeTransform } from "@angular/core";
import { BassinService } from "../core/services/bassin.service";

@Pipe({ 
  name: 'bassinImage',
  standalone: true 
})
export class BassinImagePipe implements PipeTransform {
  constructor(private bassinService: BassinService) {}

  transform(imagePath: string | undefined | null): string {
    // Si pas de chemin d'image ou chemin vide
    if (!imagePath) {
      return 'assets/default-image.webp';
    }

    // Si c'est déjà une URL complète (http/https) ou un chemin d'assets
    if (imagePath.startsWith('http') || imagePath.startsWith('assets/')) {
      return imagePath;
    }

    try {
      // Nettoyer le chemin en prenant le dernier segment après \ ou /
      const segments = imagePath.split(/[\\/]/).filter(segment => segment.trim() !== '');
      const cleanPath = segments.length > 0 ? segments[segments.length - 1] : 'default-image.webp';
      
      return `${this.bassinService.apiURL}/imagesBassin/getFS/${cleanPath}`;
    } catch (error) {
      console.error('Error processing image path:', error);
      return 'assets/default-image.webp';
    }
  }
}