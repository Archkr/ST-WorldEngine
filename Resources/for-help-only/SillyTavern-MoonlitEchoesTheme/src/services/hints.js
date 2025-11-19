import { THEME_VERSION } from '../config/theme-info.js';
import { getSettings as getExtensionSettings } from './settings-service.js';

/**
 * Ensure the Moonlit theme buttons hint is visible when the theme is enabled.
 */
export function addThemeButtonsHint() {
    const themesContainer = document.getElementById('UI-presets-block');
    if (!themesContainer) return;

    const context = SillyTavern.getContext();
    const settings = getExtensionSettings(context);

    if (!settings?.enabled) {
        const existingHint = document.getElementById('moonlit-theme-buttons-hint');
        if (existingHint) existingHint.remove();
        return;
    }

    if (document.getElementById('moonlit-theme-buttons-hint')) return;

    const hintElement = document.createElement('small');
    hintElement.id = 'moonlit-theme-buttons-hint';
    hintElement.style.margin = '5px 0';
    hintElement.style.padding = '5px 10px';
    hintElement.style.display = 'block';
    hintElement.style.lineHeight = '1.5';

    const themeSelector = document.getElementById('themes');
    let currentTheme = themeSelector ? themeSelector.value : '';

    if (currentTheme.includes('- by Rivelle')) {
        hintElement.innerHTML = `<i class="fa-solid fa-info-circle"></i>  <b><span data-i18n="You are currently using the third-party extension theme">You are currently using the third-party extension theme</span> Moonlit Echoes Theme <a href="https://github.com/RivelleDays/SillyTavern-MoonlitEchoesTheme" target="_blank">${THEME_VERSION}</a></b><br>
        <small><span data-i18n="Thank you for choosing my theme! This extension is unofficial. For issues, please contact">Thank you for choosing my theme! This extension is unofficial. For issues, please contact</span> <a href="https://github.com/RivelleDays" target="_blank">Rivelle</a></small>`;
        hintElement.style.borderLeft = '3px solid var(--customThemeColor)';
    } else {
        hintElement.innerHTML = `<i class="fa-solid fa-info-circle"></i>  <b><span data-i18n="You are currently using the third-party extension theme">You are currently using the third-party extension theme</span> Moonlit Echoes Theme <a href="https://github.com/RivelleDays/SillyTavern-MoonlitEchoesTheme" target="_blank">${THEME_VERSION}</a></b><br>
        <small><span data-i18n="customThemeIssue">This unofficial extension may not work with all custom themes. Please troubleshoot first; if confirmed, contact</span> <a href="https://github.com/RivelleDays" target="_blank">Rivelle</a></small>`;
        hintElement.style.borderLeft = '3px solid var(--SmartThemeBodyColor)';
    }

    themesContainer.appendChild(hintElement);

    if (themeSelector) {
        themeSelector.addEventListener('change', () => {
            if (!settings?.enabled) {
                return;
            }

            const themeValue = themeSelector.value;
            if (themeValue.includes('- by Rivelle')) {
                hintElement.innerHTML = `<i class="fa-solid fa-info-circle"></i>  <b><span data-i18n="You are currently using the third-party extension theme">You are currently using the third-party extension theme</span> Moonlit Echoes Theme <a href="https://github.com/RivelleDays/SillyTavern-MoonlitEchoesTheme" target="_blank">${THEME_VERSION}</a></b><br>
                <small><span data-i18n="Thank you for choosing my theme! This extension is unofficial. For issues, please contact">Thank you for choosing my theme! This extension is unofficial. For issues, please contact</span> <a href="https://github.com/RivelleDays" target="_blank">Rivelle</a></small>`;
                hintElement.style.borderLeft = '3px solid var(--customThemeColor)';
            } else {
                hintElement.innerHTML = `<i class="fa-solid fa-info-circle"></i>  <b><span data-i18n="You are currently using the third-party extension theme">You are currently using the third-party extension theme</span> Moonlit Echoes Theme <a href="https://github.com/RivelleDays/SillyTavern-MoonlitEchoesTheme" target="_blank">${THEME_VERSION}</a></b><br>
                <small><span data-i18n="customThemeIssue">This unofficial extension may not work with all custom themes. Please troubleshoot first; if confirmed, contact</span> <a href="https://github.com/RivelleDays" target="_blank">Rivelle</a></small>`;
                hintElement.style.borderLeft = '3px solid var(--SmartThemeBodyColor)';
            }
        });
    }
}
