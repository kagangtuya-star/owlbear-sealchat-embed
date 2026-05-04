import type { DialogueQueueEvent, DialogueQueueItem, DialogueQueueState } from "./types";

function replaceOrAppend(
  pending: DialogueQueueItem[],
  item: DialogueQueueItem
): DialogueQueueItem[] {
  const index = pending.findIndex((entry) => entry.messageId === item.messageId);
  if (index === -1) {
    return [...pending, item];
  }

  const next = pending.slice();
  next[index] = item;
  return next;
}

function deriveLatest(current: DialogueQueueItem | null, pending: DialogueQueueItem[]): DialogueQueueItem | null {
  return pending[pending.length - 1] ?? current;
}

export function createQueueState(): DialogueQueueState {
  return {
    current: null,
    pending: [],
    latest: null,
  };
}

export function reduceQueueEvent(
  state: DialogueQueueState,
  event: DialogueQueueEvent
): DialogueQueueState {
  if (event.type === "enqueue") {
    if (!state.current) {
      return {
        current: event.item,
        pending: [],
        latest: event.item,
      };
    }

    if (state.current.messageId === event.item.messageId) {
      return {
        current: event.item,
        pending: state.pending,
        latest: event.item,
      };
    }

    const pending = replaceOrAppend(state.pending, event.item);
    return {
      current: state.current,
      pending,
      latest: event.item,
    };
  }

  if (event.type === "update") {
    const current =
      state.current?.messageId === event.item.messageId ? event.item : state.current;
    const pending = replaceOrAppend(
      state.pending.filter((entry) => entry.messageId !== event.item.messageId),
      event.item
    );
    const shouldKeepPending =
      current?.messageId !== event.item.messageId || state.pending.some((entry) => entry.messageId === event.item.messageId);
    return {
      current,
      pending: shouldKeepPending ? pending : state.pending,
      latest:
        state.latest?.messageId === event.item.messageId
          ? event.item
          : deriveLatest(current, shouldKeepPending ? pending : state.pending),
    };
  }

  if (event.type === "delete") {
    if (state.current?.messageId === event.messageId) {
      const [nextCurrent, ...rest] = state.pending;
      return {
        current: nextCurrent ?? null,
        pending: rest,
        latest:
          state.latest?.messageId === event.messageId
            ? deriveLatest(nextCurrent ?? null, rest)
            : state.latest,
      };
    }

    const pending = state.pending.filter((entry) => entry.messageId !== event.messageId);
    return {
      current: state.current,
      pending,
      latest:
        state.latest?.messageId === event.messageId
          ? deriveLatest(state.current, pending)
          : state.latest,
    };
  }

  if (event.type === "advance") {
    const [nextCurrent, ...rest] = state.pending;
    return {
      current: nextCurrent ?? null,
      pending: rest,
      latest: deriveLatest(nextCurrent ?? null, rest),
    };
  }

  if (!state.latest) {
    return state;
  }

  return {
    current: state.latest,
    pending: [],
    latest: state.latest,
  };
}
