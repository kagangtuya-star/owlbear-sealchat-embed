import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const mainSource = readFileSync(new URL("../src/main.ts", import.meta.url), "utf8");

test("panel size controls accept any nearest integer value", () => {
  for (const id of [
    "panel-width",
    "panel-height",
    "panel-top",
    "panel-right",
    "collapsed-width",
    "collapsed-height",
    "panel-scale",
  ]) {
    assert.match(
      mainSource,
      new RegExp(`id="${id}"[^>]+type="number"[^>]+step="1"`),
      `${id} must use step=1 so rounded integer values are valid`
    );
  }
});
