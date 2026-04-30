---
title: SealChat
description: Embed SealChat into Owlbear Rodeo as a floating chat panel
author: SilverDragon
image:
icon: /icon.svg
tags:
  - chat
  - sealchat
  - owlbear-rodeo
manifest: /manifest.json
learn-more:
---

[English](README.md) | [简体中文](README.zh-CN.md)

# SealChat

Embed SealChat into Owlbear Rodeo as a floating chat panel.

You can open SealChat by clicking the `SealChat` action in Owlbear Rodeo.

When opening the extension for the first time, enter your SealChat URL and save the settings. The extension will load SealChat inside Owlbear Rodeo with the `embed=obr` mode enabled.

**Floating Chat Panel**

SealChat opens as a transparent Owlbear Rodeo popover, so it can stay above the map while you play.

The panel supports opening, closing, refreshing, and collapsing into a compact vertical chat tab.

**Resizable Layout**

Enable resize mode to adjust the chat panel size and position.

You can configure width, height, top offset, right toolbar offset, collapsed size, and iframe scale from the extension control panel.

**Collapsed Mode**

When collapsed, SealChat becomes a small vertical `聊天` tab.

Click the tab to expand the chat panel again. Long press and drag the tab to move its collapsed position.

**Login and Unread Sync**

SealChat can send login and unread-count messages to the extension with `window.parent.postMessage`.

When SealChat reports that the user is unauthenticated, the extension opens the configured SealChat URL in a login window.

When SealChat reports unread messages, the extension displays the unread count on the Owlbear Rodeo action badge.

**SealChat URL**

Production SealChat URLs must use `https://`.

Local development allows `http://localhost` and `http://127.0.0.1`.

The embedded iframe URL is built from the configured SealChat URL:

```text
{SealChat URL}?embed=obr
```

**Local Development**

Run the Vite dev server:

```bash
npm run dev
```

Then install the local manifest in Owlbear Rodeo:

```text
http://localhost:5173/manifest.json
```

If Owlbear Rodeo cannot access the local server, replace `localhost` with a reachable LAN IP or forwarded address.

**Build**

Build the static extension files:

```bash
npm run build
```

Run tests:

```bash
npm run test
```

**Integration Messages**

SealChat can notify the extension about authentication state:

```ts
{
  type: "sealchat.auth",
  status: "authenticated" | "unauthenticated"
}
```

SealChat can notify the extension about unread messages:

```ts
{
  type: "sealchat.unread",
  count: number
}
```

Messages are accepted only when their origin matches the configured SealChat URL.

**Support**

For issues with this extension, please open an issue in the project repository.

**License**

MIT License. See `LICENSE`.
