import OBR from "@owlbear-rodeo/sdk";
import { openPanel } from "./obr/popover";
import { loadLocalSettings } from "./settings/storage";
import "./styles.css";

function renderTab(): void {
  const tab = document.querySelector<HTMLDivElement>("#tab");
  if (!tab) {
    return;
  }

  tab.innerHTML = `<button class="side-tab" type="button" title="展开 SealChat">聊天</button>`;
  document.querySelector(".side-tab")?.addEventListener("click", async () => {
    const settings = loadLocalSettings();
    await openPanel({ ...settings, collapsed: false });
  });
}

OBR.onReady(renderTab);
