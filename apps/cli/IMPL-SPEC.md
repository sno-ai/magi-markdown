# `@markdown-ai/cli` — reference implementation specification

> **Status:** Scaffold (v1.0.0-rc.1 freeze; implementation matures across rc.N)
> **Audience:** Implementers of the MDA reference CLI and of independent compatible compilers/validators.
> **Spec dependency:** [`spec/v1.0/`](../../spec/v1.0/) is normative. This document is informative architecture for the reference implementation.

The reference implementation is published as `@markdown-ai/cli` on npm, written in TypeScript, and lives in this directory tree (`apps/cli/`). It is the only package the spec endorses. Independent implementations are welcome and held to the same conformance suite.

---

## 1. Scope

What `@markdown-ai/cli` MUST do at v1.0.0:

- **Parse** a `.mda` source file: extract YAML frontmatter, body, footnote-encoded relationships.
- **Validate** any `.mda` source against `schemas/frontmatter-source.schema.json`.
- **Validate** any `.md` output against the relevant target schema (`SKILL.md`, `AGENTS.md`, `MCP-SERVER.md`).
- **Compile** a `.mda` source into one or more conformant `.md` outputs per the target schemas, with field relocation per [`spec/v1.0/01-source-and-output.md §01-4`](../../spec/v1.0/01-source-and-output.md).
- **Canonicalize** any artifact for integrity computation (JCS-based per [`spec/v1.0/08-integrity.md`](../../spec/v1.0/08-integrity.md)).
- **Sign** an artifact via Sigstore OIDC (default) or did:web (air-gap), per [`spec/v1.0/09-signatures.md`](../../spec/v1.0/09-signatures.md).
- **Verify** signatures and integrity against operator-supplied policy.
- **Run** the conformance suite at `conformance/` and report pass/fail per fixture.

What `@markdown-ai/cli` MUST NOT do at v1.0.0:

- Edit body prose for size budgets (the compiler is structural, not editorial).
- Project vendor namespaces into sibling files (cut from v1.0).
- Interpret unknown vendor namespaces beyond preserving them verbatim.
- Manage long-lived signing keys (Sigstore OIDC is the default).

---

## 2. CLI surface (planned)

```
mda init <name>                         # scaffold a .mda source
mda validate <file>                     # source or output; auto-detects by extension
mda compile <file.mda> [--target T...]  # emit one or more .md outputs
mda canonicalize <file>                 # print canonical bytes to stdout
mda integrity compute <file>            # print {algorithm, digest} JSON
mda integrity verify <file>             # exit 0 iff integrity matches
mda sign <file> [--method sigstore|did-web] [--key-id ...]
mda verify <file> [--policy <path>]     # signatures + integrity, against policy
mda conformance [--suite <path>] [--level V|C]
```

Every subcommand:
- Returns exit 0 on success, non-zero on failure.
- Emits machine-readable output (JSON) under `--json`.
- Honors `--quiet` and `--verbose`.

---

## 3. Module layout (planned)

```
apps/cli/
├── src/
│   ├── parse/        # frontmatter + body + footnote extraction
│   ├── schema/       # ajv loader, registry of target schemas
│   ├── compile/      # source → outputs (per §01-4 + §06-targets/*)
│   ├── canonical/    # JCS-based canonicalizer (§08)
│   ├── integrity/    # compute + verify (§08)
│   ├── sign/         # sigstore + did:web (§09)
│   ├── verify/       # signature verification + policy
│   ├── conformance/  # manifest runner, fixture executor
│   └── cli/          # commander/citty wiring
├── package.json
├── tsconfig.json
└── README.md
```

---

## 4. Conformance levels

The reference implementation declares **level C** ([`spec/v1.0/07-conformance.md §07-2.2`](../../spec/v1.0/07-conformance.md)). It MUST pass every fixture in `conformance/manifest.yaml`.

Level-V-only implementations (validators that do not compile) are conformant if they pass every `valid/` and `invalid/` fixture.

---

## 5. Release model

Per [`SPEC.md`](../../SPEC.md) and [`spec/v1.0/00-overview.md §0.9`](../../spec/v1.0/00-overview.md):

- `v1.0.0-rc.1` — spec freeze. Reference implementation passes the source-side and minimal output-side fixtures.
- `v1.0.0-rc.N` — reference implementation maturity. Each rc adds capability and fixture coverage but does NOT change the spec.
- `v1.0.0` — ships when the reference implementation passes 100% of the conformance suite at level C.

The implementation MAY ship before `v1.0.0` final under the rc tag; users opt in.

---

## 6. Dependencies (planned)

| Concern | Library | Notes |
| ------- | ------- | ----- |
| YAML parse / dump | `yaml` (`eemeli/yaml`) | YAML 1.2; preserves quoting; round-trip-safe. |
| JSON Schema validator | `ajv` 8 + `ajv-formats` | Already in use by `scripts/validate-conformance.mjs`. |
| JCS canonicalization | `@truestamp/canonify` | RFC 8785. |
| Sigstore client | `sigstore-js` | Fulcio + Rekor. |
| did:web fetcher | `node:fetch` + `node:crypto` | No third-party dep. |
| CLI framework | `commander` | Stable subcommand API; sufficient for v1.0. |

All deps MUST be Apache-2.0 / MIT / BSD / ISC compatible.

---

## 7. Compatibility tests

In addition to the MDA conformance suite, the implementation SHOULD pass the upstream `skills-ref validate` reference checker for every emitted `SKILL.md` (https://github.com/agentskills/agentskills/tree/main/skills-ref). When the two checkers disagree, the divergence MUST be tracked as an issue and resolved before the next spec patch.

---

## 8. What is explicitly out of scope for v1.0

- **Round-trip `.md` → `.mda` decompile.** Not part of v1.0.
- **Sibling-file projection.** Cut from v1.0.
- **Body editorial behavior** (auto-relocating prose into `references/`).
- **TUF / The Update Framework** integration. Cut from v1.0.
- **Provenance graphs / SLSA-style attestations** beyond what `signatures[]` already provides. Cut from v1.0.
- **Custom hash algorithms** beyond sha256/384/512.
- **Compound SemVer ranges** beyond exact + caret.

These remain candidates for future minors (`v1.1+`) governed by the registry / RFC process described in [`REGISTRY.md`](../../REGISTRY.md).

---

## 9. Bootstrap status

This document is a scaffold. The `src/` tree is empty as of v1.0.0-rc.1 freeze; the canonical conformance runner remains [`scripts/validate-conformance.mjs`](../../scripts/validate-conformance.mjs) until the TypeScript reference is online. Contributors picking up the implementation should start with the `parse/` and `schema/` modules, port the `scripts/validate-conformance.mjs` logic into `src/conformance/`, then layer compile / canonical / integrity / sign / verify on top.
