# Changelog

## v3.6.0 (Unreleased)

### Added
- **Detection engine upgrade.** Main Detection Engine v4 and Outfit Detection Engine v2 now ship with the shared preprocessing, token-aware streaming, and fuzzy/translation reconciliation layers so detections stay accurate even when inputs arrive noisy or translated mid-stream.
- **Fuzzy name preprocessing.** Added an optional normalization layer shared by detection and outfit matching that reuses classification sampling, translation toggles, and Fuse-powered lookups to reconcile misspelled or accented names before scoring.
- **Scene panel command center.** Polished the side panel with a branded header, roster manager drawer, log viewer, auto-pin highlight toggle, and quick focus-lock controls so every button delivers meaningful actions.
- **Summon toggle for the scene panel.** Hide the panel completely and bring it back with a floating summon button that stays available as a quick toggle so the chat column can reclaim the full width whenever you need extra room.
- **Inline scene roster settings.** The footer button now opens an in-panel settings sheet with quick toggles for auto-open behavior, section visibility, and roster avatars.
- **Roster expiry counter.** Every roster entry now displays the remaining message count before it expires, making it easy to spot characters that are about to drop from the scene.
- **Aurora side panel finish.** The roster workspace picked up animated lighting, hover glows, and a responsive section scaffold so the settings footer stays anchored and never falls off-screen.
- **Coverage suggestions in the scene panel.** Vocabulary guidance from the live tester now appears alongside the roster with quick-add pills that update in real time as chats roll in.
- **Regex preprocessor opt-ins.** Profiles can opt into allowed global, preset, and scoped regex scripts, and the Live Tester now reveals the preprocessed text they run against.
- **Regex preprocessor controls in Detection.** Added dedicated checkboxes under Detection so profiles can opt into global, preset, or scoped regex collections without editing JSON, complete with inline helper text describing when to enable each tier.
- **Name matching controls.** The Detection tab now includes fuzzy tolerance presets, a custom low-confidence threshold, and an accent translation toggle so profiles can decide how aggressively diacritics and near-miss names are reconciled.
- **Lowercase fallback toggle.** Name Matching also exposes a **Scan Lowercase Cues** checkbox so chats that intentionally lowercase speaker/system prompts can opt back into fuzzy rescues for those cues without re-enabling noisy lowercase scans globally.
- **Fuzzy fallback tuning.** Added optional score caps and cooldown distance inputs under Name Matching to clamp distant rescues and throttle repeated fallback matches without editing JSON.

### Improved
- **Live tester preprocessing diagnostics.** The Match Flow panel now itemizes applied regex scripts, shows a fuzzy-tolerance badge, adds normalization notes to detections, and copies the summary data into reports so support can trace preprocessing effects.
- **Scene control center aurora parity.** The roster headline now inherits the hero gradient and animated starfield from the main header so the command center shares the same nebula finish.
- **Scene control center polish.** Refined the panel with a live-status banner, quick section navigation chips, richer hover states, and smoother animations to make the roster workspace feel faster and more intentional.
- **Coverage toggle in the control center.** Coverage suggestions now share the toolbar's quick toggles so the panel can hide or restore vocabulary guidance without opening settings.
- **Scene panel master toggle placement.** The hide/show switch now anchors to the base of the hero card so it stays visually connected to the gradient header instead of floating above it.
- **Adaptive section sizing.** Remaining scene panel sections now stretch to fill the freed space as soon as any module is hidden, so two-up layouts immediately expand instead of waiting until only a single section remains.
- **Live log export parity.** Copying the live log now produces a full report with detection summaries, switch analytics, skip reasons, and roster state—matching the fidelity of the live pattern tester output.
- **Scene panel layout cleanup.** Retired the legacy collapse handle so the crest header and toolbar own panel visibility, keeping the frame tidy without the extra toggle stub.
- **Regex & fuzzy UX copy.** Settings toggles now spell out real-world use cases for the regex preprocessor tiers and fuzzy tolerance presets, with matching README guidance so new users know why and when to enable them.

### Fixed
- **Fuzzy fallback lowercase guard.** The fallback scanner now ignores lowercase connectors such as “and/but” unless profiles
  explicitly opt into lowercase scanning, preventing common words from appearing as phantom characters in tester rankings.
- **Fuzzy fallback overlap guard.** Capitalized filler words must now share at least half of their characters with a real
  pattern slot before fuzzy rescue runs, blocking adverbs like “Now” from being remapped to characters such as Yoshinon.
- **Fuzzy fallback score cap.** Fallback rescues now require a valid Fuse score that stays under the configured tolerance (or
  an optional `fuzzyFallbackMaxScore`), preventing distant capitalized words from mapping onto live characters.
- **Top character canonical labels.** Live tester and scene panel leaderboards now always show the normalized character name,
  even when a fuzzy fallback trigger originated from filler words like “Now,” keeping phantom entries out of the rankings.
- **Fuzzy fallback gating.** Contextual and standalone fuzzy sweeps now run any time fuzzy tolerance is enabled, even when no
  other detectors report matches or the source priority is missing, so near-miss names such as “Kotory” and “Rien” still resolve
  cleanly.
- **Fuzzy fallback rescues.** Near-miss character names such as “Ailce” now trigger the fuzzy fallback scanner even when only speaker/action cues are enabled, and the default tolerance accepts one-letter swaps so low-confidence detections remap to the right character instead of being ignored entirely.
- **Fuzzy fallback possessives.** Trailing apostrophe possessives are stripped before fuzzy matching so misspellings like “Shido’s” or “Kotory’s” still resolve to the correct characters instead of being skipped.
- **Fuzzy fallback cooldown.** Contextual and standalone fuzzy collectors now pad prior match ranges and enforce a canonical/token cooldown so repeated mentions stop requeueing detections or spamming tester logs.
- **Fuzzy fallback general scan.** The standalone fallback sweep now runs whenever fuzzy tolerance is enabled, even if general detection is disabled, so misspelled names typed outside scripted cues still remap to the right characters.
- **Fuzzy fallback initials.** Near-miss names that start with the wrong letter now pass through the fallback scanner, so typos like “Xhido” still resolve to Shido when fuzzy tolerance is enabled.
- **Live tester fuzzy snapshots.** Streaming simulations now honor the preprocessed buffer produced by the match finder, so the fuzzy tolerance pill, copy-to-clipboard report, and diagnostics stay in sync with the text that actually triggered fuzzy rescues.
- **Legacy clone fallback.** Replaced direct `structuredClone` calls with a resilient deep clone helper so Electron builds and browsers without the native API can load Costume Switcher without crashing on startup.
- **Host module imports.** Costume Switcher now mirrors the official SillyTavern extension import pattern so the browser loads `script.js`, `extensions.js`, and `slash-commands.js` without triggering MIME-type errors.
- **Regex engine host shims.** Routed regex helpers through the in-extension SillyTavern bridge so startup no longer fetches core `script.js` or `lib.js` files, fixing the MIME errors that blocked Firefox from loading Costume Switcher.
- **Third-party autoloader compatibility.** Updated every SillyTavern core import to account for the new `third-party/` path so browsers fetch the correct modules instead of tripping MIME type errors during startup.
- **SillyTavern module loader.** Load SillyTavern's extension, core script, and slash-command modules on startup so the extension binds to the real host APIs without relying on brittle runtime bridges.
- **Host API availability timing.** The startup sequence now waits for the SillyTavern modules to resolve before wiring the UI, eliminating the late-binding bridge and the warning spam that came with it.
- **Regex script imports.** Corrected the regex engine import path so script collections load in SillyTavern without triggering MIME type errors.
- **Absolute host imports.** Fetch SillyTavern's `extensions.js`, `script.js`, `slash-commands.js`, and regex engine directly from `/scripts/` so third-party installs stop hitting MIME-type errors when the folder depth changes.
- **Fuzzy matcher import path.** Bundled the Fuse.js ESM build with the extension so browsers stop throwing bare-specifier errors when the name preprocessor loads.
- **Toggle styling isolation.** Master and inline switches now render with self-contained tracks so other extensions can no longer distort their shape.
- **Scene panel user message handling.** User-authored chat updates no longer trigger roster wipes or scene panel refreshes, so the control center stays stable and message counters persist while players talk.
- **Scene panel idle refresh.** Chat-change hooks now ignore updates that don't alter the latest assistant message, so editing system prompts or sending player chatter no longer clears or replays roster detections.
- **Scene panel auto-open triggers.** Auto-open on streaming or new results now re-enables the side panel when it was hidden, so updates bring the workspace back instead of staying out of view.
- **Buffer window trimming.** Streaming keeps matching after the max buffer limit trims older text, so outfit switching and live diagnostics continue instead of stalling at the limit.
- **Coverage fallback in the scene panel.** The side panel now reuses the latest tester coverage analysis when no live buffer is
  streaming so vocabulary suggestions stay visible between messages.
- **Skip reason flood control.** Live diagnostics cap repeated skip notices to keep recent switch and veto activity surfaced in
  the event list.
- **Roster inactivity detection.** Characters drop to an inactive state when they are missing from the latest detection pass,
  preventing message counters from stalling at their initial values.
- **Scene roster TTL countdown.** Remaining message counters now inherit their prior balance per character, so each roster entry ticks down independently instead of every slot sharing the same timer.
- **First-stream detection fallback.** Streaming tokens now capture their message key when the generation-start hook fires too early, restoring roster updates for the first outputs after loading a chat.
- **Scene roster scrolling.** The roster list keeps its scrollbox active so large casts remain accessible without shifting the entire panel.
- **Scene panel analytics remapping.** Detection events recorded during streaming now follow the rendered message key, restoring roster/results feeds that previously appeared empty after generation finished.
- **Scene panel mounting.** Resolving pre-fetched container references no longer breaks roster rendering, fixing the empty panel and console error triggered when the UI initializes.
- **Scene panel rehydration.** Switching chats or waiting for autosaves now restores the latest assistant message so the roster, active characters, and live log remain populated instead of clearing after a few seconds.
- **Narrator/system guard in scene restore.** Scene reconciliation ignores narrator and system posts while selecting the latest assistant result, keeping costumes from resetting when the host inserts metadata messages.
- **Live log stability.** The live diagnostics panel keeps the prior message data visible until the next stream produces detections, so it no longer flickers "Awaiting detections" while idle.
- **Live diagnostics retention.** Streaming preserves the full switch history for the active message instead of trimming entries mid-stream, so the log no longer empties before generation ends.
- **Scene panel hide toggle.** Hiding the command center now removes the panel entirely so no translucent shell remains on screen.
- **Scene control center button resilience.** Panel and summon buttons now reset their visual styles within the extension so conflicting theme overrides from other mods can no longer hide or neutralize them.
- **Scene summon toggle stability.** Restored the summon control's inline visibility guard without the heavy polling loop, preventing slowdowns while keeping the button visible when other mods interfere.
- **Scene control center refresh.** Event subscriptions now match additional SillyTavern generation hooks, so the roster, live diagnostics, and status copy update right after streaming and message completion without needing manual history edits.
- **Stream start detection resiliency.** Hidden and symbol-keyed SillyTavern events are now recognised when wiring the integration, keeping the side panel aware of streaming starts even when the host app reshuffles its hooks.
- **Streaming event detection.** The scene panel now tracks SillyTavern's symbol-based generation events, restoring auto-open behaviour and post-stream analytics updates for live messages.
- **Character slot persistence.** Pattern cards stay linked to the active profile after auto-saves, so follow-up edits continue to stick instead of silently rolling back.
- **Scene panel glow overflow.** The aurora backdrop now animates entirely inside the frame and keeps a generous bleed so no hard edges peek through mid-cycle.
- **Live tester isolation.** Running pattern simulations no longer injects tester roster data or log events into the side panel.
- **Scene completion gating.** Live tester streams no longer trigger the command center's completion handlers, so roster capture waits for real assistant messages to finish.
- **Roster activation regression.** Freshly detected characters now mark as active again when they enter the roster instead of staying flagged as inactive.
- **Manual refresh recovery.** The refresh control reloads the latest assistant outcome so the side panel actually updates instead of simply re-rendering stale data.

## v3.5.0

### Added
- **Character slot editor.** Replaced the plain character textarea with a structured slot editor that supports per-slot names, aliases, folders, quick search, and auto-save when adding new entries, making large casts easier to manage.
- **Dialogue scanning toggle.** Added a setting that lets the attribution and action detectors optionally scan quoted dialogue, unlocking better support for transcript-style prose.
- **Focus lock awareness.** The extension now surfaces focus-lock status with periodic notices and records the skip event so telemetry and reports explain why switching paused.
- **Skip-reason telemetry.** Live tester panels and exported reports summarise recent cooldown and veto skips so you can see whether throttling blocked a switch.

### Improved
- **Richer name parsing.** Detection regexes now understand honorifics, descriptive commas, and compound names while sharing the new structured pattern list, greatly improving match accuracy across localisation styles.
- **Pronoun hand-off.** Pronoun matches only fire when a confirmed subject exists, and message state now carries pending subjects between buffers to smooth streaming transitions.
- **Veto insights.** The last vetoed phrase is recorded for both live runs and tester sessions, making it obvious which safeguard halted detection.

### Fixed
- **Pattern exhaustion feedback.** When every pattern is ignored, the UI now raises an actionable error instead of silently stalling detection.
- **Skip summaries reset correctly.** Clearing tester results or rerunning tests now resets skip summaries so stale cooldown data no longer lingers.
- **Focus lock cleanup.** Clearing a focus lock resets the notice state, preventing phantom “detection paused” messages after unlocking.
