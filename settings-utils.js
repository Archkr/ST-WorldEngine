import { eventSource } from '/script.js';

export const EXTENSION_NAME = 'world-engine';
export const DEFAULT_SETTINGS = {
    movementSpeed: 1.0,
    invertLook: false,
    showInstructions: true,
    enableStreaming: true,
    showTypingIndicator: true,
    enableAutoreplies: false,
    timeOfDay: 12,
    weather: 'clear',
    cameraFov: 60,
    mouseSensitivity: 1.0,
    shadowsEnabled: true,
    renderScale: 1.0,
    showChatBubbles: true,
    rainIntensity: 1.0,
    fogDensity: 1.0,
    cloudsEnabled: true,
    cloudDensity: 1.0,
    cloudSpeed: 0.6,
};

const EXTENSION_BASE_URL = new URL('.', import.meta.url);
export const VIEW_URL = new URL('./Resources/world-engine/index.html', EXTENSION_BASE_URL).toString();

export function ensureSettings(extensionSettings) {
    extensionSettings[EXTENSION_NAME] = Object.assign({}, DEFAULT_SETTINGS, extensionSettings[EXTENSION_NAME]);
    return extensionSettings[EXTENSION_NAME];
}

export function buildViewUrl(settings) {
    const url = new URL(VIEW_URL);
    url.searchParams.set('moveSpeed', String(settings.movementSpeed ?? DEFAULT_SETTINGS.movementSpeed));
    url.searchParams.set('invertLook', String(Boolean(settings.invertLook ?? DEFAULT_SETTINGS.invertLook)));
    url.searchParams.set('showInstructions', String(Boolean(settings.showInstructions ?? DEFAULT_SETTINGS.showInstructions)));
    url.searchParams.set('enableStreaming', String(Boolean(settings.enableStreaming ?? DEFAULT_SETTINGS.enableStreaming)));
    url.searchParams.set('showTypingIndicator', String(Boolean(settings.showTypingIndicator ?? DEFAULT_SETTINGS.showTypingIndicator)));
    url.searchParams.set('enableAutoreplies', String(Boolean(settings.enableAutoreplies ?? DEFAULT_SETTINGS.enableAutoreplies)));
    url.searchParams.set('timeOfDay', String(settings.timeOfDay ?? DEFAULT_SETTINGS.timeOfDay));
    url.searchParams.set('weather', String(settings.weather ?? DEFAULT_SETTINGS.weather));
    url.searchParams.set('fov', String(settings.cameraFov ?? DEFAULT_SETTINGS.cameraFov));
    url.searchParams.set('mouseSensitivity', String(settings.mouseSensitivity ?? DEFAULT_SETTINGS.mouseSensitivity));
    url.searchParams.set('shadowsEnabled', String(Boolean(settings.shadowsEnabled ?? DEFAULT_SETTINGS.shadowsEnabled)));
    url.searchParams.set('renderScale', String(settings.renderScale ?? DEFAULT_SETTINGS.renderScale));
    url.searchParams.set('showChatBubbles', String(Boolean(settings.showChatBubbles ?? DEFAULT_SETTINGS.showChatBubbles)));
    url.searchParams.set('rainIntensity', String(settings.rainIntensity ?? DEFAULT_SETTINGS.rainIntensity));
    url.searchParams.set('fogDensity', String(settings.fogDensity ?? DEFAULT_SETTINGS.fogDensity));
    url.searchParams.set('cloudsEnabled', String(Boolean(settings.cloudsEnabled ?? DEFAULT_SETTINGS.cloudsEnabled)));
    url.searchParams.set('cloudDensity', String(settings.cloudDensity ?? DEFAULT_SETTINGS.cloudDensity));
    url.searchParams.set('cloudSpeed', String(settings.cloudSpeed ?? DEFAULT_SETTINGS.cloudSpeed));
    return url.toString();
}

export async function persistSettings(saveSettingsFn = window?.saveSettingsDebounced) {
    const tryPersist = async (label, fn) => {
        if (typeof fn !== 'function') {
            return false;
        }

        try {
            await fn.call(window);
            console.debug(`[World Engine] Settings saved via ${label}.`);
            return true;
        } catch (error) {
            console.warn(`[World Engine] Failed to persist settings via ${label}.`, error);
            return false;
        }
    };

    // Try the provided function first (usually saveSettingsDebounced)
    if (await tryPersist('provided saveSettingsFn', saveSettingsFn)) {
        return true;
    }

    // Fallback to window.saveSettings
    if (await tryPersist('window.saveSettings', window?.saveSettings)) {
        return true;
    }

    // Fallback to event emission
    if (eventSource?.emit) {
        try {
            eventSource.emit('settingsSaved', {
                source: EXTENSION_NAME,
                settings: window?.extension_settings?.[EXTENSION_NAME] ?? null,
            });
            console.debug('[World Engine] Settings saved via event emission.');
            return true;
        } catch (error) {
            console.warn('[World Engine] Failed to emit settingsSaved event.', error);
        }
    }

    console.warn('[World Engine] No available persistence mechanism for settings.');
    return false;
}

export function sendSettingsToFrame(frame, settings) {
    if (!frame?.postMessage) return;
    frame.postMessage({
        source: EXTENSION_NAME,
        type: 'world-engine-settings',
        payload: settings,
    }, '*');
}
