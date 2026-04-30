import OBR from "@owlbear-rodeo/sdk";
import { AuthStatus, parseSealChatMessage, shouldOpenLoginWindow } from "./auth/messages";
import {
  calculateResizePreviewOffset,
  calculateResizeSettings,
  RESIZE_GUTTER,
  ResizeEdge,
  ResizePreviewOffset,
} from "./panel/resize";
import { buildEmbedUrl, buildLoginUrl, getUrlOrigin, validateSealChatUrl } from "./settings/config";
import { loadLocalSettings, saveLocalSettings } from "./settings/storage";
import "./styles.css";

type Settings = ReturnType<typeof loadLocalSettings>;

let authStatus: AuthStatus = "unknown";
let loginWindowOpened = false;
let iframe: HTMLIFrameElement | null = null;
let shell: HTMLElement | null = null;
let card: HTMLElement | null = null;
let frameWrap: HTMLElement | null = null;
let emptyState: HTMLElement | null = null;
const channel = "BroadcastChannel" in window ? new BroadcastChannel("sealchat-obr") : null;
const RESIZE_EDGES: ResizeEdge[] = ["left", "right", "top", "bottom", "corner"];

function openLoginIfNeeded(baseUrl: string): void {
  if (!shouldOpenLoginWindow(authStatus, loginWindowOpened)) {
    return;
  }

  loginWindowOpened = true;
  const embedUrl = buildEmbedUrl(baseUrl);
  window.open(
    buildLoginUrl(baseUrl, embedUrl),
    "sealchat-login",
    "noopener,noreferrer,width=960,height=720"
  );
}

function ensureShell(): void {
  const panel = document.querySelector<HTMLDivElement>("#panel");
  if (!panel || shell) {
    return;
  }

  panel.innerHTML = `
    <section id="panel-shell" class="panel-shell">
      <div id="panel-card" class="panel-card">
        <button id="collapsed-tab" class="floating-tab" type="button" title="点击展开；调整模式下可拖动">
          <span>聊天</span>
          <i id="tab-resize" aria-hidden="true"></i>
        </button>
        <div class="resize-edge edge-left" data-edge="left"></div>
        <div class="resize-edge edge-right" data-edge="right"></div>
        <div class="resize-edge edge-top" data-edge="top"></div>
        <div class="resize-edge edge-bottom" data-edge="bottom"></div>
        <div class="resize-edge edge-corner" data-edge="corner"></div>
        <div id="frame-wrap" class="frame-wrap">
          <iframe id="sealchat-frame" title="SealChat"></iframe>
          <div id="panel-empty" class="panel-empty"></div>
        </div>
      </div>
    </section>
  `;

  shell = document.querySelector<HTMLElement>("#panel-shell");
  card = document.querySelector<HTMLElement>("#panel-card");
  frameWrap = document.querySelector<HTMLElement>("#frame-wrap");
  iframe = document.querySelector<HTMLIFrameElement>("#sealchat-frame");
  emptyState = document.querySelector<HTMLElement>("#panel-empty");

  bindCollapsedTab();
  bindResizeEdges();
}

function isResizeEdge(value: string): value is ResizeEdge {
  return RESIZE_EDGES.includes(value as ResizeEdge);
}

function applyPanelStyles(
  settings: Settings,
  previewOffset: ResizePreviewOffset = { right: 0 }
): void {
  ensureShell();
  if (!shell || !card) {
    return;
  }

  shell.classList.toggle("is-resizing", settings.resizeMode);
  card.classList.toggle("is-collapsed", settings.collapsed);
  card.classList.toggle("is-resizing", settings.resizeMode);
  card.style.setProperty("--panel-width", `${settings.width}px`);
  card.style.setProperty("--panel-height", `${settings.height}px`);
  card.style.setProperty("--panel-top", `${settings.collapsed ? 0 : RESIZE_GUTTER}px`);
  card.style.setProperty(
    "--panel-right",
    `${previewOffset.right + (settings.collapsed ? 0 : RESIZE_GUTTER)}px`
  );
  card.style.setProperty("--collapsed-width", `${settings.collapsedWidth}px`);
  card.style.setProperty("--collapsed-height", `${settings.collapsedHeight}px`);
  card.style.setProperty("--sealchat-scale", `${settings.scale / 100}`);
}

function applySettings(settings: Settings): void {
  applyPanelStyles(settings);
  if (!card || !frameWrap || !iframe || !emptyState) {
    return;
  }

  card.classList.remove("is-resize-dragging");
  delete card.dataset.activeEdge;

  const validation = validateSealChatUrl(settings.sealChatUrl);
  if (!validation.ok) {
    iframe.hidden = true;
    emptyState.hidden = false;
    emptyState.textContent = validation.reason;
    return;
  }

  const frameUrl = buildEmbedUrl(validation.url);
  emptyState.hidden = true;
  iframe.hidden = false;
  if (iframe.src !== frameUrl) {
    iframe.src = frameUrl;
  }
}

function publishPanelSettings(settings: Settings): void {
  saveLocalSettings(settings);
  channel?.postMessage({ type: "sealchat.panel.settings", settings });
  applySettings(settings);
}

function previewResize(start: Settings, preview: Settings, edge: ResizeEdge): void {
  applyPanelStyles(preview, calculateResizePreviewOffset(start, preview, edge));
  if (!card) {
    return;
  }

  card.classList.add("is-resize-dragging");
  card.dataset.activeEdge = edge;
}

function bindCollapsedTab(): void {
  const tab = document.querySelector<HTMLButtonElement>("#collapsed-tab");
  const resizeHandle = document.querySelector<HTMLElement>("#tab-resize");
  if (!tab) {
    return;
  }

  let moved = false;
  let resizing = false;
  let startX = 0;
  let startY = 0;
  let startTop = 0;
  let startRight = 0;
  let startHeight = 0;

  const move = (event: PointerEvent) => {
    moved = true;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    const current = loadLocalSettings();
    const next = resizing
      ? { ...current, collapsedHeight: Math.max(44, startHeight + dy) }
      : {
          ...current,
          top: Math.max(0, startTop + dy),
          rightOffset: Math.max(48, startRight - dx),
        };
    publishPanelSettings(next);
  };

  const finish = (event: PointerEvent) => {
    tab.releasePointerCapture(event.pointerId);
    document.removeEventListener("pointermove", move);
    document.removeEventListener("pointerup", finish);
    import("./obr/popover").then(({ openPanel }) => openPanel(loadLocalSettings()));
  };

  tab.addEventListener("pointerdown", (event) => {
    if (!loadLocalSettings().resizeMode) {
      return;
    }
    const settings = loadLocalSettings();
    startX = event.clientX;
    startY = event.clientY;
    startTop = settings.top;
    startRight = settings.rightOffset;
    startHeight = settings.collapsedHeight;
    moved = false;
    resizing = event.target === resizeHandle;
    tab.setPointerCapture(event.pointerId);
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", finish);
  });

  tab.addEventListener("click", () => {
    if (moved) {
      return;
    }
    const next = { ...loadLocalSettings(), collapsed: false };
    publishPanelSettings(next);
    import("./obr/popover").then(({ openPanel }) => openPanel(next));
  });
}

function bindResizeEdges(): void {
  document.querySelectorAll<HTMLElement>(".resize-edge").forEach((edge) => {
    edge.addEventListener("pointerdown", (event) => {
      const settings = loadLocalSettings();
      if (!settings.resizeMode || settings.collapsed) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const edgeName = edge.dataset.edge ?? "";
      if (!isResizeEdge(edgeName)) {
        return;
      }

      const startX = event.clientX;
      const startY = event.clientY;
      const start = loadLocalSettings();
      let preview = start;

      edge.classList.add("is-active");
      edge.setPointerCapture(event.pointerId);

      const move = (moveEvent: PointerEvent) => {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;

        preview = calculateResizeSettings(start, edgeName, { dx, dy });
        previewResize(start, preview, edgeName);
      };

      const finish = () => {
        edge.classList.remove("is-active");
        edge.releasePointerCapture(event.pointerId);
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", finish);
        document.removeEventListener("pointercancel", finish);
        publishPanelSettings(preview);
        import("./obr/popover").then(({ openPanel }) => openPanel(preview));
      };

      document.addEventListener("pointermove", move);
      document.addEventListener("pointerup", finish);
      document.addEventListener("pointercancel", finish);
    });
  });
}

window.addEventListener("message", async (event) => {
  const settings = loadLocalSettings();
  const validation = validateSealChatUrl(settings.sealChatUrl);
  if (!validation.ok || event.origin !== getUrlOrigin(validation.url)) {
    return;
  }

  const message = parseSealChatMessage(event.data);
  if (!message) {
    return;
  }

  if (message.type === "auth") {
    authStatus = message.status;
    openLoginIfNeeded(validation.url);
  }

  if (message.type === "unread") {
    await OBR.action.setBadgeText(message.count > 0 ? String(message.count) : undefined);
  }
});

channel?.addEventListener("message", (event) => {
  if (event.data?.type === "sealchat.control.refresh" && iframe) {
    iframe.src = iframe.src;
  }
  if (event.data?.type === "sealchat.control.settings" && event.data.settings) {
    saveLocalSettings(event.data.settings);
    applySettings(event.data.settings);
  }
});

OBR.onReady(() => applySettings(loadLocalSettings()));
