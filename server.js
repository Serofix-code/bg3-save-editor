const http = require("node:http");
const fs = require("node:fs/promises");
const fss = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { execFile } = require("node:child_process");

const PORT = Number(process.env.PORT || 8081);
const HOST = process.env.HOST || "0.0.0.0";
const PUBLIC_ROOT = path.join(__dirname, "public");
const WORK_ROOT = path.join(__dirname, "work");
const EXTRACT_ROOT = path.join(WORK_ROOT, "extracted");
const PACK_ROOT = path.join(WORK_ROOT, "pack");
const UPLOAD_ROOT = path.join(WORK_ROOT, "manual_uploads");
const BACKUP_ROOT = path.join(__dirname, "backups");
const GLOBALS_EDIT_MARKER = ".globalsEdited";

const GOLD_TEMPLATE = "1c3c9c74-34a1-4685-989e-410dc080be6f";

const KNOWN_LEVELS = [
  ["WLD_Main_A", "Act 1 - Wilderness, Underdark, Mountain Pass, Rosymorn"],
  ["CRE_Main_A", "Act 1 - Githyanki Creche"],
  ["CRE_AstralPlane_E_Art", "Creche Astral Plane"],
  ["SCL_Main_A", "Act 2 - Shadow-Cursed Lands"],
  ["BGO_Main_A", "Act 3 - Wyrm's Lookout / transition"],
  ["WYR_Main_A", "Act 3 - Rivington / Wyrm's Crossing"],
  ["CTY_Main_A", "Act 3 - Lower City"],
  ["END_Main", "Finale"],
  ["TUT_Avernus_C", "Nautiloid"],
  ["SYS_CC_I", "Character Creation"]
].map(([id, label]) => ({ id, label, source: "known" }));

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".lsv": "application/octet-stream"
};

function pathExistsSync(target) {
  try {
    return !!target && fss.existsSync(target);
  } catch {
    return false;
  }
}

function readDirSync(target) {
  try {
    return fss.readdirSync(target, { withFileTypes: true });
  } catch {
    return [];
  }
}

function uniquePaths(values) {
  const seen = new Set();
  const rows = [];
  for (const value of values.filter(Boolean)) {
    const resolved = path.resolve(value);
    const key = process.platform === "win32" ? resolved.toLowerCase() : resolved;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(resolved);
  }
  return rows;
}

function storyRootForProfile(bg3Local, profile) {
  return path.join(bg3Local, "PlayerProfiles", profile, "Savegames", "Story");
}

function detectStoryRoots() {
  const candidates = [];
  if (process.env.STORY_ROOT) candidates.push(process.env.STORY_ROOT);

  const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
  const bg3Local = process.env.BG3_LOCAL || path.join(localAppData, "Larian Studios", "Baldur's Gate 3");
  candidates.push(storyRootForProfile(bg3Local, "Public"));

  const profilesRoot = path.join(bg3Local, "PlayerProfiles");
  for (const entry of readDirSync(profilesRoot)) {
    if (entry.isDirectory()) candidates.push(storyRootForProfile(bg3Local, entry.name));
  }

  const usersRoot = "C:\\Users";
  for (const user of readDirSync(usersRoot)) {
    if (!user.isDirectory()) continue;
    const otherBg3 = path.join(usersRoot, user.name, "AppData", "Local", "Larian Studios", "Baldur's Gate 3");
    candidates.push(storyRootForProfile(otherBg3, "Public"));
    const otherProfiles = path.join(otherBg3, "PlayerProfiles");
    for (const profile of readDirSync(otherProfiles)) {
      if (profile.isDirectory()) candidates.push(storyRootForProfile(otherBg3, profile.name));
    }
  }

  return uniquePaths(candidates).filter(pathExistsSync);
}

function detectBg3LocalFromStory(storyRoot) {
  if (!storyRoot) return "";
  const marker = `${path.sep}PlayerProfiles${path.sep}`;
  const index = storyRoot.indexOf(marker);
  return index >= 0 ? storyRoot.slice(0, index) : "";
}

function addExportToolCandidates(root, candidates) {
  const entries = readDirSync(root).sort((a, b) => b.name.localeCompare(a.name, undefined, { numeric: true, sensitivity: "base" }));
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (!/ExportTool|LSLib/i.test(entry.name)) continue;
    candidates.push(path.join(root, entry.name, "tools", "Divine.exe"));
    candidates.push(path.join(root, entry.name, "Divine.exe"));
  }
}

function detectDivine() {
  const candidates = [];
  if (process.env.DIVINE) candidates.push(process.env.DIVINE);
  candidates.push(path.join(__dirname, "tools", "Divine.exe"));
  candidates.push(path.join(__dirname, "Divine.exe"));

  const appData = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
  const downloads = path.join(os.homedir(), "Downloads");
  const vortexMods = path.join(appData, "Vortex", "baldursgate3", "mods");
  addExportToolCandidates(vortexMods, candidates);
  addExportToolCandidates(downloads, candidates);

  return uniquePaths(candidates).find(pathExistsSync) || uniquePaths(candidates)[0] || "";
}

let DETECTED_STORY_ROOTS = detectStoryRoots();
let STORY_ROOT = process.env.STORY_ROOT || DETECTED_STORY_ROOTS[0] || "";
let BG3_LOCAL = process.env.BG3_LOCAL || detectBg3LocalFromStory(STORY_ROOT);
let DIVINE = detectDivine();

function send(res, status, body, headers = {}) {
  res.writeHead(status, { "Cache-Control": "no-store", ...headers });
  res.end(body);
}

function json(res, status, body) {
  send(res, status, JSON.stringify(body, null, 2), { "Content-Type": "application/json; charset=utf-8" });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Invalid JSON request body."));
      }
    });
    req.on("error", reject);
  });
}

function safeJoin(root, relPath) {
  const resolvedRoot = path.resolve(root);
  const target = path.resolve(resolvedRoot, relPath || ".");
  const rootWithSep = resolvedRoot.endsWith(path.sep) ? resolvedRoot : resolvedRoot + path.sep;
  if (target !== resolvedRoot && !target.startsWith(rootWithSep)) return null;
  return target;
}

function safeName(value) {
  return String(value || "save")
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120) || "save";
}

function xmlValue(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function stamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function runDivine(args) {
  return new Promise((resolve, reject) => {
    if (!DIVINE || !pathExistsSync(DIVINE)) {
      reject(new Error("Divine.exe was not found. Set the Divine path in the app or put Divine.exe in a tools folder beside server.js."));
      return;
    }
    execFile(DIVINE, args, { windowsHide: true, maxBuffer: 1024 * 1024 * 50 }, (error, stdout, stderr) => {
      const output = `${stdout || ""}${stderr || ""}`.trim();
      if (error) {
        error.output = output;
        return reject(error);
      }
      resolve(output);
    });
  });
}

async function exists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  await fs.cp(src, dest, { recursive: true, force: true });
}

async function removeIfExists(target, root) {
  if (!(await exists(target))) return;
  const resolved = path.resolve(target);
  const rootResolved = path.resolve(root);
  if (resolved !== rootResolved && !resolved.startsWith(rootResolved + path.sep)) {
    throw new Error(`Refusing to remove outside ${rootResolved}`);
  }
  await fs.rm(resolved, { recursive: true, force: true });
}

function sourceRoot(source) {
  if (source === "upload") return UPLOAD_ROOT;
  if (!STORY_ROOT) throw new Error("No BG3 save folder is configured. Use a manual path or upload a save.");
  return STORY_ROOT;
}

function sourceFromRequest(value) {
  return value === "upload" ? "upload" : "story";
}

function saveFolderFromRequest(folderValue, sourceValue) {
  const source = sourceFromRequest(sourceValue);
  const folder = String(folderValue || "");
  if (!folder || folder.includes("/") || folder.includes("\\") || folder === "." || folder === "..") {
    throw new Error("Invalid save folder name.");
  }
  const root = sourceRoot(source);
  const full = safeJoin(root, folder);
  if (!full) throw new Error("Invalid save folder path.");
  return { source, folder, full, root };
}

function workRootFor(source) {
  return path.join(EXTRACT_ROOT, source);
}

function workFolderFor(source, folder) {
  const root = workRootFor(source);
  const full = safeJoin(root, folder);
  if (!full) throw new Error("Invalid work folder path.");
  return full;
}

async function collectSaves(root, source) {
  if (!root || !(await exists(root))) return [];
  const dirs = await fs.readdir(root, { withFileTypes: true });
  const rows = [];
  for (const dir of dirs) {
    if (!dir.isDirectory()) continue;
    const full = path.join(root, dir.name);
    const files = await fs.readdir(full, { withFileTypes: true });
    const lsv = files.find((file) => file.isFile() && file.name.toLowerCase().endsWith(".lsv"));
    const webp = files.find((file) => file.isFile() && file.name.toLowerCase().endsWith(".webp"));
    if (!lsv) continue;
    const stat = await fs.stat(path.join(full, lsv.name));
    rows.push({
      source,
      folder: dir.name,
      lsv: lsv.name,
      webp: webp ? webp.name : null,
      modified: stat.mtime.toISOString(),
      size: stat.size
    });
  }
  return rows;
}

async function listSaves(res) {
  const rows = [
    ...(await collectSaves(STORY_ROOT, "story")),
    ...(await collectSaves(UPLOAD_ROOT, "upload"))
  ];
  rows.sort((a, b) => new Date(b.modified) - new Date(a.modified));
  json(res, 200, { storyRoot: STORY_ROOT, uploadRoot: UPLOAD_ROOT, saves: rows });
}

async function extractSave(source, folder) {
  const srcFolder = saveFolderFromRequest(folder, source).full;
  const files = await fs.readdir(srcFolder);
  const lsv = files.find((name) => name.toLowerCase().endsWith(".lsv"));
  if (!lsv) throw new Error("No .lsv found in selected save folder.");

  const sourceWorkRoot = workRootFor(source);
  await fs.mkdir(sourceWorkRoot, { recursive: true });
  const work = workFolderFor(source, folder);
  await removeIfExists(work, sourceWorkRoot);
  await fs.mkdir(work, { recursive: true });

  await runDivine(["-g", "bg3", "-a", "extract-package", "-s", path.join(srcFolder, lsv), "-d", work]);
  const metaLsf = path.join(work, "meta.lsf");
  const globalsLsf = path.join(work, "Globals.lsf");
  if (await exists(metaLsf)) {
    await runDivine(["-g", "bg3", "-a", "convert-resource", "-s", metaLsf, "-d", path.join(work, "meta.lsx"), "-i", "lsf", "-o", "lsx"]);
  }
  if (await exists(globalsLsf)) {
    await runDivine(["-g", "bg3", "-a", "convert-resource", "-s", globalsLsf, "-d", path.join(work, "Globals.lsx"), "-i", "lsf", "-o", "lsx"]);
  }
  return { work, lsv };
}

function parseJsonFile(filePath) {
  return fs.readFile(filePath, "utf8").then((text) => JSON.parse(text));
}

function parseMetaSummary(metaText) {
  const readAttr = (id) => {
    const re = new RegExp(`<attribute id="${id}"[^>]*value="([^"]*)"`, "i");
    const match = metaText.match(re);
    return match ? match[1] : "";
  };
  const mods = [...metaText.matchAll(/<node id="ModuleShortDesc">([\s\S]*?)<\/node>/g)].map((match, index) => {
    const block = match[1];
    const attr = (id) => {
      const re = new RegExp(`<attribute id="${id}"[^>]*value="([^"]*)"`, "i");
      const found = block.match(re);
      return found ? found[1] : "";
    };
    return {
      order: index + 1,
      name: attr("Name"),
      folder: attr("Folder"),
      uuid: attr("UUID"),
      version64: attr("Version64"),
      md5: attr("MD5")
    };
  });
  return {
    level: readAttr("LevelUniqueKey"),
    levelRaw: readAttr("Level"),
    subRegion: readAttr("CurrentSubRegion"),
    leaderName: readAttr("LeaderName"),
    saveGameType: readAttr("SaveGameType"),
    saveGameId: readAttr("SaveGameID"),
    saveTime: readAttr("SaveTime"),
    gameId: readAttr("GameID"),
    gameSessionId: readAttr("GameSessionID"),
    mods
  };
}

async function listLevelsForWork(work, saveInfo, meta) {
  const byId = new Map();
  const add = (id, label, source) => {
    const clean = String(id || "").trim();
    if (!clean) return;
    const existing = byId.get(clean);
    if (existing) {
      existing.source = existing.source.includes(source) ? existing.source : `${existing.source}, ${source}`;
      return;
    }
    byId.set(clean, { id: clean, label: label || clean, source });
  };

  for (const level of KNOWN_LEVELS) add(level.id, level.label, level.source);
  add(saveInfo?.["Current Level"], "Current save level", "save");
  add(meta?.level, "Current meta level", "meta");
  add(meta?.levelRaw, "Current meta raw level", "meta");

  const levelCache = path.join(work, "LevelCache");
  if (await exists(levelCache)) {
    for (const entry of await fs.readdir(levelCache, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      const ext = path.extname(entry.name).toLowerCase();
      if (ext === ".lsf" || ext === ".lsx") add(path.basename(entry.name, ext), "Found in this save LevelCache", "level cache");
    }
  }

  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

async function details(res, body) {
  const { source, folder } = saveFolderFromRequest(body.folder, body.source);
  let work = workFolderFor(source, folder);
  if (body.reextract === false && (await exists(work))) {
    // Keep current work-copy edits visible after quick-edit actions.
  } else {
    ({ work } = await extractSave(source, folder));
  }
  const saveInfoPath = path.join(work, "SaveInfo.json");
  const metaPath = path.join(work, "meta.lsx");
  const globalsMarker = path.join(work, GLOBALS_EDIT_MARKER);
  const saveInfo = (await exists(saveInfoPath)) ? await parseJsonFile(saveInfoPath) : null;
  const metaText = (await exists(metaPath)) ? await fs.readFile(metaPath, "utf8") : "";
  const meta = metaText ? parseMetaSummary(metaText) : null;
  const files = await fs.readdir(work, { recursive: true });
  json(res, 200, {
    source,
    folder,
    work,
    saveInfo,
    meta,
    levels: await listLevelsForWork(work, saveInfo, meta),
    globalsEdited: await exists(globalsMarker),
    goldTemplate: GOLD_TEMPLATE,
    files: files.map((file) => String(file).replaceAll("\\", "/"))
  });
}

async function getText(res, body) {
  const { source, folder } = saveFolderFromRequest(body.folder, body.source);
  const file = String(body.file || "");
  if (!["SaveInfo.json", "meta.lsx", "Globals.lsx"].includes(file)) throw new Error("Unsupported editable file.");
  const work = workFolderFor(source, folder);
  const target = safeJoin(work, file);
  if (!target || !(await exists(target))) throw new Error("Extract the save first, or the file does not exist.");
  const text = await fs.readFile(target, "utf8");
  json(res, 200, { source, folder, file, text });
}

async function putText(res, body) {
  const { source, folder } = saveFolderFromRequest(body.folder, body.source);
  const file = String(body.file || "");
  const text = String(body.text ?? "");
  if (!["SaveInfo.json", "meta.lsx"].includes(file)) throw new Error("Only SaveInfo.json and meta.lsx can be edited from this page.");
  if (file === "SaveInfo.json") JSON.parse(text);
  const work = workFolderFor(source, folder);
  const target = safeJoin(work, file);
  if (!target || !(await exists(target))) throw new Error("Extract the save first, or the file does not exist.");
  await fs.writeFile(target, text, "utf8");
  json(res, 200, { ok: true });
}

async function backupSave(res, body) {
  const { source, folder, full } = saveFolderFromRequest(body.folder, body.source);
  await fs.mkdir(BACKUP_ROOT, { recursive: true });
  const dest = path.join(BACKUP_ROOT, `${source}__${folder}__backup_${stamp()}`);
  await copyDir(full, dest);
  json(res, 200, { ok: true, backup: dest });
}

async function applyQuickEdit(res, body) {
  const { source, folder } = saveFolderFromRequest(body.folder, body.source);
  const work = workFolderFor(source, folder);
  const saveInfoPath = path.join(work, "SaveInfo.json");
  const metaPath = path.join(work, "meta.lsx");
  if (!(await exists(saveInfoPath))) throw new Error("Extract the save before editing.");

  const saveInfo = await parseJsonFile(saveInfoPath);
  if (typeof body.saveName === "string" && body.saveName.trim()) {
    saveInfo["Save Name"] = safeName(body.saveName.trim());
  }
  if (typeof body.currentLevel === "string" && body.currentLevel.trim()) {
    saveInfo["Current Level"] = body.currentLevel.trim();
  }
  await fs.writeFile(saveInfoPath, JSON.stringify(saveInfo, null, 3) + "\n", "utf8");

  if (await exists(metaPath)) {
    let meta = await fs.readFile(metaPath, "utf8");
    if (typeof body.leaderName === "string") {
      meta = meta.replace(/(<attribute id="LeaderName"[^>]*value=")[^"]*(")/, `$1${xmlValue(body.leaderName)}$2`);
    }
    if (typeof body.currentLevel === "string" && body.currentLevel.trim()) {
      const level = xmlValue(body.currentLevel.trim());
      meta = meta
        .replace(/(<attribute id="LevelUniqueKey"[^>]*value=")[^"]*(")/, `$1${level}$2`)
        .replace(/(<attribute id="Level"[^>]*value=")[^"]*(")/, `$1${level}$2`);
    }
    await fs.writeFile(metaPath, meta, "utf8");
  }

  json(res, 200, { ok: true, saveInfo });
}

async function applyGoldEdit(res, body) {
  const { source, folder } = saveFolderFromRequest(body.folder, body.source);
  const amount = Math.floor(Number(body.amount));
  if (!Number.isFinite(amount) || amount < 0 || amount > 2000000000) {
    throw new Error("Gold amount must be between 0 and 2000000000.");
  }
  const work = workFolderFor(source, folder);
  const globalsPath = path.join(work, "Globals.lsx");
  if (!(await exists(globalsPath))) throw new Error("Globals.lsx was not found. Extract the save first.");

  let text = await fs.readFile(globalsPath, "utf8");
  let changes = 0;
  const replaceNear = (needle) => {
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(<attribute id="(?:ItemName|Stats)"[^>]*value="${escaped}"[^>]*\\/>[\\s\\S]{0,2500}?<attribute id="Amount" type="int32" value=")\\d+("[^>]*\\/>)`, "g");
    text = text.replace(re, (match, before, after) => {
      changes += 1;
      return `${before}${amount}${after}`;
    });
  };
  replaceNear("LOOT_Gold_A");
  replaceNear("OBJ_GoldPile");

  if (changes === 0) {
    throw new Error("No editable existing gold stack was found in Globals.lsx. Use the generated Script Extender command if the save can load.");
  }

  await fs.writeFile(globalsPath, text, "utf8");
  await fs.writeFile(path.join(work, GLOBALS_EDIT_MARKER), `Gold stack edit ${stamp()} amount=${amount} changes=${changes}\n`, "utf8");
  json(res, 200, { ok: true, amount, changes });
}

async function restoreModsettings(res, body) {
  const { source, folder } = saveFolderFromRequest(body.folder, body.source);
  const work = workFolderFor(source, folder);
  const metaPath = path.join(work, "meta.lsx");
  if (!(await exists(metaPath))) throw new Error("Extract the save before restoring modsettings.");
  if (!BG3_LOCAL) BG3_LOCAL = detectBg3LocalFromStory(STORY_ROOT);
  if (!BG3_LOCAL) throw new Error("Could not find the BG3 local app data folder for modsettings.lsx.");

  const modsettings = path.join(BG3_LOCAL, "PlayerProfiles", "Public", "modsettings.lsx");
  if (!(await exists(modsettings))) throw new Error(`Could not find modsettings.lsx at ${modsettings}`);
  const backup = `${modsettings}.before-save-editor-${stamp()}.bak`;
  await fs.copyFile(modsettings, backup);

  const metaText = await fs.readFile(metaPath, "utf8");
  const modsSection = metaText.match(/<node id="Mods">\s*<children>([\s\S]*?)<\/children>\s*<\/node>/);
  if (!modsSection) throw new Error("Could not find ModuleSettings/Mods in meta.lsx.");
  let current = await fs.readFile(modsettings, "utf8");
  current = current.replace(/(<node id="Mods">\s*<children>)([\s\S]*?)(<\/children>\s*<\/node>)/, `$1${modsSection[1]}$3`);
  await fs.writeFile(modsettings, current, "utf8");

  json(res, 200, { ok: true, backup, modsettings });
}

async function repack(res, body) {
  const { source, folder, full: srcFolder, root: outputRoot } = saveFolderFromRequest(body.folder, body.source);
  const work = workFolderFor(source, folder);
  if (!(await exists(work))) throw new Error("Extract the save before repacking.");

  const saveInfoPath = path.join(work, "SaveInfo.json");
  const metaLsx = path.join(work, "meta.lsx");
  const metaLsf = path.join(work, "meta.lsf");
  const globalsLsx = path.join(work, "Globals.lsx");
  const globalsLsf = path.join(work, "Globals.lsf");
  const globalsMarker = path.join(work, GLOBALS_EDIT_MARKER);
  if (await exists(metaLsx)) {
    await runDivine(["-g", "bg3", "-a", "convert-resource", "-s", metaLsx, "-d", metaLsf, "-i", "lsx", "-o", "lsf"]);
  }
  if ((await exists(globalsMarker)) && (await exists(globalsLsx))) {
    await runDivine(["-g", "bg3", "-a", "convert-resource", "-s", globalsLsx, "-d", globalsLsf, "-i", "lsx", "-o", "lsf"]);
  }

  const removeMode = String(body.levelCache || "keep");
  if (removeMode === "all") {
    await removeIfExists(path.join(work, "LevelCache"), work);
  } else if (removeMode === "cre") {
    await removeIfExists(path.join(work, "LevelCache", "CRE_Main_A.lsf"), work);
    await removeIfExists(path.join(work, "LevelCache", "CRE_AstralPlane_E_Art.lsf"), work);
  }

  const saveInfo = (await exists(saveInfoPath)) ? await parseJsonFile(saveInfoPath) : {};
  const displayName = safeName(body.outputName || saveInfo["Save Name"] || `Edited_${folder}`);
  saveInfo["Save Name"] = displayName;
  await fs.writeFile(saveInfoPath, JSON.stringify(saveInfo, null, 3) + "\n", "utf8");

  const outputFolderName = safeName(`${folder}__Edited_${stamp()}`);
  const outputFolder = path.join(outputRoot, outputFolderName);
  await fs.mkdir(outputFolder, { recursive: true });
  const outputLsv = path.join(outputFolder, `${displayName}.lsv`);

  await fs.mkdir(PACK_ROOT, { recursive: true });
  const packWork = path.join(PACK_ROOT, `${source}__${outputFolderName}`);
  await removeIfExists(packWork, PACK_ROOT);
  await fs.mkdir(packWork, { recursive: true });
  for (const entry of await fs.readdir(work, { withFileTypes: true })) {
    if (entry.name.toLowerCase().endsWith(".lsx")) continue;
    if (entry.name === GLOBALS_EDIT_MARKER) continue;
    const from = path.join(work, entry.name);
    const to = path.join(packWork, entry.name);
    if (entry.isDirectory()) {
      await fs.cp(from, to, { recursive: true, force: true });
    } else if (entry.isFile()) {
      await fs.copyFile(from, to);
    }
  }

  await runDivine(["-g", "bg3", "-a", "create-package", "-s", packWork, "-d", outputLsv]);

  const webp = (await fs.readdir(srcFolder)).find((name) => name.toLowerCase().endsWith(".webp"));
  if (webp) {
    await fs.copyFile(path.join(srcFolder, webp), path.join(outputFolder, `${displayName}.WebP`));
  }
  json(res, 200, {
    ok: true,
    source,
    folder: outputFolderName,
    lsv: outputLsv,
    download: `/api/download?source=${encodeURIComponent(source)}&folder=${encodeURIComponent(outputFolderName)}`
  });
}

async function setPaths(res, body) {
  const nextStory = String(body.storyRoot || "").trim();
  const nextDivine = String(body.divine || "").trim();
  if (nextStory) {
    const resolved = path.resolve(nextStory);
    if (!(await exists(resolved))) throw new Error(`Save folder was not found: ${resolved}`);
    STORY_ROOT = resolved;
    BG3_LOCAL = detectBg3LocalFromStory(STORY_ROOT) || BG3_LOCAL;
  }
  if (nextDivine) {
    const resolved = path.resolve(nextDivine);
    if (!(await exists(resolved))) throw new Error(`Divine.exe was not found: ${resolved}`);
    DIVINE = resolved;
  }
  DETECTED_STORY_ROOTS = detectStoryRoots();
  json(res, 200, await configBody());
}

async function uploadSave(res, body) {
  const fileName = safeName(path.basename(String(body.fileName || "Uploaded_Save.lsv")));
  if (!fileName.toLowerCase().endsWith(".lsv")) throw new Error("Upload a .lsv save file.");
  const data = String(body.dataBase64 || "").replace(/^data:.*?;base64,/, "");
  const buffer = Buffer.from(data, "base64");
  if (!buffer.length) throw new Error("Uploaded save was empty.");

  await fs.mkdir(UPLOAD_ROOT, { recursive: true });
  const base = fileName.replace(/\.lsv$/i, "");
  const folder = safeName(`${base}__Uploaded_${stamp()}`);
  const dest = path.join(UPLOAD_ROOT, folder);
  await fs.mkdir(dest, { recursive: true });
  await fs.writeFile(path.join(dest, fileName), buffer);

  if (body.webpName && body.webpBase64) {
    const webpName = safeName(path.basename(String(body.webpName)));
    if (webpName.toLowerCase().endsWith(".webp")) {
      const webp = Buffer.from(String(body.webpBase64).replace(/^data:.*?;base64,/, ""), "base64");
      if (webp.length) await fs.writeFile(path.join(dest, webpName), webp);
    }
  }

  json(res, 200, { ok: true, source: "upload", folder, root: UPLOAD_ROOT });
}

async function thumbnail(res, url) {
  const folder = url.searchParams.get("folder") || "";
  const source = sourceFromRequest(url.searchParams.get("source"));
  const { full } = saveFolderFromRequest(folder, source);
  const files = await fs.readdir(full);
  const webp = files.find((name) => name.toLowerCase().endsWith(".webp"));
  if (!webp) return send(res, 404, "No thumbnail", { "Content-Type": "text/plain; charset=utf-8" });
  const buffer = await fs.readFile(path.join(full, webp));
  send(res, 200, buffer, { "Content-Type": "image/webp" });
}

async function downloadSave(res, url) {
  const folder = url.searchParams.get("folder") || "";
  const source = sourceFromRequest(url.searchParams.get("source"));
  const { full } = saveFolderFromRequest(folder, source);
  const files = await fs.readdir(full);
  const lsv = files.find((name) => name.toLowerCase().endsWith(".lsv"));
  if (!lsv) return send(res, 404, "No .lsv", { "Content-Type": "text/plain; charset=utf-8" });
  const filePath = path.join(full, lsv);
  send(res, 200, await fs.readFile(filePath), {
    "Content-Type": "application/octet-stream",
    "Content-Disposition": `attachment; filename="${lsv.replaceAll('"', "'")}"`
  });
}

async function configBody() {
  return {
    bg3Local: BG3_LOCAL,
    storyRoot: STORY_ROOT,
    uploadRoot: UPLOAD_ROOT,
    detectedStoryRoots: DETECTED_STORY_ROOTS,
    divine: DIVINE,
    divineExists: await exists(DIVINE),
    storyRootExists: STORY_ROOT ? await exists(STORY_ROOT) : false,
    knownLevels: KNOWN_LEVELS,
    goldTemplate: GOLD_TEMPLATE
  };
}

async function routeApi(req, res, url) {
  try {
    if (req.method === "GET" && url.pathname === "/api/config") return json(res, 200, await configBody());
    if (req.method === "GET" && url.pathname === "/api/saves") return await listSaves(res);
    if (req.method === "GET" && url.pathname === "/api/thumbnail") return await thumbnail(res, url);
    if (req.method === "GET" && url.pathname === "/api/download") return await downloadSave(res, url);

    const body = await readBody(req);
    if (req.method === "POST" && url.pathname === "/api/details") return await details(res, body);
    if (req.method === "POST" && url.pathname === "/api/get-text") return await getText(res, body);
    if (req.method === "POST" && url.pathname === "/api/put-text") return await putText(res, body);
    if (req.method === "POST" && url.pathname === "/api/backup") return await backupSave(res, body);
    if (req.method === "POST" && url.pathname === "/api/quick-edit") return await applyQuickEdit(res, body);
    if (req.method === "POST" && url.pathname === "/api/gold-edit") return await applyGoldEdit(res, body);
    if (req.method === "POST" && url.pathname === "/api/restore-modsettings") return await restoreModsettings(res, body);
    if (req.method === "POST" && url.pathname === "/api/repack") return await repack(res, body);
    if (req.method === "POST" && url.pathname === "/api/set-paths") return await setPaths(res, body);
    if (req.method === "POST" && url.pathname === "/api/upload-save") return await uploadSave(res, body);
    json(res, 404, { error: "Unknown API route." });
  } catch (error) {
    json(res, 500, { error: String(error && error.message ? error.message : error), output: error.output || "" });
  }
}

async function serveStatic(res, url) {
  let rel = decodeURIComponent(url.pathname);
  if (rel === "/") rel = "/index.html";
  const target = safeJoin(PUBLIC_ROOT, rel.replace(/^\/+/, ""));
  if (!target) return send(res, 403, "Forbidden", { "Content-Type": "text/plain; charset=utf-8" });
  try {
    const stat = await fs.stat(target);
    if (!stat.isFile()) throw new Error("Not a file");
    const ext = path.extname(target).toLowerCase();
    send(res, 200, await fs.readFile(target), { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
  } catch {
    send(res, 404, "Not found", { "Content-Type": "text/plain; charset=utf-8" });
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  if (url.pathname.startsWith("/api/")) return routeApi(req, res, url);
  return serveStatic(res, url);
});

async function boot() {
  await fs.mkdir(EXTRACT_ROOT, { recursive: true });
  await fs.mkdir(PACK_ROOT, { recursive: true });
  await fs.mkdir(UPLOAD_ROOT, { recursive: true });
  await fs.mkdir(BACKUP_ROOT, { recursive: true });
  server.listen(PORT, HOST, () => {
    const addresses = [];
    for (const values of Object.values(os.networkInterfaces())) {
      for (const item of values || []) {
        if (item.family === "IPv4" && !item.internal) addresses.push(item.address);
      }
    }
    console.log(`BG3 save editor running at http://localhost:${PORT}`);
    for (const address of addresses) console.log(`LAN address: http://${address}:${PORT}`);
    console.log(`Story saves: ${STORY_ROOT || "not configured"}`);
    console.log(`Manual uploads: ${UPLOAD_ROOT}`);
    console.log(`Divine: ${DIVINE || "not configured"}`);
  });
}

boot().catch((error) => {
  console.error(error);
  process.exit(1);
});
