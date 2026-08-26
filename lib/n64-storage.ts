import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import type * as DocumentPicker from "expo-document-picker";

import {
  DEFAULT_CONTROL_PROFILE,
  DEFAULT_SETTINGS,
  getRomExtension,
  titleFromFileName,
  type ControlProfile,
  type N64Game,
  type N64Settings,
} from "@/lib/n64-models";

const LIBRARY_KEY = "n64-aurora/library-v1";
const PROFILES_KEY = "n64-aurora/control-profiles-v1";
const SETTINGS_KEY = "n64-aurora/settings-v1";
const ROMS_DIRECTORY = `${FileSystem.documentDirectory ?? ""}n64-aurora/roms/`;

function makeIdentifier(): string {
  return `game-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function safeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120) || "rom.z64";
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function loadGames(): Promise<N64Game[]> {
  const games = await readJson<N64Game[]>(LIBRARY_KEY, []);
  return [...games].sort((left, right) => right.importedAt.localeCompare(left.importedAt));
}

export async function getGame(gameId: string): Promise<N64Game | undefined> {
  const games = await loadGames();
  return games.find((game) => game.id === gameId);
}

export async function saveGames(games: N64Game[]): Promise<void> {
  await AsyncStorage.setItem(LIBRARY_KEY, JSON.stringify(games));
}

export async function importRom(asset: DocumentPicker.DocumentPickerAsset): Promise<N64Game> {
  const format = getRomExtension(asset.name);
  if (!format) {
    throw new Error("Escolha uma ROM nos formatos .z64, .n64 ou .v64.");
  }

  if (!FileSystem.documentDirectory) {
    throw new Error("O armazenamento local não está disponível neste ambiente.");
  }

  await FileSystem.makeDirectoryAsync(ROMS_DIRECTORY, { intermediates: true });
  const id = makeIdentifier();
  const targetUri = `${ROMS_DIRECTORY}${id}-${safeFileName(asset.name)}`;
  await FileSystem.copyAsync({ from: asset.uri, to: targetUri });

  const game: N64Game = {
    id,
    title: titleFromFileName(asset.name),
    fileName: asset.name,
    uri: targetUri,
    sizeBytes: asset.size,
    format,
    importedAt: new Date().toISOString(),
    favorite: false,
  };
  const games = await loadGames();
  await saveGames([game, ...games]);
  return game;
}

export async function setFavorite(gameId: string, favorite: boolean): Promise<N64Game[]> {
  const games = await loadGames();
  const updated = games.map((game) => (game.id === gameId ? { ...game, favorite } : game));
  await saveGames(updated);
  return updated;
}

export async function markGamePlayed(gameId: string): Promise<N64Game | undefined> {
  const games = await loadGames();
  const timestamp = new Date().toISOString();
  const updated = games.map((game) => (game.id === gameId ? { ...game, lastPlayedAt: timestamp } : game));
  await saveGames(updated);
  return updated.find((game) => game.id === gameId);
}

export async function removeGame(gameId: string): Promise<N64Game[]> {
  const games = await loadGames();
  const game = games.find((candidate) => candidate.id === gameId);
  if (game?.uri.startsWith(ROMS_DIRECTORY)) {
    const fileInfo = await FileSystem.getInfoAsync(game.uri);
    if (fileInfo.exists) await FileSystem.deleteAsync(game.uri, { idempotent: true });
  }
  const updated = games.filter((candidate) => candidate.id !== gameId);
  await saveGames(updated);
  return updated;
}

export async function loadProfiles(): Promise<ControlProfile[]> {
  const profiles = await readJson<ControlProfile[]>(PROFILES_KEY, []);
  return profiles.length ? profiles : [{ ...DEFAULT_CONTROL_PROFILE, updatedAt: new Date().toISOString() }];
}

export async function saveProfiles(profiles: ControlProfile[]): Promise<void> {
  await AsyncStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
}

export async function upsertProfile(profile: ControlProfile): Promise<ControlProfile[]> {
  const profiles = await loadProfiles();
  const existing = profiles.findIndex((candidate) => candidate.id === profile.id);
  const updated = [...profiles];
  if (existing >= 0) {
    updated[existing] = profile;
  } else {
    updated.push(profile);
  }
  await saveProfiles(updated);
  return updated;
}

export async function loadSettings(): Promise<N64Settings> {
  const settings = await readJson<N64Settings>(SETTINGS_KEY, DEFAULT_SETTINGS);
  return { ...DEFAULT_SETTINGS, ...settings };
}

export async function saveSettings(settings: N64Settings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
