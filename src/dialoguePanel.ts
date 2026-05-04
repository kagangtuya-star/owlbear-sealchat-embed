import OBR from "@owlbear-rodeo/sdk";
import { loadAvatar } from "./dialogue/avatarCache";
import type { DialogueChannelMessage, DialogueQueueEvent, SealChatRoleSnapshot } from "./dialogue/types";
import { normalizeDialoguePages } from "./dialogue/formatting";
import {
  calculateDialogueCollapsedDragSettings,
  calculateDialogueDragSettings,
  calculateDialogueResizeSettings,
  COLLAPSED_DRAG_DELAY,
  type ResizeEdge,
  type ScreenPointerPosition,
  openDialoguePanel,
  resolveDialogueCollapsedStartPosition,
  calculateScreenPointerDelta,
} from "./dialogue/popover";
import { createQueueState, reduceQueueEvent } from "./dialogue/queue";
import { countVisibleCharacters, sliceHtmlByVisibleCharacters } from "./dialogue/typewriter";
import { closeDialoguePopover } from "./dialogue/popover";
import { loadLocalSettings, saveLocalSettings } from "./settings/storage";
import "./styles.css";

type Settings = ReturnType<typeof loadLocalSettings>;

const channel = "BroadcastChannel" in window ? new BroadcastChannel("sealchat-obr") : null;
const RESIZE_EDGES: ResizeEdge[] = ["left", "right", "top", "bottom", "corner"];
const FALLBACK_AVATAR =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#2b3347"/><stop offset="1" stop-color="#151a28"/></linearGradient></defs><rect width="240" height="240" rx="24" fill="url(#g)"/><circle cx="120" cy="90" r="44" fill="#93a2c8"/><path d="M48 214c14-42 48-64 72-64s58 22 72 64" fill="#93a2c8"/></svg>`
  );

let settings = loadLocalSettings();
let queueState = createQueueState();
let rolesById = new Map<string, SealChatRoleSnapshot>();
let bridgeReady = false;
let bridgeLabel = "等待进入频道";
let visibleCharacters = 0;
let pageIndex = 0;
let currentMessageKey = "";
let avatarUrl = "";
let avatarLoadToken = 0;
let typingTimer: number | undefined;
let advanceTimer: number | undefined;
let pendingOpenSettings: Settings | null = null;
let openInFlight = false;
let playbackCompleted = false;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replace(/'/g, "&#39;");
}

function isResizeEdge(value: string): value is ResizeEdge {
  return RESIZE_EDGES.includes(value as ResizeEdge);
}

function getCurrentMessageKey(): string {
  if (!queueState.current) {
    return "";
  }

  return `${queueState.current.messageId}:${queueState.current.text}`;
}

function getQueueCount(): number {
  return queueState.pending.length + (queueState.current ? 1 : 0);
}

function resolveNameColor(color: string): string {
  if (color && typeof CSS !== "undefined" && CSS.supports("color", color)) {
    return color;
  }
  return "#f2dbff";
}

function clearPlaybackTimers(): void {
  window.clearTimeout(typingTimer);
  window.clearTimeout(advanceTimer);
}

function flushOpenDialogue(): void {
  if (openInFlight || !pendingOpenSettings || !pendingOpenSettings.dialogueEnabled) {
    return;
  }

  const next = pendingOpenSettings;
  pendingOpenSettings = null;
  openInFlight = true;
  void openDialoguePanel(next).finally(() => {
    openInFlight = false;
    flushOpenDialogue();
  });
}

function queueOpenDialogue(next: Settings): void {
  if (!next.dialogueEnabled) {
    return;
  }

  pendingOpenSettings = next;
  flushOpenDialogue();
}

function currentPages(): string[] {
  return normalizeDialoguePages(queueState.current?.text ?? "");
}

function syncDialogueScroll(): void {
  const viewport = document.querySelector<HTMLElement>(".dialogue-copy-viewport");
  if (!viewport) {
    return;
  }

  viewport.scrollTop = viewport.scrollHeight;
}

function syncAvatarForCurrent(): void {
  const current = queueState.current;
  const token = avatarLoadToken + 1;
  avatarLoadToken = token;

  if (!current?.avatarUrl) {
    avatarUrl = FALLBACK_AVATAR;
    render();
    return;
  }

  avatarUrl = FALLBACK_AVATAR;
  render();
  void loadAvatar(current.avatarUrl)
    .then((image) => {
      if (token !== avatarLoadToken) {
        return;
      }
      avatarUrl = image.src;
      render();
    })
    .catch(() => {
      if (token !== avatarLoadToken) {
        return;
      }
      avatarUrl = FALLBACK_AVATAR;
      render();
    });
}

function schedulePlayback(): void {
  clearPlaybackTimers();

  if (!settings.dialogueEnabled || settings.dialogueCollapsed || !queueState.current) {
    return;
  }

  const pages = currentPages();
  const currentPageHtml = pages[pageIndex] ?? pages[0] ?? "";
  const totalVisibleCharacters = countVisibleCharacters(currentPageHtml);

  if (visibleCharacters < totalVisibleCharacters) {
    playbackCompleted = false;
    typingTimer = window.setTimeout(() => {
      visibleCharacters = Math.min(visibleCharacters + 1, totalVisibleCharacters);
      render();
      schedulePlayback();
    }, Math.max(0, settings.dialogueTypeSpeed));
    return;
  }

  if (pageIndex < pages.length - 1) {
    playbackCompleted = false;
    advanceTimer = window.setTimeout(() => {
      pageIndex += 1;
      visibleCharacters = 0;
      render();
      schedulePlayback();
    }, Math.max(0, settings.dialogueWaitMs));
    return;
  }

  if (queueState.pending.length === 0) {
    playbackCompleted = true;
    render();
    return;
  }

  const advanceDelay = playbackCompleted ? 0 : Math.max(0, settings.dialogueWaitMs);
  advanceTimer = window.setTimeout(() => {
    playbackCompleted = false;
    queueState = reduceQueueEvent(queueState, { type: "advance" });
    pageIndex = 0;
    visibleCharacters = 0;
    currentMessageKey = getCurrentMessageKey();
    syncAvatarForCurrent();
    render();
    schedulePlayback();
  }, advanceDelay);
}

function restartPlayback(): void {
  clearPlaybackTimers();
  playbackCompleted = false;
  pageIndex = 0;
  visibleCharacters = 0;
  currentMessageKey = getCurrentMessageKey();
  syncAvatarForCurrent();
  render();
  schedulePlayback();
}

function applyQueueEvent(event: DialogueQueueEvent): void {
  const previousKey = getCurrentMessageKey();
  const previousCurrentId = queueState.current?.messageId ?? "";
  queueState = reduceQueueEvent(queueState, event);
  const nextKey = getCurrentMessageKey();
  const nextCurrentId = queueState.current?.messageId ?? "";

  if (
    previousKey !== nextKey ||
    (event.type === "update" && nextCurrentId === event.item.messageId) ||
    event.type === "fast-forward-latest" ||
    (event.type === "delete" && previousCurrentId !== nextCurrentId)
  ) {
    restartPlayback();
    return;
  }

  render();
  schedulePlayback();
}

function publishDialogueSettings(next: Settings, renderNow = true, reopen = true): void {
  settings = next;
  saveLocalSettings(next);
  channel?.postMessage({ type: "sealchat.dialogue.settings", settings: next } satisfies DialogueChannelMessage);

  if (!next.dialogueEnabled) {
    clearPlaybackTimers();
    void closeDialoguePopover();
    return;
  }

  if (renderNow) {
    render();
  }
  if (reopen) {
    queueOpenDialogue(next);
  }

  schedulePlayback();
}

function renderCollapsed(root: HTMLElement): void {
  const count = getQueueCount();
  root.innerHTML = `
    <section class="dialogue-popover-shell">
      <button
        id="dialogue-collapsed-tab"
        class="floating-tab dialogue-collapsed-tab"
        type="button"
        title="单击展开；长按拖动"
      >
        <span>剧情</span>
        ${count > 0 ? `<strong class="dialogue-collapsed-count">${count}</strong>` : ""}
      </button>
    </section>
  `;

  const tab = document.querySelector<HTMLButtonElement>("#dialogue-collapsed-tab");
  if (!tab) {
    return;
  }

  let moved = false;
  let dragging = false;
  let pressTimer: number | undefined;
  let startPointer: { screenX: number; screenY: number } = { screenX: 0, screenY: 0 };
  let startSettings = settings;
  let lastSettings = settings;
  let startPosition = resolveDialogueCollapsedStartPosition(settings, window.innerHeight);
  let pointerSession = 0;

  const move = (event: PointerEvent) => {
    if (!dragging) {
      return;
    }

    const delta = calculateScreenPointerDelta(startPointer, event);
    if (Math.abs(delta.dx) > 2 || Math.abs(delta.dy) > 2) {
      moved = true;
    }

    lastSettings = calculateDialogueCollapsedDragSettings(startSettings, startPosition, delta);
    publishDialogueSettings(lastSettings, false);
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
      queueOpenDialogue(lastSettings);
    }
    window.setTimeout(() => {
      moved = false;
      dragging = false;
    }, 0);
  };

  tab.addEventListener("pointerdown", (event) => {
    const currentSettings = loadLocalSettings();
    if (!currentSettings.dialogueCollapsed) {
      return;
    }

    event.stopPropagation();
    const session = pointerSession + 1;
    pointerSession = session;
    startPointer = event;
    startSettings = currentSettings;
    lastSettings = startSettings;
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

        startPosition = resolveDialogueCollapsedStartPosition(startSettings, viewportHeight);
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
    const next = { ...loadLocalSettings(), dialogueCollapsed: false };
    publishDialogueSettings(next, true, false);
    queueOpenDialogue(next);
  });
}

function renderExpanded(root: HTMLElement): void {
  const current = queueState.current;
  const pages = currentPages();
  const totalPages = Math.max(1, pages.length || 1);
  const showPageIndicator = Boolean(current) && totalPages > 1;
  const currentPageHtml = pages[pageIndex] ?? pages[0] ?? "";
  const totalVisibleCharacters = countVisibleCharacters(currentPageHtml);
  const renderedHtml =
    current && currentPageHtml
      ? sliceHtmlByVisibleCharacters(
          currentPageHtml,
          Math.min(playbackCompleted ? totalVisibleCharacters : visibleCharacters, totalVisibleCharacters)
        )
      : "";
  const name = current?.displayName ?? "";
  const nameColor = resolveNameColor(current?.color ?? "");
  const pageIndicatorHtml = showPageIndicator
    ? `<div class="page-indicator">${pageIndex + 1}/${totalPages}</div>`
    : "";
  root.innerHTML = `
    <section class="dialogue-popover-shell">
      <div
        id="dialogue-card"
        class="dialogue-card"
        style="--dialogue-font-size: ${settings.dialogueFontSize}px; --dialogue-name-color: ${escapeAttribute(
          nameColor
        )};"
      >
        <button
          id="dialogue-fast-forward"
          class="dialogue-window-button dialogue-fast-forward"
          type="button"
          title="快进到最新一条"
          aria-label="快进到最新一条"
        >
          »|
        </button>
        <button
          id="dialogue-minimize"
          class="dialogue-window-button dialogue-minimize"
          type="button"
          title="最小化对话框"
          aria-label="最小化对话框"
        >
          —
        </button>
        <div id="dialogue-drag-handle" class="dialogue-drag-handle" aria-hidden="true"></div>
        <div class="dialogue-resize-edge edge-left" data-edge="left"></div>
        <div class="dialogue-resize-edge edge-right" data-edge="right"></div>
        <div class="dialogue-resize-edge edge-top" data-edge="top"></div>
        <div class="dialogue-resize-edge edge-bottom" data-edge="bottom"></div>
        <div class="dialogue-resize-edge edge-corner" data-edge="corner"></div>
        <div class="message-shell dialogue-shell">
          <div class="left-column">
            <div class="portrait-frame">
              <img class="character-image" src="${escapeAttribute(
                avatarUrl || FALLBACK_AVATAR
              )}" alt="${escapeAttribute(name)}" />
            </div>
          </div>
          <div class="right-column">
            <div class="upper-part dialogue-header-row${showPageIndicator ? " has-page-indicator" : ""}">
              <div class="dialogue-nameplate" style="color: ${escapeAttribute(nameColor)}">${escapeHtml(
                name
              )}</div>
              ${pageIndicatorHtml}
            </div>
            <div class="dialogue-copy-stage">
              <div class="dialogue-copy-viewport">
                <div class="lower-part dialogue-copy" style="font-size: ${settings.dialogueFontSize}px;">
                  ${renderedHtml}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;

  document.querySelector<HTMLButtonElement>("#dialogue-minimize")?.addEventListener("click", () => {
    const next = { ...loadLocalSettings(), dialogueCollapsed: true };
    publishDialogueSettings(next, true, false);
    queueOpenDialogue(next);
  });

  document
    .querySelector<HTMLButtonElement>("#dialogue-fast-forward")
    ?.addEventListener("click", () => {
      applyQueueEvent({ type: "fast-forward-latest" });
    });

  bindExpandedDrag();
  bindResizeEdges();
}

function render(): void {
  const root = document.querySelector<HTMLElement>("#dialogue-root");
  if (!root) {
    return;
  }

  if (!settings.dialogueEnabled) {
    root.innerHTML = "";
    return;
  }

  if (settings.dialogueCollapsed) {
    renderCollapsed(root);
    return;
  }

  renderExpanded(root);
  syncDialogueScroll();
}

function bindExpandedDrag(): void {
  const handle = document.querySelector<HTMLElement>("#dialogue-drag-handle");
  if (!handle) {
    return;
  }

  handle.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    const startPointer: ScreenPointerPosition = {
      screenX: event.screenX,
      screenY: event.screenY,
    };
    const startSettings = loadLocalSettings();
    let lastSettings = startSettings;

    handle.setPointerCapture(event.pointerId);

    const move = (moveEvent: PointerEvent) => {
      const next = calculateDialogueDragSettings(
        startSettings,
        calculateScreenPointerDelta(startPointer, moveEvent)
      );
      lastSettings = next;
      publishDialogueSettings(next, false);
    };

    const finish = () => {
      handle.releasePointerCapture(event.pointerId);
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", finish);
      document.removeEventListener("pointercancel", finish);
      publishDialogueSettings(lastSettings);
    };

    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", finish);
    document.addEventListener("pointercancel", finish);
  });
}

function bindResizeEdges(): void {
  document.querySelectorAll<HTMLElement>(".dialogue-resize-edge").forEach((edge) => {
    edge.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();

      const edgeName = edge.dataset.edge ?? "";
      if (!isResizeEdge(edgeName)) {
        return;
      }

      const startX = event.clientX;
      const startY = event.clientY;
      const startSettings = loadLocalSettings();
      let lastSettings = startSettings;

      edge.classList.add("is-active");
      edge.setPointerCapture(event.pointerId);

      const move = (moveEvent: PointerEvent) => {
        lastSettings = calculateDialogueResizeSettings(startSettings, edgeName, {
          dx: moveEvent.clientX - startX,
          dy: moveEvent.clientY - startY,
        });
        publishDialogueSettings(lastSettings, false);
      };

      const finish = () => {
        edge.classList.remove("is-active");
        edge.releasePointerCapture(event.pointerId);
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", finish);
        document.removeEventListener("pointercancel", finish);
        publishDialogueSettings(lastSettings);
      };

      document.addEventListener("pointermove", move);
      document.addEventListener("pointerup", finish);
      document.addEventListener("pointercancel", finish);
    });
  });
}

function applyChannelMessage(data: unknown): void {
  if (!data || typeof data !== "object" || !("type" in data)) {
    return;
  }

  const message = data as DialogueChannelMessage | Record<string, unknown>;
  if (message.type === "sealchat.dialogue.bridge-ready") {
    const bridgeMessage = message as Extract<
      DialogueChannelMessage,
      { type: "sealchat.dialogue.bridge-ready" }
    >;
    bridgeReady = true;
    bridgeLabel =
      typeof bridgeMessage.ack.channelId === "string"
        ? `频道已连接：${bridgeMessage.ack.channelId}`
        : "频道已连接";
    render();
    return;
  }

  if (message.type === "sealchat.dialogue.roles" && Array.isArray(message.roles)) {
    const rolesMessage = message as Extract<
      DialogueChannelMessage,
      { type: "sealchat.dialogue.roles" }
    >;
    rolesById = new Map(rolesMessage.roles.map((entry) => [entry.identityId, entry]));
    return;
  }

  if (message.type === "sealchat.dialogue.settings" && message.settings) {
    const settingsMessage = message as Extract<
      DialogueChannelMessage,
      { type: "sealchat.dialogue.settings" }
    >;
    settings = settingsMessage.settings;
    saveLocalSettings(settings);
    if (!settings.dialogueEnabled) {
      clearPlaybackTimers();
      void closeDialoguePopover();
      return;
    }
    render();
    queueOpenDialogue(settings);
    schedulePlayback();
    return;
  }

  if (message.type === "sealchat.control.settings" && message.settings) {
    settings = message.settings as Settings;
    saveLocalSettings(settings);
    if (!settings.dialogueEnabled) {
      clearPlaybackTimers();
      void closeDialoguePopover();
      return;
    }
    render();
    queueOpenDialogue(settings);
    schedulePlayback();
    return;
  }

  if (message.type === "sealchat.dialogue.enqueue" && "item" in message) {
    const enqueueMessage = message as Extract<
      DialogueChannelMessage,
      { type: "sealchat.dialogue.enqueue" }
    >;
    applyQueueEvent({ type: "enqueue", item: enqueueMessage.item });
    return;
  }

  if (message.type === "sealchat.dialogue.update" && "item" in message) {
    const updateMessage = message as Extract<
      DialogueChannelMessage,
      { type: "sealchat.dialogue.update" }
    >;
    applyQueueEvent({ type: "update", item: updateMessage.item });
    return;
  }

  if (message.type === "sealchat.dialogue.delete" && typeof message.messageId === "string") {
    applyQueueEvent({ type: "delete", messageId: message.messageId });
  }
}

channel?.addEventListener("message", (event) => {
  applyChannelMessage(event.data);
});

OBR.onReady(() => {
  settings = loadLocalSettings();
  currentMessageKey = getCurrentMessageKey();
  avatarUrl = FALLBACK_AVATAR;
  render();
  schedulePlayback();
});
