import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const launcherSource = readFileSync(new URL("../src/main.ts", import.meta.url), "utf8");
const panelSource = readFileSync(new URL("../src/dialoguePanel.ts", import.meta.url), "utf8");
const hostPanelSource = readFileSync(new URL("../src/panel.ts", import.meta.url), "utf8");
const styleSource = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const formattingSource = readFileSync(new URL("../src/dialogue/formatting.ts", import.meta.url), "utf8");

test("launcher exposes dialogue controls", () => {
  assert.match(launcherSource, /id="dialogue-enabled"/);
  assert.match(launcherSource, /id="dialogue-config-mode"/);
  assert.match(launcherSource, /id="dialogue-type-speed"/);
  assert.match(launcherSource, /id="dialogue-font-size"/);
  assert.match(launcherSource, /id="dialogue-wait-ms"/);
  assert.match(launcherSource, /启用对话框/);
  assert.match(launcherSource, /调整对话框配置/);
  assert.match(launcherSource, /打字间隔\(ms\/字\)/);
  assert.match(launcherSource, /文字大小/);
  assert.match(launcherSource, /等待时间\(秒\)/);
  assert.match(launcherSource, /对话宽度/);
  assert.match(launcherSource, /对话高度/);
  assert.match(launcherSource, /对话顶部/);
  assert.match(launcherSource, /对话左偏移/);
  assert.match(launcherSource, /最小化宽度/);
  assert.match(launcherSource, /最小化高度/);
  assert.match(launcherSource, /设置已应用。/);
  assert.doesNotMatch(launcherSource, /璋冩暣/);
  assert.doesNotMatch(launcherSource, /瀵硅瘽/);
  assert.doesNotMatch(launcherSource, /璁剧疆宸插簲鐢ㄣ/);
});

test("dialogue panel exposes minimize and fast-forward buttons", () => {
  assert.match(panelSource, /id="dialogue-minimize"/);
  assert.match(panelSource, /id="dialogue-fast-forward"/);
  assert.match(panelSource, /class="dialogue-nameplate"/);
  assert.match(panelSource, /publishDialogueSettings\(next, true, false\);\s*queueOpenDialogue\(next\);/);
});

test("dialogue panel keeps the last completed line instead of reverting to waiting copy", () => {
  assert.match(panelSource, /if \(queueState\.pending\.length === 0\) \{\s*playbackCompleted = true;/);
  assert.doesNotMatch(panelSource, /dialogue-status-bar/);
  assert.doesNotMatch(panelSource, /等待进入频道/);
});

test("single-page dialogue omits the page indicator node entirely", () => {
  assert.match(panelSource, /const showPageIndicator = Boolean\(current\) && totalPages > 1;/);
  assert.match(panelSource, /const pageIndicatorHtml = showPageIndicator/);
});

test("host panel re-syncs dialogue popover from broadcast settings", () => {
  assert.match(hostPanelSource, /type === "sealchat\.dialogue\.settings"/);
  assert.match(hostPanelSource, /syncDialoguePopover\(event\.data\.settings\)/);
});

test("collapsed dialogue tab remains interactive", () => {
  assert.match(styleSource, /\.dialogue-collapsed-tab\s*\{[\s\S]*pointer-events:\s*auto;/);
  assert.match(styleSource, /\.dialogue-resize-edge\s*\{[\s\S]*background:\s*transparent;/);
  assert.match(styleSource, /\.dialogue-nameplate\s*\{[\s\S]*font-weight:\s*800;/);
  assert.match(styleSource, /\.dialogue-shell\s*\{[\s\S]*align-items:\s*start;/);
  assert.match(styleSource, /\.dialogue-shell\s*\{[\s\S]*grid-template-columns:\s*clamp\(96px, 22%, 220px\) minmax\(0, 1fr\);/);
  assert.match(styleSource, /\.dialogue-card \.portrait-frame\s*\{[\s\S]*aspect-ratio:\s*3 \/ 4;/);
  assert.match(styleSource, /\.dialogue-copy-stage\s*\{[\s\S]*height:\s*100%;[\s\S]*overflow:\s*hidden;/);
  assert.match(styleSource, /\.dialogue-copy-viewport\s*\{[\s\S]*overflow-y:\s*auto;/);
  assert.match(styleSource, /\.dialogue-copy\s*\{[\s\S]*white-space:\s*normal;[\s\S]*overflow-wrap:\s*anywhere;/);
  assert.match(styleSource, /\.dialogue-fast-forward\s*\{[\s\S]*right:\s*54px;/);
  assert.match(styleSource, /\.dialogue-card \.character-image\s*\{[\s\S]*object-fit:\s*contain;/);
  assert.doesNotMatch(styleSource, /\.dialogue-nameplate\s*\{[\s\S]*background:/);
  assert.doesNotMatch(styleSource, /\.dialogue-shell\s*\{[\s\S]*border:\s*1px/);
  assert.doesNotMatch(styleSource, /\.dialogue-card \.portrait-frame\s*\{[\s\S]*border:\s*1px/);
});

test("dialogue formatting decodes html entities before rendering", () => {
  assert.match(formattingSource, /function decodeHtmlEntities/);
  assert.match(formattingSource, /escapeHtml\(decodeHtmlEntities\(value\)\)/);
  assert.match(formattingSource, /\.replace\(\/\\r\?\\n\/g, "<br>"\)/);
});

test("dialogue render auto-scrolls the viewport with typewriter output", () => {
  assert.match(panelSource, /function syncDialogueScroll\(\)/);
  assert.match(panelSource, /document\.querySelector<HTMLElement>\("\.dialogue-copy-viewport"\)/);
  assert.match(panelSource, /renderExpanded\(root\);\s*syncDialogueScroll\(\);/);
});
