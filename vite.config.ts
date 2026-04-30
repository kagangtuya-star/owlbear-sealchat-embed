import { defineConfig } from "vite";

export default defineConfig({
  server: {
    cors: {
      origin: "https://www.owlbear.rodeo",
    },
  },
  build: {
    rollupOptions: {
      input: {
        index: "index.html",
        panel: "panel.html",
        tab: "tab.html",
      },
    },
  },
});
