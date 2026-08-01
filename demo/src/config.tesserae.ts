// Authored by hand, exactly as the browser guide documents it
// (site/content/docs/guides/browser.mdx §1). This file is never reachable from a
// client entry — the client-graph lint exists to enforce that — because it carries
// the zod schemas, which is precisely the ~65 KB the baked handles avoid.
import { tessera, defineTesserae } from "tessellum";
import { z } from "zod";

export const apiBaseUrl = tessera({
  key: "API_BASE_URL",
  schema: z.string().url(),
  doc: "Origin the SPA calls for its API",
  exposure: "public", // exposure defaults to "secret" — mark client values public explicitly
});

export const releaseChannel = tessera({
  key: "RELEASE_CHANNEL",
  schema: z.enum(["stable", "beta"]),
  doc: "Release ring this build belongs to",
  exposure: "public",
  default: "stable", // JSON default; validated like any sourced value — no privileged path
});

export const clientTesserae = defineTesserae([apiBaseUrl, releaseChannel]);
