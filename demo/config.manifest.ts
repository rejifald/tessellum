// config.manifest.ts — must be side-effect-free; bake runs it in a constrained
// context, and because tessera construction is inert, I/O here is detectable.
//
// Compose-only by contract: this file imports and spreads, it never defines tesserae.
// (Defining one here draws a bake lint warning, keyed on the defining module of every
// constructor call — bake/overview.mdx.)
import { clientTesserae } from "./src/config.tesserae";

export default {
  targets: {
    client: [...clientTesserae],
  },
};
