const state = {
  staticMode: false,
  config: null,
  saves: [],
  filtered: [],
  selected: null,
  details: null,
  characters: [],
  statusLibrary: []
};

const $ = (selector) => document.querySelector(selector);
const els = {
  status: $("#status"),
  configText: $("#configText"),
  storyRoot: $("#storyRootInput"),
  divine: $("#divineInput"),
  applyPaths: $("#applyPathsBtn"),
  rescan: $("#rescanBtn"),
  uploadLsv: $("#uploadLsv"),
  uploadWebp: $("#uploadWebp"),
  upload: $("#uploadBtn"),
  search: $("#search"),
  refresh: $("#refresh"),
  saveCount: $("#saveCount"),
  saveList: $("#saveList"),
  thumb: $("#thumb"),
  selectedFolder: $("#selectedFolder"),
  saveTitle: $("#saveTitle"),
  facts: $("#facts"),
  backup: $("#backupBtn"),
  restoreMods: $("#restoreModsBtn"),
  repack: $("#repackBtn"),
  saveName: $("#saveNameInput"),
  levelSelect: $("#levelSelect"),
  level: $("#levelInput"),
  leaderSelect: $("#leaderSelect"),
  leader: $("#leaderInput"),
  playHours: $("#playHoursInput"),
  levelCacheMode: $("#levelCacheMode"),
  applyQuick: $("#applyQuickBtn"),
  goldAmount: $("#goldAmountInput"),
  goldCommand: $("#goldCommandBtn"),
  goldGlobals: $("#goldGlobalsBtn"),
  goldCommandText: $("#goldCommandText"),
  statusCharacter: $("#statusCharacterSelect"),
  statusPreset: $("#statusPresetSelect"),
  statusPresetList: $("#statusPresetList"),
  statusId: $("#statusIdInput"),
  statusTarget: $("#statusTargetSelect"),
  statusUuid: $("#statusUuidInput"),
  statusRadius: $("#statusRadiusInput"),
  statusDuration: $("#statusDurationInput"),
  statusForce: $("#statusForceInput"),
  statusSlot: $("#statusSlotSelect"),
  statusApply: $("#statusApplyBtn"),
  statusRemove: $("#statusRemoveBtn"),
  statusCommandText: $("#statusCommandText"),
  statusCurrentList: $("#statusCurrentList"),
  characterAction: $("#characterActionSelect"),
  characterUuid: $("#characterUuidInput"),
  characterCommand: $("#characterCommandBtn"),
  characterCommandText: $("#characterCommandText"),
  partyStatTarget: $("#partyStatTargetSelect"),
  partyStatUuid: $("#partyStatUuidInput"),
  partyStatMode: $("#partyStatModeSelect"),
  statStrength: $("#statStrengthInput"),
  statDexterity: $("#statDexterityInput"),
  statConstitution: $("#statConstitutionInput"),
  statIntelligence: $("#statIntelligenceInput"),
  statWisdom: $("#statWisdomInput"),
  statCharisma: $("#statCharismaInput"),
  statAc: $("#statAcInput"),
  statHp: $("#statHpInput"),
  statMovement: $("#statMovementInput"),
  statInitiative: $("#statInitiativeInput"),
  partyStatsApply: $("#partyStatsApplyBtn"),
  partyStatsRemove: $("#partyStatsRemoveBtn"),
  partyStatsCommandText: $("#partyStatsCommandText"),
  tavMode: $("#tavModeSelect"),
  tavUuid: $("#tavUuidInput"),
  tavCommand: $("#tavCommandBtn"),
  tavCommandText: $("#tavCommandText"),
  party: $("#party"),
  mods: $("#mods"),
  log: $("#log"),
  saveinfoText: $("#saveinfoText"),
  metaText: $("#metaText"),
  globalsText: $("#globalsText")
};

function saveRef() {
  return state.selected ? { source: state.selected.source, folder: state.selected.folder } : null;
}

function setStatus(text) {
  els.status.textContent = text;
}

function log(text) {
  els.log.textContent = text;
}

async function api(path, body = null) {
  const options = body
    ? {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      }
    : {};
  const response = await fetch(path, options);
  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(`${data.error || response.statusText}${data.output ? `\n${data.output}` : ""}`);
  }
  return data;
}

function formatDate(iso) {
  return new Date(iso).toLocaleString();
}

function formatSize(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  }[char]));
}

function renderConfig(config) {
  state.config = config;
  els.storyRoot.value = config.storyRoot || "";
  els.divine.value = config.divine || "";
  const saveText = config.storyRootExists ? config.storyRoot : "No BG3 save folder found yet";
  const divineText = config.divineExists ? "Divine found" : "Divine missing";
  const detected = config.detectedStoryRoots?.length ? `${config.detectedStoryRoots.length} save folder(s) detected` : "no save folders detected";
  els.configText.textContent = `${saveText} | ${divineText} | ${detected}`;
}

function renderSaves() {
  const query = els.search.value.trim().toLowerCase();
  state.filtered = state.saves.filter((save) => {
    const text = `${save.source} ${save.folder} ${save.lsv}`.toLowerCase();
    return query.split(/\s+/).filter(Boolean).every((part) => text.includes(part));
  });
  els.saveCount.textContent = `${state.filtered.length} of ${state.saves.length} saves`;
  els.saveList.innerHTML = "";

  for (const save of state.filtered) {
    const row = document.createElement("button");
    row.type = "button";
    row.className = `save-row${state.selected?.folder === save.folder && state.selected?.source === save.source ? " active" : ""}`;
    row.innerHTML = `
      <span class="save-main">
        <span class="save-name">${escapeHtml(save.folder)}</span>
        <span class="save-sub">${escapeHtml(save.source)} | ${escapeHtml(save.lsv)} | ${formatSize(save.size)}</span>
      </span>
      <span class="save-sub">${escapeHtml(formatDate(save.modified))}</span>
    `;
    row.addEventListener("click", () => selectSave(save));
    els.saveList.append(row);
  }
}

function setControls(enabled) {
  for (const item of [
    els.backup,
    els.restoreMods,
    els.repack,
    els.saveName,
    els.levelSelect,
    els.level,
    els.leaderSelect,
    els.leader,
    els.playHours,
    els.levelCacheMode,
    els.applyQuick,
    els.goldAmount,
    els.goldCommand,
    els.goldGlobals,
    els.statusCharacter,
    els.statusPreset,
    els.statusId,
    els.statusTarget,
    els.statusUuid,
    els.statusRadius,
    els.statusDuration,
    els.statusForce,
    els.statusSlot,
    els.statusApply,
    els.statusRemove,
    els.characterAction,
    els.characterCommand,
    els.partyStatTarget,
    els.partyStatUuid,
    els.partyStatMode,
    els.statStrength,
    els.statDexterity,
    els.statConstitution,
    els.statIntelligence,
    els.statWisdom,
    els.statCharisma,
    els.statAc,
    els.statHp,
    els.statMovement,
    els.statInitiative,
    els.partyStatsApply,
    els.partyStatsRemove,
    els.tavMode,
    els.tavUuid,
    els.tavCommand,
    ...document.querySelectorAll("[data-load-text]"),
    ...document.querySelectorAll("[data-save-text]")
  ]) {
    item.disabled = !enabled;
  }
}

function setBrowserOnlyMode(error) {
  state.staticMode = true;
  state.config = {
    storyRoot: "",
    divine: "",
    divineExists: false,
    storyRootExists: false,
    knownLevels: [],
    goldTemplate: "1c3c9c74-34a1-4685-989e-410dc080be6f"
  };
  state.characters = [];
  state.statusLibrary = [
    { name: "HASTE", source: "common" },
    { name: "INVISIBLE", source: "common" },
    { name: "LONG_REST", source: "common" },
    { name: "KNOCKED_OUT", source: "common" },
    { name: "DOWNED", source: "common" }
  ];
  renderStatusLibrary(state.statusLibrary);
  renderSaveCharacters();
  setStatus("Browser-only");
  els.configText.textContent = "Opened from a static website. Full save editing needs the local Node helper running on this PC.";
  els.storyRoot.value = "";
  els.divine.value = "";
  els.saveCount.textContent = "0 local saves";
  els.saveList.innerHTML = `
    <div class="card">
      <div class="card-title">Browser-only mode</div>
      <div class="card-sub">A hosted webpage cannot scan BG3 folders, run Divine.exe, write backups, restore modsettings.lsx, or repack .lsv saves.</div>
      <div class="card-sub">Download the repo, run START SERVER.bat, then open http://localhost:8081 for the full editor.</div>
    </div>
  `;
  els.selectedFolder.textContent = "Static website";
  els.saveTitle.textContent = "Download and run locally for full editing";
  els.facts.innerHTML = "";
  for (const [label, value] of [
    ["Mode", "Browser-only"],
    ["Full editor", "Needs local server"],
    ["Reason", "Browsers cannot access or modify arbitrary PC files"]
  ]) {
    const el = document.createElement("span");
    el.className = "fact";
    el.textContent = `${label}: ${value}`;
    els.facts.append(el);
  }
  setControls(false);
  for (const item of [
    els.goldAmount,
    els.goldCommand,
    els.statusPreset,
    els.statusId,
    els.statusTarget,
    els.statusUuid,
    els.statusRadius,
    els.statusDuration,
    els.statusForce,
    els.statusSlot,
    els.statusApply,
    els.statusRemove,
    els.partyStatTarget,
    els.partyStatUuid,
    els.partyStatMode,
    els.statStrength,
    els.statDexterity,
    els.statConstitution,
    els.statIntelligence,
    els.statWisdom,
    els.statCharisma,
    els.statAc,
    els.statHp,
    els.statMovement,
    els.statInitiative,
    els.partyStatsApply,
    els.partyStatsRemove
  ]) {
    item.disabled = false;
  }
  els.statusTarget.value = "current";
  els.goldCommandText.value = "";
  log(`Browser-only mode is active.

The public website can show instructions and build paste commands, but it cannot edit BG3 saves by itself.

To use the real save editor:
1. Download the GitHub ZIP.
2. Extract it.
3. Double-click START SERVER.bat.
4. Open http://localhost:8081.

Startup error:
${error?.message || error || "No local helper server responded."}`);
}

function partyCharacters() {
  return state.details?.saveInfo?.["Active Party"]?.Characters || [];
}

function renderLevelOptions(levels) {
  const current = els.level.value;
  els.levelSelect.innerHTML = `<option value="">Custom / typed ID</option>`;
  for (const level of levels || []) {
    const option = document.createElement("option");
    option.value = level.id;
    option.textContent = `${level.id} - ${level.label} (${level.source})`;
    if (level.id === current) option.selected = true;
    els.levelSelect.append(option);
  }
}

function leaderLabel(char, index) {
  const classes = (char.Classes || []).map((c) => c.Main).filter(Boolean).join("/");
  const race = char.Race || "";
  return `${char.Origin || `Party ${index + 1}`}${race ? ` | ${race}` : ""}${classes ? ` | ${classes}` : ""}`;
}

function renderLeaderOptions(characters, currentLeader) {
  els.leaderSelect.innerHTML = `<option value="">Custom / typed name</option>`;
  if (currentLeader) {
    const current = document.createElement("option");
    current.value = currentLeader;
    current.textContent = `Current save name - ${currentLeader}`;
    current.selected = true;
    els.leaderSelect.append(current);
  }
  characters.forEach((char, index) => {
    const option = document.createElement("option");
    const value = char.Origin && char.Origin !== "Generic" ? char.Origin : leaderLabel(char, index);
    option.value = value;
    option.textContent = leaderLabel(char, index);
    els.leaderSelect.append(option);
  });
}

function characterLabel(char) {
  const bits = [
    `#${char.index}`,
    char.model || "",
    char.uuid || "no script UUID",
    char.level || "",
    char.statusCount ? `${char.statusCount} status` : "no statuses"
  ].filter(Boolean);
  return bits.join(" | ");
}

function selectedSaveCharacter() {
  const index = Number(els.statusCharacter.value);
  return state.characters.find((char) => char.index === index) || null;
}

function renderSaveCharacters() {
  els.statusCharacter.innerHTML = "";
  if (!state.characters.length) {
    els.statusCharacter.innerHTML = `<option value="">No saved character rows found</option>`;
    els.characterUuid.value = "";
    renderCurrentStatuses();
    return;
  }
  const usable = state.characters.filter((char) => char.uuid);
  const rows = usable.length ? usable : state.characters;
  for (const char of rows) {
    const option = document.createElement("option");
    option.value = String(char.index);
    option.textContent = characterLabel(char);
    els.statusCharacter.append(option);
  }
  renderCurrentStatuses();
}

function renderCurrentStatuses() {
  const char = selectedSaveCharacter();
  els.characterUuid.value = char?.uuid || "";
  if (!char) {
    els.statusCurrentList.textContent = "No save character selected.";
    return;
  }
  const header = [
    `UUID: ${char.uuid || "not stored in this row"}`,
    `Entity: ${char.entity || "unknown"}`,
    `Template: ${char.model || char.currentTemplate || char.templateId || "unknown"}`,
    `Level: ${char.level || "unknown"}`,
    `XYZ: ${char.position || "unknown"}`
  ].join("\n");
  if (!char.statuses?.length) {
    els.statusCurrentList.textContent = `${header}\n\nCurrent statuses: none found in this save row.`;
    return;
  }
  const lines = char.statuses.map((status) => {
    const life = status.lifetime ? ` | life ${status.lifetime}` : "";
    const current = status.currentLifetime ? ` | current ${status.currentLifetime}` : "";
    return `${status.id}${life}${current}`;
  });
  els.statusCurrentList.textContent = `${header}\n\nCurrent statuses:\n${lines.join("\n")}`;
}

function renderStatusLibrary(statuses) {
  const rows = statuses || [];
  els.statusPreset.innerHTML = `<option value="">Type your own status</option>`;
  els.statusPresetList.innerHTML = "";
  for (const status of rows) {
    const option = document.createElement("option");
    option.value = status.name;
    option.textContent = `${status.name}${status.source ? ` (${status.source})` : ""}`;
    els.statusPreset.append(option);

    const data = document.createElement("option");
    data.value = status.name;
    data.label = status.source || "";
    els.statusPresetList.append(data);
  }
}

function renderPartyStatTargets(characters) {
  const current = els.partyStatTarget.value;
  els.partyStatTarget.innerHTML = "";
  const base = [
    ["current", "Current controlled character"],
    ["host", "Host character"],
    ["allParty", "All active party members"],
    ["uuid", "Manual UUID"]
  ];
  for (const [value, label] of base) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    els.partyStatTarget.append(option);
  }
  (characters || []).forEach((char, index) => {
    const option = document.createElement("option");
    option.value = `partyIndex:${index + 1}`;
    option.textContent = `Party slot ${index + 1} - ${leaderLabel(char, index)}`;
    els.partyStatTarget.append(option);
  });
  if ([...els.partyStatTarget.options].some((option) => option.value === current)) {
    els.partyStatTarget.value = current;
  }
}

function renderDetails() {
  const details = state.details;
  const info = details?.saveInfo;
  const meta = details?.meta;

  els.selectedFolder.textContent = state.selected ? `${state.selected.source}: ${state.selected.folder}` : "No save selected";
  els.saveTitle.textContent = info?.["Save Name"] || state.selected?.lsv || "Select a save";
  els.thumb.hidden = !state.selected?.webp;
  if (state.selected?.webp) {
    els.thumb.src = `/api/thumbnail?source=${encodeURIComponent(state.selected.source)}&folder=${encodeURIComponent(state.selected.folder)}&t=${Date.now()}`;
  }

  els.facts.innerHTML = "";
  const facts = [
    ["Source", state.selected?.source],
    ["Level", info?.["Current Level"] || meta?.level],
    ["Displayed Hours", meta?.timeStamp ? `${(Number(meta.timeStamp) / 3600).toFixed(2)}h` : ""],
    ["Difficulty", Array.isArray(info?.Difficulty) ? info.Difficulty.join(", ") : ""],
    ["Game Version", info?.["Game Version"]],
    ["Modules", meta?.mods?.length ? `${meta.mods.length}` : ""],
    ["Globals Edited", details?.globalsEdited ? "yes" : ""],
    ["Work Copy", details?.work]
  ];
  for (const [label, value] of facts) {
    if (!value) continue;
    const el = document.createElement("span");
    el.className = "fact";
    el.textContent = `${label}: ${value}`;
    els.facts.append(el);
  }

  els.saveName.value = info?.["Save Name"] || "";
  els.level.value = info?.["Current Level"] || meta?.level || "";
  els.leader.value = meta?.leaderName || "";
  els.playHours.value = meta?.timeStamp ? (Number(meta.timeStamp) / 3600).toFixed(2) : "";
  els.goldCommandText.value = "";
  els.statusCommandText.value = "";
  els.characterCommandText.value = "";
  els.partyStatsCommandText.value = "";
  els.tavCommandText.value = "";

  const characters = partyCharacters();
  renderLevelOptions(details?.levels || state.config?.knownLevels || []);
  renderLeaderOptions(characters, meta?.leaderName || "");
  renderPartyStatTargets(characters);
  renderSaveCharacters();
  renderParty(characters);
  renderMods(meta?.mods || []);
  setControls(!!details);
}

function renderParty(characters) {
  els.party.innerHTML = "";
  if (!characters.length) {
    els.party.innerHTML = `<div class="card"><div class="card-sub">No party data in SaveInfo.json.</div></div>`;
    return;
  }
  characters.forEach((char, index) => {
    const classes = (char.Classes || []).map((c) => `${c.Main}${c.Sub ? ` / ${c.Sub}` : ""}`).join(", ");
    const position = Array.isArray(char.Position) ? char.Position.map((v) => Number(v).toFixed(2)).join(", ") : "";
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="card-title">${index + 1}. ${escapeHtml(char.Origin || "Unknown")}</div>
      <div class="card-sub">${escapeHtml(char.Race || "")} | Level ${escapeHtml(char.Level || "")} | ${escapeHtml(classes)}</div>
      <div class="card-sub">XP ${escapeHtml(char["Experience Points (Total)"] || "")} | ${escapeHtml(char.Subregion || "")}</div>
      <div class="card-sub">${position ? `XYZ ${escapeHtml(position)}` : ""}</div>
    `;
    els.party.append(card);
  });
}

function renderMods(mods) {
  els.mods.innerHTML = "";
  if (!mods.length) {
    els.mods.innerHTML = `<div class="module"><div class="module-sub">No module list found.</div></div>`;
    return;
  }
  mods.forEach((mod) => {
    const item = document.createElement("div");
    item.className = "module";
    item.innerHTML = `
      <div class="module-title">${mod.order}. ${escapeHtml(mod.name || mod.folder)}</div>
      <div class="module-sub">${escapeHtml(mod.uuid)}</div>
      <div class="module-sub">${escapeHtml(mod.folder)} | ${escapeHtml(mod.version64)}</div>
    `;
    els.mods.append(item);
  });
}

async function loadConfig() {
  const config = await api("/api/config");
  renderConfig(config);
  return config;
}

async function loadSaves() {
  setStatus("Loading");
  const data = await api("/api/saves");
  state.saves = data.saves;
  setStatus("Online");
  renderSaves();
}

async function loadStatusLibrary() {
  try {
    const data = await api("/api/status-library");
    state.statusLibrary = data.statuses || [];
    renderStatusLibrary(state.statusLibrary);
  } catch (error) {
    state.statusLibrary = [];
    renderStatusLibrary([]);
    log(`Status library could not be loaded from the BG3 install.\n${error.message}`);
  }
}

async function loadSaveCharacters() {
  if (!state.selected) return;
  try {
    const data = await api("/api/save-characters", saveRef());
    state.characters = data.characters || [];
  } catch (error) {
    state.characters = [];
    log(`Character/status scan failed.\n${error.message}`);
  }
  renderSaveCharacters();
}

async function selectSave(save) {
  state.selected = save;
  state.details = null;
  state.characters = [];
  setControls(false);
  renderSaves();
  log("Extracting save. Large saves can take a little while.");
  setStatus("Extracting");
  const details = await api("/api/details", { ...saveRef(), reextract: false });
  state.details = details;
  renderDetails();
  setStatus("Scanning characters");
  await loadSaveCharacters();
  log(`Extracted work copy. Original save has not been changed.\nCharacters scanned: ${state.characters.length}`);
  setStatus("Online");
}

async function loadText(file) {
  if (!state.selected) return;
  setStatus("Loading text");
  const data = await api("/api/get-text", { ...saveRef(), file });
  const target = file === "SaveInfo.json" ? els.saveinfoText : file === "meta.lsx" ? els.metaText : els.globalsText;
  target.value = data.text;
  log(`Loaded ${file}.`);
  setStatus("Online");
}

async function saveText(file) {
  if (!state.selected) return;
  const target = file === "SaveInfo.json" ? els.saveinfoText : els.metaText;
  setStatus("Saving text");
  await api("/api/put-text", { ...saveRef(), file, text: target.value });
  log(`Saved ${file} to the extracted work copy.`);
  setStatus("Online");
}

async function backupSelected() {
  if (!state.selected) return;
  setStatus("Backing up");
  const data = await api("/api/backup", saveRef());
  log(`Backup created:\n${data.backup}`);
  setStatus("Online");
}

async function applyQuickEdit() {
  if (!state.selected) return;
  setStatus("Applying");
  await api("/api/quick-edit", {
    ...saveRef(),
    saveName: els.saveName.value,
    currentLevel: els.level.value,
    leaderName: els.leader.value,
    playedHours: els.playHours.value
  });
  const details = await api("/api/details", { ...saveRef(), reextract: false });
  state.details = details;
  renderDetails();
  log("Fields applied to the extracted work copy.");
  setStatus("Online");
}

async function restoreModsettings() {
  if (!state.selected) return;
  setStatus("Restoring");
  const data = await api("/api/restore-modsettings", saveRef());
  log(`modsettings.lsx rebuilt from this save.\nBackup:\n${data.backup}`);
  setStatus("Online");
}

async function repackSelected() {
  if (!state.selected) return;
  setStatus("Repacking");
  const data = await api("/api/repack", {
    ...saveRef(),
    outputName: els.saveName.value || "Edited Save",
    levelCache: els.levelCacheMode.value
  });
  log(`Edited copy created:\n${data.folder}\n${data.lsv}\nDownload:\n${location.origin}${data.download}`);
  await loadSaves();
  setStatus("Online");
}

function buildGoldCommand() {
  const amount = Math.floor(Number(els.goldAmount.value || 0));
  const template = state.details?.goldTemplate || state.config?.goldTemplate || "1c3c9c74-34a1-4685-989e-410dc080be6f";
  const command = `do local target=Osi.GetHostCharacter(); local amount=${amount}; local goldTemplate="${template}"; Osi.TemplateAddTo(goldTemplate,target,amount,1); _P("Added "..tostring(amount).." gold to "..tostring(target)) end`;
  els.goldCommandText.value = command;
  log("Gold Script Extender command built.");
}

async function editGoldGlobals() {
  if (!state.selected) return;
  const amount = Math.floor(Number(els.goldAmount.value || 0));
  setStatus("Editing gold");
  const data = await api("/api/gold-edit", { ...saveRef(), amount });
  const details = await api("/api/details", saveRef());
  state.details = details;
  renderDetails();
  log(`Changed ${data.changes} existing gold stack(s) in Globals.lsx to ${data.amount}. Repack an edited copy to test it.`);
  setStatus("Online");
}

function luaString(value) {
  return `"${String(value ?? "").replace(/\\/g, "\\\\").replace(/"/g, "\\\"").replace(/\r?\n/g, "\\n")}"`;
}

function numberValue(input, fallback) {
  const value = Number(input.value);
  return Number.isFinite(value) ? value : fallback;
}

function selectedCharacterUuid() {
  return selectedSaveCharacter()?.uuid || "";
}

function buildStatusCommand(action) {
  const status = els.statusId.value.trim();
  const targetMode = els.statusTarget.value;
  const selectedUuid = selectedCharacterUuid();
  const explicitUuid = els.statusUuid.value.trim();
  const targetUuid = targetMode === "character" ? selectedUuid : explicitUuid;
  const radius = Math.max(0, numberValue(els.statusRadius, 20));
  const duration = numberValue(els.statusDuration, -1);
  const force = Math.max(0, Math.floor(numberValue(els.statusForce, 100)));
  const slot = els.statusSlot.value;
  if (!status) {
    log("Enter or choose a status ID first.");
    return;
  }
  if (targetMode === "character" && !selectedUuid) {
    log("The selected save character does not have a script UUID. Pick another row or paste a UUID manually.");
    return;
  }
  if (targetMode === "uuid" && !explicitUuid) {
    log("Paste a specific character/item UUID first.");
    return;
  }

  const slots = [
    "Melee Main Weapon", "Melee Offhand Weapon", "Ranged Main Weapon", "Ranged Offhand Weapon",
    "Breast", "Cloak", "Boots", "Gloves", "Helmet", "Ring", "Ring2", "Amulet",
    "Underwear", "VanityBody", "VanityBoots", "MusicalInstrument"
  ];
  const command = `do local status=${luaString(status)}; local targetMode=${luaString(targetMode)}; local targetUuid=${luaString(targetUuid)}; local radius=${radius}; local duration=${duration}; local force=${force}; local slot=${luaString(slot)}; local action=${luaString(action)}; local slots={${slots.map(luaString).join(",")}}; local count=0; local function txt(v) local ok,s=pcall(tostring,v); if ok then return s end; return "" end; local function current() local host=Osi.GetHostCharacter(); local user=host and Osi.GetReservedUserID(host); local cur=(user and user~=-65536 and Osi.GetCurrentCharacter(user)) or nil; return cur or host end; local function resolve(h) if h==nil then return nil end; if Osi.ResolveTranslatedString then local ok,n=pcall(Osi.ResolveTranslatedString,h); if ok and n then return txt(n) end end; if Ext and Ext.Loca and Ext.Loca.GetTranslatedString then local ok,n=pcall(Ext.Loca.GetTranslatedString,h,txt(h)); if ok and n then return txt(n) end end; return txt(h) end; local function nameOf(id) local ok,h=pcall(Osi.GetDisplayName,id); if ok and h then return resolve(h) or txt(h) end; return txt(id) end; local function applyOne(id,label) if not id or txt(id)=="" then return end; local ok,err; if action=="remove" then ok,err=pcall(Osi.RemoveStatus,id,status) else ok,err=pcall(Osi.ApplyStatus,id,status,duration,force,current() or id) end; if ok then count=count+1; _P((action=="remove" and "Removed " or "Applied ")..status.." -> "..txt(label or nameOf(id)).." | "..txt(id)) else _P("FAILED "..status.." -> "..txt(label or nameOf(id)).." | "..txt(id).." | "..txt(err)) end end; local center=current(); if targetMode=="current" then applyOne(center,nameOf(center)) elseif targetMode=="host" then local host=Osi.GetHostCharacter(); applyOne(host,nameOf(host)) elseif targetMode=="character" or targetMode=="uuid" then applyOne(targetUuid,nameOf(targetUuid)) elseif targetMode=="party" then for _,p in pairs(Osi.DB_PartyMembers:Get(nil)) do applyOne(p[1],nameOf(p[1])) end elseif targetMode=="nearby" or targetMode=="enemies" then if not (Ext and Ext.Entity and Ext.Entity.GetAllEntitiesWithComponent) then _P("Script Extender entity scan is unavailable.") else for _,ent in pairs(Ext.Entity.GetAllEntitiesWithComponent("ServerCharacter")) do local id=ent.Uuid.EntityUuid; local dist=Osi.GetDistanceTo(id,center); if id and dist and dist<=radius and txt(id)~=txt(center) then local use=true; if targetMode=="enemies" then local ok,e=pcall(Osi.IsEnemy,id,center); use=ok and (e==1 or e==true) end; if use then applyOne(id,nameOf(id).." | "..txt(dist).."m") end end end end elseif targetMode=="slot" or targetMode=="allSlots" then local carrier=targetUuid~="" and targetUuid or center; local function itemIn(s) local ok,item=pcall(Osi.GetEquippedItem,carrier,s); if ok and item and txt(item)~="" then applyOne(item,"slot "..s) end end; if targetMode=="slot" then itemIn(slot) else for _,s in ipairs(slots) do itemIn(s) end end else _P("Unknown target mode: "..txt(targetMode)) end; _P("Done. "..(action=="remove" and "Removed " or "Applied ")..status.." on "..txt(count).." target(s).") end`;
  els.statusCommandText.value = command;
  log(`Status ${action} command built.`);
}

function buildCharacterCommand() {
  const char = selectedSaveCharacter();
  const target = char?.uuid || els.statusUuid.value.trim();
  const action = els.characterAction.value;
  if (!target) {
    log("Select a save character with a UUID, or paste a UUID in the Status Editor UUID field.");
    return;
  }
  const command = `do local target=${luaString(target)}; local action=${luaString(action)}; local function txt(v) local ok,s=pcall(tostring,v); if ok then return s end; return "" end; local function current() local host=Osi.GetHostCharacter(); local user=host and Osi.GetReservedUserID(host); local cur=(user and user~=-65536 and Osi.GetCurrentCharacter(user)) or nil; return cur or host end; local function resolve(h) if h==nil then return nil end; if Osi.ResolveTranslatedString then local ok,n=pcall(Osi.ResolveTranslatedString,h); if ok and n then return txt(n) end end; if Ext and Ext.Loca and Ext.Loca.GetTranslatedString then local ok,n=pcall(Ext.Loca.GetTranslatedString,h,txt(h)); if ok and n then return txt(n) end end; return txt(h) end; local function nameOf(id) local ok,h=pcall(Osi.GetDisplayName,id); if ok and h then return resolve(h) or txt(h) end; return txt(id) end; local function modelOf(id) if Ext and Ext.Entity and Ext.Entity.Get then local ok,e=pcall(Ext.Entity.Get,id); if ok and e then local ok1,m1=pcall(function() return e.ServerCharacter.Template.Name end); if ok1 and m1 then return txt(m1) end; local ok2,m2=pcall(function() return e.ServerCharacter.Template.Id end); if ok2 and m2 then return txt(m2) end end end; return "no_model_name" end; local host=current(); if action=="log" then _P("Display Name: "..nameOf(target)); _P("Model: "..modelOf(target)); _P("UUID: "..target); local okx,x=pcall(Osi.GetPosition,target); if okx then _P("Position: "..txt(x)) end elseif action=="teleportToHost" then pcall(Osi.SetOnStage,target,1); local ok,err=pcall(Osi.TeleportTo,target,host,"",0,0,0,0,1); _P("Teleport selected to host: "..txt(ok).." | "..txt(err)) elseif action=="bringHost" then local ok,err=pcall(Osi.TeleportTo,host,target,"",0,0,0,0,1); _P("Teleport host to selected: "..txt(ok).." | "..txt(err)) elseif action=="revive" then pcall(Osi.Resurrect,target); pcall(Osi.SetHitpointsPercentage,target,100,"Guaranteed"); _P("Revived/healed: "..nameOf(target).." | "..target) elseif action=="heal" then pcall(Osi.SetHitpointsPercentage,target,100,"Guaranteed"); _P("Healed: "..nameOf(target).." | "..target) elseif action=="knockout" then local ok,err=pcall(Osi.ApplyStatus,target,"KNOCKED_OUT",-1,100,host); _P("Knockout status: "..txt(ok).." | "..txt(err).." | "..target) elseif action=="kill" then pcall(Osi.Die,target,"Physical",host,1,1,0); pcall(Osi.SetHitpoints,target,0); _P("Killed: "..nameOf(target).." | "..target) else _P("Unknown action: "..txt(action)) end end`;
  els.characterCommandText.value = command;
  log("Character command built.");
}

function statNumber(input, label, min, max) {
  const raw = input.value.trim();
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || Math.trunc(value) !== value || value < min || value > max) {
    throw new Error(`${label} must be a whole number from ${min} to ${max}.`);
  }
  return value;
}

function buildPartyStatsCommand(action) {
  let targetMode = els.partyStatTarget.value || "current";
  let partyIndex = 0;
  if (targetMode.startsWith("partyIndex:")) {
    partyIndex = Number(targetMode.split(":")[1]);
    targetMode = "partyIndex";
  }
  const manualUuid = els.partyStatUuid.value.trim();
  if (targetMode === "uuid" && !manualUuid) {
    log("Paste a character UUID for manual UUID target first.");
    return;
  }

  const mode = els.partyStatMode.value;
  const abilityInputs = [
    ["Strength", els.statStrength],
    ["Dexterity", els.statDexterity],
    ["Constitution", els.statConstitution],
    ["Intelligence", els.statIntelligence],
    ["Wisdom", els.statWisdom],
    ["Charisma", els.statCharisma]
  ];
  const boosts = [];
  const cleanAbilities = [];

  try {
    for (const [ability, input] of abilityInputs) {
      const value = statNumber(input, ability, mode === "minimum" ? 1 : -50, mode === "minimum" ? 60 : 50);
      if (value === null) continue;
      cleanAbilities.push(ability);
      if (mode === "minimum") {
        boosts.push(`AbilityOverrideMinimum(${ability},${value},true)`);
      } else if (value !== 0) {
        boosts.push(`Ability(${ability},${value})`);
      }
    }

    const ac = statNumber(els.statAc, "AC bonus", -50, 50);
    const hp = statNumber(els.statHp, "Max HP bonus", -500, 500);
    const movement = statNumber(els.statMovement, "Movement bonus", -30, 30);
    const initiative = statNumber(els.statInitiative, "Initiative bonus", -50, 50);
    if (ac !== null && ac !== 0) boosts.push(`AC(${ac})`);
    if (hp !== null && hp !== 0) boosts.push(`IncreaseMaxHP(${hp})`);
    if (movement !== null && movement !== 0) boosts.push(`MovementSpeed(${movement})`);
    if (initiative !== null && initiative !== 0) boosts.push(`Initiative(${initiative})`);

    const cleanAc = ac !== null;
    const cleanHp = hp !== null;
    const cleanMovement = movement !== null;
    const cleanInitiative = initiative !== null;
    const cleanAll = action === "remove" && !cleanAbilities.length && !cleanAc && !cleanHp && !cleanMovement && !cleanInitiative;
    if (action === "apply" && !boosts.length) {
      log("Enter at least one stat value before building an apply command.");
      return;
    }

    const command = `do local action=${luaString(action)}; local targetMode=${luaString(targetMode)}; local partyIndex=${partyIndex || 0}; local manualUuid=${luaString(manualUuid)}; local boosts={${boosts.map(luaString).join(",")}}; local cleanAbilities={${(cleanAll ? abilityInputs.map(([a]) => a) : cleanAbilities).map(luaString).join(",")}}; local cleanAc=${cleanAll || cleanAc ? "true" : "false"}; local cleanHp=${cleanAll || cleanHp ? "true" : "false"}; local cleanMovement=${cleanAll || cleanMovement ? "true" : "false"}; local cleanInitiative=${cleanAll || cleanInitiative ? "true" : "false"}; local function txt(v) local ok,s=pcall(tostring,v); if ok then return s end; return "" end; local function current() local host=Osi.GetHostCharacter(); local user=host and Osi.GetReservedUserID(host); local cur=(user and user~=-65536 and Osi.GetCurrentCharacter(user)) or nil; return cur or host end; local function resolve(h) if h==nil then return nil end; if Osi.ResolveTranslatedString then local ok,n=pcall(Osi.ResolveTranslatedString,h); if ok and n then return txt(n) end end; if Ext and Ext.Loca and Ext.Loca.GetTranslatedString then local ok,n=pcall(Ext.Loca.GetTranslatedString,h,txt(h)); if ok and n then return txt(n) end end; return txt(h) end; local function nameOf(id) local ok,h=pcall(Osi.GetDisplayName,id); if ok and h then return resolve(h) or txt(h) end; return txt(id) end; local function partyList() local out={}; local ok,rows=pcall(function() return Osi.DB_PartyMembers:Get(nil) end); if ok and rows then for _,r in ipairs(rows) do out[#out+1]=r[1] end; if #out==0 then for _,r in pairs(rows) do out[#out+1]=r[1] end end end; return out end; local function selectedTargets() if targetMode=="current" then return {current()} elseif targetMode=="host" then return {Osi.GetHostCharacter()} elseif targetMode=="uuid" then return {manualUuid} elseif targetMode=="allParty" then return partyList() elseif targetMode=="partyIndex" then local p=partyList(); if not p[partyIndex] then _P("Party slot "..txt(partyIndex).." was not found. Current DB_PartyMembers:"); for i,id in ipairs(p) do _P(txt(i)..": "..nameOf(id).." | "..txt(id)) end; return {} end; return {p[partyIndex]} end; return {} end; local function rem(target,boost) pcall(Osi.RemoveBoosts,target,boost,0,"",target) end; local function cleanup(target) for _,a in ipairs(cleanAbilities) do for v=1,60 do rem(target,"AbilityOverrideMinimum("..a..","..txt(v)..",true)"); rem(target,"AbilityOverrideMinimum("..a..","..txt(v)..")") end; for v=1,50 do rem(target,"Ability("..a..","..txt(v)..")"); rem(target,"Ability("..a..",-"..txt(v)..")") end end; if cleanAc then for v=-50,50 do rem(target,"AC("..txt(v)..")") end end; if cleanHp then for v=-500,500 do rem(target,"IncreaseMaxHP("..txt(v)..")") end end; if cleanMovement then for v=-30,30 do rem(target,"MovementSpeed("..txt(v)..")") end end; if cleanInitiative then for v=-50,50 do rem(target,"Initiative("..txt(v)..")") end end end; local targets=selectedTargets(); local changed=0; for _,target in ipairs(targets) do if target and txt(target)~="" then cleanup(target); if action=="apply" then local joined=table.concat(boosts,";"); if joined~="" then local ok,err=pcall(Osi.AddBoosts,target,joined,"",target); if ok then changed=changed+1; _P("Applied stat boosts to "..nameOf(target).." | "..txt(target).." | "..joined) else _P("FAILED stat boosts for "..nameOf(target).." | "..txt(target).." | "..txt(err)) end end else changed=changed+1; _P("Removed matching custom stat boosts from "..nameOf(target).." | "..txt(target)) end end end; _P("Party Stats Editor done. Action="..action.." targets="..txt(changed)..".") end`;
    els.partyStatsCommandText.value = command;
    log(`Party stats ${action} command built.`);
  } catch (error) {
    log(error.message);
  }
}

async function buildTavCommand() {
  if (!state.selected) return;
  setStatus("Building command");
  const data = await api("/api/tav-command", {
    mode: els.tavMode.value,
    uuid: els.tavUuid.value
  });
  els.tavCommandText.value = data.command;
  log(data.sourceFile ? `Tav command built from:\n${data.sourceFile}` : "Tav command built from fallback template.");
  setStatus("Online");
}

function setTab(tabName) {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.tab === tabName);
  });
  document.querySelectorAll(".panel").forEach((panel) => panel.classList.remove("active"));
  $(`#${tabName}Panel`).classList.add("active");
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || "").split(",")[1] || "");
    reader.onerror = () => reject(reader.error || new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}

async function uploadSave() {
  const lsv = els.uploadLsv.files?.[0];
  if (!lsv) {
    log("Choose a .lsv file first.");
    return;
  }
  setStatus("Uploading");
  const webp = els.uploadWebp.files?.[0];
  const payload = {
    fileName: lsv.name,
    dataBase64: await fileToBase64(lsv)
  };
  if (webp) {
    payload.webpName = webp.name;
    payload.webpBase64 = await fileToBase64(webp);
  }
  const data = await api("/api/upload-save", payload);
  log(`Uploaded save into manual workspace:\n${data.root}\\${data.folder}`);
  await loadSaves();
  const uploaded = state.saves.find((save) => save.source === data.source && save.folder === data.folder);
  if (uploaded) await selectSave(uploaded);
  setStatus("Online");
}

async function applyPaths() {
  setStatus("Updating paths");
  const config = await api("/api/set-paths", {
    storyRoot: els.storyRoot.value,
    divine: els.divine.value
  });
  renderConfig(config);
  await loadSaves();
  log("Paths updated.");
  setStatus("Online");
}

els.refresh.addEventListener("click", () => loadSaves().catch((error) => log(error.message)));
els.rescan.addEventListener("click", () => loadConfig().then(loadSaves).catch((error) => log(error.message)));
els.search.addEventListener("input", renderSaves);
els.applyPaths.addEventListener("click", () => applyPaths().catch((error) => {
  setStatus("Error");
  log(error.message);
}));
els.upload.addEventListener("click", () => uploadSave().catch((error) => {
  setStatus("Error");
  log(error.message);
}));
els.backup.addEventListener("click", () => backupSelected().catch((error) => log(error.message)));
els.applyQuick.addEventListener("click", () => applyQuickEdit().catch((error) => log(error.message)));
els.restoreMods.addEventListener("click", () => restoreModsettings().catch((error) => log(error.message)));
els.repack.addEventListener("click", () => repackSelected().catch((error) => log(error.message)));
els.goldCommand.addEventListener("click", buildGoldCommand);
els.goldGlobals.addEventListener("click", () => editGoldGlobals().catch((error) => {
  setStatus("Error");
  log(error.message);
}));
els.statusApply.addEventListener("click", () => buildStatusCommand("apply"));
els.statusRemove.addEventListener("click", () => buildStatusCommand("remove"));
els.statusCharacter.addEventListener("change", renderCurrentStatuses);
els.statusPreset.addEventListener("change", () => {
  if (els.statusPreset.value) els.statusId.value = els.statusPreset.value;
});
els.characterCommand.addEventListener("click", buildCharacterCommand);
els.partyStatsApply.addEventListener("click", () => buildPartyStatsCommand("apply"));
els.partyStatsRemove.addEventListener("click", () => buildPartyStatsCommand("remove"));
els.tavCommand.addEventListener("click", () => buildTavCommand().catch((error) => {
  setStatus("Error");
  log(error.message);
}));

els.levelSelect.addEventListener("change", () => {
  if (els.levelSelect.value) els.level.value = els.levelSelect.value;
});

els.leaderSelect.addEventListener("change", () => {
  if (els.leaderSelect.value) els.leader.value = els.leaderSelect.value;
});

document.querySelectorAll("[data-load-text]").forEach((button) => {
  button.addEventListener("click", () => loadText(button.dataset.loadText).catch((error) => log(error.message)));
});

document.querySelectorAll("[data-save-text]").forEach((button) => {
  button.addEventListener("click", () => saveText(button.dataset.saveText).catch((error) => log(error.message)));
});

document.querySelectorAll(".tab").forEach((button) => {
  button.addEventListener("click", () => setTab(button.dataset.tab));
});

setControls(false);
loadConfig()
  .then(() => {
    log(`Story saves:\n${state.config.storyRoot || "not found"}\nDivine: ${state.config.divineExists ? "found" : "missing"}`);
    return loadStatusLibrary();
  })
  .then(() => loadSaves())
  .then(() => {
    if (state.statusLibrary.length) log(`Loaded ${state.statusLibrary.length} status presets.`);
  })
  .catch((error) => {
    setBrowserOnlyMode(error);
  });
