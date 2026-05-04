import OBR from "@owlbear-rodeo/sdk";
import {
  closeDialoguePopover,
  openDialoguePanel,
} from "./dialogue/popover";
import { sanitizeSettingsNumbers, validateSealChatUrl } from "./settings/config";
import { openPanel } from "./obr/popover";
import { loadLocalSettings, saveLocalSettings } from "./settings/storage";
import "./styles.css";

const channel = "BroadcastChannel" in window ? new BroadcastChannel("sealchat-obr") : null;
let previewTimer: number | undefined;

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function toNumber(input: HTMLInputElement | null, fallback: number): number {
  const value = Number(input?.value);
  return Number.isFinite(value) ? value : fallback;
}

async function syncDialoguePopover(settings: ReturnType<typeof loadLocalSettings>): Promise<void> {
  if (!settings.dialogueEnabled) {
    await closeDialoguePopover();
    return;
  }

  await openDialoguePanel(settings);
}

function syncLauncherHeight(): void {
  window.requestAnimationFrame(() => {
    const launcher = document.querySelector<HTMLElement>(".launcher-control");
    if (!launcher) {
      return;
    }

    void OBR.action.setHeight(Math.ceil(launcher.scrollHeight));
  });
}

function renderLauncher(): void {
  const app = document.querySelector<HTMLDivElement>("#app");
  if (!app) {
    return;
  }

  const settings = loadLocalSettings();
  const validation = validateSealChatUrl(settings.sealChatUrl);

  app.innerHTML = `
    <main class="launcher launcher-control">
      <header class="launcher-header">
        <strong>SealChat</strong>
      </header>
      <form id="control-form" class="control-form">
        <label>
          SealChat 地址
          <input id="sealchat-url" type="url" value="${escapeAttribute(
            settings.sealChatUrl
          )}" placeholder="https://chat.example.com" />
        </label>
        <label class="switch-row">
          <input id="resize-mode" type="checkbox" ${settings.resizeMode ? "checked" : ""} />
          调整大小与位置
        </label>
        <label class="switch-row">
          <input id="dialogue-enabled" type="checkbox" ${
            settings.dialogueEnabled ? "checked" : ""
          } />
          启用对话框
        </label>
        <label class="switch-row">
          <input id="dialogue-config-mode" type="checkbox" ${
            settings.dialogueConfigMode ? "checked" : ""
          } />
          调整对话框配置
        </label>
        <section class="resize-controls ${settings.resizeMode ? "is-open" : ""}">
          <label>宽度 <input id="panel-width" type="number" min="280" step="1" value="${
            settings.width
          }" /></label>
          <label>高度 <input id="panel-height" type="number" min="360" step="1" value="${
            settings.height
          }" /></label>
          <label>顶部 <input id="panel-top" type="number" min="0" step="1" value="${
            settings.top
          }" /></label>
          <label>避开右侧工具栏 <input id="panel-right" type="number" min="0" step="1" value="${
            settings.rightOffset
          }" /></label>
          <label>收缩宽度 <input id="collapsed-width" type="number" min="36" step="1" value="${
            settings.collapsedWidth
          }" /></label>
          <label>收缩高度 <input id="collapsed-height" type="number" min="44" step="1" value="${
            settings.collapsedHeight
          }" /></label>
          <label>缩放倍率 <input id="panel-scale" type="number" min="60" max="160" step="1" value="${
            settings.scale
          }" /></label>
        </section>
        <section class="resize-controls ${settings.dialogueConfigMode ? "is-open" : ""} dialogue-controls">
          <label>打字间隔(ms/字) <input id="dialogue-type-speed" type="number" min="1" step="1" value="${
            settings.dialogueTypeSpeed
          }" /></label>
          <label>文字大小 <input id="dialogue-font-size" type="number" min="14" step="1" value="${
            settings.dialogueFontSize
          }" /></label>
          <label>等待时间(秒) <input id="dialogue-wait-ms" type="number" min="0" step="1" value="${
            Math.round(settings.dialogueWaitMs / 1000)
          }" /></label>
          <label>对话宽度 <input id="dialogue-width" type="number" step="1" value="${
            settings.dialogueWidth
          }" /></label>
          <label>对话高度 <input id="dialogue-height" type="number" step="1" value="${
            settings.dialogueHeight
          }" /></label>
          <label>对话顶部 <input id="dialogue-top" type="number" min="0" step="1" value="${
            settings.dialogueTop
          }" /></label>
          <label>对话左偏移 <input id="dialogue-left" type="number" min="0" step="1" value="${
            settings.dialogueLeftOffset
          }" /></label>
          <label>最小化宽度 <input id="dialogue-collapsed-width" type="number" min="48" step="1" value="${
            settings.dialogueCollapsedWidth
          }" /></label>
          <label>最小化高度 <input id="dialogue-collapsed-height" type="number" min="48" step="1" value="${
            settings.dialogueCollapsedHeight
          }" /></label>
        </section>
        <div class="control-actions">
          <button id="open-panel" type="button">展开</button>
          <button id="collapse-panel" type="button">收缩</button>
          <button id="refresh-panel" type="button">刷新</button>
          <button id="close-panel" type="button">关闭</button>
        </div>
        <button id="save-control" type="submit">保存设置</button>
      </form>
    </main>
  `;
  syncLauncherHeight();

  const readSettings = () => {
    const current = loadLocalSettings();
    return sanitizeSettingsNumbers({
      ...current,
      sealChatUrl: document.querySelector<HTMLInputElement>("#sealchat-url")?.value ?? "",
      resizeMode: document.querySelector<HTMLInputElement>("#resize-mode")?.checked ?? false,
      width: toNumber(document.querySelector<HTMLInputElement>("#panel-width"), current.width),
      height: toNumber(document.querySelector<HTMLInputElement>("#panel-height"), current.height),
      top: toNumber(document.querySelector<HTMLInputElement>("#panel-top"), current.top),
      rightOffset: toNumber(
        document.querySelector<HTMLInputElement>("#panel-right"),
        current.rightOffset
      ),
      collapsedWidth: toNumber(
        document.querySelector<HTMLInputElement>("#collapsed-width"),
        current.collapsedWidth
      ),
      collapsedHeight: toNumber(
        document.querySelector<HTMLInputElement>("#collapsed-height"),
        current.collapsedHeight
      ),
      scale: toNumber(document.querySelector<HTMLInputElement>("#panel-scale"), current.scale),
      dialogueEnabled:
        document.querySelector<HTMLInputElement>("#dialogue-enabled")?.checked ??
        current.dialogueEnabled,
      dialogueConfigMode:
        document.querySelector<HTMLInputElement>("#dialogue-config-mode")?.checked ??
        current.dialogueConfigMode,
      dialogueTypeSpeed: toNumber(
        document.querySelector<HTMLInputElement>("#dialogue-type-speed"),
        current.dialogueTypeSpeed
      ),
      dialogueFontSize: toNumber(
        document.querySelector<HTMLInputElement>("#dialogue-font-size"),
        current.dialogueFontSize
      ),
      dialogueWaitMs: toNumber(
        document.querySelector<HTMLInputElement>("#dialogue-wait-ms"),
        current.dialogueWaitMs / 1000
      ) * 1000,
      dialogueWidth: toNumber(
        document.querySelector<HTMLInputElement>("#dialogue-width"),
        current.dialogueWidth
      ),
      dialogueHeight: toNumber(
        document.querySelector<HTMLInputElement>("#dialogue-height"),
        current.dialogueHeight
      ),
      dialogueTop: toNumber(
        document.querySelector<HTMLInputElement>("#dialogue-top"),
        current.dialogueTop
      ),
      dialogueLeftOffset: toNumber(
        document.querySelector<HTMLInputElement>("#dialogue-left"),
        current.dialogueLeftOffset
      ),
      dialogueCollapsedWidth: toNumber(
        document.querySelector<HTMLInputElement>("#dialogue-collapsed-width"),
        current.dialogueCollapsedWidth
      ),
      dialogueCollapsedHeight: toNumber(
        document.querySelector<HTMLInputElement>("#dialogue-collapsed-height"),
        current.dialogueCollapsedHeight
      ),
    });
  };

  const persist = (collapsed = readSettings().collapsed, silent = false) => {
    const next = { ...readSettings(), collapsed };
    const result = validateSealChatUrl(next.sealChatUrl);
    if (!result.ok) {
      const status = document.querySelector("#control-status");
      if (status) {
        status.textContent = result.reason;
      }
      return null;
    }
    saveLocalSettings({ ...next, sealChatUrl: result.url });
    channel?.postMessage({ type: "sealchat.control.settings", settings: next });
    if (!silent) {
      const status = document.querySelector("#control-status");
      if (status) {
        status.textContent = "设置已应用。";
      }
    }
    return { ...next, sealChatUrl: result.url };
  };

  const preview = () => {
    window.clearTimeout(previewTimer);
    previewTimer = window.setTimeout(() => {
      persist(readSettings().collapsed, true);
    }, 90);
  };

  document.querySelector("#control-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const next = persist();
    if (next) {
      await openPanel(next);
      await syncDialoguePopover(next);
      renderLauncher();
    }
  });

  document.querySelector("#resize-mode")?.addEventListener("change", async () => {
    const next = { ...readSettings(), collapsed: settings.collapsed };
    saveLocalSettings(next);
    channel?.postMessage({ type: "sealchat.control.settings", settings: next });
    await openPanel(next);
    await syncDialoguePopover(next);
    renderLauncher();
  });

  document.querySelector("#dialogue-enabled")?.addEventListener("change", async () => {
    const next = readSettings();
    saveLocalSettings(next);
    channel?.postMessage({ type: "sealchat.control.settings", settings: next });
    await syncDialoguePopover(next);
    renderLauncher();
  });

  document.querySelector("#dialogue-config-mode")?.addEventListener("change", () => {
    const next = readSettings();
    saveLocalSettings(next);
    renderLauncher();
  });

  document.querySelectorAll<HTMLInputElement>(".control-form input").forEach((input) => {
    input.addEventListener("input", () => {
      if (input.id === "resize-mode" || input.id === "dialogue-config-mode") {
        return;
      }
      preview();
    });
  });

  document.querySelector("#open-panel")?.addEventListener("click", async () => {
    const next = persist(false);
    if (!next) {
      return;
    }
    await openPanel(next);
    await syncDialoguePopover(next);
  });

  document.querySelector("#collapse-panel")?.addEventListener("click", async () => {
    const next = persist(true);
    if (!next) {
      return;
    }
    await openPanel(next);
    await syncDialoguePopover(next);
  });

  document.querySelector("#refresh-panel")?.addEventListener("click", () => {
    channel?.postMessage({ type: "sealchat.control.refresh" });
  });

  document.querySelector("#close-panel")?.addEventListener("click", async () => {
    const { closeAllPopovers } = await import("./obr/popover");
    await closeAllPopovers();
  });
}

channel?.addEventListener("message", (event) => {
  if (
    event.data?.type !== "sealchat.panel.settings" &&
    event.data?.type !== "sealchat.dialogue.settings"
  ) {
    return;
  }
  const settings = event.data.settings;
  if (!settings) {
    return;
  }
  saveLocalSettings(settings);
  renderLauncher();
});

OBR.onReady(async () => {
  await OBR.action.setTitle("SealChat");
  await OBR.action.setIcon("/icon.ico");
  renderLauncher();
  const settings = loadLocalSettings();
  if (settings.dialogueEnabled) {
    await syncDialoguePopover(settings);
  }
});

