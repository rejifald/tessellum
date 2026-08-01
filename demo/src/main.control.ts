// THE CONTROL BUILD — the pre-ADR-0003 shape, kept only to be measured against.
//
// Identical runtime behaviour to src/main.ts. The single difference: the unwrap() key
// comes from the REAL descriptor in config.tesserae.ts instead of the baked handle.
// That one import edge is what drags zod into a browser bundle, and this build exists
// to put a number on it (ADR 0003 measured ~166x gzip; `pnpm prove` re-measures).
import { config } from "./config.baked";
import { apiBaseUrl, releaseChannel } from "./config.tesserae";

const app = document.querySelector<HTMLDivElement>("#app")!;
app.textContent = `${config.unwrap(apiBaseUrl)} (${config.unwrap(releaseChannel)})`;

const notInTarget = { $tessera: "$tessera", key: "DATABASE_URL" } as const;
const probe = config.safe(notInTarget as never);
app.dataset.scopeProbe = probe.ok ? "unexpectedly ok" : probe.error.name;

export { config };
