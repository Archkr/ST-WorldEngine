/**
 * Convert RGBA to HEX.
 * @param {string} rgba - RGBA color string.
 * @returns {string|null} HEX color string or null.
 */
export function rgbaToHex(rgba) {
    if (!rgba) {
        return null;
    }

    if (rgba.startsWith('var(--')) {
        return null;
    }

    if (rgba.startsWith('#')) {
        return rgba;
    }

    const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (!match) return null;

    const r = parseInt(match[1], 10);
    const g = parseInt(match[2], 10);
    const b = parseInt(match[3], 10);

    if ([r, g, b].some((value) => Number.isNaN(value) || value < 0 || value > 255)) {
        return null;
    }

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Extract alpha from an RGBA string.
 * @param {string} rgba - RGBA color string.
 * @returns {number} Opacity value between 0 and 1.
 */
export function getAlphaFromRgba(rgba) {
    if (!rgba || rgba.startsWith('var(--')) {
        return 1;
    }

    if (rgba.startsWith('#')) {
        return 1;
    }

    const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (!match) return 1;

    const alpha = match[4] ? parseFloat(match[4]) : 1;
    return Math.min(Math.max(alpha, 0), 1);
}

/**
 * Convert HEX to RGBA string.
 * @param {string} hex - HEX color string.
 * @param {number} alpha - Alpha value between 0 and 1.
 * @returns {string} RGBA formatted string.
 */
export function hexToRgba(hex, alpha = 1) {
    if (!hex) return 'rgba(0, 0, 0, 1)';

    try {
        let normalized = hex.replace('#', '');

        if (normalized.length === 3) {
            normalized = normalized.split('').map((char) => char + char).join('');
        }

        if (!/^[0-9A-Fa-f]{6}$/.test(normalized)) {
            return 'rgba(0, 0, 0, 1)';
        }

        const r = parseInt(normalized.substring(0, 2), 16);
        const g = parseInt(normalized.substring(2, 4), 16);
        const b = parseInt(normalized.substring(4, 6), 16);
        const constrainedAlpha = Math.min(Math.max(alpha, 0), 1);

        return `rgba(${r}, ${g}, ${b}, ${constrainedAlpha})`;
    } catch {
        return 'rgba(0, 0, 0, 1)';
    }
}

/**
 * Parse color input into hex/rgba components.
 * @param {string} color - Input color string.
 * @returns {Object|null} Parsed color data.
 */
export function parseColorValue(color) {
    if (!color) return null;

    const trimmed = color.trim();

    if (trimmed.startsWith('#')) {
        return {
            hex: trimmed,
            rgba: hexToRgba(trimmed, 1),
            alpha: 1,
        };
    }

    const rgbaMatch = trimmed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (rgbaMatch) {
        const r = parseInt(rgbaMatch[1], 10);
        const g = parseInt(rgbaMatch[2], 10);
        const b = parseInt(rgbaMatch[3], 10);
        const alpha = rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1;

        return {
            hex: `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`,
            rgba: `rgba(${r}, ${g}, ${b}, ${alpha})`,
            alpha,
        };
    }

    return null;
}

/**
 * Extract the RGB segment from an RGBA string.
 * @param {string} rgba - RGBA color string.
 * @returns {string} RGB segment string.
 */
export function getRgbPartFromRgba(rgba) {
    if (!rgba || rgba.startsWith('var(--')) {
        return '0, 0, 0';
    }

    const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (!match) return '0, 0, 0';

    return `${match[1]}, ${match[2]}, ${match[3]}`;
}
