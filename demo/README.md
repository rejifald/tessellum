# bake demo — hand-written artifacts in a real Vite SPA

An **ergonomics spike**, not a product and not the §12 proof gate.

Nothing here is generated. Every file that `tessellum bake` would emit was written by
hand, then loaded by a real Vite build, so the output could be judged and measured
before the generator exists. The hand-written artifacts are the **specification** the
generator has to reproduce.

```bash
cd demo && pnpm install
pnpm prove     # build both targets and re-measure the ADR 0003 claim
pnpm dev       # the dev loop: HMR + the dev-only staleness check
```

## What is hand-written, and what that means

| File | Stands for | Status |
| --- | --- | --- |
| `src/config.tesserae.ts` | Authored by a developer | Transcribed from `guides/browser.mdx` §1 |
| `config.manifest.ts` | Authored by a developer | Transcribed from the guide |
| `src/config.baked.ts` | **Emitted by bake** | The artifact under test — spec for the generator |
| `.env.example`, `CONFIG.md` | Emitted by bake | Transcribed shape |
| `config.manifest.lock.json` | Emitted by bake | **Invention, not transcription** — see #47 |
| `standin/tessellum.ts` | The unimplemented package | Inert `tessera()` + types, aliased so authored files read exactly as documented |

`config.manifest.lock.json` is the one file with no source to copy from: the lockfile has
no specified schema ([#47](https://github.com/rejifald/tessellum/issues/47)), so its field
names here are a proposal under review, not a transcription.

## What the spike confirmed

Measured on Vite 7.3.6 + zod 4.4.3, Node 22:

- **The baked bundle contains no validator.** `pnpm prove` scans both builds for
  `ZodError` / `invalid_type` / `too_small` / `ZodString`: the baked build has none, the
  control build has all four. The zero-runtime-dependency claim holds literally.
- **The dev-only staleness check strips completely from production.** The prod build is a
  single 1,637 B chunk with no reference to `config.tesserae` at all. In `pnpm dev`, the
  network log shows `src/config.tesserae.ts` and `node_modules/.vite/deps/zod.js` being
  fetched lazily — the dynamic import fires in dev and vanishes in prod, exactly as ADR
  0003 requires.
- **HMR treats the generated module like any other.** Editing a baked literal in
  `src/config.baked.ts` updates the page with no manual reload, which is what
  `bake --watch` + `vite dev` depends on (`guides/browser.mdx:82`).
- **The scope really is runtime-restricted.** Reading a handle outside the client target
  returns `NotInScopeError` through `config.safe()`.
- **The integration story needs no plugin.** Bake stays a CLI that writes a plain module;
  Vite consumes it as source with no special handling.

## What the spike found wrong or unresolved

1. **ADR 0003's published numbers are stale by roughly 10x on the cost side.** The ADR
   records 393 B vs 65,401 B gzip (~166x), and `guides/browser.mdx:122` publishes
   "~0.4 KB … ~65 KB of zod" as a claim. Re-measured here: **882 B vs 14,503 B gzip
   (16.4x)**. The conclusion is unchanged and the direction is the same, but zod 4 with
   two small schemas tree-shakes far better than the original spike's ~65 KB, and the
   882 B includes DOM code and the scope probe rather than the shim alone. A claim that
   overstates the benefit is still a claim that fails P17.
2. **The dev-check guard is bundler-specific.** ADR 0003 specifies
   `process.env.NODE_ENV !== "production"`. There is no `process` in a browser — the guard
   survives only because the bundler folds the expression, and Vite's own idiom is
   `import.meta.env.DEV`. Note also that `vite build --mode development` produced a
   byte-identical bundle with the check stripped: in a Vite *build* the guard is not
   mode-sensitive, so only the dev server ever runs it. Bake needs a decision about what
   it emits, and whether that is target-aware.
3. **The shim has to invent its own error type.** It imports nothing, so `NotInScopeError`
   here is a plain `Error` carrying a structural brand and a `code`. Any consumer writing
   `err instanceof NotInScopeError` against the library's class gets `false`. This is
   [#45](https://github.com/rejifald/tessellum/issues/45) made concrete, and the shim is
   the hardest constraint on that contract.
4. **The dev staleness check cannot actually check staleness yet.** A handle's `identity`
   string can't be generated until the rendering ([#41](https://github.com/rejifald/tessellum/issues/41))
   and hash mechanism ([#42](https://github.com/rejifald/tessellum/issues/42)) are settled,
   so the check in `config.baked.ts` compares *presence* only. ADR 0003's dev-mode
   `StaleBakeError` is blocked on those two.

5. **Issue #18's constraint-position trap reappeared immediately.** The stand-in's
   `defineTesserae` was first written `<const T extends readonly Tessera<never>[]>` and
   rejected every real tessera. #18 recorded this for `bind`; it applies to *every*
   `extends` position, and it cost a typecheck failure here within minutes of writing the
   types. Whatever the real package does, it needs an explicit `AnyTessera` alias.

## Deliberately not covered

The leak scan and its thresholds (#51), the `--check` drift gate, the manifest sandbox
(#50), the wiring digest (#49), the server target, anything secret-exposure, and the
generator itself. This spike answers "does the emitted artifact work and feel right in a
real build" — nothing else.

## Not the proof gate

The §12 acceptance demo ([#60](https://github.com/rejifald/tessellum/issues/60)) is a
different artifact with a different purpose: falsifiable, rubric fixed in advance, and it
must not be tuned until it passes. This spike exists to be surprised by. Keep them apart.
