import {
  DEFAULT_COLLAPSED_HEIGHT,
  DEFAULT_DIALOGUE_COLLAPSED_HEIGHT,
  DEFAULT_SETTINGS,
  SealChatSettings,
  sanitizeSettingsNumbers,
} from "./config";

const LOCAL_KEY = "sealchat.owlbear.settings.v1";
const ROOM_URL_KEY = "sealchat.owlbear/defaultUrl";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function mergeSettings(value: unknown): SealChatSettings {
  if (!isRecord(value)) {
    return DEFAULT_SETTINGS;
  }

  return sanitizeSettingsNumbers({
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
    dialogueEnabled:
      typeof value.dialogueEnabled === "boolean"
        ? value.dialogueEnabled
        : DEFAULT_SETTINGS.dialogueEnabled,
    dialogueConfigMode:
      typeof value.dialogueConfigMode === "boolean"
        ? value.dialogueConfigMode
        : DEFAULT_SETTINGS.dialogueConfigMode,
    dialogueTypeSpeed:
      typeof value.dialogueTypeSpeed === "number"
        ? value.dialogueTypeSpeed === 10
          ? DEFAULT_SETTINGS.dialogueTypeSpeed
          : value.dialogueTypeSpeed
        : DEFAULT_SETTINGS.dialogueTypeSpeed,
    dialogueFontSize:
      typeof value.dialogueFontSize === "number"
        ? value.dialogueFontSize === 24
          ? DEFAULT_SETTINGS.dialogueFontSize
          : value.dialogueFontSize
        : DEFAULT_SETTINGS.dialogueFontSize,
    dialogueWaitMs:
      typeof value.dialogueWaitMs === "number"
        ? value.dialogueWaitMs === 1000
          ? DEFAULT_SETTINGS.dialogueWaitMs
          : value.dialogueWaitMs
        : DEFAULT_SETTINGS.dialogueWaitMs,
    dialogueWidth:
      typeof value.dialogueWidth === "number"
        ? value.dialogueWidth
        : DEFAULT_SETTINGS.dialogueWidth,
    dialogueHeight:
      typeof value.dialogueHeight === "number"
        ? value.dialogueHeight
        : DEFAULT_SETTINGS.dialogueHeight,
    dialogueTop:
      typeof value.dialogueTop === "number" ? value.dialogueTop : DEFAULT_SETTINGS.dialogueTop,
    dialogueLeftOffset:
      typeof value.dialogueLeftOffset === "number"
        ? value.dialogueLeftOffset
        : DEFAULT_SETTINGS.dialogueLeftOffset,
    dialogueCollapsed:
      typeof value.dialogueCollapsed === "boolean"
        ? value.dialogueCollapsed
        : DEFAULT_SETTINGS.dialogueCollapsed,
    dialogueCollapsedTop:
      typeof value.dialogueCollapsedTop === "number"
        ? value.dialogueCollapsedTop
        : DEFAULT_SETTINGS.dialogueCollapsedTop,
    dialogueCollapsedLeftOffset:
      typeof value.dialogueCollapsedLeftOffset === "number"
        ? value.dialogueCollapsedLeftOffset
        : DEFAULT_SETTINGS.dialogueCollapsedLeftOffset,
    dialogueCollapsedWidth:
      typeof value.dialogueCollapsedWidth === "number"
        ? value.dialogueCollapsedWidth
        : DEFAULT_SETTINGS.dialogueCollapsedWidth,
    dialogueCollapsedHeight:
      typeof value.dialogueCollapsedHeight === "number" &&
      value.dialogueCollapsedHeight !== 96
        ? value.dialogueCollapsedHeight
        : DEFAULT_DIALOGUE_COLLAPSED_HEIGHT,
  });
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
  window.localStorage.setItem(LOCAL_KEY, JSON.stringify(sanitizeSettingsNumbers(settings)));
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

