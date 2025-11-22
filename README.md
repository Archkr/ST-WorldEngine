# World Engine Extension

An embedded 3D park viewer for SillyTavern's extension menu. This readme covers setup, controls, and the optional integration hooks the extension exposes.

## Setup
1. Place the `world-engine` folder in the main SillyTavern directory (no longer inside the `extensions/` folder).
2. Enable the **World Engine** extension inside SillyTavern.
3. Open the extension window from the Extensions sidebar. Use the **Open in new tab** button if you prefer a detached view.
4. Adjust the extension settings (below the iframe) to tune the experience before clicking into the scene.

## Controls and keybindings
- **Move:** `W`, `A`, `S`, `D` (arrow keys also work).
- **Look:** Move the mouse while pointer lock is active (click the canvas to lock the cursor).
- **Exit pointer lock:** Press `Esc`.
- **Settings:**
  - *Movement speed* slider scales acceleration.
  - *Time of day* slider (00:00–24:00) remaps the sky color, fog density, and light intensity so you can jump between sunrise, high noon, or a moonlit night.
  - *Weather preset* (Clear/Foggy/Rainy) tints the fog, adjusts ambient lighting, and spawns fog banks or rain particles to match the mood.
  - *Invert look* flips vertical mouse input.
  - *Show instructions overlay* toggles the on-screen entry overlay.
  - The same controls are mirrored inside the iframe toolbar so you can continue tweaking while the scene is open.

## Integration points
- **Character Expressions:** The bundled `ExpressionTextureClient` watches `#expression-image` in the parent SillyTavern UI and updates a `THREE.Sprite` when the image changes. Import it from `WorldEngine.ExpressionTextureClient` inside the scene to drive avatar textures.
- **Chat sync:** The scene listens for messages posted to the iframe (or via the exposed `WorldEngine.updateChatMessage(text)` helper) with `{ source: 'world-engine', type: 'world-engine-chat', payload: { text } }` to update the floating chat bubble.
- **Live settings:** Updated settings are pushed into the iframe via `postMessage` when you change them in the extension window, and can also be applied directly with `WorldEngine.applySettings(config)` from inside the scene.

## Settings persistence fallback
`persistSettings` now attempts every available SillyTavern persistence hook so slider/checkbox tweaks survive reloads even if the usual helpers are missing. It first calls `window.saveSettingsDebounced`, then `window.saveSettings`, and finally emits a `settingsSaved` event through `/script.js`'s `eventSource` so the host can flush `extension_settings` to disk. This layered approach keeps the extension compatible with older nightlies or custom forks where only some of these APIs exist.

## Resizing
The renderer automatically resizes with its container via a `ResizeObserver`, so it will follow layout changes in the SillyTavern host UI without needing a page refresh.
