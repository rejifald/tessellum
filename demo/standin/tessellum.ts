/**
 * STAND-IN for the not-yet-implemented `tessellum` package.
 *
 * This exists so the demo's authored files (`src/config.tesserae.ts`) can read
 * EXACTLY as the design site documents them — `import { tessera } from "tessellum"` —
 * while the real package is still a placeholder. `vite.config.ts` and `tsconfig.json`
 * alias `tessellum` here.
 *
 * It implements only what the spike needs, and only as far as P1 requires: construction
 * is inert (no I/O, no validation, no registration), the result is frozen, and detection
 * is by the structural `$tessera` brand rather than `instanceof`.
 *
 * It is NOT a preview of the real implementation. In particular it does not hash
 * identity (issues #41/#42 are unresolved), does not canonicalize, and does not bind.
 */

/** Minimal Standard Schema surface — validate() only, never introspection (P4). */
export interface StandardSchemaV1<Output = unknown> {
  readonly "~standard": {
    readonly version: 1;
    readonly vendor: string;
    readonly validate: (value: unknown) => unknown;
    readonly types?: { readonly output: Output };
  };
}

/**
 * A tessera descriptor OR a baked handle — deliberately the same type.
 * The baked handle carries `key` + `identity` and no schema; that is the whole
 * point of ADR 0003, and it is why `config.unwrap()` accepts either.
 * `__value` is a phantom: it never exists at runtime.
 */
export interface Tessera<V = unknown> {
  readonly $tessera: "$tessera";
  readonly key: string;
  readonly identity?: string;
  readonly __value?: V;
}

/** Structural brand (ADR 0007) — a well-known string key, never a `unique symbol`. */
export const SCOPE_BRAND = "~tessellum.scope";

export interface Scope<T extends Record<string, unknown> = Record<string, unknown>> {
  readonly [SCOPE_BRAND]: true;
  unwrap<V>(t: Tessera<V>): V;
  safe<V>(t: Tessera<V>): { ok: true; value: V } | { ok: false; error: Error };
  readonly __config?: T;
}

export interface TesseraConfig<O> {
  key: string;
  schema?: StandardSchemaV1<O>;
  doc?: string;
  exposure?: "public" | "secret";
  default?: unknown;
}

/** Inert by contract (P1): freeze and return. No I/O, no validation, no registration. */
export function tessera<O = string>(config: TesseraConfig<O>): Tessera<O> {
  return Object.freeze({
    $tessera: "$tessera" as const,
    key: config.key,
    schema: config.schema,
    doc: config.doc,
    exposure: config.exposure ?? "secret",
    default: config.default,
  }) as unknown as Tessera<O>;
}

// NOTE: the constraint is `Tessera<any>`, not `Tessera` or `Tessera<never>`.
// Issue #18's type spike recorded this exact trap for `bind`; it applies to every
// constraint position, `defineTesserae` included. A bare `Tessera` defaults its
// parameter to `unknown` and silently rejects concrete tesserae.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function defineTesserae<const T extends readonly Tessera<any>[]>(tesserae: T): T {
  return tesserae;
}
