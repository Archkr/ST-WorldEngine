import { defaultSettings, ensureSettingsStructure } from '../config/default-settings.js';
import { settingsKey, getSettings as getExtensionSettings, saveSettings as saveExtensionSettings } from '../services/settings-service.js';
import { registerDomReadyHandler } from './lifecycle-hooks.js';
import { initExtensionUI, toggleCss } from '../../index.js';

/**
 * Initialize the Moonlit Echoes extension context and schedule UI setup.
 * Handles settings bootstrapping, CSS toggling, and defers UI initialization
 * until the DOM is ready.
 */
export function initExtension() {
    const context = SillyTavern.getContext();

    let extensionSettings = getExtensionSettings(context);
    if (!extensionSettings) {
        context.extensionSettings[settingsKey] = structuredClone(defaultSettings);
        extensionSettings = getExtensionSettings(context);
    }

    ensureSettingsStructure(extensionSettings);

    for (const key of Object.keys(defaultSettings)) {
        if (key !== 'presets' && key !== 'activePreset' && extensionSettings[key] === undefined) {
            extensionSettings[key] = defaultSettings[key];
        }
    }

    saveExtensionSettings(context);

    toggleCss(extensionSettings.enabled);

    registerDomReadyHandler(initExtensionUI);
}
