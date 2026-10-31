# ADR 0013 — Identity hashing and the content-address wire format

- **Status:** Proposed (2026-07-24; design phase — no code yet; awaiting author ratification)
- **Date:** 2026-07-24
- **Deciders:** project author
- **Constitution touchpoints:** P1 (the descriptor is inert data — construction performs zero
  computation-with-side-effects; the hash is pure and must not be cached *on* the frozen
  object), P2 (the descriptor round-trips as JSON — identity is computed over the serializable
  subset and must survive a round-trip), P4 (BYO Standard Schema; the validator exposes only
  `validate()`, so identity can never introspect a schema — the floor is revalidate-on-fallback),
  P5 (browser-first, runtime-universal core — the hash runs in the browser), P6 (bundle-frugal,
  zero runtime dependencies, measured budgets — xxh128 and the canonicalizer are vendored code
  against the 10 kB core budget), P11 (content-addressed identity with a frozen field list —
  this ADR pins how that list is serialized, hashed, and rendered), P18 (conditional structure
  is a relation, tagged from day one — the `$when`/`$variants` wire shapes are identity-bearing)
- **Related docs:** [`concepts/identity`](../../site/content/docs/concepts/identity.mdx)
  (the field list, the `tesserav1|`/`tesserav1:xxh128:` forms, the compatibility table),
  [`concepts/conditional`](../../site/content/docs/concepts/conditional.mdx) (the `$variants`
  wire example, the `relv1|` relation address, and the `$when` node this ADR adds),
  [`reference/api`](../../site/content/docs/reference/api.mdx) (§Identity `identityOf`; the
  `when()` signature; `explain(): Provenance`), [`principles.md`](../../principles.md) P4 / P11 /
  P18; resolves issues #41, #42, #43, #54, #55, and the wire-format half of #44
- **Builds on:**
  - [ADR 0007](./0007-cross-install-identity-and-library-consumption.md) — structural equality
    over the frozen field list is the authoritative cross-install guarantee; the hash is only an
    index. This ADR pins the index's bytes without disturbing that ordering.
  - [ADR 0004](./0004-async-snapshot-coherence.md) — added `version` to `Provenance` as the
    provider CAS token; this ADR gives `Provenance` its one canonical definition (#55).
  - **ADR 0012** (pending) — the v0.1/v0.2 scope cut defers the `when()` *runtime* to v0.2. This
    ADR discharges that cut's standing obligation: the `when()` *wire shape* is reserved now, so a
    v0.1 lockfile stays forward-readable when v0.2 turns the runtime on (#44).

> Engineering decision record, kept apart from the published design site (which presents the
> library "as if it existed"). Records *why* and what it costs, not the final reference prose.

---

## Context

`identityOf()` is among the first primitives that must exist: the three-way `unwrap()` contract,
`DescriptorMismatchError`, `unify`, the lockfile's declared→effective map, and every relation's
content address all depend on a descriptor having a stable, cross-runtime identity. The field
*list* is settled (P11, [`concepts/identity`](../../site/content/docs/concepts/identity.mdx)) —
what is **not** settled, and what blocks the first line of code, is how that subset is
serialized, hashed, rendered, and referenced from other artifacts. Five findings converge here:

- **#42 — no implementation decision.** xxh128 + RFC 8785 (JCS) canonicalization is non-trivial
  code that must run in a zero-dependency browser core against the only budget CI enforces (10 kB).
  Nothing records where the code comes from, when the hash is computed (eager vs. lazy), or
  whether the runtime needs it at all.
- **#41 — the rendered form is ambiguous.** The docs show two strings for "the identity":
  `tesserav1|…` (as a hash *preimage* prefix at [`identity`](../../site/content/docs/concepts/identity.mdx):42,
  and as a *reference* inside a relation at [`conditional`](../../site/content/docs/concepts/conditional.mdx):236)
  and `tesserav1:xxh128:…` (as `identityOf()` output at [`identity`](../../site/content/docs/concepts/identity.mdx):56).
  The digest width is unstated and the examples disagree (32-hex elided vs. 16-hex literals).
- **#43 — two names for one field.** The identical wire descriptor is `"sources": […]` at
  [`identity`](../../site/content/docs/concepts/identity.mdx):92 and `"refs": […]` at
  [`conditional`](../../site/content/docs/concepts/conditional.mdx):240.
- **#54 — `schemaId` names a mechanism that cannot exist.** It is described as "a vendor
  fingerprint of the schema, or your explicit `version`", but Standard Schema exposes no
  per-schema fingerprint (only `~standard.vendor`, a *name*, and `~standard.version`, the *spec*
  version) — and P4 forbids introspecting the validator. The docs even contradict themselves:
  `schemaId` renders as a plain `"2"` at [`identity`](../../site/content/docs/concepts/identity.mdx):96
  but as a hashed `"std1|4be0…"` at [`conditional`](../../site/content/docs/concepts/conditional.mdx):241.
  P4's reference to "the ADR-0004-style ladder" is also ambiguous — in *this* repo ADR 0004 is
  async coherence; the intent is StitchAPI's ADR 0004.
- **#55 — `Provenance` is referenced but never defined.** `explain()` returns it and ADR 0004
  adds `version` to it, but no document gives it a shape.
- **#44 (format half) — `$when` is unspecified.** [`conditional`](../../site/content/docs/concepts/conditional.mdx)
  asserts the relation wire is recursive and tagged with three node kinds, but only shows
  `$variants`. `$when` cannot be emitted, canonicalized, or hashed.

These are one decision, not six: they all concern the bytes of content-addressed identity, and
they must be fixed *together* so the preimage is internally consistent. The wire format is a
forward-compatibility contract the moment v0.1 writes its first lockfile — this is the last cheap
day to pin it.

---

## Decision drivers

- **P11 / ADR 0007 — structural equality is authoritative; the hash is an index.** Whatever this
  ADR decides about hashing must not put the hash on the correctness path: a reference read never
  needs it, and a crafted collision must never forge a match.
- **P4 — no schema introspection, ever.** Any identity contribution derived from the validator is
  forbidden. `schemaId` can only carry what the *author* declares, and the always-on
  revalidate-on-fallback floor is what makes an absent discriminator safe.
- **P6 — every byte is measured against 10 kB.** The canonicalizer and hash are core payload;
  they must be minimal, and the choice must be reducible to a measured delta.
- **P2 — round-trip stability.** Identity is computed over the *normalized effective* subset, so
  a descriptor that is serialized and reconstructed must hash identically.
- **Cross-runtime determinism.** `identityOf()` must produce the same string in a browser, in
  Node, in Deno, and inside bake — one canonical form, one implementation, no per-environment
  divergence. (This is also the seam through which the future polyglot spec, #8, reproduces
  identity in another language.)
- **One rendering.** A single user-visible string for "the identity", used everywhere a digest is
  written down, beats two forms readers must reconcile.

---

## Decision

Six sub-decisions, **D1–D6**.

### D1 — The field name is `sources`, input and wire alike (#43)

The declared source-reference list is **`sources`** everywhere it is serialized — the constructor
input, the identity subset, the `DescriptorMismatchError` rendering, and every relation-embedded
descriptor. `refs` is retired as a *field* name; it survives only as informal English ("a
tessera's declared refs" in P20 prose = "its `sources`"). Input and wire share the name because
P2 makes the descriptor its own serialization — a rename-on-serialize would be a gratuitous second
vocabulary. **Sweep:** [`conditional`](../../site/content/docs/concepts/conditional.mdx):240
`"refs"` → `"sources"`.

### D2 — One rendered form: `<scheme>:xxh128:<32-hex>`; the `|` form is preimage-only (#41)

There are exactly two byte-strings in the identity system, with disjoint jobs:

1. **The hash preimage** — the bytes fed to xxh128, *never surfaced*:
   `preimage = "<scheme>v1|" + JCS(subset)`, where `<scheme>v1` ∈ {`tesserav1`, `relv1`} and the
   `|` (0x7C) is a domain separator (JCS output begins with `{`, so the boundary is unambiguous).
2. **The rendered identity** — the one string users and artifacts ever see:
   `"<scheme>:xxh128:<hex>"`, e.g. `tesserav1:xxh128:9f2c77aa…`. It is returned by
   `identityOf()`, printed in errors, listed in `unify` aliases, **and** used as the reference
   form inside relations (`"on"`, `"id"`) and lockfile entries.

The digest is the **full 128-bit xxh128, rendered as exactly 32 lowercase hex characters**, never
truncated. The algorithm tag (`xxh128`) is in the string so a future hash migration is legible
rather than silent. **Sweeps:** the `tesserav1|<hex>` *reference* forms
([`conditional`](../../site/content/docs/concepts/conditional.mdx):236) and `relv1|<hex>` id forms
(:249) become `tesserav1:xxh128:<hex>` / `relv1:xxh128:<hex>`; all 16-hex example digests widen to
32-hex. (The `"<scheme>v1|" + JCS` form remains, correctly, only as the *preimage* description at
[`identity`](../../site/content/docs/concepts/identity.mdx):42.)

### D3 — Vendored xxh128 + a scoped JCS encoder; computed lazily, memoized off-descriptor; one shared canonicalizer (#42)

- **Source.** Vendor a minimal **xxh128** (xxHash is BSD-2-Clause; zero runtime dependency, P6).
  Canonicalization is a **JCS-conformant encoder scoped to the value shapes the identity subset
  can contain** — not a general RFC 8785 library over arbitrary JSON. The top-level fields are
  known and typed; only the open-valued fields (`default`, and a predicate's `equals`/`in`
  operands, D5) carry arbitrary `Json`, so full JCS number/string/array rules are implemented
  *for those values only*. The output is byte-for-byte JCS, so it stays reproducible by an
  independent (polyglot) implementation; the code just need not handle shapes that cannot occur.
- **Timing.** The hash is **pure** and computed **lazily on first `identityOf()`**, memoized in a
  module-level `WeakMap<descriptor, string>` — **never** written onto the frozen descriptor (P1
  forbids caching on it, and it is frozen regardless). Construction computes nothing (P1).
- **Does the runtime need it?** Only off the hot path. A reference-equality read never hashes;
  **structural equality over the normalized subset is the authoritative comparison** (ADR 0007)
  and needs no digest. The hash is computed only to *index* a hash-fallback lookup, to render an
  error, or to write a lockfile.
- **One implementation, not two.** Bake (on Node) reuses the **same** canonical form and hash as
  the runtime — the lockfile's content addresses must equal runtime `identityOf()` byte-for-byte,
  so a second implementation is a divergence risk, not an optimization. There is one canonicalizer.
- **Normalization (the preimage subset).** Compute over the *effective* descriptor: `exposure`
  absent → `"secret"`; `freshness` absent → `"snapshot"`; `sources` absent → `[{ "env": <key> }]`;
  `schemaId` absent → **omit the key** (D4); `default` absent → omit the key. A field present with
  its defaulted value and a field omitted therefore hash identically (P2 round-trip). JCS sorts
  object keys, so field order is not hand-maintained.
- **Size.** Estimated well under 1 kB min+gz for xxh128 plus the scoped encoder. **Acceptance
  gate:** the PR that lands `identityOf()` records the measured delta against the 10 kB core
  budget in `.size-limit.json`; if it ever breaches, the encoder moves behind a lazily-imported
  core submodule (the reference-equality path, which needs no hash, stays in the always-loaded
  core). A measured number cannot be recorded in a design-phase ADR and is deferred to that PR.

Worked example (digest illustrative — not computed here):

```
descriptor:  tessera({ key: "SMTP_URL", schema: z.string().url(), doc: "…", version: "2" })
subset:      { "default"?, "exposure":"secret", "freshness":"snapshot",
               "key":"SMTP_URL", "schemaId":"2", "sources":[{"env":"SMTP_URL"}] }   // doc excluded
preimage:    tesserav1|{"exposure":"secret","freshness":"snapshot","key":"SMTP_URL","schemaId":"2","sources":[{"env":"SMTP_URL"}]}
identityOf:  "tesserav1:xxh128:9f2c77aa…"   // 32 hex, full width
```

### D4 — `schemaId` is the explicit `version`, or absent; there is no introspective fingerprint (#54)

`schemaId` is present in the identity subset **only when the author declares an explicit
`version`** on the tessera, and it is that string, verbatim (`version: "2"` → `"schemaId":"2"`).
There is **no vendor fingerprint of the schema**: Standard Schema exposes `~standard.vendor` (a
library *name*, invariant across schema edits) and `~standard.version` (the *spec* version, `1`)
— neither detects a schema change, and P4 forbids reaching past `validate()` into vendor
internals to synthesize one. So:

- **Absent `version` → `schemaId` is omitted** from the preimage (not `null`, not `""` — omission,
  so absence and any value never collide). Silent schema drift under a preserved identity is then
  caught by the **always-on revalidate-on-fallback floor** (P4), which is exactly why that floor
  exists. The compatibility table's "change the schema without bumping `version` → identity
  preserved, silent-drift hazard" row ([`identity`](../../site/content/docs/concepts/identity.mdx):194)
  is correct and stays.
- **The `std1|…` hashed form is removed.** [`conditional`](../../site/content/docs/concepts/conditional.mdx):241
  `"schemaId": "std1|4be0…"` becomes a plain version string (or is omitted). A schema *content*
  hash is unimplementable under P4 and is struck from the design.
- **P4's cross-repo reference is qualified.** The "ADR-0004-style ladder" in P4 is **StitchAPI's**
  ADR 0004 (the validator-fingerprint ladder, §7), not this repo's ADR 0004 (async coherence). P4
  gains the "StitchAPI's" qualifier, mirroring how it already qualifies the "StitchAPI ADR 0011
  lesson". In *this* library the ladder has one usable rung — the explicit `version` — because
  Standard Schema affords no fingerprint; the revalidation floor is the backstop, not a fingerprint.

### D5 — The `$when` wire node, and canonicalization across all three node kinds (#44, format half)

A relation entry is one of three node kinds. All three are content-addressed as
`"relv1|" + JCS(node without its own "id") → xxh128`, rendered `relv1:xxh128:<32-hex>` in the
`"id"` field. Embedded descriptors contribute their **normalized identity subset** (D3), so a
member's cosmetic field never forks the relation's identity.

**`$when`** (companion to the existing `$variants`), mirroring the `when()` signature
`when({ tessera, is }, members)`:

```json
{
  "$when": 1,
  "on": "tesserav1:xxh128:8c72d1f0…",
  "is": { "equals": "production" },
  "members": {
    "sentryDsn": { "key": "SENTRY_DSN", "exposure": "secret", "freshness": "snapshot", "sources": [{ "env": "SENTRY_DSN" }] },
    "sampleRate": { "key": "TRACE_SAMPLE_RATE", "exposure": "public", "freshness": "snapshot", "default": 0.1, "schemaId": "1", "sources": [{ "env": "TRACE_SAMPLE_RATE" }] }
  },
  "id": "relv1:xxh128:a17be3c4…"
}
```

- `"$when": 1` — node tag and format version (parallels `"$variants": 1`).
- `"on"` — the condition tessera, referenced by its **rendered identity** (D2). The condition
  tessera must be `freshness: "snapshot"` (`LiveDiscriminantError`), so the reference is stable.
- `"is"` — the predicate, encoded as the `when()` union: the JSON string `"set"` (a source
  produced a non-empty raw; a `default` does **not** count), or `{ "equals": <Json> }`, or
  `{ "in": [<Json>, …] }`. The `equals` operand and each `in` element are JCS-canonicalized. For
  `in`, elements are **sorted by their JCS byte encoding** before hashing, so `{"in":["a","b"]}`
  and `{"in":["b","a"]}` are one relation (membership is order-insensitive — unlike `sources`,
  whose order *is* meaning).
- `"members"` — a `Record<string, node>` (parallels `$variants.branches`); each value is a
  descriptor, a `$when`, or a `$variants`. v1 rejects nesting at *construction*
  (`VariantsNestingError`), but the *format* admits it, so v2 enabling it is a flag flip, not a
  break (ADR 0012).
- `"id"` — the relation's own content address (excluded from its own preimage).

**Canonicalization rule, all three kinds:**

| Node | Preimage |
| --- | --- |
| descriptor | `"tesserav1\|" + JCS(normalized identity subset)` |
| `$variants` | `"relv1\|" + JCS({ "$variants":1, "on":<ref>, "branches":{ name → member-preimage-subset } })` |
| `$when` | `"relv1\|" + JCS({ "$when":1, "on":<ref>, "is":<canonical predicate>, "members":{ name → member-preimage-subset } })` |

where `<ref>` is the rendered identity string of the referenced tessera, and a nested relation
member recurses through this same table.

### D6 — `Provenance` has one canonical shape (#55)

`Provenance` is the record `explain(tessera)` returns for a resolved value — defined once, here,
and referenced everywhere else:

```ts
interface Provenance {
  source: SourceId;      // which ref supplied the value: "env" | "file" | "default" | "literal"
                         //   | "<provider id>"  (the AsyncProvider.id for provider-sourced values)
  resolvedKey: string;   // the effective name actually read (post-wiring), e.g. "PLATFORM_PG_URL"
  version?: string;      // provider CAS token (ADR 0004); present only when the provider supplies one
}
```

`explain(): Provenance` at [`api`](../../site/content/docs/reference/api.mdx):168 is the anchor;
ADR 0004's `version` is folded in as the optional CAS token. Any other shape in the docs conforms
to this one.

---

## Consequences

**Positive**

- The first primitive is unblocked: `identityOf()` has a pinned preimage, a single rendered form,
  a fixed digest width, and a stated implementation and timing — deterministic across runtimes and
  stable across a JSON round-trip (the #42 / #41 acceptance criteria).
- The wire format is frozen and forward-compatible: `$when` is reserved with its predicate and
  reference encodings, so a v0.1 lockfile survives v0.2 turning the `when()` runtime on (#44).
- The design stops advertising a mechanism it cannot build: `schemaId` is honestly the author's
  `version` or nothing, consistent with P4, and the `std1|` schema-hash fiction is struck (#54).
- One vocabulary (`sources`) and one identity string across input, wire, errors, and lockfile
  (#43, #41) — fewer things a reader or a polyglot re-implementer must reconcile.

**Negative / costs**

- **Required doc sweeps** (this ADR mandates edits to already-published pages; tracked, not yet
  applied): `refs`→`sources` and `std1|…`→version-string and `tesserav1|`/`relv1|`
  reference-forms→`:xxh128:` and 16-hex→32-hex in
  [`conditional`](../../site/content/docs/concepts/conditional.mdx); the `$when` node added beside
  the `$variants` example; P4 gains the "StitchAPI's ADR 0004" qualifier in
  [`principles.md`](../../principles.md) and its mirror; `Provenance` defined in
  [`api`](../../site/content/docs/reference/api.mdx).
- **A measured size number is still owed.** The ADR sets the budget constraint and the fallback,
  but the real delta lands with the implementing PR — an honest deferral, not a decision left open.
- **`in`-sorting is a small surprise.** Two `when` predicates that differ only in `in` order are
  one identity; documented, and the safer default (it prevents accidental identity forks), but it
  is a rule an author must know.

**Security posture**

- Unchanged and intact: structural equality over the frozen subset remains authoritative (ADR
  0007), so pinning the hash's bytes adds an index, not a trust boundary — a crafted xxh128
  collision still cannot forge a match. P4's revalidate-on-fallback floor is now explicitly the
  thing that makes an absent `schemaId` safe (D4).

---

## Scope — what this ADR is *not*

- **Not a change to what counts as identity.** The frozen field list (P11) is unchanged; this ADR
  pins how it is *serialized, hashed, rendered, and referenced*, and fixes the one field-*name*
  inconsistency (#43). No field enters or leaves the identity subset.
- **Not the `when()` runtime.** Evaluating conditions defers to v0.2 (ADR 0012). This ADR reserves
  only the wire shape.
- **Not the wiring digest or the lockfile schema.** How declared→effective wiring is hashed
  (#49) and the lockfile's own schema (#47/#48) are bake concerns (Milestone B); this ADR gives
  them the tessera- and relation-address *primitives* they will reference, nothing more.
- **Not a general JSON canonicalizer.** The encoder is scoped to the identity subset's value
  shapes (D3); shipping a full RFC 8785 library for arbitrary input is a non-goal under P6.
