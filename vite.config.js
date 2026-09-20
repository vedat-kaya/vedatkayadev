import { defineConfig } from "vite";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { fortressApiPlugin } from "./server/vite-plugin.js";

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [fortressApiPlugin()],
  build: {
    sourcemap: false,
    rollupOptions: {
      input: {
        main: resolve(root, "index.html"),
        sorsana: resolve(root, "work/sorsana.html"),
        wordi: resolve(root, "work/wordi.html"),
        notFound: resolve(root, "404.html"),
      },
    },
  },
});
