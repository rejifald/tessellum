# ADR 0012 — The v0.1 implementation scope cut

- **Status:** Proposed (drafted 2026-07-21; awaiting author ratification — design phase, no code yet)
- **Date:** 2026-07-21
- **Deciders:** project author
- **Constitution touchpoints:** P5 (subpath entries — the cut is drawn on entry-point lines), P6
  (bundle-frugal — every shipped entry costs a measured, published budget), P8 (eager validation is
  the default door), P10 (no side effects — poll-on-read), P13/P14 (bake is the only channel that
  inlines client config; it never resolves secret values), P16 (live only over re-readable sources),
  P17 (**honest claims** — the load-bearing driver: a release must not document machinery it cannot
  demonstrate), P18 (relations round-trip as recursive tagged JSON *even when* the runtime rejects
  them — which is what makes deferral additive), P19/P21 (the write plane and secret provider class —
  the half being deferred)
- **Related docs:**
  [`reference/decisions`](../../site/content/docs/reference/decisions.mdx) §12 (the proof gate this
  cut is derived from), §5–§8 (already-deferred surface),
  [`reference/api`](../../site/content/docs/reference/api.mdx) (the full contract this cut narrows),
  [issue #32](https://github.com/rejifald/tessellum/issues/32) (whose opening note scoped "the
  decisions §12 proof-gate demo as the first real implementation, scoped to the stable sync core" —
  a phrase this ADR turns into a list)
- **Builds on:**
  - [ADR 0011](./0011-ship-node-file-source.md) — the precedent and the *rule*: the file source ships
    because the proof gate exercises it, and shipping the freshness surface without it would have been
    paper. This ADR generalizes that test to the whole surface.
  - [ADR 0003](./0003-client-read-api-and-bake-staleness.md) (baked handles — the client target's
    read API), [ADR 0009](./0009-attestation-strictness.md) (attestation posture),
    [ADR 0010](./0010-server-bake-target-semantics.md) (server target semantics) — the three ADRs
    that define what "bake ships" means in D1.

> Engineering decision record, kept apart from the published design site. Records *why* and
> what it costs, not the final reference prose.

---

## Context

The design phase is finished: eleven accepted ADRs, a 21-clause constitution, and roughly 7,500 lines
of contract on the design site. The implementation phase has zero lines of code and **no statement of
what the first release contains.** The registry settles what is *true*; nothing settles what is
*first*.

That gap has two failure modes, and they pull in opposite directions:

- **Build it all.** Implementation starts at the top of `reference/api` and works down — async
  providers, the write plane, write verification, coherence groups, the conformance kit — and nothing
  runs end to end for a long time. The §12 proof gate, which is the decision procedure for whether to
  ship *at all*, arrives last, after the sunk cost that makes it unfalsifiable.
- **Ship a slice of everything.** A partial async plane lands in v0.1 with no demo exercising it:
  `AsyncBinding` with no store anyone has run against, `verify: "report"` with no provider that
  implements `storedRaw`. That is precisely the paper-feature outcome ADR 0011 refused for freshness,
  reintroduced one layer up.

A terminology note this ADR fixes in passing: the site says variants nesting is "rejected in v1" and
the attested branch-freeze is "v2". Those refer to the **1.0 contract**, not to the first published
tag. This ADR uses **v0.1** for the first release, and deferring something from v0.1 to v0.2 says
nothing about its v1.0 status.

---

## Decision drivers

- **P17, applied to a release rather than a sentence.** The honesty bar already forbids overclaiming
  in prose. A first release that ships an entry point nothing can run is the same overclaim in
  package form.
- **ADR 0011's test is reusable.** That ADR shipped the file source *because the gate exercises it*
  and rejected the smaller scope *because it would have shipped the freshness surface as paper*. Read
  as a rule: **ship what the gate exercises, plus what is structurally required to make it run.**
- **§12 is pass/fail, and it gates everything.** The gate is comparative — the demo must clearly beat
  t3-env plus hand-rolling, or the honest outcome is to publish the learnings and stop. Every week of
  work on surface the gate does not touch is a week the go/no-go decision is deferred.
- **The deferred half is the least verifiable half.** ADR 0004 (coherence cuts), ADR 0005 (read
  deadlines and boot outage), and ADR 0006 (atomic batch caps) encode concurrency semantics whose
  correctness needs real stores, a conformance kit, and provider ecosystems. None of §12's five items
  touches any of it.
- **P6 makes surface area a recurring cost.** Every shipped entry point owes a measured budget in CI
  and a published number in the README. Five budgets on day one is a table a reader can check; twelve
  is a table nobody maintains.
- **Deferral must be additive, never a format break.** P18 already requires the relation wire format
  to be recursive and tagged from day one even though nesting is rejected — the same discipline makes
  everything below a later *addition* rather than a later *migration*.

---

## Considered options

- **A. Implement `reference/api` as written (rejected).** Four runtime entry points, the write plane,
  secret provider classing, and the conformance kit before one demo runs. It maximizes the distance to
  the gate and ships the highest-risk semantics unproven.
- **B. Derive the cut from the §12 gate *(chosen)*.** Everything the five gate items exercise, plus
  what is structurally required to run them, ships in v0.1; everything else defers to v0.2 with its
  ADRs intact and its wire-format seats reserved.
- **C. Minimal core (rejected).** Core plus `tessellum/node` env-only — no bake, no Workers. It is
  smaller than the gate itself: it fails §12 items 2, 3, and 4 outright and reopens ADR 0011's
  settled question about paper freshness. A release that cannot run its own acceptance procedure is
  not a smaller v0.1; it is a v0.0.

---

## Decision

### D1 — v0.1 is exactly the gate-reachable surface

| Entry | Ships in v0.1 |
| --- | --- |
| `tessellum` (core, universal) | `tessera()`, `defineTesserae()`, `identityOf()`, `isSecret()`; `bind` / `bind.lazy` / `bind.unchecked` with **no natural defaults** (a bare `env`/`file` ref is `NoWiringError`); `Snapshot` (`unwrap`, `safe`, `pick`, `explain`, `toJSON`); the structural `Scope` / `ConfigOf` brand; `Secret<T>` (ADR 0002); `literal()`; the `env()` / `file()` / `chain()` wiring combinators as pure data; `keepLastGood()`; `refresh()`; the `Clock` seam |
| `tessellum/node` | `bind` with natural defaults (`process.env` + fs); the `{ file }` source and `LiveBinding` (`snapshot`, `epoch`, `health`, `pick`) with poll-on-read throttling, single-coherent-pass file reads, poisoning, and keep-last-good (ADR 0011) |
| `tessellum/workers` | `bind(entries, { env })` — the per-request bag as a required bind option (§12 item 2) |
| `tessellum/testing` | `secretLiteral()`, `manualClock` |
| `tessellum bake` (CLI) | `bake`, `bake --check`, `bake --watch`; the client target (public literals + schema-free handles + the zero-import shim, ADR 0003); the optional server presence module (ADR 0010); `config.manifest.lock.json` with the mandatory client-target digest check and `attest` for servers (ADR 0009); the leak scan and the secret-name gate; `.env.example` and `CONFIG.md` |

`BindOptions` in v0.1: `env`, `transform`, `maxStalenessMs`, `onInvalid`, `onSourceError`, `invalid`,
`unify`, `clock`, `attest`. The error taxonomy ships whole **minus** the write, provider, and relation
families — with one deliberate exception noted in D4.

### D2 — The async plane defers to v0.2, whole

`tessellum/async` does not ship in v0.1: no `AsyncProvider`, no `SecretProvider` class, no
`AsyncBinding`, no `ready()`, no `set()` / `setMany()` / write verification, no `coherent([...])`
groups, no `readTimeoutMs` / `readyTimeoutMs`, no `provider()` combinator, and no `fakeProvider` /
`fakeSecretProvider` / `verifyProvider` in the testing kit.

It is deferred **whole**, not sliced. A half-shipped provider contract is the worst of both: it fixes
the batch shape and the capability vocabulary in a published package while none of it has met a real
store. Deferring the entry also retires — for v0.1 — the open browser-reachability edge recorded in
ADR 0008 (whether the async door is importable from a browser build), because the only path that
needs it is the fetch fallback, which is itself the fallback to a fallback.

### D3 — Relations and inheritance defer to v0.2; their wire-format seats are reserved now

`variants()`, `when()`, `rule()`, and `inherit()` do not ship in v0.1. The gate exercises none of
them, and by D-driver "ship what the gate exercises" they would ship unproven. Two consequences are
load-bearing and both are already required by the constitution, so neither costs anything to honor
now:

- **The recursive tagged wire format ships anyway** (P18). An entry is a tessera descriptor, a
  `$when` node, or a `$variants` node, and `inherit` keeps its tag. v0.1 emits and canonicalizes the
  format with those tags reserved and rejects the nodes at construction; v0.2 turns on the runtime
  behind them without touching a single committed lockfile.
- **`identityOf()` is unaffected.** Identity is content-addressed over the closed field list (P11);
  relations reference discriminants *by identity*, so nothing about the hash changes when the runtime
  arrives.

The escape, stated so it is not litigated informally later: if conditional config must be in the
first release, the honest move is to **add a §12 gate item for it** and then ship it — not to ship it
untested because it is a headline. §12 is amendable; the rule that a v0.1 feature must be
demonstrable is not.

### D4 — Deferral is not retraction

- **Every accepted ADR stays accepted.** ADRs 0001, 0004, 0005, and 0006 describe v0.2 mechanics.
  They are decisions, not release promises, and reopening them is a new ADR, not a scope note.
- **The union type view still ships.** "One runtime shape, three type views" is a v0.1 property:
  `ready()` is pre-resolved on snapshots, `epoch` is frozen at 0 on pins, and `set()` exists and
  throws `NotWritableError`. That is why `NotWritableError` ships while the rest of the write family
  does not — the widening fail-safe must be safe at runtime from the first release.
- **The subpaths stay reserved.** `package.json` `exports` and the tsup entry list keep their seats
  for `./async` and the provider doubles, so v0.2 adds files rather than rearranging a published
  package.
- **The site must say what is available.** The design site deliberately reads as if the library
  existed; the moment a package exists, an unmarked page becomes an overclaim (P17). v0.1 ships with
  per-feature availability markers on the pages describing deferred surface. This is the one piece of
  documentation work the cut *creates*.

### D5 — The gate is the amendment procedure

Scope changes to v0.1 go through §12: to add surface, add the gate item that demonstrates it. This
keeps the release scope and the acceptance procedure from drifting apart, which is the failure this
ADR exists to prevent.

---

## Consequences

**Positive**

- The go/no-go decision arrives sooner. §12 is reachable with roughly half the designed surface, and
  §12 is the only decision that determines whether any of the rest is worth building.
- Nothing in v0.1 is paper. Every shipped feature has a demo item that runs it, by construction of
  the cut.
- The riskiest semantics get the benefit of real usage before they are frozen in a published package:
  the provider contract meets stores in v0.2 with a shipped core behind it.
- P6 becomes enforceable on day one — five entry points, five budgets, one honest README table.

**Negative / costs**

- **The site advertises more than v0.1 ships.** Conditional config appears on the landing page;
  database-backed config has a full guide. D4's availability markers are a real documentation task,
  and until they exist the gap between site and package is exactly the overclaim P17 forbids.
- **`variants()` is the painful cut.** It is sync, fully specced, and a genuine differentiator — the
  requiredness-depends-on-another-value story no incumbent handles well. Deferring it is defensible
  only because the gate does not test it, and D3's escape hatch exists precisely because this may be
  the call the author wants to reverse.
- **Deferring the async plane defers the StitchAPI-adjacent story** (database-backed operator config)
  that several guides are written around, so those guides describe v0.2 for a full release cycle.
- **Reserved-but-empty seats are a small ongoing tax:** the wire format carries tags nothing emits,
  and `exports` carries subpaths nothing resolves, until v0.2.

---

## Scope — what this ADR is *not*

- **Not a mechanism specification.** It narrows *what* ships; it decides nothing about *how*. The
  encoding gaps that block implementation are unaffected by this cut and are tracked separately:
  identity-hash rendering ([#41](https://github.com/rejifald/tessellum/issues/41)) and its
  implementation under P6 ([#42](https://github.com/rejifald/tessellum/issues/42)), the wire-format
  field name ([#43](https://github.com/rejifald/tessellum/issues/43)) and the reserved `$when` shape
  ([#44](https://github.com/rejifald/tessellum/issues/44)), the error-class contract
  ([#45](https://github.com/rejifald/tessellum/issues/45)), the lockfile schema
  ([#47](https://github.com/rejifald/tessellum/issues/47)), the wiring digest
  ([#49](https://github.com/rejifald/tessellum/issues/49)), the bake manifest sandbox
  ([#50](https://github.com/rejifald/tessellum/issues/50)), and the leak scan's gate
  ([#51](https://github.com/rejifald/tessellum/issues/51)).
- **Not a change to any accepted decision.** No ADR is superseded, amended, or reopened here.
- **Not a 1.0 statement.** v0.1 is the first tag. What belongs in the 1.0 contract — including
  variants nesting (rejected in v1) and the attested branch-freeze (v2) — is untouched.
- **Not a schedule.** It is an ordering, with an amendment procedure (D5) instead of a date.
