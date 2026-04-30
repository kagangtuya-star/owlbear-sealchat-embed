import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "../settings/config";
import { mergeSettings } from "../settings/storage";

describe("settings storage", () => {
  it("merges partial settings with defaults", () => {
    expect(
      mergeSettings({
        sealChatUrl: "https://chat.example.com",
        width: 500,
        top: 120,
        scale: 125,
      })
    ).toEqual({
      ...DEFAULT_SETTINGS,
      sealChatUrl: "https://chat.example.com",
      width: 500,
      top: 120,
      scale: 125,
    });
  });

  it("ignores invalid stored settings", () => {
    expect(mergeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(mergeSettings("bad")).toEqual(DEFAULT_SETTINGS);
  });
});
