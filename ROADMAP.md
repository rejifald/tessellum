# Roadmap to v1 spec

**Destination.** A **complete, build-ready, forward-compatible v1 specification** — every
`design-blocker`, `open-decision`, and `spec-consistency` finding closed, every bake-facing
wire format reserved, and the [decisions registry](site/content/docs/reference/decisions.mdx)
re-synced so it is the single source of truth again. When this roadmap is done, the first
line of implementation can be written without a pending design question upstream of it, and
nothing shipped in v1 can force a breaking format change in v1.x.

This is a roadmap to the *spec*, not to a shipped npm release. Implementation phasing — and
the release-scope fork it turns on — lives in [Build horizon](#build-horizon) below, past the
spec gate.

## The one rule that makes the phasing safe

> **Reserve every bake-facing format now, even though bake is implemented last.**

Bake is separable as *code* but not as *contract*. The lockfile, the identity rendering, the
`$when` relation shape, and the error base class are all things bake reads or produces — and
they are also core. If the core freezes those to only what its own runtime needs and bake is
designed later, bake will need a field the core never reserved, and that is a breaking
lockfile change in a config library — the one break the project cannot take. The project
already applies this rule to `when()` ([#44](https://github.com/rejifald/tessellum/issues/44):
runtime defers to v0.2, tags reserved in v0.1); this roadmap generalizes it to the whole
bake-facing surface. Every Milestone A–B ADR is written **looking at bake's constraints**, not
just the core's.

## Relationship to existing trackers

- **[#32](https://github.com/rejifald/tessellum/issues/32)** (pre-implementation review) is
  **closed** — spikes, async/DB semantics, the spec re-sync, and decisions #28–30 all landed
  as [ADRs 0004–0011](docs/adr/). This roadmap covers the *second* review pass
  ([#41–63](https://github.com/rejifald/tessellum/issues/41)).
- The **[decisions registry](site/content/docs/reference/decisions.mdx)** is the running
  source of truth. It currently still lists only the original six questions; **backfilling
  #41–63 into it is task zero** (cheap, makes the rest trackable), and thereafter each item
  graduates to a one-line ADR pointer *as it is settled*, exactly as the
  [ADR README](docs/adr/README.md) describes. Registry re-sync is therefore a running
  obligation, not a discrete phase.
- Proposed ADR numbers below start at **0012**, aligning with the scope-cut already referenced
  in [#44](https://github.com/rejifald/tessellum/issues/44).

---

## Milestone A — Spec foundations (cross-cutting contracts)

**Goal.** Pin the two primitives every module imports — identity and errors — and freeze their
wire formats. Nothing else in the core can be written until these are decided, and they must be
decided against bake's needs.

| Issue | What it closes | Output |
| --- | --- | --- |
| [#44](https://github.com/rejifald/tessellum/issues/44) | `when()` runtime → v0.2; `$when` tags reserved in v0.1 | **ADR 0012** — v0.1/v0.2 scope cut |
| [#42](https://github.com/rejifald/tessellum/issues/42) | Identity hash impl (xxh128 + JCS source, eager-vs-lazy, does the runtime need it) | **ADR 0013** — identity & wire format |
| [#41](https://github.com/rejifald/tessellum/issues/41) | Identity string rendering + digest width | ADR 0013 |
| [#43](https://github.com/rejifald/tessellum/issues/43) | `sources` vs `refs` descriptor field | ADR 0013 |
| [#54](https://github.com/rejifald/tessellum/issues/54) | `schemaId` vendor-fingerprint read + absent-encoding; P4 ref | ADR 0013 |
| [#55](https://github.com/rejifald/tessellum/issues/55) | `Provenance` — one shape | ADR 0013 |
| [#44](https://github.com/rejifald/tessellum/issues/44) | `$when` node wire shape (format half) | ADR 0013 |
| [#45](https://github.com/rejifald/tessellum/issues/45) | Error base class, brand, stable `code`, cross-realm predicate, shim throw | **ADR 0014** — error contract |
| [#46](https://github.com/rejifald/tessellum/issues/46) | One scenario → one error name | ADR 0014 |

**Exit criteria.** `identityOf()` is deterministic across runtimes and stable across a JSON
round-trip, with a measured size delta against the 10 kB core budget; the lockfile/identity
wire format is frozen and covers all three relation node kinds; the error base class is
producible by the zero-import baked shim. **This is the critical-path milestone** — start here.

## Milestone B — Bake specification

**Goal.** Give every declared bake boundary a named mechanism, so the spec satisfies P17
(no advertised boundary that isn't one). Specify the **server-bake** subset ahead of the
**client-bake** surface, so it can ship first (see Build horizon).

| Issue | What it closes | Output |
| --- | --- | --- |
| [#47](https://github.com/rejifald/tessellum/issues/47), [#48](https://github.com/rejifald/tessellum/issues/48), [#49](https://github.com/rejifald/tessellum/issues/49) | Lockfile schema, lockfile-vs-`manifest.json`, wiring-digest preimage + comparands + missing-file behavior | **ADR 0015** — lockfile & wiring digest *(server-bake subset)* |
| [#50](https://github.com/rejifald/tessellum/issues/50) | `config.manifest.ts` sandbox mechanism + honest boundary statement | **ADR 0016** — manifest constrained context |
| [#51](https://github.com/rejifald/tessellum/issues/51) | Leak-scan measure, thresholds, encoded-string handling, fixtures | **ADR 0017** — leak scan |
| [#52](https://github.com/rejifald/tessellum/issues/52) | What computes the client-reachable tessera set | **ADR 0018** — reachability coverage |
| [#53](https://github.com/rejifald/tessellum/issues/53) | JSON-Schema emission reconciled with P4 (opaque validators) | **ADR 0019** — document schema emission |
| [#63](https://github.com/rejifald/tessellum/issues/63) | Browser-safe dev-check guard (not `process.env.NODE_ENV`) | Spec fix in `bake/overview` |
| [#62](https://github.com/rejifald/tessellum/issues/62) | ADR 0003 bundle numbers reproduce (166× claim vs 16.4× measured) | Doc correction |

**Exit criteria.** Each bake artifact has a schema; each security claim names its mechanism and
its known escapes; server-bake (ADR 0015 + presence-check ADR 0010) is specified independently
of the client leak-scan/sandbox/coverage cluster; published numbers reproduce from a committed
fixture.

## Milestone C — Remaining edges + registry

**Goal.** Close the last open decision and restore the registry.

| Issue | What it closes | Output |
| --- | --- | --- |
| [#56](https://github.com/rejifald/tessellum/issues/56) | Is `tessellum/async` reachable from a browser build | **ADR 0020** — async bundle boundary |
| — | Registry lists #41–63 with ADR pointers | [decisions registry](site/content/docs/reference/decisions.mdx) re-synced |

**Exit criteria.** Zero open `design-blocker` / `open-decision` / `spec-consistency` issues; the
registry is the single source of truth again.

## Milestone D — Spec → build handoff (proof scaffolding)

**Goal.** Prove the spec is *executable*, not just internally consistent, and clear the
project's own ship-gate.

| Issue | What it closes | Output |
| --- | --- | --- |
| [#58](https://github.com/rejifald/tessellum/issues/58) | Internal seams: pipeline order, source-injection, scope table, cache/epoch | Recorded (ADR or `docs/`) |
| [#59](https://github.com/rejifald/tessellum/issues/59) | Lost spikes re-created as committed tests | Tests in-repo |
| [#57](https://github.com/rejifald/tessellum/issues/57) | Per-feature size budgets (P6) exist and are enforced | `.size-limit.json` + README table |
| [#60](https://github.com/rejifald/tessellum/issues/60) | §12 proof-gate demo: repo shape, unpublished-build consumption, CI, rubric | Demo package + CI |
| [#61](https://github.com/rejifald/tessellum/issues/61) | Availability markers so the site does not overclaim once v0.1 exists | Site annotations |

**Exit criteria.** Spikes are green in CI; budgets are enforced; the §12 planted-leak demo
visibly fails the build and the near-miss does not. At this point the **v1 spec is build-ready
and has cleared its own "ship only if the demo clearly wins" gate**
([decisions §6](site/content/docs/reference/decisions.mdx)).

---

## Build horizon

Past the spec gate, implementation proceeds in three phases — the split established during
design review. The spec (Milestones A–D) reserves all formats for all three, so each phase is
purely additive.

1. **Core.** Declare (`tessera`) → bind (`bind`/`env`/scopes) → validate-at-boot → read a
   pinned `Snapshot`, across Node / Workers / Deno / Bun / tests, plus the live file source and
   the async/DB + writes layer (semantics settled in [ADRs 0004–0006](docs/adr/),
   [0011](docs/adr/0011-ship-node-file-source.md)). Everything here is ready to build the day
   Milestone A lands.
2. **Server-bake.** The presence-checking bake target
   ([ADR 0010](docs/adr/0010-server-bake-target-semantics.md) + ADR 0015). This is what the
   first consumer, StitchAPI, actually needs (§7), and it carries none of the client leak-scan
   weight.
3. **Client-bake.** The browser inlining pipeline and the "secrets never reach the browser by
   construction" headline (ADRs 0016–0019). Highest value, highest risk, specified last.

**Release-scope fork (author's call).** Whether v1 *ships* at phase 2 or phase 3 is a product
decision, not a build-order one:

- **Edge/server config library** — v1 = phases 1–2; client-bake is v1.x. Bake is genuinely
  optional to the value proposition (per-request `env` binding + live/DB + secret-by-default
  already exceed envalid/t3-env).
- **Browser-secrets library** — v1 requires phase 3; phases 1–2 are internal milestones. This
  is what the current README promises front-and-center; shipping without it is the overclaim
  [#61](https://github.com/rejifald/tessellum/issues/61) warns about.

Either way the spec roadmap above is unchanged — it reserves phase 3's formats regardless, so
the fork can be decided as late as the phase-2 release.

## Explicitly out of v1 scope

Post-v1 enhancements, tracked but not gating the spec:
[#5](https://github.com/rejifald/tessellum/issues/5) library-author defer ·
[#6](https://github.com/rejifald/tessellum/issues/6) browser-extension tier ·
[#7](https://github.com/rejifald/tessellum/issues/7) read-time migration ·
[#8](https://github.com/rejifald/tessellum/issues/8) polyglot descriptor spec ·
[#9](https://github.com/rejifald/tessellum/issues/9) CLI argv precedence ·
[#11](https://github.com/rejifald/tessellum/issues/11) home dotfile source ·
[#14](https://github.com/rejifald/tessellum/issues/14) `latch` freshness mode.

---

*This is a living document. As each issue graduates, update the
[decisions registry](site/content/docs/reference/decisions.mdx) with its ADR pointer and check
it off here.*
