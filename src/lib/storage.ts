const KEY = "dreamwork-settings";

function validNum(n: unknown, min: number, max: number): number | undefined {
  return typeof n === "number" && n >= min && n <= max ? n : undefined;
}

function validBeautySettings(s: unknown): StoredBeautySettings | undefined {
  if (!s || typeof s !== "object") return undefined;
  const p = s as Record<string, unknown>;
  const skinSmoothing = validNum(p.skinSmoothing, 0, 100);
  const brighten = validNum(p.brighten, 0, 100);
  const glow = validNum(p.glow, 0, 100);
  const whiten = validNum(p.whiten, 0, 100);
  const contrast = validNum(p.contrast, 0, 100);
  const saturation = validNum(p.saturation, 0, 100);
  if (
    skinSmoothing === undefined ||
    brighten === undefined ||
    glow === undefined ||
    whiten === undefined ||
    contrast === undefined ||
    saturation === undefined
  )
    return undefined;
  return { skinSmoothing, brighten, glow, whiten, contrast, saturation };
}

export type StoredAvatarShape = "circle" | "rect";
export type StoredAvatarDecor = "none" | "simple" | "glow" | "dashed";
export type StoredFaceFilter =
  | "none"
  | "glasses"
  | "heart"
  | "star"
  | "mustache"
  | "cat"
  | "panda"
  | "vampire"
  | "fairy";

export interface StoredBeautySettings {
  skinSmoothing: number;
  brighten: number;
  glow: number;
  whiten: number;
  contrast: number;
  saturation: number;
}

export type RecordResolution = "720p" | "1080p" | "4K";

export interface StoredSettings {
  glowColor?: string;
  pipPos?: { x: number; y: number };
  fullPagePipPos?: { x: number; y: number };
  recordResolution?: RecordResolution;
  previewPosition?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  fullPagePreviewPos?: { x: number; y: number };
  sidebarWidth?: number;
  whiteboardHeight?: number;
  avatarSize?: number;
  avatarShape?: StoredAvatarShape;
  avatarDecor?: StoredAvatarDecor;
  avatarImageSrc?: string;
  beautyMode?: boolean;
  beautySettings?: StoredBeautySettings;
  faceFilter?: StoredFaceFilter;
  micVolume?: number;
  systemVolume?: number;
}

export function loadSettings(): StoredSettings {
  try {
    const s = localStorage.getItem(KEY);
    if (!s) return {};
    const parsed = JSON.parse(s) as StoredSettings;
    return {
      glowColor: typeof parsed.glowColor === "string" ? parsed.glowColor : undefined,
      pipPos:
        parsed.pipPos && typeof parsed.pipPos.x === "number" && typeof parsed.pipPos.y === "number"
          ? parsed.pipPos
          : undefined,
      fullPagePipPos:
        parsed.fullPagePipPos && typeof parsed.fullPagePipPos.x === "number" && typeof parsed.fullPagePipPos.y === "number"
          ? parsed.fullPagePipPos
          : undefined,
      recordResolution:
        parsed.recordResolution && ["720p", "1080p", "4K"].includes(parsed.recordResolution)
          ? (parsed.recordResolution as RecordResolution)
          : undefined,
      previewPosition:
        parsed.previewPosition &&
        ["top-left", "top-right", "bottom-left", "bottom-right"].includes(parsed.previewPosition)
          ? (parsed.previewPosition as "top-left" | "top-right" | "bottom-left" | "bottom-right")
          : undefined,
      fullPagePreviewPos:
        parsed.fullPagePreviewPos &&
        typeof parsed.fullPagePreviewPos.x === "number" &&
        typeof parsed.fullPagePreviewPos.y === "number"
          ? parsed.fullPagePreviewPos
          : undefined,
      sidebarWidth:
        typeof parsed.sidebarWidth === "number" && parsed.sidebarWidth >= 240 && parsed.sidebarWidth <= 600
          ? parsed.sidebarWidth
          : undefined,
      whiteboardHeight:
        typeof parsed.whiteboardHeight === "number" && parsed.whiteboardHeight >= 120 && parsed.whiteboardHeight <= 800
          ? parsed.whiteboardHeight
          : undefined,
      avatarSize:
        typeof parsed.avatarSize === "number" && parsed.avatarSize >= 60 && parsed.avatarSize <= 280
          ? parsed.avatarSize
          : undefined,
      avatarShape:
        parsed.avatarShape === "circle" || parsed.avatarShape === "rect"
          ? parsed.avatarShape
          : undefined,
      avatarDecor:
        parsed.avatarDecor &&
        ["none", "simple", "glow", "dashed"].includes(parsed.avatarDecor)
          ? parsed.avatarDecor
          : undefined,
      avatarImageSrc:
        typeof parsed.avatarImageSrc === "string" && parsed.avatarImageSrc.startsWith("data:image/")
          ? parsed.avatarImageSrc
          : undefined,
      beautyMode: typeof parsed.beautyMode === "boolean" ? parsed.beautyMode : undefined,
      beautySettings: validBeautySettings(parsed.beautySettings),
      faceFilter:
        parsed.faceFilter &&
        ["none", "glasses", "heart", "star", "mustache", "cat", "panda", "vampire", "fairy"].includes(
          parsed.faceFilter
        )
          ? parsed.faceFilter
          : undefined,
      micVolume:
        typeof parsed.micVolume === "number" && parsed.micVolume >= 0 && parsed.micVolume <= 100
          ? parsed.micVolume
          : undefined,
      systemVolume:
        typeof parsed.systemVolume === "number" &&
        parsed.systemVolume >= 0 &&
        parsed.systemVolume <= 100
          ? parsed.systemVolume
          : undefined,
    };
  } catch {
    return {};
  }
}

export function saveSettings(settings: StoredSettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}
