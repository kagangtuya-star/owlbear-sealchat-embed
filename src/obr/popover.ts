import { RESIZE_GUTTER } from "../panel/resize";

export const PANEL_ID = "sealchat/sidebar";

export type GeometryInput = {
  viewportWidth: number;
  viewportHeight: number;
  width: number;
  height: number;
  top: number;
  rightOffset: number;
  collapsed: boolean;
  collapsedWidth?: number;
  collapsedHeight?: number;
};

export type PanelGeometry = {
  width: number;
  height: number;
  top: number;
  left: number;
};

export function calculatePanelGeometry(input: GeometryInput): PanelGeometry {
  const rightOffset = Math.max(0, input.rightOffset);
  const gutter = input.collapsed ? 0 : RESIZE_GUTTER;
  const anchorRightOffset = Math.max(0, rightOffset - gutter);
  const requestedWidth = input.collapsed
    ? input.collapsedWidth ?? 44
    : input.width + gutter * 2;
  const requestedHeight = input.collapsed
    ? input.collapsedHeight ?? 96
    : input.height + gutter * 2;
  const minWidth = input.collapsed ? 36 : 280;
  const minHeight = input.collapsed ? 44 : 360;
  const preferredTop = input.collapsed
    ? input.viewportHeight - requestedHeight - 24
    : input.top - gutter;
  const width = Math.min(
    Math.max(minWidth, requestedWidth),
    Math.max(minWidth, input.viewportWidth - anchorRightOffset)
  );
  const height = Math.min(
    Math.max(minHeight, requestedHeight),
    Math.max(minHeight, input.viewportHeight - preferredTop - 16)
  );
  const top = Math.min(Math.max(0, preferredTop), Math.max(0, input.viewportHeight - height));

  return {
    width,
    height,
    top,
    left: input.viewportWidth - anchorRightOffset,
  };
}

export type PanelOpenSettings = {
  width: number;
  height: number;
  top: number;
  rightOffset: number;
  collapsed: boolean;
  collapsedWidth: number;
  collapsedHeight: number;
  scale: number;
};

export async function openPanel(settings: PanelOpenSettings): Promise<void> {
  const { default: OBR } = await import("@owlbear-rodeo/sdk");
  const viewportWidth = await OBR.viewport.getWidth();
  const viewportHeight = await OBR.viewport.getHeight();
  const geometry = calculatePanelGeometry({
    viewportWidth,
    viewportHeight,
    width: settings.width,
    height: settings.height,
    top: settings.top,
    rightOffset: settings.rightOffset,
    collapsed: settings.collapsed,
    collapsedWidth: settings.collapsedWidth,
    collapsedHeight: settings.collapsedHeight,
  });

  await OBR.popover.open({
    id: PANEL_ID,
    url: "/panel.html",
    width: geometry.width,
    height: geometry.height,
    anchorReference: "POSITION",
    anchorPosition: { top: geometry.top, left: geometry.left },
    anchorOrigin: { horizontal: "RIGHT", vertical: "TOP" },
    transformOrigin: { horizontal: "RIGHT", vertical: "TOP" },
    disableClickAway: true,
    hidePaper: true,
    marginThreshold: 0,
  });
}

export async function closeAllPopovers(): Promise<void> {
  const { default: OBR } = await import("@owlbear-rodeo/sdk");
  await OBR.popover.close(PANEL_ID);
}
