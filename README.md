# UWP & XBOX Library Sync for Millennium

Automatically add your UWP (Microsoft Store) and XBOX app games to Steam as native shortcuts.

## Features

- **Auto‑discovery** - Scans your system for launchable UWP applications via PowerShell and `Get-StartApps`.
- **One‑click sync** - Creates or updates Steam shortcuts for every eligible UWP app.
- **Smart merging** - Preserves existing shortcut fields (`appid`, `LastPlayTime`, etc.) while keeping managed entries in sync.
- **Default disablelist** - Ships with a sensible blocklist (Xbox app overlays, system apps, etc.). Can be turned off.
- **Per‑game control** - Enable or disable individual apps through a searchable management modal.
- **Auto‑resync on startup** - Optionally run the sync automatically when Steam loads.
- **Steam restart helper** - Restart Steam directly from the settings UI. (Forces steam to reload shortcuts, until i can find a way to do it without forcing a client relaunch)

> Please note that this plugin is windows only.

<img width="1874" height="909" alt="image" src="https://github.com/user-attachments/assets/d14bb11f-da53-4cff-8702-20173a1b6fef" />

## Usage

Once installed, most things work out of the box - but you can enable/disable things in Steam -> Millennium Library Manager -> UWP & XBOX Library Sync

- **Resync Library** - Manually trigger a scan of UWP apps and update Steam shortcuts.
- **Managed Games** - Opens a modal where you can search, filter, and toggle which apps are imported.
- **Relaunch Steam** - Restart Steam (useful after a sync to refresh the library).
- **Default DisableList** - Toggle the built‑in blocklist on/off.
- **Auto Resync on Startup** - Enable/disable automatic syncing when Steam starts.

<img width="1874" height="909" alt="plugin_settings" src="https://github.com/user-attachments/assets/e173fab8-4d93-4d96-9303-ec0a689c5952" />

## Notes & Limitations

- **Steam must be restarted** after a sync for new shortcuts to appear in the library. The plugin provides a **Relaunch Steam** button, or you can restart manually.
- The plugin only manages shortcuts it created (identified by the `__millennium_uwp_aumid=` marker in `ShortcutPath`). It will never touch other non‑Steam shortcuts.
- Icon loading uses the original asset paths from the app package. If an asset is missing or unreadable, the plugin falls back to an empty icon.
- Some UWP games may not launch if they depend on specific command‑line arguments - the plugin launches them via their `AppUserModelId` only.

### What gets synced?

The plugin adds a shortcut for every UWP app that:
- Is an AppX package with a valid `ApplicationId`.
- Is not disabled by either the **default disablelist** or **user‑disabled list**.
- Has a valid display name and `AppUserModelId`.

The created shortcuts use a custom launcher (PowerShell + .NET interop) that invokes `IApplicationActivationManager` to start the UWP app correctly. Steam will see it as a normal non‑Steam game.

### Removing a managed shortcut

Simply disable the app in the **Manage Games** modal and run **Resync Library**. The shortcut will be removed from `shortcuts.vdf`.

## Default Disablelist

The following apps are **blocked by default** to avoid cluttering your Steam library with system utilities or overlay components:

- Xbox Gaming Overlay (`Microsoft.XboxGamingOverlay`)
- Windows Store, Calculator, Notepad, Photos, Terminal
- NVIDIA Control Panel
- Windows Security, ScreenSketch, Backup, ClickToDo
- Immersive Control Panel

You can disable this blocklist entirely by toggling **Default DisableList** in the settings.

## File Overview

| File                 | Purpose                                                                 |
|----------------------|-------------------------------------------------------------------------|
| `main.lua`           | Plugin entry point; handles lifecycle, frontend readiness, and auto‑sync. |
| `backend.lua`        | Exposes API calls to the frontend (`get_settings_state`, `resync_library`, etc.). |
| `sync.lua`           | Orchestrates the sync process: reads/writes `shortcuts.vdf`.             |
| `uwp_discovery.lua`  | PowerShell discovery, asset path resolution, and game merging logic.   |
| `vdf.lua`            | Binary VDF parser/serializer for `shortcuts.vdf`.                      |
| `client_manager.lua` | Steam restart logic and secure image reading (data URLs).              |
| `config.lua`         | Persistent configuration (disabled shortcuts, auto‑sync flag, etc.).   |
| `steam_user.lua`     | Detects the currently logged‑in Steam user from `loginusers.vdf`.      |
| `frontend/`          | React + TypeScript UI (settings page, management modal).               |
