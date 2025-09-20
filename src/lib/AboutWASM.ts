import * as THREE from 'three';

interface WASMModule {
    ccall: (ident: string, returnType: string, argTypes: string[], args: any[]) => any;
    ready: Promise<void>;
}

export class AboutWASM {
    private module: WASMModule | null = null;
    private initialized = false;
    private fallback = false;
    private frame: number | null = null;
    private lastTime = 0;
    private flowers: THREE.Mesh[] = [];
    private scene: THREE.Scene | null = null;
    private container: HTMLElement | null = null;

    async init(scene: THREE.Scene, container: HTMLElement): Promise<void> {
        this.scene = scene;
        this.container = container;
        
        try {
            const script = document.createElement('script');
            script.src = '/wasm/about-animations.js';
            document.head.appendChild(script);
            
            await new Promise((resolve, reject) => {
                script.onload = resolve;
                script.onerror = reject;
            });
            
            // @ts-ignore
            const WASMModule = window.AboutAnimationsWASM;
            this.module = await WASMModule();
            await this.module.ready;
            
            const { width, height } = this.getDimensions();
            this.module.ccall('aboutInit', 'void', ['number', 'number'], [width, height]);
            await this.createFlowers();
            this.initialized = true;
            console.log('WASM About initialized with', this.flowers.length, 'SVG flowers');
        } catch (error) {
            console.log('WASM failed, using fallback:', error);
            this.fallback = true;
            await this.createFallbackFlowers();
            this.initialized = true;
            console.log('Fallback About initialized with', this.flowers.length, 'SVG flowers');
        }
    }

    private getDimensions() {
        if (!this.container) return { width: window.innerWidth, height: window.innerHeight };
        const rect = this.container.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
    }

    private async loadSVGTexture(svgPath: string): Promise<THREE.Texture> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d')!;
                canvas.width = 128;
                canvas.height = 128;
                ctx.drawImage(img, 0, 0, 128, 128);
                
                const texture = new THREE.CanvasTexture(canvas);
                texture.needsUpdate = true;
                resolve(texture);
            };
            
            img.onerror = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d')!;
                canvas.width = 128;
                canvas.height = 128;
                ctx.fillStyle = '#FF6B9D';
                ctx.fillRect(0, 0, 128, 128);
                
                const texture = new THREE.CanvasTexture(canvas);
                resolve(texture);
            };
            
            img.src = svgPath;
        });
    }

    private createFlowerGeometry(): THREE.BufferGeometry {
        const geometry = new THREE.PlaneGeometry(0.4, 0.4);
        return geometry;
    }

    private async createFlowers(): Promise<void> {
        if (!this.scene) return;
        
        const flowerGeometry = this.createFlowerGeometry();
        
        console.log('Loading 12 About SVG flowers...');
        
        for (let i = 0; i < 12; i++) {
            const svgIndex = (i % 6) + 1;
            const svgPath = `/flowers/flower${svgIndex}.svg`;
            
            try {
                const texture = await this.loadSVGTexture(svgPath);
                const material = new THREE.MeshBasicMaterial({
                    map: texture,
                    transparent: true,
                    opacity: 0.7,
                    alphaTest: 0.1
                });
                
                const flower = new THREE.Mesh(flowerGeometry, material);
                
                const { width, height } = this.getDimensions();
                flower.position.x = (Math.random() - 0.5) * width / 300;
                flower.position.y = (Math.random() - 0.5) * height / 300;
                flower.position.z = Math.random() * 0.5;
                flower.scale.setScalar(0.15 + Math.random() * 0.1);
                flower.userData = { id: i, time: Math.random() * Math.PI * 2 };
                this.flowers.push(flower);
                this.scene.add(flower);
                console.log(`Added About SVG flower ${i + 1} from ${svgPath} at position:`, flower.position);
            } catch (error) {
                console.error(`Failed to load About flower ${i + 1}:`, error);
            }
        }
        
        console.log('Total About SVG flowers in scene:', this.flowers.length);
    }

    private async createFallbackFlowers(): Promise<void> {
        if (!this.scene) return;
        
        const flowerGeometry = this.createFlowerGeometry();
        
        console.log('Loading 12 fallback About SVG flowers...');
        
        for (let i = 0; i < 12; i++) {
            const svgIndex = (i % 6) + 1;
            const svgPath = `/flowers/flower${svgIndex}.svg`;
            
            try {
                const texture = await this.loadSVGTexture(svgPath);
                const material = new THREE.MeshBasicMaterial({
                    map: texture,
                    transparent: true,
                    opacity: 0.7,
                    alphaTest: 0.1
                });
                
                const flower = new THREE.Mesh(flowerGeometry, material);
                
                const { width, height } = this.getDimensions();
                flower.position.x = (Math.random() - 0.5) * width / 300;
                flower.position.y = (Math.random() - 0.5) * height / 300;
                flower.position.z = Math.random() * 0.5;
                flower.scale.setScalar(0.15 + Math.random() * 0.1);
                flower.userData = { 
                    id: i, 
                    time: Math.random() * Math.PI * 2,
                    vx: (Math.random() - 0.5) * 0.002, 
                    vy: (Math.random() - 0.5) * 0.001 
                };
                this.flowers.push(flower);
                this.scene.add(flower);
                console.log(`Added fallback About SVG flower ${i + 1} from ${svgPath} at position:`, flower.position);
            } catch (error) {
                console.error(`Failed to load fallback About flower ${i + 1}:`, error);
            }
        }
        
        console.log('Total fallback About SVG flowers in scene:', this.flowers.length);
    }

    start(): void {
        if (!this.initialized) return;
        this.lastTime = performance.now();
        this.frame = requestAnimationFrame(this.loop.bind(this));
    }

    private loop(currentTime: number): void {
        const dt = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        if (!this.fallback && this.module) {
            this.module.ccall('aboutUpdate', 'void', ['number'], [dt]);
            this.updateFromWASM();
        } else {
            this.updateFallback(dt);
        }

        this.frame = requestAnimationFrame(this.loop.bind(this));
    }

    private updateFromWASM(): void {
        this.flowers.forEach((flower, i) => {
            const time = performance.now() / 1000;
            const { width, height } = this.getDimensions();
            
            const x = Math.sin(time * 0.05 + i) * width / 400;
            const y = Math.cos(time * 0.2 + i) * height / 500;
            const z = Math.sin(time * 0.1 + i) * 0.1;
            const rotation = time * 0.5 + i * 2;
            const scale = 0.15 + Math.sin(time * 0.3 + i) * 0.05;

            flower.position.set(x, y, z);
            flower.rotation.z = rotation * Math.PI / 180;
            flower.scale.setScalar(scale);
        });
    }

    private updateFallback(dt: number): void {
        this.flowers.forEach((flower, i) => {
            flower.userData.time += dt;
            
            const { width, height } = this.getDimensions();
            
            flower.position.x += flower.userData.vx + Math.cos(flower.userData.time * 0.05 + i) * 0.0002;
            flower.position.y += flower.userData.vy + Math.sin(flower.userData.time * 0.2 + i) * 0.0003;
            flower.rotation.z += 0.01 * dt;
            
            const boundary = width / 300;
            if (flower.position.x > boundary) flower.position.x = -boundary;
            if (flower.position.x < -boundary) flower.position.x = boundary;
            
            const yBoundary = height / 250;
            if (flower.position.y > yBoundary) flower.position.y = -yBoundary;
            if (flower.position.y < -yBoundary) flower.position.y = yBoundary;
        });
    }

    handleResize(): void {
        if (!this.initialized) return;

        const { width, height } = this.getDimensions();

        if (!this.fallback && this.module) {
            this.module.ccall('aboutResize', 'void', ['number', 'number'], [width, height]);
        }
    }

    destroy(): void {
        if (this.frame) {
            cancelAnimationFrame(this.frame);
            this.frame = null;
        }

        if (!this.fallback && this.module) {
            this.module.ccall('aboutClear', 'void', [], []);
        }

        this.flowers.forEach(flower => {
            if (this.scene) this.scene.remove(flower);
        });
        
        this.flowers = [];
        this.initialized = false;
    }

    getInfo(): { isUsingWASM: boolean; flowerCount: number } {
        return {
            isUsingWASM: !this.fallback,
            flowerCount: this.flowers.length
        };
    }
}

export const createAboutAnimations = async (scene: THREE.Scene, container: HTMLElement): Promise<AboutWASM> => {
    const animations = new AboutWASM();
    await animations.init(scene, container);
    return animations;
};