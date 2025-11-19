import { extension_settings, renderExtensionTemplateAsync, saveSettingsDebounced } from '/scripts/extensions.js';
import { callGenericPopup, POPUP_TYPE } from '/scripts/popup.js';

const EXTENSION_NAME = 'world-engine';
const EXTENSION_BASE_URL = new URL('.', import.meta.url);
const VIEW_URL = new URL('./Resources/world-engine/index.html', EXTENSION_BASE_URL).toString();
const DEFAULT_SETTINGS = {
    movementSpeed: 1.0,
    invertLook: false,
    showInstructions: true,
};

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
        sendSettingsToFrame(event.target.contentWindow);
    });

    dialog.on('input', '#world_engine_speed', (event) => {
        const value = Number(event.target.value) || DEFAULT_SETTINGS.movementSpeed;
        settings.movementSpeed = Math.max(0.1, value);
        dialog.find('#world_engine_speed_value').text(`${settings.movementSpeed.toFixed(1)}x`);
        persistSettings();
        sendSettingsToFrame(dialog.find('#world_engine_iframe')[0]?.contentWindow);
    });

    dialog.on('change', '#world_engine_invert_look', (event) => {
        settings.invertLook = Boolean(event.target.checked);
        persistSettings();
        sendSettingsToFrame(dialog.find('#world_engine_iframe')[0]?.contentWindow);
    });

    dialog.on('change', '#world_engine_show_instructions', (event) => {
        settings.showInstructions = Boolean(event.target.checked);
        persistSettings();
        sendSettingsToFrame(dialog.find('#world_engine_iframe')[0]?.contentWindow);
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

function buildViewUrl(settings) {
    const url = new URL(VIEW_URL);
    url.searchParams.set('moveSpeed', String(settings.movementSpeed ?? DEFAULT_SETTINGS.movementSpeed));
    url.searchParams.set('invertLook', String(Boolean(settings.invertLook ?? DEFAULT_SETTINGS.invertLook)));
    url.searchParams.set('showInstructions', String(Boolean(settings.showInstructions ?? DEFAULT_SETTINGS.showInstructions)));
    return url.toString();
}

function getSettings() {
    extension_settings[EXTENSION_NAME] = Object.assign({}, DEFAULT_SETTINGS, extension_settings[EXTENSION_NAME]);
    return extension_settings[EXTENSION_NAME];
}

function persistSettings() {
    if (typeof saveSettingsDebounced === 'function') {
        saveSettingsDebounced();
    }
}

function sendSettingsToFrame(frame) {
    if (!frame?.postMessage) return;
    frame.postMessage({
        source: EXTENSION_NAME,
        type: 'world-engine-settings',
        payload: getSettings(),
    }, '*');
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
});
