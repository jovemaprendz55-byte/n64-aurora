export type RomFormat = "z64" | "n64" | "v64";

export type N64Game = {
  id: string;
  title: string;
  fileName: string;
  uri: string;
  sizeBytes?: number;
  format: RomFormat;
  importedAt: string;
  lastPlayedAt?: string;
  favorite: boolean;
};

export type N64Input =
  | "a"
  | "b"
  | "z"
  | "l"
  | "r"
  | "start"
  | "dpadUp"
  | "dpadDown"
  | "dpadLeft"
  | "dpadRight"
  | "cUp"
  | "cDown"
  | "cLeft"
  | "cRight";

export type ControlId = "stick" | "dpad" | N64Input;

export type ControlLayoutItem = {
  id: ControlId;
  label: string;
  x: number;
  y: number;
  size: number;
  opacity: number;
  visible: boolean;
};

export type ControlProfile = {
  id: string;
  name: string;
  controls: ControlLayoutItem[];
  updatedAt: string;
};

export type N64Settings = {
  hapticsEnabled: boolean;
  controlOpacity: number;
  activeProfileId: string;
  preferPerformance: boolean;
};

export const SUPPORTED_ROM_EXTENSIONS: RomFormat[] = ["z64", "n64", "v64"];

export const DEFAULT_CONTROL_LAYOUT: ControlLayoutItem[] = [
  { id: "stick", label: "Analógico", x: 11, y: 69, size: 82, opacity: 0.78, visible: true },
  { id: "dpad", label: "Direcional", x: 11, y: 44, size: 62, opacity: 0.74, visible: true },
  { id: "a", label: "A", x: 79, y: 67, size: 54, opacity: 0.86, visible: true },
  { id: "b", label: "B", x: 69, y: 76, size: 48, opacity: 0.82, visible: true },
  { id: "z", label: "Z", x: 49, y: 84, size: 42, opacity: 0.78, visible: true },
  { id: "l", label: "L", x: 9, y: 24, size: 48, opacity: 0.74, visible: true },
  { id: "r", label: "R", x: 80, y: 24, size: 48, opacity: 0.74, visible: true },
  { id: "start", label: "START", x: 47, y: 70, size: 42, opacity: 0.8, visible: true },
  { id: "cUp", label: "C↑", x: 85, y: 44, size: 30, opacity: 0.82, visible: true },
  { id: "cDown", label: "C↓", x: 85, y: 55, size: 30, opacity: 0.82, visible: true },
  { id: "cLeft", label: "C←", x: 78, y: 50, size: 30, opacity: 0.82, visible: true },
  { id: "cRight", label: "C→", x: 92, y: 50, size: 30, opacity: 0.82, visible: true },
];

export const DEFAULT_CONTROL_PROFILE: ControlProfile = {
  id: "aurora-default",
  name: "Aurora padrão",
  controls: DEFAULT_CONTROL_LAYOUT,
  updatedAt: "",
};

export const DEFAULT_SETTINGS: N64Settings = {
  hapticsEnabled: true,
  controlOpacity: 82,
  activeProfileId: DEFAULT_CONTROL_PROFILE.id,
  preferPerformance: true,
};

export function getRomExtension(fileName: string): RomFormat | null {
  const extension = fileName.split(".").pop()?.trim().toLowerCase();
  return SUPPORTED_ROM_EXTENSIONS.includes(extension as RomFormat) ? (extension as RomFormat) : null;
}

export function titleFromFileName(fileName: string): string {
  const noExtension = fileName.replace(/\.[^.]+$/, "");
  return noExtension
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase()) || "Jogo sem título";
}

export function formatFileSize(sizeBytes?: number): string {
  if (!sizeBytes || sizeBytes <= 0) return "Tamanho não informado";
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(Math.floor(Math.log(sizeBytes) / Math.log(1024)), units.length - 1);
  const value = sizeBytes / 1024 ** exponent;
  return `${value >= 10 || exponent === 0 ? Math.round(value) : value.toFixed(1)} ${units[exponent]}`;
}

export function normalizeControlLayout(layout: ControlLayoutItem[]): ControlLayoutItem[] {
  return layout.map((control) => ({
    ...control,
    x: Math.min(96, Math.max(4, Math.round(control.x * 10) / 10)),
    y: Math.min(92, Math.max(8, Math.round(control.y * 10) / 10)),
    size: Math.min(112, Math.max(26, Math.round(control.size))),
    opacity: Math.min(1, Math.max(0.25, Math.round(control.opacity * 100) / 100)),
  }));
}
