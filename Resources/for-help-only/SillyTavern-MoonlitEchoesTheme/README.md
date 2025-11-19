# Moonlit Echoes Theme

**English** | [繁體中文](https://github.com/RivelleDays/SillyTavern-MoonlitEchoesTheme/blob/main/.github/README-zh_Hant.md)

![](https://github.com/RivelleDays/SillyTavern-MoonlitEchoesTheme/blob/main/.github/ImagePreview/visual_novel_mode.png)

**Moonlit Echoes 月下回聲** is a UI theme designed for SillyTavern. It has been customized and refined based on my personal preferences to create a more modern, elegant, and minimalist interface while enhancing the user experience across both desktop and mobile platforms.

Moonlit Echoes was first released on the SillyTavern Discord server on November 25, 2024, and has been continuously updated with valuable feedback and support from the community. Eventually, to improve maintainability and ease of updates—and to satisfy my obsession with well-designed themes—I developed this as a SillyTavern extension and made it open-source on GitHub.

| UI Interface | System Messages |
|----------------------|-------------------|
| <img src="https://github.com/RivelleDays/SillyTavern-MoonlitEchoesTheme/blob/main/.github/ImagePreview/ui_overview.png"> | <img src="https://github.com/RivelleDays/SillyTavern-MoonlitEchoesTheme/blob/main/.github/ImagePreview/system_messages.png"> |

## Features

### Core Features
- **Multiple Message Styles**: In addition to SillyTavern’s default "Flat," "Bubble," and "Document" layouts, this theme introduces unique styles like "Echo," "Whisper," "Hush," "Ripple," and "Tide," designed for different chat scenarios with extra customization options available.
- **Cross-Platform Friendly**: Optimized for both desktop and mobile, with wider input fields and adaptive layouts—ideal for detail-oriented users and those on mobile devices.

### Moonlit Echoes Theme Presets
Users can now easily share color schemes and themes based on Moonlit Echoes Theme. These presets can sync with SillyTavern’s built-in UI themes for a seamless transition.

<img src="https://github.com/RivelleDays/SillyTavern-MoonlitEchoesTheme/blob/main/.github/ImagePreview/moonlit_theme_presets.png" width="500">

## Screenshots
The following screenshots are from **version 2.5.0**, taken on a MacBook using Chrome, showcasing the newly added "Glimmer (微光)" theme introduced in 2.5.0.

![](https://github.com/RivelleDays/SillyTavern-MoonlitEchoesTheme/blob/main/.github/ImagePreview/1chatstyle_flat.png)
![](https://github.com/RivelleDays/SillyTavern-MoonlitEchoesTheme/blob/main/.github/ImagePreview/2chatstyle_bubble.png)
![](https://github.com/RivelleDays/SillyTavern-MoonlitEchoesTheme/blob/main/.github/ImagePreview/3chatstyle_document.png)
![](https://github.com/RivelleDays/SillyTavern-MoonlitEchoesTheme/blob/main/.github/ImagePreview/4chatstyle_echo.png)
![](https://github.com/RivelleDays/SillyTavern-MoonlitEchoesTheme/blob/main/.github/ImagePreview/5chatstyle_whisper.png)
![](https://github.com/RivelleDays/SillyTavern-MoonlitEchoesTheme/blob/main/.github/ImagePreview/6chatstyle_hush.png)
![](https://github.com/RivelleDays/SillyTavern-MoonlitEchoesTheme/blob/main/.github/ImagePreview/7chatstyle_ripple.png)
![](https://github.com/RivelleDays/SillyTavern-MoonlitEchoesTheme/blob/main/.github/ImagePreview/8chatstyle_tide.png)

# Installation
## Prerequisites
It is recommended to use the **latest version** of SillyTavern (either Release or Staging) along with Google Chrome.

## Installation Steps

### 1. **Install Moonlit Echoes Theme**
In the **SillyTavern Extension Manager**, use "Install from URL" and paste the following Git URL:
   ```
   https://github.com/RivelleDays/SillyTavern-MoonlitEchoesTheme
   ```

### 2. **Update to `/SillyTavern/config.yaml` for thumbnail settings**
Previously, I recommended disabling thumbnails, but this can slow down image loading on mobile. Here’s a tested configuration I now recommend:
```
thumbnails:
  enabled: true
  format: png
  quality: 100
  dimensions:
    bg:
      - 240
      - 135
    avatar:
      - 864
      - 1280
```
Before applying and restarting SillyTavern, consider deleting the entire thumbnails folder (likely located at `/SillyTavern/data/default-user/thumbnails`) Don’t worry—it will regenerate automatically with better image quality after restart.

### 3. **Download and Enable the Theme (Highly Recommended!)**

The Moonlit Echoes theme extension is ready to use after installation. However, if you’d like your interface to match the style shown in the preview images, please download the theme file and import it into your User Settings, then set it as your UI theme.

The newly added **"Glimmer (微光)"** theme in version 2.5.0 is especially recommended. This theme was specially designed for this release—minimalist, versatile, and perfect for using your phone under the covers at night.
You can find it in the GitHub theme folder or download it directly below:

- [Glimmer - by Rivelle.json](https://github.com/RivelleDays/SillyTavern-MoonlitEchoesTheme/blob/main/theme/Glimmer%20-%20by%20Rivelle.json) → for SillyTavern User Settings
- [[Moonlit] Glimmer - by Rivelle.json](https://github.com/RivelleDays/SillyTavern-MoonlitEchoesTheme/blob/main/theme/%5BMoonlit%5D%20Glimmer%20-%20by%20Rivelle.json) → for Moonlit Echoes Theme Presets

No need to tweak anything—just drop the file in and you’re good to go!

## For SillyTavern Users via Termux 📱
If you’re using SillyTavern via Termux, here’s how you can modify `config.yaml`.

> [!Warning]
> I don’t have experience with Android devices or Termux, so I can’t answer related questions, test the steps, or guarantee results. The following methods are provided by other users.

> [!NOTE]
> You may find two config.yaml files inside the SillyTavern folder. Make sure to edit the one in the root directory: `/SillyTavern/config.yaml.` **Do NOT modify** `/SillyTavern/default/config.yaml` or anything inside the default folder.

### Method 1: Edit via Termux
1. Open Termux and enter: `cd SillyTavern`
2. Then, run: `nano config.yaml` to edit the file.

### Method 2: Use Material Files (Android File Manager)
1. **Open Material Files** > **Add Storage** > **Navigate to Termux** > **SillyTavern**
2. Within the SillyTavern directory, edit `config.yaml` directly

# Usage Guide

## How to Use the Moonlit Echoes Theme Preset?
The Moonlit Echoes theme preset is partially synced with the UI themes in SillyTavern. If there are matching options in the menu, switching either one will sync the settings accordingly.

However, the Moonlit Echoes theme preset is fundamentally separate from SillyTavern’s UI themes. The Moonlit Echoes Theme does NOT create or modify any SillyTavern UI themes.

### Import & Export
- Moonlit Echoes theme preset files follow the format `[Moonlit] PresetName.json` (e.g., `[Moonlit] Honey Cream.json`). There is a half-width space after `[Moonlit]`
- This does not affect functionality. You do **NOT** need to remove `[Moonlit] ` before importing—just import the file directly
- If the imported preset does not sync with SillyTavern UI themes, **reload the page** or **select a different theme** to apply the changes

## FAQ

### Q: The layout looks broken or doesn’t work with other extensions?
**A:** Yes, despite my best efforts, I can’t guarantee full compatibility with every third-party SillyTavern extension. If you run into any issues, please try the following troubleshooting steps:

1. Make sure you're using the latest version of SillyTavern with the latest version of Chrome.  
2. Temporarily disable this theme extension to check whether it’s the cause.  
   If it is—or if the third-party extension you're using isn't supported yet—feel free to report it.

Moonlit Echoes is a third-party theme extension and is not affiliated with the official SillyTavern project. It’s a personal project born out of love for SillyTavern and a strong preference for visual design. If you encounter any issues, please reach out to me first—I’ll do my best to help.

### Q: What other extensions are you using in the preview images?
**A:** Here are the extensions I highly recommend and can confirm are fully supported by Moonlit Echoes:
- **[SillyTavern / Extension-TopInfoBar](https://github.com/SillyTavern/Extension-TopInfoBar)**: Official extension. Lets you quickly switch chats, jump between files, and search messages. My absolute favorite—highly recommended!
- **[SillyTavern / Extension-QuickPersona](https://github.com/SillyTavern/Extension-QuickPersona)**: Official extension. Easily switch personas from the chat input area, with stylish visual cues.
- **[SillyTavern / Extension-TypingIndicator](https://github.com/SillyTavern/Extension-TypingIndicator)**: Official extension. Shows a cute `{{char}} is typing...` indicator while characters are responding.
- **[zerofata / SillyTavern-Dialogue-Colorizer-Plus](https://github.com/zerofata/SillyTavern-Dialogue-Colorizer-Plus)**: A fork of the original [SillyTavern-Dialogue-Colorizer](https://github.com/XanadusWorks/SillyTavern-Dialogue-Colorizer), with improved variable support for customizing character dialogue colors.
- **[qvink / SillyTavern-MessageSummarize](https://github.com/qvink/SillyTavern-MessageSummarize)**: Adds smart summarization to simulate long- and short-term memory for LLMs—very powerful and useful.
- **[LenAnderson / SillyTavern-MoreFlexibleContinues](https://github.com/LenAnderson/SillyTavern-MoreFlexibleContinues/)**: Adds more flexibility to continue generations.
- **[splitclover / rewrite-extension](https://github.com/splitclover/rewrite-extension)**: Allows fast partial rewrites and deletions of message content.

### Q: Experiencing a lag when switching themes with Moonlit Echoes?
**A:** Yes, this is a known issue I haven’t been able to resolve yet. On mobile, the switch may freeze briefly for a few seconds before completing. Just wait a moment and it should load fine. This rarely happens on desktop.

# Feedback & Suggestions
If you encounter any issues or have feature requests, please submit them in the Issues section using the provided template.

You’re also welcome to share your color schemes in the Discussions section!<br>
Whether it’s a SillyTavern UI theme or a Moonlit Echoes theme preset, I’d love to see your creative designs.

# Special Thanks

A heartfelt thank you to everyone who has supported and contributed to this project.

- A big thank you to ceruleandeep for your early support in the SillyTavern Discord—this all started because of you.
- Huge thanks to IceFog72 for encouraging me to create SillyTavern themes and for developing [SillyTavern-CustomThemeStyleInputs](https://github.com/RivelleDays/SillyTavern-MoonlitEchoesTheme), which saved me a lot of hassle in the early stages.
- Much appreciation to Bronya-Rand for your open-source work—I learned a lot from your SillyTavern extension and took inspiration from its feature layout.
- Thanks to vesper—I drew inspiration from your custom themes when designing the Ripple message style.

Finally, endless gratitude to Wolfsblvt and Cohee for adding i18n support for third-party extensions in SillyTavern. This has greatly improved the experience for non-English users, and I truly appreciate it!

# License
AGPLv3
