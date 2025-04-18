import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { WebGLRenderer, Scene, PerspectiveCamera, Mesh, BoxGeometry, MeshBasicMaterial, Group } from 'three';

@Injectable({
  providedIn: 'root'
})
export class ArExperienceService {

  private scene: Scene;
  private camera: PerspectiveCamera;
  private renderer: WebGLRenderer;
  private controller!: Group;
  private cube: Mesh;

  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.xr.enabled = true;

    // Initialisation du cube
    const geometry = new BoxGeometry();
    const material = new MeshBasicMaterial({ color: 0x00ff00 });
    this.cube = new Mesh(geometry, material);
    this.scene.add(this.cube);

    this.camera.position.z = 5;

    this.setupARControls();

    this.renderer.setAnimationLoop(() => this.render());
    document.body.appendChild(this.renderer.domElement);
  }

  private setupARControls(): void {
    this.controller = this.renderer.xr.getController(0);
    
    // Cast du contrôleur en EventTarget pour éviter l'erreur
    (this.controller as unknown as EventTarget).addEventListener('selectstart', () => {
      console.log('Cube rotated');
      this.cube.rotation.y += 0.1;
    });

    this.scene.add(this.controller);
  }

  private render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  public async start(): Promise<void> {
    if (navigator.xr) {
      const isSupported = await navigator.xr.isSessionSupported('immersive-ar');
      if (isSupported) {
        navigator.xr.requestSession('immersive-ar').then((session) => {
          this.renderer.xr.setSession(session);
          console.log('AR session started');
        }).catch((error: any) => {
          console.error('Failed to start AR session:', error);
        });
      } else {
        console.error('AR is not supported on this device');
      }
    } else {
      console.error('WebXR is not supported by this browser');
    }
  }

  public stop(): void {
    if (this.renderer.xr.getSession()) {
      this.renderer.xr.getSession()?.end();
      console.log('AR session stopped');
    }
  }
}