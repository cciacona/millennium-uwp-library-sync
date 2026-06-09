local logger = require("logger")
local fs = require("fs")
local utils = require("utils")
local millennium = require("millennium")
local helpers = require("helpers")
local config = require("config")
local steam_user = require("steam_user")
local vdf = require("vdf")
local uwp_discovery = require("uwp_discovery")

local function shortcuts_vdf_path()
    local steam_root = fs.current_path()
    local ids = steam_user.current_steam_user_ids()
    return fs.join(steam_root, "userdata", ids.steam3, "config", "shortcuts.vdf")
end

local function write_shortcuts_bytes(path, bytes)
    local bak_path = path .. ".millennium.bak"
    if fs.exists(path) then
        logger:info("write: backup existing file")
        local ok_copy, err_copy = fs.copy(path, bak_path)
        if not ok_copy then
            error("failed backing up shortcuts.vdf: " .. tostring(err_copy))
        end
    end

    local tmp_path = path .. ".tmp"
    logger:info("write: write temp file")
    local ok_write, err_write = utils.write_file(tmp_path, bytes)
    if not ok_write then
        error("failed writing temporary shortcuts.vdf: " .. tostring(err_write))
    end

    if fs.exists(path) then
        logger:info("write: remove old file")
        local ok_remove, err_remove = fs.remove(path)
        if ok_remove == nil then
            error("failed removing old shortcuts.vdf: " .. tostring(err_remove))
        end
    end

    logger:info("write: rename temp file")
    local ok_rename, err_rename = fs.rename(tmp_path, path)
    if not ok_rename then
        error("failed replacing shortcuts.vdf: " .. tostring(err_rename))
    end
end

local function sync_uwp_games_to_steam_internal()
    logger:info("sync stage 1: resolve current steam user")
    local ids = steam_user.current_steam_user_ids()
    logger:info(
        "Current Steam user: steamid64=" .. ids.steamid64 ..
        ", steam3=" .. ids.steam3 ..
        ", account=" .. tostring(ids.account_name) ..
        ", persona=" .. tostring(ids.persona_name)
    )

    logger:info("sync stage 2: discover uwp games")
    local games = uwp_discovery.powershell_discover_games()
    logger:info("sync stage 2 done, discovered count=" .. tostring(games and #games or 0))
    millennium.config.set("uwp_snapshot", games)
    if not games or #games == 0 then
        local now = helpers.current_timestamp_iso8601()
        config.set_last_sync_at(now)
        logger:info("No launchable UWP packaged games found")
        return {
            success = true,
            changed = false,
            message = "No launchable UWP packaged games found",
            synced_at = now
        }
    end

    logger:info("sync stage 3: resolve shortcuts path")
    local path = shortcuts_vdf_path()
    logger:info("Using shortcuts.vdf: " .. path)

    logger:info("sync stage 4: parse shortcuts.vdf")
    local doc = vdf.parse_shortcuts_vdf(path)
    logger:info("Parsed shortcuts.vdf entries: " .. tostring(#(doc.shortcuts or {})))

    logger:info("sync stage 5: merge games")
    local changed
    changed, doc = uwp_discovery.merge_games(doc, games)
    logger:info("sync stage 5 done, changed=" .. tostring(changed))

    if not changed then
        local now = helpers.current_timestamp_iso8601()
        config.set_last_sync_at(now)
        logger:info("No changes needed")
        return {
            success = true,
            changed = false,
            message = "No changes needed",
            synced_at = now
        }
    end

    logger:info("sync stage 6: serialize shortcuts")
    logger:info("Shortcuts to write: " .. tostring(#(doc.shortcuts or {})))
    local bytes = vdf.serialize_shortcuts_vdf(doc)
    logger:info("sync stage 6 done, bytes=" .. tostring(#bytes))

    logger:info("sync stage 7: write shortcuts")
    write_shortcuts_bytes(path, bytes)
    logger:info("sync stage 7 done")

    local now = helpers.current_timestamp_iso8601()
    config.set_last_sync_at(now)
    logger:info("Updated shortcuts.vdf successfully")

    return {
        success = true,
        changed = true,
        message = "Updated shortcuts.vdf successfully",
        synced_at = now
    }
end

return {
    shortcuts_vdf_path = shortcuts_vdf_path,
    sync_uwp_games_to_steam_internal = sync_uwp_games_to_steam_internal,
}