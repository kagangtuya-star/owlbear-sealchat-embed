export type ValidationResult =
  | { ok: true; url: string }
  | { ok: false; reason: string };

export type SealChatSettings = {
  sealChatUrl: string;
  width: number;
  height: number;
  top: number;
  rightOffset: number;
  collapsedTop: number;
  collapsedRightOffset: number;
  collapsedWidth: number;
  collapsedHeight: number;
  scale: number;
  resizeMode: boolean;
  minimalChrome: boolean;
  useRoomDefault: boolean;
  collapsed: boolean;
  dialogueEnabled: boolean;
  dialogueConfigMode: boolean;
  dialogueTypeSpeed: number;
  dialogueFontSize: number;
  dialogueWaitMs: number;
  dialogueWidth: number;
  dialogueHeight: number;
  dialogueTop: number;
  dialogueLeftOffset: number;
  dialogueCollapsed: boolean;
  dialogueCollapsedTop: number;
  dialogueCollapsedLeftOffset: number;
  dialogueCollapsedWidth: number;
  dialogueCollapsedHeight: number;
};

export const DEFAULT_COLLAPSED_HEIGHT = 56;
export const DEFAULT_DIALOGUE_COLLAPSED_HEIGHT = 56;

export const DEFAULT_SETTINGS: SealChatSettings = {
  sealChatUrl: "",
  width: 420,
  height: 620,
  top: 48,
  rightOffset: 72,
  collapsedTop: -1,
  collapsedRightOffset: 72,
  collapsedWidth: 44,
  collapsedHeight: DEFAULT_COLLAPSED_HEIGHT,
  scale: 100,
  resizeMode: false,
  minimalChrome: true,
  useRoomDefault: false,
  collapsed: false,
  dialogueEnabled: false,
  dialogueConfigMode: false,
  dialogueTypeSpeed: 50,
  dialogueFontSize: 20,
  dialogueWaitMs: 5000,
  dialogueWidth: 640,
  dialogueHeight: 280,
  dialogueTop: 56,
  dialogueLeftOffset: 88,
  dialogueCollapsed: false,
  dialogueCollapsedTop: -1,
  dialogueCollapsedLeftOffset: 88,
  dialogueCollapsedWidth: 52,
  dialogueCollapsedHeight: DEFAULT_DIALOGUE_COLLAPSED_HEIGHT,
};

function nearestInteger(value: number): number {
  return Number.isFinite(value) ? Math.round(value) : value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function sanitizeSettingsNumbers(settings: SealChatSettings): SealChatSettings {
  return {
    ...settings,
    width: nearestInteger(settings.width),
    height: nearestInteger(settings.height),
    top: nearestInteger(settings.top),
    rightOffset: nearestInteger(settings.rightOffset),
    collapsedTop: nearestInteger(settings.collapsedTop),
    collapsedRightOffset: nearestInteger(settings.collapsedRightOffset),
    collapsedWidth: nearestInteger(settings.collapsedWidth),
    collapsedHeight: nearestInteger(settings.collapsedHeight),
    scale: nearestInteger(settings.scale),
    dialogueTypeSpeed: nearestInteger(settings.dialogueTypeSpeed),
    dialogueFontSize: nearestInteger(settings.dialogueFontSize),
    dialogueWaitMs: nearestInteger(settings.dialogueWaitMs),
    dialogueWidth: nearestInteger(settings.dialogueWidth),
    dialogueHeight: nearestInteger(settings.dialogueHeight),
    dialogueTop: nearestInteger(settings.dialogueTop),
    dialogueLeftOffset: nearestInteger(settings.dialogueLeftOffset),
    dialogueCollapsedTop: nearestInteger(settings.dialogueCollapsedTop),
    dialogueCollapsedLeftOffset: nearestInteger(settings.dialogueCollapsedLeftOffset),
    dialogueCollapsedWidth: nearestInteger(settings.dialogueCollapsedWidth),
    dialogueCollapsedHeight: nearestInteger(settings.dialogueCollapsedHeight),
  };
}

export function normalizeSealChatUrl(input: string): string {
  return input.trim().replace(/\/+$/, "");
}

export function validateSealChatUrl(input: string): ValidationResult {
  const normalized = normalizeSealChatUrl(input);
  if (!normalized) {
    return { ok: false, reason: "Please enter a SealChat URL." };
  }

  let url: URL;
  try {
    url = new URL(normalized);
  } catch {
    return { ok: false, reason: "SealChat URL is not a valid URL." };
  }

  const isLocalhost = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol === "https:" || (url.protocol === "http:" && isLocalhost)) {
    return { ok: true, url: normalized };
  }

  return { ok: false, reason: "Production requires an https:// URL." };
}

export function buildEmbedUrl(baseUrl: string): string {
  const url = new URL(normalizeSealChatUrl(baseUrl));
  url.searchParams.set("embed", "obr");
  return url.toString();
}

export function buildSealChatRootUrl(baseUrl: string): string {
  return normalizeSealChatUrl(baseUrl);
}

export function buildLoginUrl(baseUrl: string): string {
  return normalizeSealChatUrl(baseUrl);
}

export function getUrlOrigin(input: string): string {
  return new URL(normalizeSealChatUrl(input)).origin;
}

export function isBridgeChannelAck(value: unknown): value is {
  type: "sealchat.bridge.handshake.ack";
  channelId: string;
} {
  return (
    isRecord(value) &&
    value.type === "sealchat.bridge.handshake.ack" &&
    typeof value.channelId === "string" &&
    value.channelId.length > 0
  );
}

