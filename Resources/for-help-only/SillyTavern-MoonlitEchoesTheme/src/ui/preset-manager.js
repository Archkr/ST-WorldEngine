import { themeCustomSettings as defaultThemeCustomSettings } from '../config/theme-settings.js';

const defaultTranslate = (strings, ...values) => strings.reduce((result, part, index) => {
    const value = index < values.length ? values[index] : '';
    return result + part + value;
}, '');

const noop = () => {};

let managerConfig = {
    settingsKey: '',
    themeVersion: '',
    t: defaultTranslate,
    themeCustomSettings: defaultThemeCustomSettings,
    applyThemeSetting: noop,
    applyAllThemeSettings: noop,
    updateSettingsUI: noop,
    updateColorPickerUI: noop,
    updateSelectUI: noop,
    updateThemeSelector: noop,
};

export function configurePresetManager(options = {}) {
    managerConfig = {
        ...managerConfig,
        ...options,
        t: options.t || defaultTranslate,
        themeCustomSettings: options.themeCustomSettings || managerConfig.themeCustomSettings,
        applyThemeSetting: options.applyThemeSetting || managerConfig.applyThemeSetting,
        applyAllThemeSettings: options.applyAllThemeSettings || managerConfig.applyAllThemeSettings,
        updateSettingsUI: options.updateSettingsUI || managerConfig.updateSettingsUI,
        updateColorPickerUI: options.updateColorPickerUI || managerConfig.updateColorPickerUI,
        updateSelectUI: options.updateSelectUI || managerConfig.updateSelectUI,
        updateThemeSelector: options.updateThemeSelector || managerConfig.updateThemeSelector,
    };
}

function getContextAndSettings() {
    const context = SillyTavern.getContext();
    const settings = managerConfig.settingsKey ? context.extensionSettings[managerConfig.settingsKey] : undefined;
    return { context, settings };
}

export function createPresetManagerUI(container, settingsOverride) {
    if (!container) {
        return;
    }

    const { settings: contextSettings } = getContextAndSettings();
    const settings = settingsOverride || contextSettings || {};
    const t = managerConfig.t;

    const presetManagerContainer = document.createElement('div');
    presetManagerContainer.id = 'moonlit-preset-manager';
    presetManagerContainer.classList.add('moonlit-preset-manager');
    presetManagerContainer.style.marginBottom = '5px';

    const presetTitle = document.createElement('h4');
    presetTitle.textContent = t`Moonlit Echoes Theme Presets`;
    presetTitle.style.marginBottom = '10px';
    presetManagerContainer.appendChild(presetTitle);

    const presetSelector = document.createElement('select');
    presetSelector.id = 'moonlit-preset-selector';
    presetSelector.classList.add('moonlit-preset-selector');
    presetSelector.style.width = '100%';

    const presets = settings.presets || { Default: {} };
    for (const presetName in presets) {
        const option = document.createElement('option');
        option.value = presetName;
        option.textContent = presetName;
        option.selected = settings.activePreset === presetName;
        presetSelector.appendChild(option);
    }

    presetSelector.addEventListener('change', () => {
        loadPreset(presetSelector.value);
    });

    presetManagerContainer.appendChild(presetSelector);

    const buttonsRow = document.createElement('div');
    buttonsRow.style.display = 'flex';
    buttonsRow.style.alignItems = 'center';
    buttonsRow.style.gap = '8px';
    buttonsRow.style.justifyContent = 'flex-start';

    const importButton = document.createElement('button');
    importButton.id = 'moonlit-preset-import';
    importButton.classList.add('menu_button');
    importButton.title = t`Import Preset`;
    importButton.innerHTML = '<i class="fa-solid fa-file-import"></i>';
    importButton.addEventListener('click', importPreset);
    buttonsRow.appendChild(importButton);

    const exportButton = document.createElement('button');
    exportButton.id = 'moonlit-preset-export';
    exportButton.classList.add('menu_button');
    exportButton.title = t`Export Preset`;
    exportButton.innerHTML = '<i class="fa-solid fa-file-export"></i>';
    exportButton.addEventListener('click', exportActivePreset);
    buttonsRow.appendChild(exportButton);

    const saveButton = document.createElement('button');
    saveButton.id = 'moonlit-preset-save';
    saveButton.classList.add('menu_button');
    saveButton.title = t`Update Current Preset`;
    saveButton.innerHTML = '<i class="fa-solid fa-save"></i>';
    saveButton.addEventListener('click', updateCurrentPreset);
    buttonsRow.appendChild(saveButton);

    const newButton = document.createElement('button');
    newButton.id = 'moonlit-preset-new';
    newButton.classList.add('menu_button');
    newButton.title = t`Save as New Preset`;
    newButton.innerHTML = '<i class="fa-solid fa-file-circle-plus"></i>';
    newButton.addEventListener('click', saveAsNewPreset);
    buttonsRow.appendChild(newButton);

    const deleteButton = document.createElement('button');
    deleteButton.id = 'moonlit-preset-delete';
    deleteButton.classList.add('menu_button');
    deleteButton.title = t`Delete Preset`;
    deleteButton.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
    deleteButton.addEventListener('click', deleteCurrentPreset);
    buttonsRow.appendChild(deleteButton);

    presetManagerContainer.appendChild(buttonsRow);

    const fileInput = document.createElement('input');
    fileInput.id = 'moonlit-preset-file-input';
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.style.display = 'none';
    fileInput.addEventListener('change', handlePresetFileSelected);
    presetManagerContainer.appendChild(fileInput);

    container.appendChild(presetManagerContainer);
}

export function initPresetManager() {
    // Placeholder for future shared initialization logic
}

function handlePresetFileSelected(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const jsonData = JSON.parse(e.target.result);

            if (!jsonData.moonlitEchoesPreset || !jsonData.presetName || !jsonData.settings) {
                throw new Error(managerConfig.t`Invalid Moonlit Echoes theme preset file format`);
            }

            const { context, settings } = getContextAndSettings();
            if (!settings) {
                throw new Error('Settings unavailable');
            }

            const presetName = jsonData.presetName;
            settings.presets[presetName] = jsonData.settings;
            settings.activePreset = presetName;

            applyPresetToSettings(presetName);
            updatePresetSelector();

            context.saveSettingsDebounced();
            toastr.success(managerConfig.t`Preset "${presetName}" imported successfully`);
        } catch (error) {
            toastr.error(`Error importing preset: ${error.message}`);
        }

        event.target.value = '';
    };

    reader.readAsText(file);
}

export function importPreset() {
    const fileInput = document.getElementById('moonlit-preset-file-input');
    if (fileInput) {
        fileInput.click();
    } else {
        toastr.error(managerConfig.t`File input element not found`);
    }
}

export function exportActivePreset() {
    const { settings } = getContextAndSettings();
    if (!settings) return;

    const presetName = settings.activePreset;
    const preset = settings.presets?.[presetName];

    if (!preset) {
        toastr.error(managerConfig.t`Preset "${presetName}" not found`);
        return;
    }

    const exportData = {
        moonlitEchoesPreset: true,
        presetVersion: managerConfig.themeVersion,
        presetName,
        settings: preset,
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `[Moonlit] ${presetName.replace(/\s+/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toastr.success(managerConfig.t`Preset "${presetName}" exported successfully`);
}

export function updateCurrentPreset() {
    const { context, settings } = getContextAndSettings();
    if (!settings) return;

    const presetName = settings.activePreset;

    if (presetName === 'Default' && Object.keys(settings.presets).length > 1) {
        if (!confirm(managerConfig.t`Are you sure you want to update the Default preset? This will overwrite the original settings.`)) {
            return;
        }
    }

    const currentSettings = {};
    managerConfig.themeCustomSettings.forEach(({ varId }) => {
        currentSettings[varId] = settings[varId];
    });

    settings.presets[presetName] = currentSettings;
    context.saveSettingsDebounced();
    toastr.success(managerConfig.t`Moonlit Echoes theme preset "${presetName}" updated successfully`);
}

export function saveAsNewPreset() {
    import('../../../../../popup.js').then(({ POPUP_TYPE, callGenericPopup }) => {
        callGenericPopup(
            `<h3 data-i18n="Save New Moonlit Echoes Theme Preset">Save New Moonlit Echoes Theme Preset</h3>
            <p data-i18n="Please enter a name for your new Moonlit Echoes theme preset:">Please enter a name for your new Moonlit Echoes theme preset:</p>`,
            POPUP_TYPE.INPUT,
            '',
            'New preset name'
        ).then((presetName) => {
            if (!presetName) return;

            if (!presetName.trim()) {
                toastr.error('Preset name cannot be empty');
                return;
            }

            const { context, settings } = getContextAndSettings();
            if (!settings) return;

            if (settings.presets[presetName]) {
                import('../../../../../popup.js').then(({ POPUP_TYPE, callGenericPopup }) => {
                    callGenericPopup(
                        `<h3 data-i18n='Confirm Overwrite">Confirm Overwrite</h3>
                        <p data-i18n='A preset named "${presetName}" already exists. Do you want to overwrite it?'>A preset named "${presetName}" already exists. Do you want to overwrite it?</p>`,
                        POPUP_TYPE.CONFIRM
                    ).then((confirmed) => {
                        if (!confirmed) return;
                        createNewPreset(presetName, context, settings);
                    });
                });
            } else {
                createNewPreset(presetName, context, settings);
            }
        });
    });
}

function createNewPreset(presetName, context, settings) {
    const currentSettings = {};
    managerConfig.themeCustomSettings.forEach(({ varId }) => {
        currentSettings[varId] = settings[varId];
    });

    settings.presets[presetName] = currentSettings;
    settings.activePreset = presetName;

    updatePresetSelector();
    syncMoonlitPresetsWithThemeList();
    context.saveSettingsDebounced();
    toastr.success(managerConfig.t`Preset "${presetName}" saved successfully`);
}

export function deleteCurrentPreset() {
    const { context, settings } = getContextAndSettings();
    if (!settings) return;

    const presetName = settings.activePreset;

    if (Object.keys(settings.presets).length <= 1) {
        toastr.error(managerConfig.t`Cannot delete the only preset`);
        return;
    }

    if (presetName === 'Moonlit Echoes') {
        toastr.error(managerConfig.t`Cannot delete the Moonlit Echoes theme preset`);
        return;
    }

    import('../../../../../popup.js').then(({ POPUP_TYPE, callGenericPopup }) => {
        callGenericPopup(
            `<h3>${managerConfig.t`Delete Theme Preset`}</h3><p>${managerConfig.t`Are you sure you want to delete the preset "${presetName}"?`}</p>`,
            POPUP_TYPE.CONFIRM
        ).then((confirmed) => {
            if (!confirmed) return;

            const themeSelector = document.getElementById('themes');
            if (themeSelector) {
                const themeName = `${presetName} - by Rivelle`;
                for (let i = 0; i < themeSelector.options.length; i++) {
                    if (themeSelector.options[i].value === themeName) {
                        themeSelector.remove(i);
                        break;
                    }
                }
            }

            delete settings.presets[presetName];
            settings.activePreset = 'Default';

            applyPresetToSettings('Default');
            updatePresetSelector();
            syncMoonlitPresetsWithThemeList();
            context.saveSettingsDebounced();
            toastr.success(managerConfig.t`Preset "${presetName}" deleted successfully`);
        });
    });
}

export function loadPreset(presetName) {
    const { context, settings } = getContextAndSettings();
    if (!settings) return;

    if (!settings.presets[presetName]) {
        toastr.error(managerConfig.t`Preset "${presetName}" not found`);
        return;
    }

    settings.activePreset = presetName;
    applyPresetToSettings(presetName);
    updatePresetSelector();
    managerConfig.updateThemeSelector(presetName);
    context.saveSettingsDebounced();
    toastr.success(managerConfig.t`Preset "${presetName}" loaded successfully`);
}

export function applyActivePreset() {
    const { settings } = getContextAndSettings();
    if (!settings) return;

    if (!settings.activePreset || !settings.presets[settings.activePreset]) {
        const firstPreset = Object.keys(settings.presets || {})[0] || 'Default';
        settings.activePreset = firstPreset;
    }

    applyPresetToSettings(settings.activePreset);
}

export function applyPresetToSettings(presetName) {
    const { context, settings } = getContextAndSettings();
    if (!settings) return;

    const preset = settings.presets?.[presetName];
    if (!preset) return;

    managerConfig.themeCustomSettings.forEach(({ varId, default: defaultValue }) => {
        const value = preset[varId] !== undefined ? preset[varId] : defaultValue;
        settings[varId] = value;
        managerConfig.applyThemeSetting(varId, value);
    });

    managerConfig.applyAllThemeSettings();
    managerConfig.updateSettingsUI();

    setTimeout(() => {
        managerConfig.themeCustomSettings.forEach(({ varId, type }) => {
            const value = settings[varId];
            if (value === undefined) return;

            if (type === 'color') {
                managerConfig.updateColorPickerUI(varId, value);
            } else if (type === 'select') {
                managerConfig.updateSelectUI(varId, value);
            }
        });
    }, 100);
}

export function updatePresetSelector() {
    const presetSelector = document.getElementById('moonlit-preset-selector');
    if (!presetSelector) return;

    const { settings } = getContextAndSettings();
    if (!settings) return;

    presetSelector.innerHTML = '';

    for (const presetName in settings.presets) {
        const option = document.createElement('option');
        option.value = presetName;
        option.textContent = presetName;
        option.selected = settings.activePreset === presetName;
        presetSelector.appendChild(option);
    }
}

export function handleMoonlitPresetImport(jsonData) {
    if (!jsonData.moonlitEchoesPreset || !jsonData.presetName || !jsonData.settings) {
        toastr.error('Invalid Moonlit Echoes preset format');
        return;
    }

    const { context, settings } = getContextAndSettings();
    if (!settings) return;

    let presetName = jsonData.presetName;
    if (presetName.startsWith('[Moonlit] ')) {
        presetName = presetName.substring('[Moonlit] '.length);
    }
    if (!presetName.trim()) {
        presetName = 'Imported Preset';
    }

    settings.presets[presetName] = jsonData.settings;
    settings.activePreset = presetName;

    applyPresetToSettings(presetName);
    updatePresetSelector();
    managerConfig.updateThemeSelector(presetName);
    syncMoonlitPresetsWithThemeList();
    context.saveSettingsDebounced();
    toastr.success(managerConfig.t`Preset "${presetName}" imported successfully`);
}

export function syncMoonlitPresetsWithThemeList() {
    const { settings } = getContextAndSettings();
    if (!settings) return;

    const themeSelector = document.getElementById('themes');
    if (!themeSelector) return;

    const presets = settings.presets || {};
    const existingPresetOptions = new Set();

    Array.from(themeSelector.options).forEach(option => {
        if (Object.keys(presets).includes(option.value)) {
            existingPresetOptions.add(option.value);
        }
    });

    for (let i = themeSelector.options.length - 1; i >= 0; i--) {
        const option = themeSelector.options[i];
        if (existingPresetOptions.has(option.value) && !presets[option.value]) {
            themeSelector.remove(i);
        }
    }

    if (settings.enabled) {
        const activePreset = settings.activePreset;
        let optionExists = false;
        for (let i = 0; i < themeSelector.options.length; i++) {
            if (themeSelector.options[i].value === activePreset) {
                optionExists = true;
                break;
            }
        }

        if (optionExists && themeSelector.value !== activePreset) {
            themeSelector.value = activePreset;
        }
    }
}
