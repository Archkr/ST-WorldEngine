# Manual QA: Outfit Lab

Use this checklist to verify the Outfit Lab UI behaves as expected when testing locally in the SillyTavern client.

1. Open the extension settings and switch to the **Outfits** tab.
2. Verify the editor renders immediately:
   - The disabled notice is hidden.
   - The **Add Character Slot** button is enabled on load.
   - Inputs inside the editor accept focus and edits without additional toggles.
3. Click **Add Character Slot** and verify a new character card appears with editable name and default folder fields.
4. Add at least one outfit variation inside the new character card:
   - Confirm the folder picker button opens a directory picker (browser support permitting) and populates the folder input when a directory is chosen.
   - Enter several trigger lines and confirm they persist when you switch tabs and return.
   - Check the Match Types options and ensure selected checkboxes persist after saving and reloading the profile.
   - Populate the Scene Awareness fields (requires all / requires any / exclude) with sample names and confirm they save and restore.
   - Adjust the Priority field and confirm the value is saved, reloaded, and accepts negative, zero, and positive integers.
5. Remove the variation and the character to ensure the list updates and the mapping table in the Characters tab reflects the changes.

Mark each item as you complete it before delivering the build.
