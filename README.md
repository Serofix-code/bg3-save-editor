# BG3 Local Save Editor

Local web editor for Baldur's Gate 3 save files. It runs on the user's own PC and does not upload saves anywhere unless the user manually chooses a local `.lsv` file for the app to copy into its own work folder.

## Requirements

- Windows
- Node.js 18 or newer
- Norbyte/LSLib ExportTool with `Divine.exe`
- Baldur's Gate 3 saves, or a manual `.lsv` upload

## Start

Double-click:

```text
START SERVER.bat
```

Or run:

```bash
npm start
```

Then open:

```text
http://localhost:8081
```

## What It Does

- Scans common Windows BG3 save locations.
- Lets the user manually set the `Savegames\Story` folder if scan fails.
- Lets the user manually upload a `.lsv` save if no local save folder is found.
- Scans common Vortex/Downloads ExportTool locations for `Divine.exe`.
- Lets the user manually set the `Divine.exe` path if scan fails.
- Extracts a selected save into a local work copy.
- Shows `SaveInfo.json`, `meta.lsx`, party summary, module list, and LevelCache levels.
- Provides dropdowns for level ID and displayed save leader name.
- Can edit displayed playtime hours in the extracted work copy.
- Can rebuild active `modsettings.lsx` from a save's module order.
- Can create a repacked edited copy without overwriting the original.
- Includes a Script Extender gold command helper.
- Includes an advanced existing-gold-stack edit for extracted `Globals.lsx`.
- Scans `Globals.lsx` for saved character/ped rows, UUIDs, positions, templates, and current statuses.
- Loads premade status IDs from the local BG3 `Data\Editor\Mods\...\StatusData` files when available.
- Builds Script Extender commands to apply or remove statuses from a selected saved character/ped, a specific UUID, party members, nearby creatures/NPCs, enemies, or equipped item slots.
- Includes a small character/ped command builder for logging, teleporting, reviving, healing, knocking out, or killing a selected UUID.
- Includes a Tav command builder that opens the in-game character creator and repairs/logs the created Tav through Script Extender. It does not inject a full Tav directly into a save file.

## Important Safety Notes

Original saves are not overwritten. The app creates work copies and edited output folders.

Repacked BG3 saves can show the game's tamper/corruption warning, especially when `Globals.lsx` has been changed. Always test on a backup copy first.

Changing the displayed level in `SaveInfo.json` / `meta.lsx` may not fully move an in-game party to another region. It changes save metadata and can help with recovery experiments, but the true world state is deeper in `Globals.lsf`.

## Git Ignore

The app's generated folders are ignored:

- `work/`
- `backups/`
- `*.log`

Do not commit real save files unless they are intentionally shared test saves.
