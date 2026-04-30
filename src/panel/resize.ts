import { SealChatSettings } from "../settings/config";

export type ResizeEdge = "left" | "right" | "top" | "bottom" | "corner";

export type ResizeDelta = {
  dx: number;
  dy: number;
};

export type ResizePreviewOffset = {
  right: number;
};

const MIN_WIDTH = 280;
const MIN_HEIGHT = 360;
const MIN_RIGHT_OFFSET = 48;
export const RESIZE_GUTTER = 6;

export function calculateResizeSettings(
  start: SealChatSettings,
  edge: ResizeEdge,
  delta: ResizeDelta
): SealChatSettings {
  const next = { ...start };

  if (edge === "left" || edge === "corner") {
    next.width = Math.max(MIN_WIDTH, start.width - delta.dx);
  }
  if (edge === "right") {
    next.rightOffset = Math.max(MIN_RIGHT_OFFSET, start.rightOffset - delta.dx);
  }
  if (edge === "top") {
    next.top = Math.max(0, start.top + delta.dy);
    next.height = Math.max(MIN_HEIGHT, start.height - delta.dy);
  }
  if (edge === "bottom" || edge === "corner") {
    next.height = Math.max(MIN_HEIGHT, start.height + delta.dy);
  }

  return next;
}

export function calculateResizePreviewOffset(
  start: SealChatSettings,
  preview: SealChatSettings,
  edge: ResizeEdge
): ResizePreviewOffset {
  if (edge === "right") {
    return { right: preview.rightOffset - start.rightOffset };
  }

  return { right: 0 };
}
