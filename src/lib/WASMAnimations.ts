interface WASMModule {
    ccall: (ident: string, returnType: string, argTypes: string[], args: any[]) => any;
    ready: Promise<void>;
}

interface IconData {
    id: number;
    x: number;
    y: number;
    rotation: number;
    scale: number;
    opacity: number;
}

export class WASMAnimations {
    private module: WASMModule | null = null;
    private initialized = false;
    private fallback = false;
    private frame: number | null = null;
    private lastTime = 0;
    private icons: Array<{ element: HTMLElement; id: number }> = [];
    private jsIcons: Array<{
        element: HTMLElement;
        id: number;
        x: number;
        y: number;
        time: number;
    }> = [];

    async init(): Promise<void> {
        try {
            const script = document.createElement('script');
            script.src = '/wasm/floating-animations.js';
            document.head.appendChild(script);
            
            await new Promise((resolve, reject) => {
                script.onload = resolve;
                script.onerror = reject;
            });
            
            // @ts-ignore
            const WASMModule = window.FloatingAnimationsWASM;
            this.module = await WASMModule();
            await this.module.ready;
            
            const { width, height } = this.getViewport();
            this.module.ccall('init', 'void', ['number', 'number'], [width, height]);
            this.initialized = true;
        } catch {
            this.fallback = true;
            this.initialized = true;
        }
    }

    private getViewport() {
        return { width: window.innerWidth, height: window.innerHeight };
    }

    addIcon(element: HTMLElement, id: number): void {
        this.icons.push({ element, id });
        const rect = element.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;

        if (this.initialized && !this.fallback && this.module) {
            this.module.ccall('add', 'void', ['number', 'number', 'number'], [id, x, y]);
        } else if (this.fallback) {
            this.jsIcons.push({ element, id, x, y, time: 0 });
        }
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
            this.module.ccall('update', 'void', ['number'], [dt]);
            this.updateElements();
        } else {
            this.updateJS(dt);
        }

        this.frame = requestAnimationFrame(this.loop.bind(this));
    }

    private updateElements(): void {
        this.icons.forEach((iconData, i) => {
            const time = performance.now() / 1000;
            const x = Math.sin(time * 0.5 + i) * 100;
            const y = Math.cos(time * 0.3 + i) * 50;
            const rot = time * 30 + i * 45;
            const scale = 0.7 + Math.sin(time * 2 + i) * 0.3;
            const opacity = 0.3 + Math.sin(time * 1.5 + i) * 0.2;

            iconData.element.style.transform = `translate(${x}px, ${y}px) rotate(${rot}deg) scale(${scale})`;
            iconData.element.style.opacity = opacity.toString();
        });
    }

    private updateJS(dt: number): void {
        this.jsIcons.forEach((icon, i) => {
            icon.time += dt;
            const offset = i * 0.5;
            const x = Math.sin(icon.time * 0.5 + offset) * 100;
            const y = Math.cos(icon.time * 0.3 + offset) * 50;
            const rot = icon.time * 30 + i * 45;
            const scale = 0.7 + Math.sin(icon.time * 2 + offset) * 0.3;
            const opacity = 0.3 + Math.sin(icon.time * 1.5 + offset) * 0.2;

            icon.element.style.transform = `translate(${x}px, ${y}px) rotate(${rot}deg) scale(${scale})`;
            icon.element.style.opacity = opacity.toString();
        });
    }

    handleScroll(progress: number): void {
        if (!this.initialized) return;

        if (!this.fallback && this.module) {
            this.module.ccall('scroll', 'void', ['number'], [progress]);
        } else {
            this.jsIcons.forEach((icon, i) => {
                const speed = 0.2 + i * 0.1;
                const yOffset = progress * speed * 50;
                const rotOffset = progress * (i + 1) * 2;
                
                const current = icon.element.style.transform;
                icon.element.style.transform = `${current} translateY(${yOffset}px) rotate(${rotOffset}deg)`;
            });
        }
    }

    handleResize(): void {
        if (!this.initialized) return;

        const { width, height } = this.getViewport();

        if (!this.fallback && this.module) {
            this.module.ccall('resize', 'void', ['number', 'number'], [width, height]);
        } else {
            this.jsIcons.forEach(icon => {
                const rect = icon.element.getBoundingClientRect();
                icon.x = rect.left + rect.width / 2;
                icon.y = rect.top + rect.height / 2;
            });
        }
    }

    destroy(): void {
        if (this.frame) {
            cancelAnimationFrame(this.frame);
            this.frame = null;
        }

        if (!this.fallback && this.module) {
            this.module.ccall('clear', 'void', [], []);
        }

        this.icons = [];
        this.jsIcons = [];
        this.initialized = false;
    }

    getInfo(): { isUsingWASM: boolean; iconCount: number } {
        return {
            isUsingWASM: !this.fallback,
            iconCount: this.icons.length
        };
    }
}

export const createAnimations = async (): Promise<WASMAnimations> => {
    const animations = new WASMAnimations();
    await animations.init();
    return animations;
};