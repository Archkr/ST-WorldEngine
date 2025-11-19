import { t } from '../../../../../i18n.js';
import { getSettings as getExtensionSettings } from './settings-service.js';

/**
 * Initialize slash commands - only when theme is enabled.
 * Register various chat style slash commands for Moonlit Echoes Theme.
 */
export function initializeSlashCommands() {
    const context = SillyTavern.getContext();
    const settings = getExtensionSettings(context);

    if (!settings?.enabled) {
        return;
    }

    const { SlashCommandParser, SlashCommand } = context;

    function switchChatStyle(styleName, styleValue) {
        try {
            const chatDisplaySelect = document.getElementById('chat_display');
            if (!chatDisplaySelect) {
                return t`Chat display selector not found.`;
            }

            chatDisplaySelect.value = styleValue;

            document.body.classList.remove(
                'flatchat',
                'bubblechat',
                'documentstyle',
                'echostyle',
                'whisperstyle',
                'hushstyle',
                'ripplestyle',
                'tidestyle',
            );

            document.body.classList.add(styleName);

            localStorage.setItem('savedChatStyle', styleValue);

            return t`Chat style switched to ${styleName}`;
        } catch (error) {
            return t`Error switching chat style: ${error.message}`;
        }
    }

    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'echostyle',
        description: t`Switch to Echo chat style`,
        callback: () => switchChatStyle('echostyle', '3'),
        helpString: t`Switch to Echo chat style by Moonlit Echoes Theme`,
    }));

    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'whisperstyle',
        description: t`Switch to Whisper chat style`,
        callback: () => switchChatStyle('whisperstyle', '4'),
        helpString: t`Switch to Whisper chat style by Moonlit Echoes Theme`,
    }));

    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'hushstyle',
        description: t`Switch to Hush chat style`,
        callback: () => switchChatStyle('hushstyle', '5'),
        helpString: t`Switch to Hush chat style by Moonlit Echoes Theme`,
    }));

    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'ripplestyle',
        description: t`Switch to Ripple chat style`,
        callback: () => switchChatStyle('ripplestyle', '6'),
        helpString: t`Switch to Ripple chat style by Moonlit Echoes Theme`,
    }));

    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'tidestyle',
        description: t`Switch to Tide chat style`,
        callback: () => switchChatStyle('tidestyle', '7'),
        helpString: t`Switch to Tide chat style by Moonlit Echoes Theme`,
    }));

    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'moonlit-bubble',
        description: t`Switch to Bubble chat style`,
        callback: () => switchChatStyle('bubblechat', '1'),
        helpString: t`Switch to Bubble chat style by Moonlit Echoes Theme`,
    }));

    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'moonlit-flat',
        description: t`Switch to Flat chat style`,
        callback: () => switchChatStyle('flatchat', '0'),
        helpString: t`Switch to Flat chat style by Moonlit Echoes Theme`,
    }));

    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'moonlit-document',
        description: t`Switch to Document chat style`,
        callback: () => switchChatStyle('documentstyle', '2'),
        helpString: t`Switch to Document chat style by Moonlit Echoes Theme`,
    }));
}
