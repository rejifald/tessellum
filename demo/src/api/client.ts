// Exactly the call site the browser guide documents (§5).
// The handles come from ../config.baked, NOT from ../config.tesserae — importing the
// real descriptor for the unwrap() key is what would pull zod into the bundle, and the
// client-graph lint fails the build if you do. See src/main.control.ts for that build.
import { config, apiBaseUrl, releaseChannel } from "../config.baked";

export function apiFetch(path: string) {
  return fetch(new URL(path, config.unwrap(apiBaseUrl)), {
    headers: { "x-release-channel": config.unwrap(releaseChannel) },
  });
}

export function describeConfig(): string {
  return `${config.unwrap(apiBaseUrl)} (${config.unwrap(releaseChannel)})`;
}
