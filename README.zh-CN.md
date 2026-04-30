---
title: SealChat
description: 将 SealChat 作为浮动聊天面板嵌入 Owlbear Rodeo
author: SilverDragon
image:
icon: /icon.ico
tags:
  - chat
  - sealchat
  - owlbear-rodeo
manifest: /manifest.json
learn-more:
---

[English](README.md) | [简体中文](README.zh-CN.md)

# owlbear-sealchat-embed
<img width="1854" height="1092" alt="PixPin_2026-04-30_16-55-26" src="https://github.com/user-attachments/assets/cd14e45d-3cae-455d-a26b-8b28b3eecea4" />

将 SealChat 作为浮动聊天面板嵌入 Owlbear Rodeo。

你可以在 Owlbear Rodeo 中点击 `SealChat` 操作按钮打开插件。

首次打开扩展时，输入 SealChat 地址并保存设置。扩展会以 `embed=obr` 模式在 Owlbear Rodeo 内加载 SealChat。

**浮动聊天面板**

SealChat 会作为透明的 Owlbear Rodeo popover 打开，因此可以在跑团时悬浮在地图上方。

面板支持展开、关闭、刷新，并可收缩为紧凑的竖向聊天标签。

**可调整布局**

启用调整模式后，可以调整聊天面板的尺寸和位置。

你可以在扩展控制面板中配置宽度、高度、顶部偏移、右侧工具栏避让距离、收缩尺寸和 iframe 缩放倍率。

**收缩模式**

收缩后，SealChat 会变成一个小型竖向 `聊天` 标签。

单击标签可以重新展开聊天面板。长按并拖动标签可以移动其收缩位置。

**登录与未读同步**

SealChat 可以通过 `window.parent.postMessage` 向扩展发送登录状态和未读数量消息。

当 SealChat 报告用户未登录时，扩展会用配置的 SealChat 地址打开一个登录窗口。

当 SealChat 报告未读消息时，扩展会将未读数量显示在 Owlbear Rodeo 操作按钮的 badge 上。

**SealChat 地址**

生产环境中的 SealChat 地址必须使用 `https://`。

本地开发允许使用 `http://localhost` 和 `http://127.0.0.1`。

嵌入 iframe 的地址会根据配置的 SealChat 地址生成：

```text
{SealChat URL}?embed=obr
```

**本地开发**

启动 Vite 开发服务器：

```bash
npm run dev
```

然后在 Owlbear Rodeo 中安装本地 manifest：

```text
http://localhost:5173/manifest.json
```

如果 Owlbear Rodeo 无法访问本地服务器，请将 `localhost` 替换为可访问的局域网 IP 或转发地址。

**构建**

构建静态扩展文件：

```bash
npm run build
```

运行测试：

```bash
npm run test
```

**集成消息**

SealChat 可以通知扩展当前认证状态：

```ts
{
  type: "sealchat.auth",
  status: "authenticated" | "unauthenticated"
}
```

SealChat 可以通知扩展未读消息数量：

```ts
{
  type: "sealchat.unread",
  count: number
}
```

扩展只接受来源与已配置 SealChat 地址同源的消息。

**支持**

如需反馈此扩展的问题，请在项目仓库中提交 issue。

**许可证**

MIT License。详见 `LICENSE`。
