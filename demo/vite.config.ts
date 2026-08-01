import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// DEMO_CONTROL=1 builds the descriptor-importing control instead of the baked path.
// Two separate builds, never one build with two inputs: shared chunking between the
// entries would smear zod across both and destroy the measurement.
const control = process.env.DEMO_CONTROL === "1";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  resolve: {
    alias: {
      // The real package is still a placeholder; the demo's authored files import
      // "tessellum" exactly as documented. See standin/tessellum.ts.
      tessellum: fileURLToPath(new URL("./standin/tessellum.ts", import.meta.url)),
    },
  },
  build: {
    outDir: control ? "dist-control" : "dist-baked",
    emptyOutDir: true,
    rollupOptions: {
      input: fileURLToPath(new URL(control ? "./control.html" : "./index.html", import.meta.url)),
    },
  },
});
