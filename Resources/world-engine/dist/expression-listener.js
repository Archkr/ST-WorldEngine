const EXPRESSION_IMAGE_SELECTOR = '#expression-image';
const FALLBACK_IMAGE = '../assets/expression-fallback.png';

function safeGetDocument(targetWindow) {
    if (!targetWindow || targetWindow === window) {
        return null;
    }

    try {
        return targetWindow.document || null;
    } catch (error) {
        console.debug('[World Engine] Unable to access parent document for expressions.', error);
        return null;
    }
}

function resolveDocumentList() {
    const documents = new Set();
    if (typeof document !== 'undefined') {
        documents.add(document);
    }

    const parentDoc = safeGetDocument(window.parent);
    if (parentDoc) {
        documents.add(parentDoc);
    }

    const topDoc = safeGetDocument(window.top);
    if (topDoc) {
        documents.add(topDoc);
    }

    return Array.from(documents).filter(Boolean);
}

function resolveUrl(path) {
    return new URL(path, import.meta.url).toString();
}

function loadTexture(loader, url) {
    return new Promise((resolve, reject) => {
        loader.load(url, resolve, undefined, reject);
    });
}

export class ExpressionTextureClient {
    constructor({ sprite, textureLoader = null, fallbackUrl = FALLBACK_IMAGE, expressionSelector = EXPRESSION_IMAGE_SELECTOR, onTextureApplied = null } = {}) {
        this.sprite = sprite;
        this.textureLoader = textureLoader ?? (window.THREE ? new window.THREE.TextureLoader() : null);
        this.fallbackUrl = fallbackUrl ? resolveUrl(fallbackUrl) : null;
        this.expressionSelector = expressionSelector || EXPRESSION_IMAGE_SELECTOR;
        this.onTextureApplied = typeof onTextureApplied === 'function' ? onTextureApplied : null;
        this.imageObserver = null;
        this.domObservers = [];
        this.currentTexture = null;
        this.currentTarget = null;
        this.lastUrl = null;
        this.expressionDocuments = resolveDocumentList();

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
        this.expressionDocuments = resolveDocumentList();
        this.disconnectDomObservers();

        this.domObservers = this.expressionDocuments
            .map((doc) => {
                if (!doc?.body) return null;
                const observer = new MutationObserver(() => this.attachToExpressionImage());
                observer.observe(doc.body, { childList: true, subtree: true });
                return observer;
            })
            .filter(Boolean);
    }

    disconnectDomObservers() {
        this.domObservers.forEach((observer) => observer.disconnect());
        this.domObservers = [];
    }

    findExpressionImageTarget() {
        for (const doc of this.expressionDocuments) {
            try {
                const target = doc?.querySelector?.(this.expressionSelector);
                if (target) {
                    return target;
                }
            } catch (error) {
                console.debug('[World Engine] Unable to query expression image in document.', error);
            }
        }

        return null;
    }

    getImageSource(target) {
        if (!target) return null;
        return target.currentSrc || target.src || target.getAttribute('src');
    }

    attachToExpressionImage() {
        const target = this.findExpressionImageTarget();
        if (target === this.currentTarget) return;

        if (!target) {
            this.imageObserver?.disconnect();
            this.currentTarget = null;
            this.handleExpressionChange(null);
            return;
        }

        this.imageObserver?.disconnect();
        this.currentTarget = target;
        this.imageObserver = new MutationObserver(mutations => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'src') {
                    this.handleExpressionChange(this.getImageSource(target));
                }
            }
        });
        this.imageObserver.observe(target, { attributes: true, attributeFilter: ['src'] });

        this.handleExpressionChange(this.getImageSource(target));
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
        if (window.THREE && 'SRGBColorSpace' in window.THREE && texture?.colorSpace !== window.THREE.SRGBColorSpace) {
            texture.colorSpace = window.THREE.SRGBColorSpace;
        }
        this.sprite.material.map = texture;
        this.sprite.material.needsUpdate = true;
        this.currentTexture = texture;
        if (this.onTextureApplied) {
            this.onTextureApplied(texture);
        }
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
        this.disconnectDomObservers();
        this.currentTarget = null;
    }
}
