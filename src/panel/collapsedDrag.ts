import { SealChatSettings } from "../settings/config";

export type CollapsedPosition = {
  top: number;
  rightOffset: number;
};

export type CollapsedDragDelta = {
  dx: number;
  dy: number;
};

export type ScreenPointerPosition = {
  screenX: number;
  screenY: number;
};

export const COLLAPSED_DRAG_DELAY = 260;

export function calculateScreenPointerDelta(
  start: ScreenPointerPosition,
  current: ScreenPointerPosition
): CollapsedDragDelta {
  return {
    dx: current.screenX - start.screenX,
    dy: current.screenY - start.screenY,
  };
}

export function resolveCollapsedStartPosition(
  settings: SealChatSettings,
  viewportHeight: number
): CollapsedPosition {
  return {
    top:
      settings.collapsedTop >= 0
        ? settings.collapsedTop
        : Math.max(0, viewportHeight - settings.collapsedHeight - 24),
    rightOffset: Math.max(0, settings.collapsedRightOffset),
  };
}

export function calculateCollapsedDragSettings(
  start: SealChatSettings,
  startPosition: CollapsedPosition,
  delta: CollapsedDragDelta
): SealChatSettings {
  return {
    ...start,
    collapsedTop: Math.max(0, startPosition.top + delta.dy),
    collapsedRightOffset: Math.max(0, startPosition.rightOffset - delta.dx),
  };
}
