import { renderExtensionTemplateAsync } from '../../extensions.js';
import { callGenericPopup, POPUP_TYPE } from '../../popup.js';

const EXTENSION_NAME = 'world-engine';
const EXTENSION_FOLDER = `extensions/${EXTENSION_NAME}`;
const RESOURCE_ROOT = `${EXTENSION_FOLDER}/resources/world-engine`;
const VIEW_URL = `${RESOURCE_ROOT}/index.html`;

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

async function openWorldEnginePopup() {
    const template = await renderExtensionTemplateAsync(EXTENSION_NAME, 'window', { src: VIEW_URL });
    const dialog = $(template);
    dialog.on('click', '#world_engine_open_in_tab', () => {
        window.open(VIEW_URL, '_blank', 'noopener');
    });

    callGenericPopup(dialog, POPUP_TYPE.TEXT, 'World Engine', { wide: true, large: true, allowVerticalScrolling: false });
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
