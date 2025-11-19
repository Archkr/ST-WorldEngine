import { extension_settings, renderExtensionTemplateAsync } from '/scripts/extensions.js';
import { callGenericPopup, POPUP_TYPE } from '/scripts/popup.js';
import { eventSource, event_types } from '/script.js';
import { registerSillyTavernIntegration, unregisterSillyTavernIntegration } from './chat-integration.js';
import { buildViewUrl, DEFAULT_SETTINGS, ensureSettings, EXTENSION_NAME, persistSettings, sendSettingsToFrame } from './settings-utils.js';

const EXTENSION_BASE_URL = new URL('.', import.meta.url);
const SETTINGS_HTML_URL = new URL('./settings.html', EXTENSION_BASE_URL).toString();
const SETTINGS_ROOT_ID = 'world-engine-settings';
const CHAT_ROLE_USER = 'user';
const CHAT_ROLE_ASSISTANT = 'assistant';
const CHAT_SYNC_POLL_INTERVAL = 5000;
const CHAT_SYNC_HISTORY_LIMIT = 24;

let chatIntegrationHandle = null;
let chatPollTimer = null;

const chatSyncState = {
    lastSignature: null,
    streamingBuffer: '',
    streamingActive: false,
};

function getWorldEngineContext() {
    if (typeof window.getContext === 'function') {
        return window.getContext();
    }

    if (window?.SillyTavern && typeof window.SillyTavern.getContext === 'function') {
        return window.SillyTavern.getContext();
    }

    return null;
}

function getWorldEngineFrames() {
    return Array.from(document.querySelectorAll('iframe.world-engine-iframe'))
        .map((iframe) => iframe?.contentWindow)
        .filter(Boolean);
}

function broadcastChatPayload(payload, targetFrame = null) {
    const frames = targetFrame ? [targetFrame] : getWorldEngineFrames();
    frames.forEach((frame) => {
        try {
            frame.postMessage({
                source: EXTENSION_NAME,
                type: 'world-engine-chat',
                payload,
            }, '*');
        } catch (error) {
            console.warn('[World Engine] Failed to deliver chat payload to frame.', error);
        }
    });
}

function normalizeChatMessage(message) {
    if (!message || typeof message !== 'object') return null;
    const text = typeof message.mes === 'string' ? message.mes.trim() : '';
    if (!text) return null;
    const signature = `${message.mesId ?? message.id ?? message.key ?? ''}:${text}`;
    return {
        text,
        signature,
        role: message.is_user ? CHAT_ROLE_USER : CHAT_ROLE_ASSISTANT,
    };
}

function syncChatHistory(targetFrame = null) {
    const ctx = getWorldEngineContext();
    const chat = Array.isArray(ctx?.chat) ? ctx.chat : [];

    const recentRaw = chat.slice(-CHAT_SYNC_HISTORY_LIMIT * 2);
    
    const normalized = recentRaw
        .map((entry) => normalizeChatMessage(entry))
        .filter(Boolean);

    const recent = normalized.slice(-CHAT_SYNC_HISTORY_LIMIT);
    const lastEntry = recent[recent.length - 1] || null;
    chatSyncState.lastSignature = lastEntry?.signature ?? null;

    let displayHistory = [];
    for (let i = recent.length - 1; i >= 0; i--) {
        if (recent[i].role === CHAT_ROLE_ASSISTANT) {
            displayHistory = [recent[i]];
            break;
        }
    }

    broadcastChatPayload({
        history: displayHistory.map(({ text, role }) => ({ text, role })),
        direction: 'incoming',
    }, targetFrame);
}

function resetChatSyncState() {
    chatSyncState.lastSignature = null;
    chatSyncState.streamingBuffer = '';
    chatSyncState.streamingActive = false;
}

function handleStreamStart() {
    chatSyncState.streamingActive = true;
    chatSyncState.streamingBuffer = '';
}

function resolveTokenText(args = []) {
    if (!args.length) return '';
    if (typeof args[0] === 'number') {
        return String(args[1] ?? '');
    }
    if (typeof args[0] === 'object') {
        return String(args[0]?.token ?? args[0]?.text ?? '');
    }
    return String(args.join(' ') || '');
}

function handleStreamToken(...args) {
    if (!chatSyncState.streamingActive) return;
    const tokenText = resolveTokenText(args);
    if (!tokenText) return;
    chatSyncState.streamingBuffer += tokenText;
    broadcastChatPayload({
        text: chatSyncState.streamingBuffer,
        role: CHAT_ROLE_ASSISTANT,
        direction: 'incoming',
    });
}

function handleMessageFinished() {
    if (chatSyncState.streamingBuffer) {
        broadcastChatPayload({
            text: chatSyncState.streamingBuffer,
            role: CHAT_ROLE_ASSISTANT,
            direction: 'incoming',
        });
    }
    chatSyncState.streamingActive = false;
    chatSyncState.streamingBuffer = '';
    syncChatHistory();
}

function pushMessageToSillyTavern(text) {
    if (!text) return;

    if (typeof window.send_message === 'function') {
        window.send_message(text);
        return;
    }

    if (window?.SillyTavern && typeof window.SillyTavern.sendMessage === 'function') {
        window.SillyTavern.sendMessage(text);
        return;
    }

    const textarea = document.querySelector('#send_textarea') || document.querySelector('textarea[name="send_textarea"]');
    if (textarea) {
        textarea.value = text;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }

    const sendButton = document.querySelector('#send_but') || document.querySelector('#send_button') || document.querySelector('[data-send-button]');
    if (sendButton) {
        sendButton.click();
        return;
    }

    const form = document.querySelector('#send_form') || textarea?.closest('form');
    if (form) {
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }
}

function handleFrameChatMessage(event) {
    const { data } = event || {};
    if (!data || data.source !== EXTENSION_NAME || data.type !== 'world-engine-chat') return;

    const payload = data.payload || {};
    const text = typeof payload.text === 'string' ? payload.text.trim() : '';
    if (!text || payload.direction !== 'outgoing') return;

    pushMessageToSillyTavern(text);
}

function initializeChatIntegration() {
    if (chatIntegrationHandle) return;

    window.addEventListener('message', handleFrameChatMessage, false);
    chatIntegrationHandle = registerSillyTavernIntegration({
        eventSource,
        eventTypes: event_types,
        onGenerationStarted: handleStreamStart,
        onStreamStarted: handleStreamStart,
        onStreamToken: handleStreamToken,
        onMessageFinished: handleMessageFinished,
        onChatChanged: syncChatHistory,
        onHistoryChanged: () => {
            resetChatSyncState();
            syncChatHistory();
        },
    });

    if (chatPollTimer) {
        clearInterval(chatPollTimer);
    }
    chatPollTimer = window.setInterval(syncChatHistory, CHAT_SYNC_POLL_INTERVAL);
    syncChatHistory();
}

function teardownChatIntegration() {
    if (chatPollTimer) {
        clearInterval(chatPollTimer);
        chatPollTimer = null;
    }

    if (chatIntegrationHandle) {
        unregisterSillyTavernIntegration(chatIntegrationHandle, { eventSource });
        chatIntegrationHandle = null;
    }

    window.removeEventListener('message', handleFrameChatMessage, false);
    resetChatSyncState();
}

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
        syncChatHistory(event.target.contentWindow);
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
    const iframeWrapper = root.querySelector('.world-engine-iframe-wrapper');
    const speedInput = root.querySelector('#world_engine_speed');
    const speedValue = root.querySelector('#world_engine_speed_value');
    const invertCheckbox = root.querySelector('#world_engine_invert_look');
    const instructionsCheckbox = root.querySelector('#world_engine_show_instructions');
    const maximizeButton = root.querySelector('#world_engine_maximize');
    const maximizeIcon = maximizeButton?.querySelector('.fa-solid');
    const maximizeLabel = maximizeButton?.querySelector('.world-engine-maximize-label');
    const minimizeButton = root.querySelector('#world_engine_minimize');
    const iframeWrapperParent = iframeWrapper?.parentElement;
    const iframeWrapperPlaceholder = document.createComment('world-engine-iframe-placeholder');
    const iframeWrapperNextSibling = iframeWrapper?.nextSibling || null;
    let isMaximized = false;

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

    const moveWrapperToBody = () => {
        if (!iframeWrapper) return;

        if (!iframeWrapperPlaceholder.isConnected && iframeWrapperParent) {
            iframeWrapperParent.insertBefore(iframeWrapperPlaceholder, iframeWrapper);
        }

        document.body.appendChild(iframeWrapper);
    };

    const restoreWrapperToPanel = () => {
        if (!iframeWrapper || !iframeWrapperParent) return;

        if (iframeWrapperPlaceholder.parentNode) {
            iframeWrapperPlaceholder.replaceWith(iframeWrapper);
            return;
        }

        iframeWrapperParent.insertBefore(iframeWrapper, iframeWrapperNextSibling);
    };

    const setMaximized = (maximized) => {
        isMaximized = Boolean(maximized);

        if (isMaximized) {
            moveWrapperToBody();
            iframeWrapper?.classList.remove('is-hidden');
        } else {
            iframeWrapper?.classList.add('is-hidden');
            restoreWrapperToPanel();
        }
        iframeWrapper?.classList.toggle('is-maximized', isMaximized);
        document.body.classList.toggle('world-engine-maximized', isMaximized);

        if (maximizeButton) {
            maximizeButton.setAttribute('aria-pressed', String(isMaximized));
        }

        if (maximizeIcon) {
            maximizeIcon.classList.toggle('fa-maximize', !isMaximized);
            maximizeIcon.classList.toggle('fa-minimize', isMaximized);
        }

        if (maximizeLabel) {
            maximizeLabel.textContent = isMaximized ? 'Minimize view' : 'Start world';
        }
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

    maximizeButton?.addEventListener('click', () => setMaximized(!isMaximized));
    minimizeButton?.addEventListener('click', () => setMaximized(false));

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && isMaximized) {
            setMaximized(false);
        }
    });

    iframe?.addEventListener('load', () => {
        sendSettingsToFrame(iframe.contentWindow, settings);
        syncChatHistory(iframe.contentWindow);
    });

    root.dataset.initialized = 'true';
    syncControls();
    updateIframeSrc();
    setMaximized(false);
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
    initializeChatIntegration();
});
