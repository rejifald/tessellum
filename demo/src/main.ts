// The shipped path: client code reads config through baked handles only.
import { describeConfig } from "./api/client";
import { config, apiBaseUrl } from "./config.baked";

const app = document.querySelector<HTMLDivElement>("#app")!;
app.textContent = describeConfig();

// Reading a tessera that is not in the client target is a runtime-restricted scope
// error — the same narrowing pick() gives you, but baked in.
const notInTarget = { $tessera: "$tessera", key: "DATABASE_URL" } as const;
const probe = config.safe(notInTarget as never);
app.dataset.scopeProbe = probe.ok ? "unexpectedly ok" : probe.error.name;

export { config, apiBaseUrl };
