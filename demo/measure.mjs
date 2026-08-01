// Re-establishes ADR 0003's measurement, which was made once in a scratchpad that no
// longer exists (issue #59). Run `pnpm prove` to rebuild both targets and re-measure.
import { gzipSync } from "node:zlib";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// Markers that only appear if a real validator reached the bundle.
const ZOD_MARKERS = ["ZodError", "invalid_type", "too_small", "ZodString"];

function jsFiles(dir) {
  const out = [];
  const walk = (d) => {
    for (const entry of readdirSync(d)) {
      const path = join(d, entry);
      if (statSync(path).isDirectory()) walk(path);
      else if (path.endsWith(".js")) out.push(path);
    }
  };
  try {
    walk(dir);
  } catch {
    return null;
  }
  return out;
}

function measure(dir, label) {
  const files = jsFiles(dir);
  if (!files?.length) {
    console.log(`${label.padEnd(24)} —  no build found (run \`pnpm build:both\` first)`);
    return null;
  }
  let raw = 0;
  let gzip = 0;
  const found = new Set();
  for (const file of files) {
    const source = readFileSync(file);
    raw += source.length;
    gzip += gzipSync(source, { level: 9 }).length;
    const text = source.toString("utf8");
    for (const marker of ZOD_MARKERS) if (text.includes(marker)) found.add(marker);
  }
  return { label, files: files.length, raw, gzip, zod: [...found] };
}

const results = [measure("dist-baked", "baked handles"), measure("dist-control", "real descriptors")].filter(
  Boolean,
);

console.log("\n  entry                      files   minified      gzip   zod present?");
console.log("  ─────────────────────────────────────────────────────────────────────");
for (const r of results) {
  const zod = r.zod.length ? `YES — ${r.zod.join(", ")}` : "none";
  console.log(
    `  ${r.label.padEnd(24)} ${String(r.files).padStart(5)} ${String(r.raw).padStart(10)} B ${String(r.gzip).padStart(8)} B   ${zod}`,
  );
}

if (results.length === 2) {
  const [baked, control] = results;
  const ratio = (control.gzip / baked.gzip).toFixed(1);
  console.log(`\n  ratio: the descriptor path is ${ratio}x larger gzip.`);
  console.log(`  ADR 0003 recorded 393 B vs 65,401 B (~166x) with esbuild.\n`);
}
