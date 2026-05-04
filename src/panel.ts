import OBR from "@owlbear-rodeo/sdk";
import { AuthStatus, parseSealChatMessage, shouldOpenLoginWindow } from "./auth/messages";
import {
  createHandshakeMessage,
  createUnsubscribeMessage,
  isHandshakeAckWithChannel,
  normalizeBridgeMessageEvent,
  readRolesSnapshot,
} from "./dialogue/bridge";
import { closeDialoguePopover, openDialoguePanel } from "./dialogue/popover";
import type { SealChatRoleSnapshot } from "./dialogue/types";
import { openPanel } from "./obr/popover";
import {
  calculateResizeSettings,
  RESIZE_GUTTER,
  RESIZE_PREVIEW_RESERVE,
  ResizeEdge,
} from "./panel/resize";
import {
  calculateCollapsedDragSettings,
  calculateScreenPointerDelta,
  COLLAPSED_DRAG_DELAY,
  resolveCollapsedStartPosition,
} from "./panel/collapsedDrag";
import type { CollapsedPosition, ScreenPointerPosition } from "./panel/collapsedDrag";
import {
  buildLoginUrl,
  buildSealChatRootUrl,
  getUrlOrigin,
  validateSealChatUrl,
} from "./settings/config";
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
let resizePreview: HTMLElement | null = null;
let bridgeHandshakeTimer: number | undefined;
let bridgeReadyChannelId = "";
let bridgeRolesById = new Map<string, SealChatRoleSnapshot>();
const channel = "BroadcastChannel" in window ? new BroadcastChannel("sealchat-obr") : null;
const RESIZE_EDGES: ResizeEdge[] = ["left", "right", "top", "bottom", "corner"];

function openLoginIfNeeded(baseUrl: string): void {
  if (!shouldOpenLoginWindow(authStatus, loginWindowOpened)) {
    return;
  }

  loginWindowOpened = true;
  window.open(
    buildLoginUrl(baseUrl),
    "sealchat-login",
    "noopener,noreferrer,width=960,height=720"
  );
}

function clearBridgeState(): void {
  bridgeReadyChannelId = "";
  bridgeRolesById = new Map<string, SealChatRoleSnapshot>();
  window.clearInterval(bridgeHandshakeTimer);
}

function sendBridgeUnsubscribe(): void {
  if (!iframe?.contentWindow) {
    return;
  }

  iframe.contentWindow.postMessage(createUnsubscribeMessage(), "*");
}

function sendBridgeHandshake(): void {
  if (!iframe?.contentWindow || !loadLocalSettings().dialogueEnabled) {
    return;
  }

  iframe.contentWindow.postMessage(createHandshakeMessage(), "*");
}

function startBridgeHandshakePolling(): void {
  clearBridgeState();
  sendBridgeHandshake();
  bridgeHandshakeTimer = window.setInterval(() => {
    if (bridgeReadyChannelId) {
      window.clearInterval(bridgeHandshakeTimer);
      return;
    }
    sendBridgeHandshake();
  }, 1500);
}

function shouldReplaceFrameSource(currentSrc: string, nextRootUrl: string): boolean {
  if (!currentSrc) {
    return true;
  }

  try {
    const currentUrl = new URL(currentSrc);
    const nextUrl = new URL(nextRootUrl);
    return currentUrl.origin !== nextUrl.origin || currentUrl.pathname !== nextUrl.pathname;
  } catch {
    return true;
  }
}

function ensureShell(): void {
  const panel = document.querySelector<HTMLDivElement>("#panel");
  if (!panel || shell) {
    return;
  }

  panel.innerHTML = `
    <section id="panel-shell" class="panel-shell">
      <div id="panel-card" class="panel-card">
        <button id="collapsed-tab" class="floating-tab" type="button" title="单击展开；长按拖动">
          <span>聊天</span>
          <i id="tab-resize" aria-hidden="true"></i>
        </button>
        <button id="panel-minimize" class="panel-minimize" type="button" title="收缩 SealChat" aria-label="收缩 SealChat">
          <span aria-hidden="true"></span>
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
      <div id="resize-preview" class="resize-preview" aria-hidden="true"></div>
    </section>
  `;

  shell = document.querySelector<HTMLElement>("#panel-shell");
  card = document.querySelector<HTMLElement>("#panel-card");
  frameWrap = document.querySelector<HTMLElement>("#frame-wrap");
  iframe = document.querySelector<HTMLIFrameElement>("#sealchat-frame");
  emptyState = document.querySelector<HTMLElement>("#panel-empty");
  resizePreview = document.querySelector<HTMLElement>("#resize-preview");

  bindCollapsedTab();
  bindResizeEdges();
  iframe?.addEventListener("load", () => {
    if (!loadLocalSettings().dialogueEnabled) {
      clearBridgeState();
      return;
    }
    startBridgeHandshakePolling();
  });
  window.addEventListener("beforeunload", () => {
    clearBridgeState();
    sendBridgeUnsubscribe();
  });
}

function isResizeEdge(value: string): value is ResizeEdge {
  return RESIZE_EDGES.includes(value as ResizeEdge);
}

function getPanelReserve(settings: Settings): { top: number; right: number } {
  if (settings.collapsed) {
    return { top: 0, right: 0 };
  }

  const reserve = settings.resizeMode ? RESIZE_PREVIEW_RESERVE : 0;
  const totalReserve = RESIZE_GUTTER + reserve;
  return {
    top: Math.min(settings.top, totalReserve),
    right: Math.min(settings.rightOffset, totalReserve),
  };
}

function applyPanelStyles(settings: Settings): void {
  ensureShell();
  if (!shell || !card) {
    return;
  }

  shell.classList.toggle("is-resizing", settings.resizeMode);
  card.classList.toggle("is-collapsed", settings.collapsed);
  card.classList.toggle("is-resizing", settings.resizeMode);
  const reserve = getPanelReserve(settings);
  card.style.setProperty("--panel-width", `${settings.width}px`);
  card.style.setProperty("--panel-height", `${settings.height}px`);
  card.style.setProperty("--panel-top", `${reserve.top}px`);
  card.style.setProperty("--panel-right", `${reserve.right}px`);
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
  resizePreview?.classList.remove("is-visible");

  const validation = validateSealChatUrl(settings.sealChatUrl);
  if (!validation.ok) {
    clearBridgeState();
    iframe.hidden = true;
    emptyState.hidden = false;
    emptyState.textContent = validation.reason;
    return;
  }

  const frameUrl = buildSealChatRootUrl(validation.url);
  emptyState.hidden = true;
  iframe.hidden = false;
  if (shouldReplaceFrameSource(iframe.src, frameUrl)) {
    clearBridgeState();
    sendBridgeUnsubscribe();
    iframe.src = frameUrl;
  } else if (settings.dialogueEnabled && !bridgeReadyChannelId) {
    startBridgeHandshakePolling();
  }
}

function syncDialoguePopover(settings: Settings): void {
  if (!settings.dialogueEnabled) {
    void closeDialoguePopover();
    return;
  }

  void openDialoguePanel(settings);
}

function publishPanelSettings(settings: Settings): void {
  saveLocalSettings(settings);
  channel?.postMessage({ type: "sealchat.panel.settings", settings });
  applySettings(settings);
}

function previewResize(start: Settings, preview: Settings, edge: ResizeEdge): void {
  if (!card || !resizePreview) {
    return;
  }

  const reserve = getPanelReserve(start);
  const frame = {
    width: preview.width,
    height: preview.height,
    top: reserve.top + preview.top - start.top,
    right: reserve.right + preview.rightOffset - start.rightOffset,
  };
  resizePreview.style.setProperty("--resize-preview-width", `${frame.width}px`);
  resizePreview.style.setProperty("--resize-preview-height", `${frame.height}px`);
  resizePreview.style.setProperty("--resize-preview-top", `${frame.top}px`);
  resizePreview.style.setProperty("--resize-preview-right", `${frame.right}px`);
  resizePreview.classList.add("is-visible");
  card.classList.add("is-resize-dragging");
  card.dataset.activeEdge = edge;
}

function bindCollapsedTab(): void {
  const tab = document.querySelector<HTMLButtonElement>("#collapsed-tab");
  const minimize = document.querySelector<HTMLButtonElement>("#panel-minimize");
  if (!tab || !minimize) {
    return;
  }

  let moved = false;
  let dragging = false;
  let pressTimer: number | undefined;
  let startPointer: ScreenPointerPosition = { screenX: 0, screenY: 0 };
  let startPosition: CollapsedPosition = { top: 0, rightOffset: 0 };
  let startSettings = loadLocalSettings();
  let lastSettings = loadLocalSettings();
  let pendingOpenSettings: Settings | null = null;
  let openInFlight = false;
  let pointerSession = 0;

  const flushOpenPanel = () => {
    if (openInFlight || !pendingOpenSettings) {
      return;
    }

    const next = pendingOpenSettings;
    pendingOpenSettings = null;
    openInFlight = true;
    void openPanel(next).finally(() => {
      openInFlight = false;
      flushOpenPanel();
    });
  };

  const queueOpenPanel = (settings: Settings) => {
    pendingOpenSettings = settings;
    flushOpenPanel();
  };

  minimize.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const next = { ...loadLocalSettings(), collapsed: true };
    publishPanelSettings(next);
    queueOpenPanel(next);
  });

  const move = (event: PointerEvent) => {
    if (!dragging) {
      return;
    }

    const { dx, dy } = calculateScreenPointerDelta(startPointer, event);
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
      moved = true;
    }

    const next = calculateCollapsedDragSettings(startSettings, startPosition, { dx, dy });
    lastSettings = next;
    publishPanelSettings(next);
    queueOpenPanel(next);
  };

  const finish = (event: PointerEvent) => {
    pointerSession += 1;
    window.clearTimeout(pressTimer);
    if (tab.hasPointerCapture(event.pointerId)) {
      tab.releasePointerCapture(event.pointerId);
    }
    document.removeEventListener("pointermove", move);
    document.removeEventListener("pointerup", finish);
    document.removeEventListener("pointercancel", finish);
    if (dragging) {
      queueOpenPanel(lastSettings);
    }
    window.setTimeout(() => {
      moved = false;
      dragging = false;
    }, 0);
  };

  tab.addEventListener("pointerdown", (event) => {
    const settings = loadLocalSettings();
    if (!settings.collapsed) {
      return;
    }

    event.stopPropagation();
    const session = pointerSession + 1;
    pointerSession = session;
    startPointer = event;
    startSettings = settings;
    lastSettings = settings;
    moved = false;
    dragging = false;
    tab.setPointerCapture(event.pointerId);
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", finish);
    document.addEventListener("pointercancel", finish);

    void OBR.viewport
      .getHeight()
      .catch(() => window.innerHeight)
      .then((viewportHeight) => {
        if (session !== pointerSession) {
          return;
        }

        startPosition = resolveCollapsedStartPosition(settings, viewportHeight);
        pressTimer = window.setTimeout(() => {
          dragging = true;
          moved = true;
        }, COLLAPSED_DRAG_DELAY);
      });
  });

  tab.addEventListener("click", () => {
    if (moved) {
      return;
    }
    const next = { ...loadLocalSettings(), collapsed: false };
    publishPanelSettings(next);
    queueOpenPanel(next);
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
        resizePreview?.classList.remove("is-visible");
        edge.releasePointerCapture(event.pointerId);
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", finish);
        document.removeEventListener("pointercancel", finish);
        publishPanelSettings(preview);
        void openPanel(preview);
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

  if (settings.dialogueEnabled) {
    if (isHandshakeAckWithChannel(event.data)) {
      bridgeReadyChannelId = event.data.channelId;
      window.clearInterval(bridgeHandshakeTimer);
      channel?.postMessage({ type: "sealchat.dialogue.bridge-ready", ack: event.data });
      return;
    }

    const roles = readRolesSnapshot(event.data);
    if (roles) {
      bridgeRolesById = new Map(roles.map((entry) => [entry.identityId, entry]));
      channel?.postMessage({ type: "sealchat.dialogue.roles", roles });
      return;
    }

    const queueEvent = normalizeBridgeMessageEvent(event.data, bridgeRolesById);
    if (queueEvent) {
      if (queueEvent.type === "enqueue") {
        channel?.postMessage({ type: "sealchat.dialogue.enqueue", item: queueEvent.item });
      } else if (queueEvent.type === "update") {
        channel?.postMessage({ type: "sealchat.dialogue.update", item: queueEvent.item });
      } else if (queueEvent.type === "delete") {
        channel?.postMessage({ type: "sealchat.dialogue.delete", messageId: queueEvent.messageId });
      }
      return;
    }
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
    clearBridgeState();
    sendBridgeUnsubscribe();
    iframe.src = iframe.src;
  }
  if (event.data?.type === "sealchat.control.settings" && event.data.settings) {
    saveLocalSettings(event.data.settings);
    applySettings(event.data.settings);
    syncDialoguePopover(event.data.settings);
    if (!event.data.settings.dialogueEnabled) {
      clearBridgeState();
      sendBridgeUnsubscribe();
    }
  }
  if (event.data?.type === "sealchat.dialogue.settings" && event.data.settings) {
    saveLocalSettings(event.data.settings);
    syncDialoguePopover(event.data.settings);
  }
});

OBR.onReady(() => {
  const settings = loadLocalSettings();
  applySettings(settings);
  syncDialoguePopover(settings);
});
