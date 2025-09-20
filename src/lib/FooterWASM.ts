import * as THREE from 'three';

interface WASMModule {
    ccall: (ident: string, returnType: string, argTypes: string[], args: any[]) => any;
    ready: Promise<void>;
}

export class FooterWASM {
    private module: WASMModule | null = null;
    private initialized = false;
    private fallback = false;
    private frame: number | null = null;
    private lastTime = 0;
    private flowers: THREE.Mesh[] = [];
    private scene: THREE.Scene | null = null;
    private flowerSVGs: string[] = [];

    async init(scene: THREE.Scene, flowerSVGs: string[]): Promise<void> {
        this.scene = scene;
        this.flowerSVGs = flowerSVGs;
        
        try {
            const script = document.createElement('script');
            script.src = '/wasm/footer-animations.js';
            document.head.appendChild(script);
            
            await new Promise((resolve, reject) => {
                script.onload = resolve;
                script.onerror = reject;
            });
            
            // @ts-ignore
            const WASMModule = window.FooterAnimationsWASM;
            this.module = await WASMModule();
            await this.module.ready;
            
            const { width, height } = this.getDimensions();
            this.module.ccall('footerInit', 'void', ['number', 'number'], [width, height]);
            await this.createFlowers();
            this.initialized = true;
        } catch (error) {
            console.log('WASM failed, using fallback:', error);
            this.fallback = true;
            await this.createFallbackFlowers();
            this.initialized = true;
            console.log('Fallback Footer initialized with', this.flowers.length, 'SVG flowers');
        }
    }

    private getDimensions() {
        const width = window.innerWidth;
        const height = width < 480 ? 80 : width < 768 ? 100 : 120;
        return { width, height };
    }

    private async createFlowers(): Promise<void> {
        if (!this.scene) return;
        
        const flowerGeometry = this.createFlowerGeometry();
        for (let i = 0; i < 6; i++) {
            const svgPath = `/flowers/flower${i + 1}.svg`;
            try {
                const texture = await this.loadSVGTexture(svgPath);
                const material = new THREE.MeshBasicMaterial({
                    map: texture,
                    transparent: true,
                    opacity: 0.9,
                    alphaTest: 0.1
                });
                
                const flower = new THREE.Mesh(flowerGeometry, material);
                flower.position.x = (Math.random() - 0.5) * 12;
                flower.position.y = (Math.random() - 0.5) * 1;
                flower.position.z = (Math.random() - 0.5) * 0.2;
                flower.scale.setScalar(1.5 + Math.random() * 1.0);
                flower.userData = { id: i, time: Math.random() * Math.PI * 2 };
                this.flowers.push(flower);
                this.scene.add(flower);
            } catch (error) {
                console.error(`Failed to load flower ${i + 1}:`, error);
            }
        }
    }

    private async createFallbackFlowers(): Promise<void> {
        if (!this.scene) return;
        const flowerGeometry = this.createFlowerGeometry();
        for (let i = 0; i < 6; i++) {
            const svgPath = `/flowers/flower${i + 1}.svg`;
            
            try {
                const texture = await this.loadSVGTexture(svgPath);
                const material = new THREE.MeshBasicMaterial({
                    map: texture,
                    transparent: true,
                    opacity: 0.9,
                    alphaTest: 0.1
                });
                
                const flower = new THREE.Mesh(flowerGeometry, material);
                flower.position.x = (Math.random() - 0.5) * 12;
                flower.position.y = (Math.random() - 0.5) * 1;
                flower.position.z = (Math.random() - 0.5) * 0.2;
                flower.scale.setScalar(1.5 + Math.random() * 1.0);
                flower.userData = { 
                    id: i, 
                    time: Math.random() * Math.PI * 2,
                    vx: (Math.random() - 0.5) * 0.012, 
                    vy: (Math.random() - 0.5) * 0.006 
                };
                this.flowers.push(flower);
                this.scene.add(flower);
            } catch (error) {
                console.error(`Failed to load fallback flower ${i + 1}:`, error);
            }
        }
        
    }

    private async loadSVGTexture(svgPath: string): Promise<THREE.Texture> {
        return new Promise((resolve, reject) => {
            const loader = new THREE.TextureLoader();
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
                // Fallback to colored plane if SVG fails to load
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
        const geometry = new THREE.PlaneGeometry(1.2, 1.2);
        return geometry;
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
            this.module.ccall('footerUpdate', 'void', ['number'], [dt]);
            this.updateFromWASM();
        } else {
            this.updateFallback(dt);
        }

        this.frame = requestAnimationFrame(this.loop.bind(this));
    }

    private updateFromWASM(): void {
        this.flowers.forEach((flower, i) => {
            const time = performance.now() / 1000;
            const x = Math.sin(time * 0.5 + i) * 6;
            const y = Math.cos(time * 2 + i) * 1;
            const z = Math.sin(time + i) * 0.5;
            const rotation = time * 20 + i * 10;
            const scale = 0.4 + Math.sin(time * 3 + i) * 0.2;

            flower.position.set(x, y, z);
            flower.rotation.z = rotation * Math.PI / 180;
            flower.scale.setScalar(scale);
        });
    }

    private updateFallback(dt: number): void {
        this.flowers.forEach((flower, i) => {
            flower.userData.time += dt;
            
            flower.position.x += flower.userData.vx + Math.cos(flower.userData.time * 0.5 + i) * 0.003;
            flower.position.y += flower.userData.vy + Math.sin(flower.userData.time * 2 + i) * 0.005;
            flower.rotation.z += 0.3 * dt;
            
            if (flower.position.x > 7) flower.position.x = -7;
            if (flower.position.x < -7) flower.position.x = 7;
            
            const yLimit = 1.5;
            if (flower.position.y > yLimit) flower.position.y = -yLimit;
            if (flower.position.y < -yLimit) flower.position.y = yLimit;
        });
    }

    handleResize(): void {
        if (!this.initialized) return;

        const { width, height } = this.getDimensions();

        if (!this.fallback && this.module) {
            this.module.ccall('footerResize', 'void', ['number', 'number'], [width, height]);
        }
    }

    destroy(): void {
        if (this.frame) {
            cancelAnimationFrame(this.frame);
            this.frame = null;
        }

        if (!this.fallback && this.module) {
            this.module.ccall('footerClear', 'void', [], []);
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

export const createFooterAnimations = async (scene: THREE.Scene, flowerSVGs: string[] = []): Promise<FooterWASM> => {
    const animations = new FooterWASM();
    await animations.init(scene, flowerSVGs);
    return animations;
};