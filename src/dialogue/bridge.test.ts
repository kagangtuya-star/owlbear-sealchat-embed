import { describe, expect, it } from "vitest";
import {
  createHandshakeMessage,
  isHandshakeAckWithChannel,
  normalizeBridgeMessageEvent,
} from "./bridge";

describe("dialogue bridge helpers", () => {
  it("builds handshake payloads", () => {
    expect(createHandshakeMessage().type).toBe("sealchat.bridge.handshake");
  });

  it("treats ack with channelId as bridge-ready", () => {
    expect(
      isHandshakeAckWithChannel({
        type: "sealchat.bridge.handshake.ack",
        channelId: "channel-1",
      })
    ).toBe(true);
  });

  it("accepts only public IC created messages", () => {
    expect(
      normalizeBridgeMessageEvent(
        {
          type: "sealchat.bridge.message",
          event: "message-created",
          icMode: "ic",
          isWhisper: false,
          messageId: "m1",
          contentText: "Hello",
          displayName: "A",
          color: "#fff",
          avatarUrl: "https://img",
        },
        new Map()
      )
    ).toMatchObject({
      type: "enqueue",
      item: { messageId: "m1" },
    });

    expect(
      normalizeBridgeMessageEvent(
        {
          type: "sealchat.bridge.message",
          event: "message-created",
          icMode: "ooc",
          isWhisper: false,
          messageId: "m2",
          contentText: "No",
        },
        new Map()
      )
    ).toBeNull();
  });
});
