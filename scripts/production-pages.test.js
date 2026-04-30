import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const distDir = join(process.cwd(), "dist");

test("production build includes every Owlbear HTML entry", () => {
  const expectedPages = ["index.html", "panel.html", "tab.html"];

  for (const page of expectedPages) {
    assert.equal(existsSync(join(distDir, page)), true, `${page} should exist in dist`);
  }
});

test("production panel entry loads the panel bundle instead of the launcher bundle", () => {
  const panelHtml = readFileSync(join(distDir, "panel.html"), "utf8");

  assert.match(panelHtml, /assets\/panel-/);
  assert.doesNotMatch(panelHtml, /assets\/index-/);
});
