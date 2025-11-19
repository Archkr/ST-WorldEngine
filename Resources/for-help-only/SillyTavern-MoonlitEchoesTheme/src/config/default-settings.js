import { themeCustomSettings } from './theme-settings.js';

/**
 * Generate default settings snapshot used for initial bootstrapping.
 * This mirrors the original inline logic so existing behaviour stays the same.
 */
function generateDefaultSettings() {
    const settings = {
        enabled: true,
        presets: {
            "Moonlit Echoes - by Rivelle": {}
        },
        activePreset: "Moonlit Echoes - by Rivelle"
    };

    themeCustomSettings.forEach((setting) => {
        settings[setting.varId] = setting.default;
        settings.presets["Moonlit Echoes - by Rivelle"][setting.varId] = setting.default;
    });

    return Object.freeze(settings);
}

export const defaultSettings = generateDefaultSettings();

/**
 * Ensure the settings structure is up-to-date.
 * @param {Object} settings - Settings object
 */
export function ensureSettingsStructure(settings) {
    if (!settings.presets) {
        settings.presets = {};
    }

    if (Object.keys(settings.presets).length === 0) {
        settings.presets["Moonlit Echoes - by Rivelle"] = {};

        themeCustomSettings.forEach((setting) => {
            const { varId } = setting;
            if (settings[varId] !== undefined) {
                settings.presets["Moonlit Echoes - by Rivelle"][varId] = settings[varId];
            } else {
                settings.presets["Moonlit Echoes - by Rivelle"][varId] = setting.default;
            }
        });
    }

    if (!settings.activePreset || !settings.presets[settings.activePreset]) {
        const firstPreset = Object.keys(settings.presets)[0] || "Moonlit Echoes - by Rivelle";
        settings.activePreset = firstPreset;
    }

    if (settings.presets["Moonlit Echoes"]) {
        if (!settings.presets["Moonlit Echoes - by Rivelle"]) {
            settings.presets["Moonlit Echoes - by Rivelle"] = settings.presets["Moonlit Echoes"];
        }

        delete settings.presets["Moonlit Echoes"];

        if (settings.activePreset === "Moonlit Echoes") {
            settings.activePreset = "Moonlit Echoes - by Rivelle";
        }
    }
}
