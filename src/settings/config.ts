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
};

export const DEFAULT_COLLAPSED_HEIGHT = 56;

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
};

export function normalizeSealChatUrl(input: string): string {
  return input.trim().replace(/\/+$/, "");
}

export function validateSealChatUrl(input: string): ValidationResult {
  const normalized = normalizeSealChatUrl(input);
  if (!normalized) {
    return { ok: false, reason: "请输入 SealChat 地址。" };
  }

  let url: URL;
  try {
    url = new URL(normalized);
  } catch {
    return { ok: false, reason: "SealChat 地址不是有效 URL。" };
  }

  const isLocalhost = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol === "https:" || (url.protocol === "http:" && isLocalhost)) {
    return { ok: true, url: normalized };
  }

  return { ok: false, reason: "生产环境必须使用 https:// 地址。" };
}

export function buildEmbedUrl(baseUrl: string): string {
  const url = new URL(normalizeSealChatUrl(baseUrl));
  url.searchParams.set("embed", "obr");
  return url.toString();
}

export function buildLoginUrl(baseUrl: string, returnTo: string): string {
  const url = new URL("/login", normalizeSealChatUrl(baseUrl));
  url.searchParams.set("redirect", new URL(returnTo).toString());
  return url.toString();
}

export function getUrlOrigin(input: string): string {
  return new URL(normalizeSealChatUrl(input)).origin;
}
