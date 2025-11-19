import {
    tabMappings as defaultTabMappings,
    themeCustomSettings as defaultThemeCustomSettings,
} from '../config/theme-settings.js';

const defaultTranslate = (strings, ...values) => strings.reduce((result, part, index) => {
    const value = index < values.length ? values[index] : '';
    return result + part + value;
}, '');

const noop = () => {};

let tabsConfig = {
    t: defaultTranslate,
    tabMappings: defaultTabMappings,
    themeCustomSettings: defaultThemeCustomSettings,
    createSettingItem: noop,
    addModernCompactStyles: noop,
};

export function configureSettingsTabs(options = {}) {
    tabsConfig = {
        ...tabsConfig,
        ...options,
        t: options.t || tabsConfig.t,
        tabMappings: options.tabMappings || tabsConfig.tabMappings,
        themeCustomSettings: options.themeCustomSettings || tabsConfig.themeCustomSettings,
        createSettingItem: options.createSettingItem || tabsConfig.createSettingItem,
        addModernCompactStyles: options.addModernCompactStyles || tabsConfig.addModernCompactStyles,
    };
}

export function createTabbedSettingsUI(container, settings) {
    if (!container) {
        return;
    }

    const t = tabsConfig.t;

    const tabsContainer = document.createElement('div');
    tabsContainer.classList.add('moonlit-tabs');

    const tabButtons = document.createElement('div');
    tabButtons.classList.add('moonlit-tab-buttons');

    const tabContents = document.createElement('div');
    tabContents.classList.add('moonlit-tab-contents');

    const tabs = [
        { id: 'core-settings', label: t`Core Settings` },
        { id: 'chat-interface', label: t`Chat Interface` },
        { id: 'mobile-devices', label: t`Mobile Devices` },
    ];

    const activeTabId = getActiveTab();

    tabs.forEach((tab) => {
        const button = document.createElement('button');
        button.id = `moonlit-tab-btn-${tab.id}`;
        button.classList.add('moonlit-tab-button');
        button.textContent = tab.label;

        if (tab.id === activeTabId) {
            button.classList.add('active');
        }

        const content = document.createElement('div');
        content.id = `moonlit-tab-content-${tab.id}`;
        content.classList.add('moonlit-tab-content');

        if (tab.id === activeTabId) {
            content.classList.add('active');
        }

        button.addEventListener('click', () => {
            document.querySelectorAll('.moonlit-tab-button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.moonlit-tab-content').forEach(node => node.classList.remove('active'));

            button.classList.add('active');
            content.classList.add('active');
            saveActiveTab(tab.id);
        });

        tabButtons.appendChild(button);
        tabContents.appendChild(content);
    });

    tabsContainer.appendChild(tabButtons);
    tabsContainer.appendChild(tabContents);
    container.appendChild(tabsContainer);

    enhancedPopulateTabContent(tabs, tabContents, settings);
    addTabStyles();
    addCollapsibleSectionStyles();
}

function enhancedPopulateTabContent(tabs, tabContents, settings) {
    populateTabContent(tabs, tabContents, settings, true);
}

function populateTabContent(tabs, tabContents, settings, firstSectionAlwaysExpanded = false) {
    const categorizedSettings = {};

    tabsConfig.themeCustomSettings.forEach(setting => {
        const category = setting.category || 'general';
        if (!categorizedSettings[category]) {
            categorizedSettings[category] = [];
        }
        categorizedSettings[category].push(setting);
    });

    tabs.forEach(tab => {
        const tabContent = document.getElementById(`moonlit-tab-content-${tab.id}`);
        if (!tabContent) return;

        const categories = tabsConfig.tabMappings[tab.id] || [];
        let isFirstSection = true;

        categories.forEach(category => {
            if (!categorizedSettings[category] || categorizedSettings[category].length === 0) {
                return;
            }

            const sectionContainer = document.createElement('div');
            sectionContainer.classList.add('moonlit-section');
            sectionContainer.id = `moonlit-section-${category}`;

            const sectionHeader = document.createElement('div');
            sectionHeader.classList.add('moonlit-section-header');

            if (isFirstSection) {
                sectionHeader.classList.add('moonlit-first-section-header');
            }

            const sectionToggle = document.createElement('div');
            sectionToggle.classList.add('moonlit-section-toggle');

            const sectionTitle = document.createElement('h4');
            sectionTitle.style.margin = '0';
            sectionTitle.style.display = 'flex';
            sectionTitle.style.justifyContent = 'space-between';
            sectionTitle.style.alignItems = 'center';

            const titleText = document.createElement('span');
            titleText.textContent = getCategoryDisplayName(category);

            const toggleIcon = document.createElement('i');
            toggleIcon.classList.add('fa', 'fa-chevron-down');
            toggleIcon.style.transition = 'transform 0.3s ease';

            if (isFirstSection && firstSectionAlwaysExpanded) {
                sectionContainer.classList.add('expanded');
                sectionContainer.classList.add('moonlit-first-section');
                toggleIcon.style.transform = 'rotate(180deg)';
                toggleIcon.style.visibility = 'hidden';
                sectionToggle.style.cursor = 'default';
            } else {
                const isExpanded = getSectionExpandState(category);
                if (isExpanded) {
                    sectionContainer.classList.add('expanded');
                    toggleIcon.style.transform = 'rotate(180deg)';
                }
            }

            sectionTitle.appendChild(titleText);
            sectionTitle.appendChild(toggleIcon);
            sectionToggle.appendChild(sectionTitle);
            sectionHeader.appendChild(sectionToggle);

            const sectionContent = document.createElement('div');
            sectionContent.classList.add('moonlit-section-content');

            if (!(isFirstSection && firstSectionAlwaysExpanded)) {
                sectionToggle.addEventListener('click', () => {
                    sectionContainer.classList.toggle('expanded');

                    if (sectionContainer.classList.contains('expanded')) {
                        toggleIcon.style.transform = 'rotate(180deg)';
                        saveSectionExpandState(category, true);
                    } else {
                        toggleIcon.style.transform = 'rotate(0deg)';
                        saveSectionExpandState(category, false);
                    }
                });
            }

            const categorySettings = categorizedSettings[category];
            categorySettings.forEach(setting => {
                const settingContainer = document.createElement('div');
                settingContainer.classList.add('theme-setting-item');

                tabsConfig.createSettingItem(settingContainer, setting, settings);
                sectionContent.appendChild(settingContainer);
            });

            sectionContainer.appendChild(sectionHeader);
            sectionContainer.appendChild(sectionContent);
            tabContent.appendChild(sectionContainer);

            isFirstSection = false;
        });
    });

    tabsConfig.addModernCompactStyles();
}

function saveSectionExpandState(category, isExpanded) {
    try {
        const stateKey = 'moonlit_section_states';
        const sectionStates = JSON.parse(localStorage.getItem(stateKey) || '{}');
        sectionStates[category] = isExpanded;
        localStorage.setItem(stateKey, JSON.stringify(sectionStates));
    } catch (error) {
        // Ignore storage errors
    }
}

function getSectionExpandState(category) {
    try {
        const stateKey = 'moonlit_section_states';
        const sectionStates = JSON.parse(localStorage.getItem(stateKey) || '{}');
        return sectionStates[category] !== undefined ? sectionStates[category] : true;
    } catch (error) {
        return true;
    }
}

function saveActiveTab(tabId) {
    try {
        localStorage.setItem('moonlit_active_tab', tabId);
    } catch (error) {
        // Ignore storage errors
    }
}

function getActiveTab() {
    try {
        return localStorage.getItem('moonlit_active_tab') || 'core-settings';
    } catch (error) {
        return 'core-settings';
    }
}

function getCategoryDisplayName(category) {
    const t = tabsConfig.t;
    const categoryNames = {
        'theme-colors': t`Theme Colors`,
        'chat-style': t`Global Message Style`,
        'background-effects': t`Background Effects`,
        'theme-extras': t`Theme Extras`,
        'raw-css': t`Advanced Custom CSS`,
        'chat-general': t`General Chat Settings`,
        'visual-novel': t`Visual Novel Mode`,
        'chat-echo': t`Echo Style Settings`,
        'chat-whisper': t`Whisper Style Settings`,
        'chat-ripple': t`Ripple Style Settings`,
        'mobile-global-settings': t`Mobile Global Settings`,
        'mobile-detailed-settings': t`Mobile Detailed Settings`,
        'colors': t`Theme Colors`,
        'background': t`Background Settings`,
        'chat': t`Chat Interface Settings`,
        'visualNovel': t`Visual Novel Mode`,
        'features': t`Advanced Features`,
        'general': t`General Settings`,
        'mobileSettings': t`Mobile Device Settings`,
    };

    return categoryNames[category] || category;
}

function addTabStyles() {
    if (document.getElementById('moonlit-tab-styles')) {
        return;
    }

    const styleElement = document.createElement('style');
    styleElement.id = 'moonlit-tab-styles';
    styleElement.textContent = `
        .moonlit-tabs {
            margin-bottom: 20px;
        }

        .moonlit-tab-buttons {
            display: flex;
            border-bottom: 1px solid color-mix(in srgb, var(--SmartThemeBodyColor) 10%, transparent);
            margin-bottom: 15px;
        }

        .moonlit-tab-button {
            padding: 8px 10px;
            background: none;
            border: none;
            border-bottom: 1px solid transparent;
            cursor: pointer;
            color: var(--SmartThemeBodyColor);
            opacity: 0.7;
            transition: all 0.5s ease;
        }

        .moonlit-tab-button:hover {
            opacity: 0.9;
        }

        .moonlit-tab-button.active {
            opacity: 1;
            border-bottom: 1px solid var(--SmartThemeBodyColor);
        }

        .moonlit-tab-content {
            display: none;
        }

        .moonlit-tab-content.active {
            display: block;
        }
    `;

    document.head.appendChild(styleElement);
}

function addCollapsibleSectionStyles() {
    if (document.getElementById('moonlit-section-styles')) {
        return;
    }

    const styleElement = document.createElement('style');
    styleElement.id = 'moonlit-section-styles';
    styleElement.textContent = `
    .moonlit-section {
        border: 1px solid color-mix(in srgb, var(--SmartThemeBodyColor) 25%, transparent);
        border-radius: 5px;
        margin-bottom: 15px;
        overflow: hidden;
    }

    .moonlit-section-header {
        background-color: color-mix(in srgb, var(--SmartThemeBodyColor) 10%, transparent);
        padding: 5px 12px;
        border-bottom: 1px solid color-mix(in srgb, var(--SmartThemeBodyColor) 25%, transparent);
    }

    .moonlit-first-section-header {
        padding: 10px 12px;
    }

    .moonlit-first-section .moonlit-section-toggle h4 {
        font-weight: 600;
    }

    .moonlit-section-toggle {
        cursor: pointer;
        user-select: none;
    }

    .moonlit-section-toggle i {
        font-size: 0.9em;
        opacity: 0.7;
        margin-left: 8px;
    }

    .moonlit-section.expanded .moonlit-section-toggle i {
        opacity: 1;
    }

    .moonlit-section-content {
        max-height: 0;
        overflow: hidden;
        padding: 0 10px;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        opacity: 0;
    }

    .moonlit-section.expanded .moonlit-section-content {
        max-height: 2000px;
        padding: 10px;
        opacity: 1;
    }

    .checkbox-container {
        margin: 10px 0;
    }

    .checkbox-container > div {
        display: flex;
        align-items: center;
        padding: 2px 0;
    }

    .checkbox-container label {
        flex-grow: 1;
        cursor: pointer;
        user-select: none;
        margin-right: 10px;
    }

    .checkbox-container input[type="checkbox"] {
        width: 18px;
        height: 18px;
        cursor: pointer;
        margin-left: auto;
        margin-right: unset;
        accent-color: var(--customThemeColor, var(--SmartThemeBodyColor));
    }

    .checkbox-container small {
        margin-top: 4px;
        padding-left: 0;
        opacity: 0.7;
        line-height: 1.4;
    }
    `;

    document.head.appendChild(styleElement);
}
