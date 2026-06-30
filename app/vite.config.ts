import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const napoleonRuntimeProxyTarget =
  process.env.NAPOLEON_RUNTIME_PROXY_TARGET?.trim() || "http://127.0.0.1:18768";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/napoleon-runtime": {
        target: napoleonRuntimeProxyTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/napoleon-runtime/, ""),
      },
    },
  },
});
