import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const rootDir = resolve(import.meta.dirname, "editor");
const templateDir = resolve(import.meta.dirname, "template");

export default defineConfig(({ mode }) => ({
  root: rootDir,
  plugins: [react()],
  publicDir: false,
  define: {
    "process.env.NODE_ENV": JSON.stringify(
      mode === "development" ? "development" : "production",
    ),
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: templateDir,
    emptyOutDir: false,
    cssCodeSplit: false,
    sourcemap: false,
    lib: {
      entry: resolve(rootDir, "src/main.tsx"),
      formats: ["es"],
      cssFileName: "editor-app",
      fileName: () => "editor-app.js",
    },
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          if (
            assetInfo.name?.endsWith(".css") ||
            assetInfo.names.some((name) => name.endsWith(".css"))
          ) {
            return "editor-app.css";
          }
          return "assets/[name]-[hash][extname]";
        },
      },
    },
  },
}));
