import { describe, expect, it } from "vitest";
import { parseSealChatMessage, shouldOpenLoginWindow } from "../auth/messages";

describe("SealChat auth messages", () => {
  it("parses authenticated status", () => {
    expect(
      parseSealChatMessage({ type: "sealchat.auth", status: "authenticated" })
    ).toEqual({
      type: "auth",
      status: "authenticated",
    });
  });

  it("parses unauthenticated status", () => {
    expect(
      parseSealChatMessage({ type: "sealchat.auth", status: "unauthenticated" })
    ).toEqual({
      type: "auth",
      status: "unauthenticated",
    });
  });

  it("parses unread counts", () => {
    expect(parseSealChatMessage({ type: "sealchat.unread", count: 7 })).toEqual({
      type: "unread",
      count: 7,
    });
  });

  it("ignores malformed messages", () => {
    expect(parseSealChatMessage({ type: "sealchat.auth", status: "expired" })).toBe(
      null
    );
    expect(parseSealChatMessage("sealchat.auth")).toBe(null);
  });

  it("opens login only when unauthenticated and not already opened", () => {
    expect(shouldOpenLoginWindow("authenticated", false)).toBe(false);
    expect(shouldOpenLoginWindow("unknown", false)).toBe(false);
    expect(shouldOpenLoginWindow("unauthenticated", false)).toBe(true);
    expect(shouldOpenLoginWindow("unauthenticated", true)).toBe(false);
  });
});
