import { describe, expect, it } from "vitest";
import { createQueueState, reduceQueueEvent } from "./queue";

const alpha = {
  messageId: "a",
  identityId: null,
  displayName: "Alpha",
  color: "#fff",
  avatarUrl: "",
  text: "one",
  createdAt: 1,
};

const beta = {
  messageId: "b",
  identityId: null,
  displayName: "Beta",
  color: "#fff",
  avatarUrl: "",
  text: "two",
  createdAt: 2,
};

describe("dialogue queue reducer", () => {
  it("fast-forwards to the latest item and clears pending", () => {
    let state = reduceQueueEvent(createQueueState(), { type: "enqueue", item: alpha });
    state = reduceQueueEvent(state, { type: "enqueue", item: beta });
    state = reduceQueueEvent(state, { type: "fast-forward-latest" });

    expect(state.current?.messageId).toBe("b");
    expect(state.pending).toHaveLength(0);
  });

  it("removes deleted current items and advances", () => {
    let state = reduceQueueEvent(createQueueState(), { type: "enqueue", item: alpha });
    state = reduceQueueEvent(state, { type: "enqueue", item: beta });
    state = reduceQueueEvent(state, { type: "delete", messageId: "a" });

    expect(state.current?.messageId).toBe("b");
  });
});
