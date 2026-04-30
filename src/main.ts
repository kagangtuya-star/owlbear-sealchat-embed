import OBR from "@owlbear-rodeo/sdk";
import { buildEmbedUrl, buildLoginUrl, validateSealChatUrl } from "./settings/config";
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
        <span>${settings.collapsed ? "已收缩" : "已展开"}</span>
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
        <section class="resize-controls ${settings.resizeMode ? "is-open" : ""}">
          <label>宽度 <input id="panel-width" type="number" min="280" step="10" value="${
            settings.width
          }" /></label>
          <label>高度 <input id="panel-height" type="number" min="360" step="10" value="${
            settings.height
          }" /></label>
          <label>顶部 <input id="panel-top" type="number" min="0" step="10" value="${
            settings.top
          }" /></label>
          <label>避开右侧工具栏 <input id="panel-right" type="number" min="0" step="4" value="${
            settings.rightOffset
          }" /></label>
          <label>收缩宽度 <input id="collapsed-width" type="number" min="36" step="2" value="${
            settings.collapsedWidth
          }" /></label>
          <label>收缩高度 <input id="collapsed-height" type="number" min="96" step="8" value="${
            settings.collapsedHeight
          }" /></label>
          <label>缩放倍率 <input id="panel-scale" type="number" min="60" max="160" step="5" value="${
            settings.scale
          }" /></label>
        </section>
        <p id="control-status" class="control-status">${
          validation.ok ? "地址有效，可打开右侧面板。" : escapeAttribute(validation.reason)
        }</p>
        <div class="control-actions">
          <button id="open-panel" type="button">展开</button>
          <button id="collapse-panel" type="button">收缩</button>
          <button id="refresh-panel" type="button">刷新</button>
          <button id="login-panel" type="button">登录</button>
          <button id="close-panel" type="button">关闭</button>
        </div>
        <button id="save-control" type="submit">保存设置</button>
      </form>
    </main>
  `;

  const readSettings = () => {
    const current = loadLocalSettings();
    return {
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
    };
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
      renderLauncher();
    }
  });

  document.querySelector("#resize-mode")?.addEventListener("change", async () => {
    const next = { ...readSettings(), collapsed: settings.collapsed };
    saveLocalSettings(next);
    channel?.postMessage({ type: "sealchat.control.settings", settings: next });
    await openPanel(next);
    renderLauncher();
  });

  document.querySelectorAll<HTMLInputElement>(".control-form input").forEach((input) => {
    input.addEventListener("input", () => {
      if (input.id === "resize-mode") {
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
  });

  document.querySelector("#collapse-panel")?.addEventListener("click", async () => {
    const next = persist(true);
    if (!next) {
      return;
    }
    await openPanel(next);
  });

  document.querySelector("#refresh-panel")?.addEventListener("click", () => {
    channel?.postMessage({ type: "sealchat.control.refresh" });
  });

  document.querySelector("#login-panel")?.addEventListener("click", () => {
    const next = persist();
    if (!next) {
      return;
    }
    const embedUrl = buildEmbedUrl(next.sealChatUrl);
    window.open(
      buildLoginUrl(next.sealChatUrl, embedUrl),
      "sealchat-login",
      "noopener,noreferrer,width=960,height=720"
    );
  });

  document.querySelector("#close-panel")?.addEventListener("click", async () => {
    const { closeAllPopovers } = await import("./obr/popover");
    await closeAllPopovers();
  });
}

channel?.addEventListener("message", (event) => {
  if (event.data?.type !== "sealchat.panel.settings") {
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
  await OBR.action.setIcon("/icon.svg");
  renderLauncher();
});
