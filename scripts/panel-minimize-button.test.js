import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const panelSource = readFileSync(new URL("../src/panel.ts", import.meta.url), "utf8");
const stylesSource = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const minimizeRule = stylesSource.match(/\.panel-minimize\s*\{[^}]+\}/)?.[0] ?? "";

test("panel renders an embedded mini minimize button", () => {
  assert.match(panelSource, /id="panel-minimize"/);
  assert.match(panelSource, /class="panel-minimize"/);
  assert.match(panelSource, /title="收缩 SealChat"/);
});

test("mini minimize button collapses the panel through existing settings flow", () => {
  assert.match(panelSource, /querySelector<HTMLButtonElement>\("#panel-minimize"\)/);
  assert.match(panelSource, /collapsed:\s*true/);
  assert.match(panelSource, /publishPanelSettings\(next\)/);
  assert.match(panelSource, /queueOpenPanel\(next\)/);
});

test("mini minimize button stays visually unobtrusive and hides when collapsed", () => {
  assert.match(stylesSource, /\.panel-minimize\s*\{/);
  assert.match(minimizeRule, /width:\s*20px/);
  assert.match(minimizeRule, /height:\s*20px/);
  assert.match(minimizeRule, /opacity:\s*0\.34/);
  assert.match(stylesSource, /\.panel-card\.is-collapsed \.panel-minimize/);
  assert.match(stylesSource, /display:\s*none/);
});
