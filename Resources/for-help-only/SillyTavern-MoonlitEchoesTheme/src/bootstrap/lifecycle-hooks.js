import { addModernCompactStyles, applyAllThemeSettings, addCustomSetting, applyThemeSetting, THEME_VERSION } from '../../index.js';
import { themeCustomSettings } from '../config/theme-settings.js';
import { getSettings as getExtensionSettings, saveSettings as saveExtensionSettings } from '../services/settings-service.js';
import { loadPreset, applyPresetToSettings, syncMoonlitPresetsWithThemeList } from '../ui/preset-manager.js';
import { initFormSheldHeightMonitor } from '../core/observers.js';

const domReadyHandlers = new Set();

/**
 * Register a handler to run once the DOM is ready.
 * If the DOM is already ready, the handler executes immediately.
 *
 * @param {Function} handler - Function to invoke when DOM is ready.
 */
export function registerDomReadyHandler(handler) {
    if (typeof handler !== 'function') {
        return;
    }

    if (document.readyState === 'loading') {
        domReadyHandlers.add(handler);
    } else {
        handler();
    }
}

function runDomReadyHandlers() {
    domReadyHandlers.forEach((handler) => {
        try {
            handler();
        } catch (error) {
            console.error('Moonlit Echoes DOM ready handler failed', error);
        }
    });
    domReadyHandlers.clear();

    try {
        addModernCompactStyles();
    } catch (error) {
        console.error('Moonlit Echoes failed to add compact styles', error);
    }

    try {
        syncMoonlitPresetsWithThemeList();
    } catch (error) {
        console.error('Moonlit Echoes failed to sync presets after DOM ready', error);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runDomReadyHandlers, { once: true });
} else {
    runDomReadyHandlers();
}

function initializeThemeColorOnDemand() {
    applyAllThemeSettings();
    syncMoonlitPresetsWithThemeList();
}

window.initializeThemeColorOnDemand = initializeThemeColorOnDemand;

window.MoonlitEchoesTheme = {
    init: function() {
        applyAllThemeSettings();
        initializeThemeColorOnDemand();
        syncMoonlitPresetsWithThemeList();
    },

    addSetting: addCustomSetting,

    applySetting: applyThemeSetting,

    getSettings: function() {
        return getExtensionSettings();
    },

    getSettingsConfig: function() {
        return [...themeCustomSettings];
    },

    presets: {
        getAll: function() {
            const context = SillyTavern.getContext();
            const settings = getExtensionSettings(context);
            return settings?.presets || {};
        },

        getActive: function() {
            const context = SillyTavern.getContext();
            const settings = getExtensionSettings(context);
            return {
                name: settings.activePreset,
                settings: settings.presets[settings.activePreset] || {}
            };
        },

        create: function(name, settingsObj) {
            const context = SillyTavern.getContext();
            const settings = getExtensionSettings(context);

            if (!name || typeof name !== 'string') {
                return false;
            }

            settings.presets[name] = settingsObj || {};
            saveExtensionSettings(context);
            syncMoonlitPresetsWithThemeList();

            return true;
        },

        load: function(name) {
            return loadPreset(name);
        },

        update: function(name, settingsObj) {
            const context = SillyTavern.getContext();
            const settings = getExtensionSettings(context);

            if (!settings.presets[name]) {
                return false;
            }

            settings.presets[name] = settingsObj || settings.presets[name];
            saveExtensionSettings(context);

            return true;
        },

        delete: function(name) {
            const context = SillyTavern.getContext();
            const settings = getExtensionSettings(context);

            if (name === 'Default') {
                return false;
            }

            if (!settings.presets[name]) {
                return false;
            }

            if (Object.keys(settings.presets).length <= 1) {
                return false;
            }

            if (settings.activePreset === name) {
                settings.activePreset = 'Default';
                applyPresetToSettings('Default');
            }

            delete settings.presets[name];
            saveExtensionSettings(context);
            syncMoonlitPresetsWithThemeList();

            return true;
        },

        export: function(name) {
            const context = SillyTavern.getContext();
            const settings = getExtensionSettings(context);

            if (!settings.presets[name]) {
                return null;
            }

            return {
                moonlitEchoesPreset: true,
                presetVersion: THEME_VERSION,
                presetName: name,
                settings: settings.presets[name]
            };
        },

        import: function(jsonData) {
            if (!jsonData || !jsonData.moonlitEchoesPreset || !jsonData.presetName || !jsonData.settings) {
                return false;
            }

            const context = SillyTavern.getContext();
            const settings = getExtensionSettings(context);
            const presetName = jsonData.presetName;

            settings.presets[presetName] = jsonData.settings;
            saveExtensionSettings(context);
            syncMoonlitPresetsWithThemeList();

            return true;
        }
    }
};

window.formSheldHeightController = initFormSheldHeightMonitor();
