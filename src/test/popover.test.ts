import { describe, expect, it } from "vitest";
import { calculatePanelGeometry } from "../obr/popover";

describe("right-side popover geometry", () => {
  it("anchors expanded panel left of the Owlbear right toolbar", () => {
    expect(
      calculatePanelGeometry({
        viewportWidth: 1200,
        viewportHeight: 800,
        width: 420,
        height: 620,
        top: 48,
        rightOffset: 72,
        collapsed: false,
      })
    ).toEqual({
      width: 420,
      height: 620,
      top: 48,
      left: 1128,
    });
  });

  it("clamps panel width on small viewports", () => {
    expect(
      calculatePanelGeometry({
        viewportWidth: 360,
        viewportHeight: 640,
        width: 420,
        height: 620,
        top: 48,
        rightOffset: 72,
        collapsed: false,
      })
    ).toEqual({
      width: 288,
      height: 544,
      top: 48,
      left: 288,
    });
  });

  it("uses a narrow draggable-sized strip when collapsed", () => {
    expect(
      calculatePanelGeometry({
        viewportWidth: 1200,
        viewportHeight: 800,
        width: 420,
        height: 620,
        top: 180,
        rightOffset: 72,
        collapsed: true,
        collapsedWidth: 44,
        collapsedHeight: 176,
      })
    ).toEqual({
      width: 44,
      height: 176,
      top: 600,
      left: 1128,
    });
  });
});
