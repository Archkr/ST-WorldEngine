export const settingsKey = 'SillyTavernMoonlitEchoesTheme';

/**
 * Retrieve the Moonlit Echoes settings object from the current context.
 * @param {object} [context=SillyTavern.getContext()] - Optional SillyTavern context.
 * @returns {object} Settings object for this extension.
 */
export function getSettings(context = SillyTavern.getContext()) {
    return context.extensionSettings[settingsKey];
}

/**
 * Persist the current settings via SillyTavern's debounced saver.
 * @param {object} [context=SillyTavern.getContext()] - Optional SillyTavern context.
 */
export function saveSettings(context = SillyTavern.getContext()) {
    context.saveSettingsDebounced();
}
