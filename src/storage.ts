import { SETTINGS_KEY, STORAGE_KEY, defaultSettings } from "./config";
import type { NeoSettings, VaultFile } from "./types";

export function loadFiles(): VaultFile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as VaultFile[]) : [];
  } catch {
    return [];
  }
}

export function saveFiles(files: VaultFile[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
}

export function loadSettings(): NeoSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...defaultSettings, ...JSON.parse(raw) } : defaultSettings;
  } catch {
    return defaultSettings;
  }
}

export function saveSettings(settings: NeoSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function formatBytes(bytes: number) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = bytes;
  let unit = 0;

  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }

  return `${size.toFixed(size >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

export function shortAddress(address?: string | null) {
  if (!address) return "Not connected";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function makeId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
