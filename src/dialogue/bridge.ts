import type {
  BridgeHandshakeAck,
  DialogueQueueEvent,
  DialogueQueueItem,
  SealChatRoleSnapshot,
} from "./types";

type RoleMap = Map<string, SealChatRoleSnapshot>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function resolveRoleField(
  data: Record<string, unknown>,
  field: "displayName" | "color" | "avatarUrl",
  rolesById: RoleMap
): string {
  const directValue = data[field];
  if (typeof directValue === "string" && directValue.length > 0) {
    return directValue;
  }

  const identityId = typeof data.identityId === "string" ? data.identityId : null;
  if (!identityId) {
    return "";
  }

  return rolesById.get(identityId)?.[field] ?? "";
}

export function createHandshakeMessage(): {
  type: "sealchat.bridge.handshake";
  version: 1;
  nonce: string;
  want: ["roles", "messages"];
  currentChannelOnly: true;
} {
  return {
    type: "sealchat.bridge.handshake",
    version: 1,
    nonce: `obr-${Date.now()}`,
    want: ["roles", "messages"],
    currentChannelOnly: true,
  };
}

export function createUnsubscribeMessage(): {
  type: "sealchat.bridge.unsubscribe";
} {
  return {
    type: "sealchat.bridge.unsubscribe",
  };
}

export function isHandshakeAckWithChannel(data: unknown): data is BridgeHandshakeAck {
  return (
    isRecord(data) &&
    data.type === "sealchat.bridge.handshake.ack" &&
    typeof data.channelId === "string" &&
    data.channelId.length > 0
  );
}

export function readRolesSnapshot(data: unknown): SealChatRoleSnapshot[] | null {
  if (!isRecord(data) || data.type !== "sealchat.bridge.roles.snapshot" || !Array.isArray(data.roles)) {
    return null;
  }

  return data.roles
    .filter((entry): entry is Record<string, unknown> => isRecord(entry))
    .map((entry) => ({
      identityId: typeof entry.identityId === "string" ? entry.identityId : "",
      displayName: typeof entry.displayName === "string" ? entry.displayName : "",
      color: typeof entry.color === "string" ? entry.color : "",
      avatarUrl: typeof entry.avatarUrl === "string" ? entry.avatarUrl : "",
    }))
    .filter((entry) => entry.identityId.length > 0);
}

function normalizeItem(
  data: Record<string, unknown>,
  rolesById: RoleMap
): DialogueQueueItem | null {
  const messageId = typeof data.messageId === "string" ? data.messageId : "";
  const text = typeof data.contentText === "string" ? data.contentText.trim() : "";
  if (!messageId || !text) {
    return null;
  }

  return {
    messageId,
    identityId: typeof data.identityId === "string" ? data.identityId : null,
    displayName: resolveRoleField(data, "displayName", rolesById) || "未知角色",
    color: resolveRoleField(data, "color", rolesById),
    avatarUrl: resolveRoleField(data, "avatarUrl", rolesById),
    text,
    createdAt: typeof data.createdAt === "number" ? data.createdAt : null,
  };
}

export function normalizeBridgeMessageEvent(
  data: unknown,
  rolesById: RoleMap
): DialogueQueueEvent | null {
  if (
    !isRecord(data) ||
    data.type !== "sealchat.bridge.message" ||
    data.icMode !== "ic" ||
    data.isWhisper !== false ||
    typeof data.event !== "string"
  ) {
    return null;
  }

  if (data.event === "message-deleted") {
    return typeof data.messageId === "string"
      ? { type: "delete", messageId: data.messageId }
      : null;
  }

  const item = normalizeItem(data, rolesById);
  if (!item) {
    return null;
  }

  if (data.event === "message-created") {
    return {
      type: "enqueue",
      item,
    };
  }

  if (data.event === "message-updated") {
    return {
      type: "update",
      item,
    };
  }

  return null;
}
