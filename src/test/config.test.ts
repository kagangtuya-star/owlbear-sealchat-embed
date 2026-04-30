import { describe, expect, it } from "vitest";
import {
  buildEmbedUrl,
  buildLoginUrl,
  getUrlOrigin,
  normalizeSealChatUrl,
  validateSealChatUrl,
} from "../settings/config";

describe("SealChat URL configuration", () => {
  it("accepts https URLs and removes trailing spaces", () => {
    expect(normalizeSealChatUrl(" https://chat.example.com ")).toBe(
      "https://chat.example.com"
    );
    expect(validateSealChatUrl("https://chat.example.com").ok).toBe(true);
  });

  it("allows localhost http for development", () => {
    expect(validateSealChatUrl("http://localhost:5173").ok).toBe(true);
  });

  it("rejects unsafe protocols", () => {
    expect(validateSealChatUrl("javascript:alert(1)").ok).toBe(false);
    expect(validateSealChatUrl("data:text/html,hello").ok).toBe(false);
    expect(validateSealChatUrl("http://chat.example.com").ok).toBe(false);
  });

  it("builds an embed URL without forcing path rewrites", () => {
    expect(buildEmbedUrl("https://chat.example.com/sealchat")).toBe(
      "https://chat.example.com/sealchat?embed=obr"
    );
  });

  it("builds a login URL that returns to the embed URL", () => {
    const loginUrl = buildLoginUrl(
      "https://chat.example.com",
      "https://chat.example.com?embed=obr"
    );
    expect(loginUrl).toBe(
      "https://chat.example.com/login?redirect=https%3A%2F%2Fchat.example.com%2F%3Fembed%3Dobr"
    );
  });

  it("extracts the configured origin for postMessage validation", () => {
    expect(getUrlOrigin("https://chat.example.com/path?embed=obr")).toBe(
      "https://chat.example.com"
    );
  });
});
