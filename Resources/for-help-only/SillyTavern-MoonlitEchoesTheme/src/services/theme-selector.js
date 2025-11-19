import { addThemeButtonsHint } from './hints.js';
import { getSettings as getExtensionSettings } from './settings-service.js';
import {
    importPreset,
    exportActivePreset,
    updateCurrentPreset,
    saveAsNewPreset,
    deleteCurrentPreset,
    loadPreset,
    handleMoonlitPresetImport,
} from '../ui/preset-manager.js';

const MOONLIT_LISTENER_KEY = '__moonlitEchoesListeners';

export function integrateWithThemeSelector() {
    const themeSelector = document.getElementById('themes');
    if (!themeSelector) {
        return;
    }

    const importButton = document.getElementById('ui_preset_import_button');
    const exportButton = document.getElementById('ui_preset_export_button');
    const deleteButton = document.getElementById('ui-preset-delete-button');
    const updateButton = document.getElementById('ui-preset-update-button');
    const saveButton = document.getElementById('ui-preset-save-button');
    const importFileInput = document.getElementById('ui_preset_import_file');

    attachMoonlitListener(themeSelector, 'change', handleMoonlitThemeChange);

    if (importButton && importFileInput) {
        attachMoonlitListener(importButton, 'click', handleMoonlitImportButtonClick);
    }

    attachMoonlitListener(exportButton, 'click', handleMoonlitExportButtonClick);
    attachMoonlitListener(updateButton, 'click', handleMoonlitUpdateButtonClick);
    attachMoonlitListener(saveButton, 'click', handleMoonlitSaveButtonClick);
    attachMoonlitListener(deleteButton, 'click', handleMoonlitDeleteButtonClick);
    attachMoonlitListener(importFileInput, 'change', handleMoonlitPresetFileImport);

    addThemeButtonsHint();
}

function attachMoonlitListener(element, eventType, handler) {
    if (!element || typeof element.addEventListener !== 'function') return;

    if (!element[MOONLIT_LISTENER_KEY]) {
        element[MOONLIT_LISTENER_KEY] = {};
    }

    const attachedHandlers = element[MOONLIT_LISTENER_KEY];
    if (attachedHandlers[eventType] === handler) {
        return;
    }

    if (attachedHandlers[eventType]) {
        element.removeEventListener(eventType, attachedHandlers[eventType]);
    }

    element.addEventListener(eventType, handler);
    attachedHandlers[eventType] = handler;
}

function getMoonlitSettings() {
    const context = SillyTavern.getContext();
    return getExtensionSettings(context) || {};
}

function isMoonlitPreset(presetName) {
    if (!presetName) return false;
    const settings = getMoonlitSettings();
    const presets = settings.presets || {};
    return Object.prototype.hasOwnProperty.call(presets, presetName);
}

function isMoonlitPresetSelected() {
    const themeSelector = document.getElementById('themes');
    if (!themeSelector) return false;
    return isMoonlitPreset(themeSelector.value);
}

function handleMoonlitThemeChange(event) {
    const themeSelector = event?.currentTarget ?? document.getElementById('themes');
    if (!themeSelector) return;

    const selectedTheme = themeSelector.value;
    if (!isMoonlitPreset(selectedTheme)) {
        return;
    }

    const settings = getMoonlitSettings();
    if (settings.activePreset === selectedTheme) {
        return;
    }

    try {
        loadPreset(selectedTheme);
    } catch (error) {
        // Error handled silently
    }
}

function handleMoonlitImportButtonClick() {
    if (isMoonlitPresetSelected()) {
        importPreset();
    }
}

function handleMoonlitExportButtonClick() {
    if (isMoonlitPresetSelected()) {
        exportActivePreset();
    }
}

function handleMoonlitUpdateButtonClick() {
    if (isMoonlitPresetSelected()) {
        updateCurrentPreset();
    }
}

function handleMoonlitSaveButtonClick() {
    if (isMoonlitPresetSelected()) {
        saveAsNewPreset();
    }
}

function handleMoonlitDeleteButtonClick() {
    if (isMoonlitPresetSelected()) {
        deleteCurrentPreset();
    }
}

function handleMoonlitPresetFileImport(event) {
    const file = event?.target?.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const jsonData = JSON.parse(e.target.result);
            if (jsonData.moonlitEchoesPreset) {
                handleMoonlitPresetImport(jsonData);
            }
        } catch (error) {
            // Error handled silently
        }
    };
    reader.readAsText(file);
}
