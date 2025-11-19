import { extension_settings, renderExtensionTemplateAsync } from '/scripts/extensions.js';
import { callGenericPopup, POPUP_TYPE } from '/scripts/popup.js';
import { buildViewUrl, DEFAULT_SETTINGS, ensureSettings, EXTENSION_NAME, persistSettings, sendSettingsToFrame } from './settings-utils.js';

const EXTENSION_BASE_URL = new URL('.', import.meta.url);
const SETTINGS_HTML_URL = new URL('./settings.html', EXTENSION_BASE_URL).toString();
const SETTINGS_ROOT_ID = 'world-engine-settings';

function getMenuContainer() {
    const selectors = ['#extensionsMenu', '#extensions-menu', '#extensionsList', '#extensionsMenuContainer', '#extensions_menu'];
    for (const selector of selectors) {
        const element = $(selector);
        if (element && element.length) {
            return element;
        }
    }
    return null;
}

async function renderWorldEngineTemplate(name, context = {}) {
    const templatePath = new URL(`./templates/${name}.html`, EXTENSION_BASE_URL).toString();

    try {
        const response = await fetch(templatePath, { cache: 'no-cache' });

        if (!response.ok) {
            throw new Error(`Failed to load template: ${templatePath}`);
        }

        const templateSource = await response.text();

        if (window.Handlebars?.compile) {
            return window.Handlebars.compile(templateSource)(context);
        }

        return templateSource;
    } catch (error) {
        console.warn('[World Engine] Falling back to default template renderer.', error);

        if (typeof renderExtensionTemplateAsync === 'function') {
            return renderExtensionTemplateAsync(EXTENSION_NAME, name, context);
        }

        throw error;
    }
}

async function openWorldEnginePopup() {
    const settings = getSettings();
    const viewUrl = buildViewUrl(settings);
    const template = await renderWorldEngineTemplate('window', { src: viewUrl });
    const dialog = $(template);

    dialog.on('load', '#world_engine_iframe', (event) => {
        sendSettingsToFrame(event.target.contentWindow, settings);
    });

    dialog.on('input', '#world_engine_speed', (event) => {
        const value = Number(event.target.value) || DEFAULT_SETTINGS.movementSpeed;
        settings.movementSpeed = Math.max(0.1, value);
        dialog.find('#world_engine_speed_value').text(`${settings.movementSpeed.toFixed(1)}x`);
        persistSettings();
        sendSettingsToFrame(dialog.find('#world_engine_iframe')[0]?.contentWindow, settings);
    });

    dialog.on('change', '#world_engine_invert_look', (event) => {
        settings.invertLook = Boolean(event.target.checked);
        persistSettings();
        sendSettingsToFrame(dialog.find('#world_engine_iframe')[0]?.contentWindow, settings);
    });

    dialog.on('change', '#world_engine_show_instructions', (event) => {
        settings.showInstructions = Boolean(event.target.checked);
        persistSettings();
        sendSettingsToFrame(dialog.find('#world_engine_iframe')[0]?.contentWindow, settings);
    });

    dialog.on('click', '#world_engine_open_in_tab', () => {
        const url = buildViewUrl(settings);
        window.open(url, '_blank', 'noopener');
    });

    dialog.find('#world_engine_speed').val(settings.movementSpeed);
    dialog.find('#world_engine_speed_value').text(`${settings.movementSpeed.toFixed(1)}x`);
    dialog.find('#world_engine_invert_look').prop('checked', settings.invertLook);
    dialog.find('#world_engine_show_instructions').prop('checked', settings.showInstructions);

    callGenericPopup(dialog, POPUP_TYPE.TEXT, 'World Engine', { wide: true, large: true, allowVerticalScrolling: false });
}

function getSettings() {
    return ensureSettings(extension_settings);
}

async function ensureSettingsPanel() {
    const existingRoot = document.getElementById(SETTINGS_ROOT_ID);
    if (existingRoot) {
        setupSettingsPanel(existingRoot);
        return;
    }

    try {
        const response = await fetch(SETTINGS_HTML_URL, { cache: 'no-cache' });
        if (!response.ok) {
            throw new Error(`Failed to load settings HTML (${response.status})`);
        }

        const settingsHtml = await response.text();
        const settingsContainer = $('#extensions_settings');

        if (!settingsContainer?.length) {
            console.warn('[World Engine] Could not find the extensions settings container.');
            return;
        }

        settingsContainer.append(settingsHtml);
        const root = document.getElementById(SETTINGS_ROOT_ID);
        setupSettingsPanel(root);
    } catch (error) {
        console.error('[World Engine] Failed to initialize settings UI:', error);
    }
}

function setupSettingsPanel(root) {
    if (!root || root.dataset.initialized === 'true') return;

    const settings = getSettings();
    const iframe = root.querySelector('#world_engine_iframe');
    const speedInput = root.querySelector('#world_engine_speed');
    const speedValue = root.querySelector('#world_engine_speed_value');
    const invertCheckbox = root.querySelector('#world_engine_invert_look');
    const instructionsCheckbox = root.querySelector('#world_engine_show_instructions');
    const openInTabButton = root.querySelector('#world_engine_open_in_tab');

    const updateIframeSrc = () => {
        if (iframe) {
            iframe.src = buildViewUrl(settings);
        }
    };

    const syncControls = () => {
        if (speedInput) speedInput.value = settings.movementSpeed;
        if (speedValue) speedValue.textContent = `${settings.movementSpeed.toFixed(1)}x`;
        if (invertCheckbox) invertCheckbox.checked = Boolean(settings.invertLook);
        if (instructionsCheckbox) instructionsCheckbox.checked = Boolean(settings.showInstructions);
    };

    const pushSettingsToFrame = () => {
        persistSettings();
        sendSettingsToFrame(iframe?.contentWindow, settings);
    };

    speedInput?.addEventListener('input', (event) => {
        const value = Number(event.target.value) || DEFAULT_SETTINGS.movementSpeed;
        settings.movementSpeed = Math.max(0.1, value);
        if (speedValue) speedValue.textContent = `${settings.movementSpeed.toFixed(1)}x`;
        pushSettingsToFrame();
    });

    invertCheckbox?.addEventListener('change', (event) => {
        settings.invertLook = Boolean(event.target.checked);
        pushSettingsToFrame();
    });

    instructionsCheckbox?.addEventListener('change', (event) => {
        settings.showInstructions = Boolean(event.target.checked);
        pushSettingsToFrame();
    });

    openInTabButton?.addEventListener('click', () => {
        const url = buildViewUrl(settings);
        window.open(url, '_blank', 'noopener');
    });

    iframe?.addEventListener('load', () => {
        sendSettingsToFrame(iframe.contentWindow, settings);
    });

    root.dataset.initialized = 'true';
    syncControls();
    updateIframeSrc();
}

function addMenuButton() {
    if ($('#world_engine_menu_button').length) return;
    const container = getMenuContainer();
    if (!container) {
        console.warn('[World Engine] Could not find an extensions menu container to attach the launcher.');
        return;
    }

    const buttonHtml = `
        <div id="world_engine_menu_button" class="list-group-item flex-container flexGap5">
            <div class="fa-solid fa-mountain-sun extensionsMenuExtensionButton"></div>
            <div class="flex1">World Engine</div>
        </div>
    `;

    container.append(buttonHtml);
    $('#world_engine_menu_button').on('click', openWorldEnginePopup);
}

jQuery(() => {
    addMenuButton();
    ensureSettingsPanel();
});
