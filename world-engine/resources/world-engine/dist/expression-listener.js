const EXPRESSION_IMAGE_SELECTOR = '#expression-image';
const FALLBACK_IMAGE = '../assets/expression-fallback.png';

function resolveUrl(path) {
    return new URL(path, import.meta.url).toString();
}

function loadTexture(loader, url) {
    return new Promise((resolve, reject) => {
        loader.load(url, resolve, undefined, reject);
    });
}

export class ExpressionTextureClient {
    constructor({ sprite, textureLoader = null, fallbackUrl = FALLBACK_IMAGE } = {}) {
        this.sprite = sprite;
        this.textureLoader = textureLoader ?? (window.THREE ? new window.THREE.TextureLoader() : null);
        this.fallbackUrl = fallbackUrl ? resolveUrl(fallbackUrl) : null;
        this.imageObserver = null;
        this.domObserver = null;
        this.currentTexture = null;
        this.currentTarget = null;
        this.lastUrl = null;

        if (!this.sprite || !this.sprite.material) {
            console.warn('[World Engine] ExpressionTextureClient requires a THREE.Sprite instance with a material.');
            return;
        }

        if (!this.textureLoader) {
            console.warn('[World Engine] THREE.TextureLoader not available. Expression listener disabled.');
            return;
        }

        this.observeForExpressionImage();
        this.attachToExpressionImage();
    }

    observeForExpressionImage() {
        this.domObserver?.disconnect();
        this.domObserver = new MutationObserver(() => this.attachToExpressionImage());
        this.domObserver.observe(document.body, { childList: true, subtree: true });
    }

    attachToExpressionImage() {
        const target = document.querySelector(EXPRESSION_IMAGE_SELECTOR);
        if (!target || target === this.currentTarget) return;

        this.imageObserver?.disconnect();
        this.currentTarget = target;
        this.imageObserver = new MutationObserver(mutations => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'src') {
                    this.handleExpressionChange(target.getAttribute('src'));
                }
            }
        });
        this.imageObserver.observe(target, { attributes: true, attributeFilter: ['src'] });

        this.handleExpressionChange(target.getAttribute('src'));
    }

    async handleExpressionChange(src) {
        const nextUrl = src || this.fallbackUrl;
        if (!nextUrl) {
            this.lastUrl = null;
            this.clearSpriteMap();
            return;
        }

        if (nextUrl === this.lastUrl) return;

        this.lastUrl = nextUrl;
        await this.swapTexture(nextUrl);
    }

    async swapTexture(url) {
        try {
            const texture = await loadTexture(this.textureLoader, url);
            this.applyTexture(texture);
        } catch (error) {
            console.warn('[World Engine] Failed to load expression texture', { url, error });
            if (url !== this.fallbackUrl && this.fallbackUrl) {
                await this.swapTexture(this.fallbackUrl);
                return;
            }

            const fallbackTexture = this.createFallbackTexture();
            if (fallbackTexture) {
                this.applyTexture(fallbackTexture);
            }
        }
    }

    applyTexture(texture) {
        this.disposeTexture();
        this.sprite.material.map = texture;
        this.sprite.material.needsUpdate = true;
        this.currentTexture = texture;
    }

    clearSpriteMap() {
        this.disposeTexture();
        if (this.sprite.material.map) {
            this.sprite.material.map = null;
            this.sprite.material.needsUpdate = true;
        }
    }

    createFallbackTexture() {
        if (!window.THREE || !window.THREE.CanvasTexture) return null;

        const canvas = document.createElement('canvas');
        canvas.width = 2;
        canvas.height = 2;

        const context = canvas.getContext('2d');
        context.fillStyle = '#4b5563';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = '#9ca3af';
        context.fillRect(0, 0, 1, 1);

        const texture = new window.THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    }

    disposeTexture() {
        if (this.currentTexture) {
            this.currentTexture.dispose();
            this.currentTexture = null;
        }
    }

    dispose() {
        this.disposeTexture();
        this.imageObserver?.disconnect();
        this.domObserver?.disconnect();
        this.currentTarget = null;
    }
}
