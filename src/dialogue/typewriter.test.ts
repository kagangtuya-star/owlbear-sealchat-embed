import { describe, expect, it } from "vitest";
import { countVisibleCharacters, sliceHtmlByVisibleCharacters } from "./typewriter";

describe("dialogue typewriter helpers", () => {
  it("counts html entities and tags as visible glyphs", () => {
    expect(countVisibleCharacters("A<br>&amp;")).toBe(3);
  });

  it("slices by visible characters while preserving tags and entities", () => {
    expect(sliceHtmlByVisibleCharacters("A<br>&amp;", 2)).toBe("A<br>&amp;");
  });
});
