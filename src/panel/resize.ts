import { SealChatSettings } from "../settings/config";

export type ResizeEdge = "left" | "right" | "top" | "bottom" | "corner";

export type ResizeDelta = {
  dx: number;
  dy: number;
};

export type ResizePreviewFrame = {
  width: number;
  height: number;
  top: number;
  right: number;
};

const MIN_WIDTH = 280;
const MIN_HEIGHT = 360;
export const RESIZE_GUTTER = 6;
export const RESIZE_PREVIEW_RESERVE = 240;
const MIN_RIGHT_OFFSET = 48;

function reserveSteps(distance: number): number {
  return Math.ceil(Math.max(0, distance) / RESIZE_PREVIEW_RESERVE);
}

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

export function calculateResizePreviewContainer(
  start: SealChatSettings,
  preview: SealChatSettings
): SealChatSettings {
  const startBottom = start.top + start.height;
  const previewBottom = preview.top + preview.height;
  const rightReserve = reserveSteps(start.rightOffset - preview.rightOffset);
  const topReserve = reserveSteps(start.top - preview.top);
  const rightOffset = Math.max(
    0,
    start.rightOffset - rightReserve * RESIZE_PREVIEW_RESERVE
  );
  const top = Math.max(
    0,
    start.top - topReserve * RESIZE_PREVIEW_RESERVE
  );
  const baseWidth = start.width + start.rightOffset - rightOffset;
  const requiredWidth = Math.max(
    baseWidth,
    preview.width + preview.rightOffset - rightOffset
  );
  const baseHeight = startBottom - top;
  const requiredHeight = Math.max(baseHeight, previewBottom - top);

  const width =
    baseWidth +
    reserveSteps(requiredWidth - baseWidth) * RESIZE_PREVIEW_RESERVE;
  const height =
    baseHeight +
    reserveSteps(requiredHeight - baseHeight) * RESIZE_PREVIEW_RESERVE;

  return {
    ...start,
    width,
    height,
    top,
    rightOffset,
  };
}

export function calculateResizeStartContainer(
  start: SealChatSettings
): SealChatSettings {
  const preview = { ...start };
  preview.width += RESIZE_PREVIEW_RESERVE;
  preview.height += RESIZE_PREVIEW_RESERVE;
  preview.top = Math.max(0, start.top - RESIZE_PREVIEW_RESERVE);
  preview.rightOffset = Math.max(0, start.rightOffset - RESIZE_PREVIEW_RESERVE);

  return calculateResizePreviewContainer(start, preview);
}

export function resizeContainerContains(
  current: SealChatSettings,
  requested: SealChatSettings
): boolean {
  const currentLeftExtent = current.rightOffset + current.width;
  const requestedLeftExtent = requested.rightOffset + requested.width;
  const currentBottom = current.top + current.height;
  const requestedBottom = requested.top + requested.height;

  return (
    current.rightOffset <= requested.rightOffset &&
    currentLeftExtent >= requestedLeftExtent &&
    current.top <= requested.top &&
    currentBottom >= requestedBottom
  );
}

export function calculateResizePreviewFrame(
  start: SealChatSettings,
  preview: SealChatSettings,
  container: SealChatSettings
): ResizePreviewFrame {
  return {
    width: preview.width,
    height: preview.height,
    top: RESIZE_GUTTER + preview.top - container.top,
    right: RESIZE_GUTTER + preview.rightOffset - container.rightOffset,
  };
}

export function calculateResizeContentFrame(
  start: SealChatSettings,
  container: SealChatSettings
): Pick<ResizePreviewFrame, "top" | "right"> {
  return {
    top: RESIZE_GUTTER + start.top - container.top,
    right: RESIZE_GUTTER + start.rightOffset - container.rightOffset,
  };
}
