export type AuthStatus = "unknown" | "authenticated" | "unauthenticated";

export type SealChatMessage =
  | { type: "auth"; status: Exclude<AuthStatus, "unknown"> }
  | { type: "unread"; count: number };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseSealChatMessage(value: unknown): SealChatMessage | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    value.type === "sealchat.auth" &&
    (value.status === "authenticated" || value.status === "unauthenticated")
  ) {
    return { type: "auth", status: value.status };
  }

  if (value.type === "sealchat.unread" && typeof value.count === "number") {
    return { type: "unread", count: Math.max(0, Math.floor(value.count)) };
  }

  return null;
}

export function shouldOpenLoginWindow(
  status: AuthStatus,
  loginWindowOpened: boolean
): boolean {
  return status === "unauthenticated" && !loginWindowOpened;
}
