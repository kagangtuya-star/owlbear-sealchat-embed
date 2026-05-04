import type { SealChatSettings } from "../settings/config";

export type DialogueQueueItem = {
  messageId: string;
  identityId: string | null;
  displayName: string;
  color: string;
  avatarUrl: string;
  text: string;
  createdAt: number | null;
};

export type DialogueQueueEvent =
  | { type: "enqueue"; item: DialogueQueueItem }
  | { type: "update"; item: DialogueQueueItem }
  | { type: "delete"; messageId: string }
  | { type: "advance" }
  | { type: "fast-forward-latest" };

export type DialogueQueueState = {
  current: DialogueQueueItem | null;
  pending: DialogueQueueItem[];
  latest: DialogueQueueItem | null;
};

export type BridgeHandshakeAck = {
  type: "sealchat.bridge.handshake.ack";
  version?: number;
  nonce?: string;
  ok?: boolean;
  worldId?: string;
  channelId: string;
};

export type SealChatRoleSnapshot = {
  identityId: string;
  displayName: string;
  color: string;
  avatarUrl: string;
};

export type DialogueChannelMessage =
  | { type: "sealchat.dialogue.bridge-ready"; ack: BridgeHandshakeAck }
  | { type: "sealchat.dialogue.roles"; roles: SealChatRoleSnapshot[] }
  | { type: "sealchat.dialogue.enqueue"; item: DialogueQueueItem }
  | { type: "sealchat.dialogue.update"; item: DialogueQueueItem }
  | { type: "sealchat.dialogue.delete"; messageId: string }
  | { type: "sealchat.dialogue.settings"; settings: SealChatSettings };
