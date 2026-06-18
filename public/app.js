const state = {
  staticMode: false,
  config: null,
  saves: [],
  filtered: [],
  selected: null,
  details: null
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
  levelCacheMode: $("#levelCacheMode"),
  applyQuick: $("#applyQuickBtn"),
  goldAmount: $("#goldAmountInput"),
  goldCommand: $("#goldCommandBtn"),
  goldGlobals: $("#goldGlobalsBtn"),
  goldCommandText: $("#goldCommandText"),
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
    els.levelCacheMode,
    els.applyQuick,
    els.goldAmount,
    els.goldCommand,
    els.goldGlobals,
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
  setStatus("Browser-only");
  els.configText.textContent = "Opened from a static website. Full save editing needs the local Node helper running on this PC.";
  els.storyRoot.value = "";
  els.divine.value = "";
  els.saveCount.textContent = "0 local saves";
  els.saveList.innerHTML = `
    <div class="card">
      <div class="card-title">Browser-only mode</div>
      <div class="card-sub">A hosted webpage cannot scan local BG3 folders, run Divine.exe, write backups, restore modsettings.lsx, or repack .lsv saves.</div>
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
  els.goldAmount.disabled = false;
  els.goldCommand.disabled = false;
  els.goldCommandText.value = "";
  log(`Browser-only mode is active.

The public website can show instructions and build simple paste commands, but it cannot edit BG3 saves by itself.

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
  els.goldCommandText.value = "";

  const characters = partyCharacters();
  renderLevelOptions(details?.levels || state.config?.knownLevels || []);
  renderLeaderOptions(characters, meta?.leaderName || "");
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

async function selectSave(save) {
  state.selected = save;
  state.details = null;
  setControls(false);
  renderSaves();
  log("Extracting save. Large saves can take a little while.");
  setStatus("Extracting");
  const details = await api("/api/details", { ...saveRef(), reextract: false });
  state.details = details;
  renderDetails();
  log("Extracted work copy. Original save has not been changed.");
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
    leaderName: els.leader.value
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
  if (state.staticMode) {
    const lsv = els.uploadLsv.files?.[0];
    log(lsv
      ? `Selected ${lsv.name}, but browser-only mode cannot unpack .lsv saves. Run START SERVER.bat locally to use manual upload.`
      : "Choose a .lsv file first. Browser-only mode can select a file, but it cannot unpack/repack it without the local helper.");
    return;
  }
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
  if (state.staticMode) {
    log("Path scanning and manual path use need the local helper server. Run START SERVER.bat, then open http://localhost:8081.");
    return;
  }
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
els.rescan.addEventListener("click", () => loadConfig().then(loadSaves).catch((error) => {
  if (state.staticMode) setBrowserOnlyMode(error);
  else log(error.message);
}));
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
    return loadSaves();
  })
  .catch((error) => {
    setBrowserOnlyMode(error);
  });
