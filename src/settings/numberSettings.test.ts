import { describe, expect, it } from "vitest";
import { calculateResizeSettings } from "../panel/resize";
import { DEFAULT_SETTINGS, sanitizeSettingsNumbers } from "./config";
import { mergeSettings } from "./storage";

describe("integer settings numbers", () => {
  it("rounds stored panel geometry values loaded from local settings", () => {
    expect(
      mergeSettings({
        ...DEFAULT_SETTINGS,
        width: 383.99962306022644,
        height: 649.787409901619,
        top: 59.40001606941223,
        rightOffset: 72.5,
      })
    ).toMatchObject({
      width: 384,
      height: 650,
      top: 59,
      rightOffset: 73,
    });
  });

  it("rounds all numeric settings fields to the nearest integer", () => {
    expect(
      sanitizeSettingsNumbers({
        ...DEFAULT_SETTINGS,
        width: 420.4,
        height: 620.5,
        top: 48.49,
        rightOffset: 71.51,
        collapsedTop: 12.5,
        collapsedRightOffset: 72.49,
        collapsedWidth: 44.5,
        collapsedHeight: 55.5,
        scale: 99.5,
        dialogueTypeSpeed: 19.6,
        dialogueFontSize: 24.5,
        dialogueWaitMs: 1000.6,
        dialogueWidth: 639.6,
        dialogueHeight: 279.6,
        dialogueTop: 55.6,
        dialogueLeftOffset: 88.6,
        dialogueCollapsedTop: 13.5,
        dialogueCollapsedLeftOffset: 90.5,
        dialogueCollapsedWidth: 52.5,
        dialogueCollapsedHeight: 55.6,
      })
    ).toMatchObject({
      width: 420,
      height: 621,
      top: 48,
      rightOffset: 72,
      collapsedTop: 13,
      collapsedRightOffset: 72,
      collapsedWidth: 45,
      collapsedHeight: 56,
      scale: 100,
      dialogueTypeSpeed: 20,
      dialogueFontSize: 25,
      dialogueWaitMs: 1001,
      dialogueWidth: 640,
      dialogueHeight: 280,
      dialogueTop: 56,
      dialogueLeftOffset: 89,
      dialogueCollapsedTop: 14,
      dialogueCollapsedLeftOffset: 91,
      dialogueCollapsedWidth: 53,
      dialogueCollapsedHeight: 56,
    });
  });

  it("rounds resize drag output before it can be persisted", () => {
    expect(
      calculateResizeSettings(
        { ...DEFAULT_SETTINGS, width: 420, height: 620, top: 48, rightOffset: 72 },
        "top",
        { dx: 0, dy: 11.6 }
      )
    ).toMatchObject({
      height: 608,
      top: 60,
    });
  });
});
