import { COLLAPSED_DRAG_DELAY, calculateScreenPointerDelta } from "../panel/collapsedDrag";
import type { ScreenPointerPosition } from "../panel/collapsedDrag";
import { RESIZE_GUTTER } from "../panel/resize";
import type { ResizeEdge } from "../panel/resize";
import type { SealChatSettings } from "../settings/config";
import { DEFAULT_DIALOGUE_COLLAPSED_HEIGHT, sanitizeSettingsNumbers } from "../settings/config";

export const DIALOGUE_ID = "sealchat/dialogue";

const MIN_DIALOGUE_WIDTH = 1;
const MIN_DIALOGUE_HEIGHT = 1;
const MIN_DIALOGUE_COLLAPSED_WIDTH = 48;

export type DialogueGeometryInput = {
  viewportWidth: number;
  viewportHeight: number;
  width: number;
  height: number;
  top: number;
  leftOffset: number;
  collapsedTop?: number;
  collapsedLeftOffset?: number;
  collapsed: boolean;
  collapsedWidth?: number;
  collapsedHeight?: number;
};

export type DialogueGeometry = {
  width: number;
  height: number;
  top: number;
  left: number;
};

export type DialogueCollapsedPosition = {
  top: number;
  leftOffset: number;
};

export type DialogueOpenSettings = Pick<
  SealChatSettings,
  | "dialogueWidth"
  | "dialogueHeight"
  | "dialogueTop"
  | "dialogueLeftOffset"
  | "dialogueCollapsed"
  | "dialogueCollapsedTop"
  | "dialogueCollapsedLeftOffset"
  | "dialogueCollapsedWidth"
  | "dialogueCollapsedHeight"
>;

export { COLLAPSED_DRAG_DELAY, calculateScreenPointerDelta };
export type { ScreenPointerPosition, ResizeEdge };

export function calculateDialogueGeometry(input: DialogueGeometryInput): DialogueGeometry {
  const leftOffset = Math.max(
    0,
    input.collapsed ? input.collapsedLeftOffset ?? input.leftOffset : input.leftOffset
  );
  const edgeGutter = input.collapsed ? 0 : RESIZE_GUTTER;
  const topReserve = Math.min(input.top, edgeGutter);
  const leftReserve = Math.min(leftOffset, edgeGutter);
  const rightReserve = edgeGutter;
  const bottomReserve = edgeGutter;
  const anchorLeftOffset = Math.max(0, leftOffset - leftReserve);
  const requestedWidth = input.collapsed
    ? input.collapsedWidth ?? MIN_DIALOGUE_COLLAPSED_WIDTH
    : input.width + leftReserve + rightReserve;
  const requestedHeight = input.collapsed
    ? input.collapsedHeight ?? DEFAULT_DIALOGUE_COLLAPSED_HEIGHT
    : input.height + topReserve + bottomReserve;
  const minWidth = input.collapsed ? MIN_DIALOGUE_COLLAPSED_WIDTH : MIN_DIALOGUE_WIDTH;
  const minHeight = input.collapsed ? DEFAULT_DIALOGUE_COLLAPSED_HEIGHT : MIN_DIALOGUE_HEIGHT;
  const preferredTop =
    input.collapsed && input.collapsedTop !== undefined && input.collapsedTop >= 0
      ? input.collapsedTop
      : input.collapsed
        ? input.viewportHeight - requestedHeight - 24
        : input.top - topReserve;
  const width = Math.min(
    Math.max(minWidth, requestedWidth),
    Math.max(minWidth, input.viewportWidth - anchorLeftOffset)
  );
  const height = Math.min(
    Math.max(minHeight, requestedHeight),
    Math.max(minHeight, input.viewportHeight - preferredTop - 16)
  );
  const top = Math.min(Math.max(0, preferredTop), Math.max(0, input.viewportHeight - height));
  const left = Math.min(Math.max(0, anchorLeftOffset), Math.max(0, input.viewportWidth - width));

  return {
    width,
    height,
    top,
    left,
  };
}

export function calculateDialogueDragSettings(
  start: SealChatSettings,
  delta: { dx: number; dy: number }
): SealChatSettings {
  return sanitizeSettingsNumbers({
    ...start,
    dialogueLeftOffset: Math.max(0, start.dialogueLeftOffset + delta.dx),
    dialogueTop: Math.max(0, start.dialogueTop + delta.dy),
  });
}

export function resolveDialogueCollapsedStartPosition(
  settings: SealChatSettings,
  viewportHeight: number
): DialogueCollapsedPosition {
  return {
    top:
      settings.dialogueCollapsedTop >= 0
        ? settings.dialogueCollapsedTop
        : Math.max(0, viewportHeight - settings.dialogueCollapsedHeight - 24),
    leftOffset: Math.max(0, settings.dialogueCollapsedLeftOffset),
  };
}

export function calculateDialogueCollapsedDragSettings(
  start: SealChatSettings,
  startPosition: DialogueCollapsedPosition,
  delta: { dx: number; dy: number }
): SealChatSettings {
  return sanitizeSettingsNumbers({
    ...start,
    dialogueCollapsedTop: Math.max(0, startPosition.top + delta.dy),
    dialogueCollapsedLeftOffset: Math.max(0, startPosition.leftOffset + delta.dx),
  });
}

export function calculateDialogueResizeSettings(
  start: SealChatSettings,
  edge: ResizeEdge,
  delta: { dx: number; dy: number }
): SealChatSettings {
  const next = { ...start };

  if (edge === "left") {
    const requestedWidth = Math.max(MIN_DIALOGUE_WIDTH, start.dialogueWidth - delta.dx);
    const consumedDx = start.dialogueWidth - requestedWidth;
    next.dialogueWidth = requestedWidth;
    next.dialogueLeftOffset = Math.max(0, start.dialogueLeftOffset + consumedDx);
  }

  if (edge === "right" || edge === "corner") {
    next.dialogueWidth = Math.max(MIN_DIALOGUE_WIDTH, start.dialogueWidth + delta.dx);
  }

  if (edge === "top") {
    const requestedHeight = Math.max(MIN_DIALOGUE_HEIGHT, start.dialogueHeight - delta.dy);
    const consumedDy = start.dialogueHeight - requestedHeight;
    next.dialogueHeight = requestedHeight;
    next.dialogueTop = Math.max(0, start.dialogueTop + consumedDy);
  }

  if (edge === "bottom" || edge === "corner") {
    next.dialogueHeight = Math.max(MIN_DIALOGUE_HEIGHT, start.dialogueHeight + delta.dy);
  }

  return sanitizeSettingsNumbers(next);
}

export async function openDialoguePanel(settings: DialogueOpenSettings): Promise<void> {
  const { default: OBR } = await import("@owlbear-rodeo/sdk");
  const viewportWidth = await OBR.viewport.getWidth();
  const viewportHeight = await OBR.viewport.getHeight();
  const geometry = calculateDialogueGeometry({
    viewportWidth,
    viewportHeight,
    width: settings.dialogueWidth,
    height: settings.dialogueHeight,
    top: settings.dialogueTop,
    leftOffset: settings.dialogueLeftOffset,
    collapsedTop: settings.dialogueCollapsedTop,
    collapsedLeftOffset: settings.dialogueCollapsedLeftOffset,
    collapsed: settings.dialogueCollapsed,
    collapsedWidth: settings.dialogueCollapsedWidth,
    collapsedHeight: settings.dialogueCollapsedHeight,
  });

  await OBR.popover.open({
    id: DIALOGUE_ID,
    url: "/dialogue.html",
    width: geometry.width,
    height: geometry.height,
    anchorReference: "POSITION",
    anchorPosition: { top: geometry.top, left: geometry.left },
    anchorOrigin: { horizontal: "LEFT", vertical: "TOP" },
    transformOrigin: { horizontal: "LEFT", vertical: "TOP" },
    disableClickAway: true,
    hidePaper: true,
    marginThreshold: 0,
  });
}

export async function closeDialoguePopover(): Promise<void> {
  const { default: OBR } = await import("@owlbear-rodeo/sdk");
  await OBR.popover.close(DIALOGUE_ID);
}

