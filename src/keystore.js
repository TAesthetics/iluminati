// Schlüsselkammer: dauerhafte Ablage der drei API-Schlüssel und Modellwahl.
// Gespeichert wird in data/keys.json (per .gitignore vom Repository ausgeschlossen,
// Dateirechte 0600), damit der Benutzer die Schlüssel nur einmal eingeben muss.

import { mkdirSync, readFileSync, writeFileSync, chmodSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DATA_DIR = join(ROOT, "data");
const KEYS_FILE = join(DATA_DIR, "keys.json");

export const ROLES = ["father", "son", "spirit"];

export const DEFAULT_MODELS = {
  father: "llama-3.3-70b",
  son: "grok-4",
  spirit: "gemini-2.5-flash",
};

function emptyStore() {
  return { keys: { father: "", son: "", spirit: "" }, models: { ...DEFAULT_MODELS } };
}

export function loadStore() {
  if (!existsSync(KEYS_FILE)) return emptyStore();
  try {
    const raw = JSON.parse(readFileSync(KEYS_FILE, "utf8"));
    const store = emptyStore();
    for (const role of ROLES) {
      if (typeof raw?.keys?.[role] === "string") store.keys[role] = raw.keys[role];
      if (typeof raw?.models?.[role] === "string" && raw.models[role].trim()) {
        store.models[role] = raw.models[role].trim();
      }
    }
    return store;
  } catch {
    return emptyStore();
  }
}

export function saveStore(update) {
  const store = loadStore();
  for (const role of ROLES) {
    // Leere Eingaben lassen einen bereits gespeicherten Schlüssel unangetastet.
    const key = update?.keys?.[role];
    if (typeof key === "string" && key.trim()) store.keys[role] = key.trim();
    const model = update?.models?.[role];
    if (typeof model === "string" && model.trim()) store.models[role] = model.trim();
  }
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(KEYS_FILE, JSON.stringify(store, null, 2), "utf8");
  chmodSync(KEYS_FILE, 0o600);
  return store;
}

export function clearKey(role) {
  const store = loadStore();
  if (ROLES.includes(role)) {
    store.keys[role] = "";
    mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(KEYS_FILE, JSON.stringify(store, null, 2), "utf8");
    chmodSync(KEYS_FILE, 0o600);
  }
  return store;
}

// Öffentliche Sicht: verrät nie den Schlüssel selbst, nur ob er hinterlegt ist.
export function publicView(store = loadStore()) {
  const view = { keys: {}, models: { ...store.models } };
  for (const role of ROLES) {
    const key = store.keys[role];
    view.keys[role] = key
      ? { saved: true, hint: "…" + key.slice(-4) }
      : { saved: false, hint: "" };
  }
  return view;
}
