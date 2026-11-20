import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "./",
  build: {
    // `npm run build` writes straight into the extension, so there is nothing to copy by hand.
    outDir: "../extension/panel",
    emptyOutDir: true,
  },
});