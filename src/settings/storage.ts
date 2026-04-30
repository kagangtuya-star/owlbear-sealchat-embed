import { DEFAULT_COLLAPSED_HEIGHT, DEFAULT_SETTINGS, SealChatSettings } from "./config";

const LOCAL_KEY = "sealchat.owlbear.settings.v1";
const ROOM_URL_KEY = "sealchat.owlbear/defaultUrl";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function mergeSettings(value: unknown): SealChatSettings {
  if (!isRecord(value)) {
    return DEFAULT_SETTINGS;
  }

  return {
    ...DEFAULT_SETTINGS,
    sealChatUrl:
      typeof value.sealChatUrl === "string"
        ? value.sealChatUrl
        : DEFAULT_SETTINGS.sealChatUrl,
    width: typeof value.width === "number" ? value.width : DEFAULT_SETTINGS.width,
    height: typeof value.height === "number" ? value.height : DEFAULT_SETTINGS.height,
    top: typeof value.top === "number" ? value.top : DEFAULT_SETTINGS.top,
    rightOffset:
      typeof value.rightOffset === "number" ? value.rightOffset : DEFAULT_SETTINGS.rightOffset,
    collapsedTop:
      typeof value.collapsedTop === "number" ? value.collapsedTop : DEFAULT_SETTINGS.collapsedTop,
    collapsedRightOffset:
      typeof value.collapsedRightOffset === "number"
        ? value.collapsedRightOffset
        : DEFAULT_SETTINGS.collapsedRightOffset,
    collapsedWidth:
      typeof value.collapsedWidth === "number"
        ? value.collapsedWidth
        : DEFAULT_SETTINGS.collapsedWidth,
    collapsedHeight:
      typeof value.collapsedHeight === "number" && value.collapsedHeight !== 96
        ? value.collapsedHeight
        : DEFAULT_COLLAPSED_HEIGHT,
    scale: typeof value.scale === "number" ? value.scale : DEFAULT_SETTINGS.scale,
    resizeMode:
      typeof value.resizeMode === "boolean" ? value.resizeMode : DEFAULT_SETTINGS.resizeMode,
    minimalChrome:
      typeof value.minimalChrome === "boolean"
        ? value.minimalChrome
        : DEFAULT_SETTINGS.minimalChrome,
    useRoomDefault:
      typeof value.useRoomDefault === "boolean"
        ? value.useRoomDefault
        : DEFAULT_SETTINGS.useRoomDefault,
    collapsed:
      typeof value.collapsed === "boolean" ? value.collapsed : DEFAULT_SETTINGS.collapsed,
  };
}

export function loadLocalSettings(): SealChatSettings {
  const raw = window.localStorage.getItem(LOCAL_KEY);
  if (!raw) {
    return DEFAULT_SETTINGS;
  }

  try {
    return mergeSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveLocalSettings(settings: SealChatSettings): void {
  window.localStorage.setItem(LOCAL_KEY, JSON.stringify(settings));
}

export async function loadRoomDefaultUrl(): Promise<string> {
  const { default: OBR } = await import("@owlbear-rodeo/sdk");
  const metadata = await OBR.room.getMetadata();
  const value = metadata[ROOM_URL_KEY];
  return typeof value === "string" ? value : "";
}

export async function saveRoomDefaultUrl(url: string): Promise<void> {
  const { default: OBR } = await import("@owlbear-rodeo/sdk");
  await OBR.room.setMetadata({ [ROOM_URL_KEY]: url });
}
