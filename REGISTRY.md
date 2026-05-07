# MDA Registry

> **Status:** Active
> **Authority:** This file is the normative source for: (1) vendor namespace assignment under `metadata.<vendor>` (referenced by [`spec/v1.0/04-platform-namespaces.md`](spec/v1.0/04-platform-namespaces.md)); (2) the standard `requires` capability keys (referenced by [`spec/v1.0/10-capabilities.md`](spec/v1.0/10-capabilities.md)); (3) reserved Sigstore OIDC issuers and transparency log providers (referenced by [`spec/v1.0/09-signatures.md`](spec/v1.0/09-signatures.md)); (4) reserved DSSE `payload-type` values for the `signatures[]` envelope (referenced by [`spec/v1.0/09-signatures.md §09-3.1`](spec/v1.0/09-signatures.md)).
> **License:** This registry document is licensed under [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/), matching the specification.

## Purpose

MDA frontmatter reserves the top-level `metadata` object as an extension hook. Each top-level key under `metadata` is a **vendor namespace** owned by a single vendor, runtime, or registry. This file is the canonical list of registered namespaces and the process for adding new ones. It also lists the optional standard keys the spec recognizes under `metadata.mda.requires`, the reserved infrastructure providers for the Sigstore signing path, and the reserved DSSE `payload-type` values that MDA-aware verifiers treat as on-spec.

Why a registry exists:

- Avoid silent collisions between unrelated vendors that pick the same key.
- Give each vendor a stable, documented home for their extensions.
- Let downstream tools enumerate which namespaces they need to understand.
- Give third-party MDA consumers a place to discover what each namespace means.

## Registered namespaces

Each row binds a namespace key to its owner, the upstream documentation that defines its semantics, and the contact responsible for the binding.

| Namespace key       | Owner                      | Upstream documentation                                              | Status     | Contact (PR / issue) |
| ------------------- | -------------------------- | ------------------------------------------------------------------- | ---------- | -------------------- |
| `mda`               | MDA project                | [`spec/v1.0/02-frontmatter.md`](spec/v1.0/02-frontmatter.md)       | Stable     | This repo            |
| `claude-code`       | Anthropic Claude Code      | https://code.claude.com/docs/en/skills                              | Stable     | This repo            |
| `codex`             | OpenAI Codex               | https://developers.openai.com/codex/skills                          | Stable     | This repo            |
| `hermes`            | Nous Research Hermes Agent | https://hermes-agent.nousresearch.com/docs/developer-guide/creating-skills | Stable | This repo            |
| `opencode`          | OpenCode                   | https://opencode.ai/docs/skills/                                    | Stable     | This repo            |
| `openclaw`          | OpenClaw                   | https://docs.openclaw.ai/tools/skills                               | Stable     | This repo            |
| `skills-sh`         | skills.sh / Skills Directory | https://www.skillsdirectory.com/docs/skill-md-format              | Stable     | This repo            |
| `snoai-llmix`       | SnoAI LLMix                | https://github.com/sno-ai/llmix/blob/main/docs/mda-vendor-namespace.md | Provisional | This repo          |

The MDA-aware compiler and validator MUST recognize every namespace listed as `Stable`. They MAY recognize namespaces marked `Provisional`. They MUST NOT reject a frontmatter document solely because it contains an unregistered namespace whose key satisfies the kebab-case shape — only warn — so new vendors can experiment before registration. Compilers MUST preserve unknown vendor namespaces verbatim and MUST NOT interpret their contents (see [`spec/v1.0/04-platform-namespaces.md §04-5.1`](spec/v1.0/04-platform-namespaces.md)).

## Reserved (do not assign)

The following keys are reserved and MUST NOT be assigned to any vendor:

- `mda` — owned by the spec itself.
- `default`, `__proto__`, `constructor`, `prototype` — JavaScript/JSON-toolchain hazards.
- Any key beginning with `_` (underscore) — reserved for future spec-internal use.

## Namespace key constraints

Every namespace key MUST satisfy the kebab-case identifier shape used elsewhere in the spec:

- Regex: `^[a-z0-9]+(-[a-z0-9]+)*$`
- Length: 1-64 characters
- No leading/trailing hyphen, no consecutive hyphens

Vendors with multi-word names SHOULD use the slug form of their product name (e.g. `claude-code`, not `claude_code` or `ClaudeCode`).

## How to register a new namespace

The registry is open. Any vendor or independent maintainer MAY claim a namespace by following the steps below.

### Process

1. **Open a pull request against this file.** Add a new row to the **Registered namespaces** table. Place rows in registration order; do not re-sort.
2. **Include in the PR description:**
   - The namespace key you propose.
   - The owning vendor or product name.
   - A URL to upstream documentation that defines the fields you intend to put under the namespace. If the documentation does not yet exist, link to a draft or an issue committing to publish it before the PR merges.
   - A point of contact (GitHub handle, email, or org).
   - A short rationale (1-3 sentences) for why this namespace is needed and why an existing one cannot be reused.
3. **Wait for review.** A spec maintainer (see CONTRIBUTING.md) will review within 7 days. The review checks:
   - Key conformance (kebab-case, length, not on the reserved list).
   - No collision with an existing or pending entry.
   - Upstream documentation is reachable and on-topic.
   - Rationale shows the namespace will be used (not squatting).
4. **Merge.** On merge, the namespace is assigned. The status starts as `Provisional` and graduates to `Stable` after the first observable production use (an open-source skill, a vendor SDK release, or equivalent), confirmed in a follow-up PR.

### Squatting and abandoned namespaces

A namespace marked `Provisional` for more than 12 months without observable production use MAY be re-assigned by spec maintainers after a 30-day notice on the project issue tracker. `Stable` namespaces are not re-assignable.

## Conflict resolution

If two PRs propose the same key concurrently:

1. The earlier-opened PR takes precedence. (Date by `created_at`, not by latest update.)
2. If the earlier PR stalls without merge for 30 days, the second PR may proceed.
3. If both PRs come from the same vendor (rare, but happens with multi-team orgs), the vendor MUST resolve internally before either merges.

If a vendor renames its product after a namespace is assigned:

1. The original key remains valid (existing MDA documents do not break).
2. The vendor MAY register the new key as an alias by opening a PR that adds a new row and links it to the original.
3. New documentation SHOULD use the new key; the registry retains both.

## Per-namespace documentation requirements

A registered namespace MUST publish, at the upstream documentation URL:

- The full set of keys defined under the namespace.
- The expected types and constraints for each key.
- Whether each key is required or optional.
- Stability guarantees (how often the namespace evolves, how breaking changes are signalled).

The MDA registry does not validate the contents of vendor namespaces — that is each vendor's responsibility — but the registry entry is contingent on the documentation existing and being reachable.

## Schema enforcement

`schemas/_defs/metadata-namespaces.schema.json` lists the registered namespaces explicitly and accepts any other kebab-case key via `patternProperties` so unregistered experimental namespaces continue to validate. Stable namespaces SHOULD be added to that schema in the same PR that registers them here.

## Standard `requires` keys (capabilities)

The `metadata.mda.requires` field is open key-value (see [`spec/v1.0/10-capabilities.md`](spec/v1.0/10-capabilities.md)). Authors MAY use any kebab-case key. The keys below are the recognized standard set: their value shapes are defined in §10-3 of the spec and consumers that recognize them MUST honor those shapes.

| Key | Value shape (summary) | Spec section |
| --- | --------------------- | ------------ |
| `runtime` | array of strings, `<runtime>[<comparator><version>]` | §10-3.1 |
| `tools` | array of opaque tool-name strings (MDA does not parse entries; vendor-specific syntax belongs under `metadata.<vendor>.*`) | §10-3.2 |
| `network` | `none` \| `local` \| `public` \| array of host globs | §10-3.3 |
| `packages` | array of package identifiers | §10-3.4 |
| `model` | object with `min-context`, `tools-required`, `vision` | §10-3.5 |
| `cost-hints` | object with `tokens-per-call`, `seconds-per-call`, `paid-apis` | §10-3.6 |

To propose a new standard key:

1. Open a PR adding a row to the table above and a value-shape definition either to [`spec/v1.0/10-capabilities.md`](spec/v1.0/10-capabilities.md) or as a sub-section of this registry (depending on stability).
2. Provide rationale: which consumer needs it, what semantics, why an existing standard key cannot carry the meaning.
3. Reviewer applies the same on-topic / non-squatting test as for vendor namespaces.

Unknown `requires` keys remain valid forever; promotion to "standard" only documents the recommended value shape.

## Reserved Sigstore OIDC issuers

For the default Sigstore signing path ([`spec/v1.0/09-signatures.md §09-4`](spec/v1.0/09-signatures.md)), the following OIDC issuers are recognized as legitimate, on-topic Sigstore deployments. Recognition does NOT mean a verifier MUST trust them — that is operator policy. It means the MDA project considers the issuer a valid `signer` prefix.

| Issuer URL | Operator | Notes |
| ---------- | -------- | ----- |
| `https://accounts.google.com` | Google | Public Sigstore tenant. |
| `https://github.com/login/oauth` | GitHub Actions OIDC | Public Sigstore tenant. |
| `https://oauth2.sigstore.dev/auth` | Sigstore Dex | Public Sigstore tenant. |
| `https://token.actions.githubusercontent.com` | GitHub Actions workload identity | For CI-emitted signatures. |
| `https://gitlab.com` | GitLab CI workload identity | For CI-emitted signatures. |

To propose a new issuer: open a PR with the issuer URL, the operator, and a link to the public Sigstore deployment documentation. Operators of private Sigstore deployments do NOT need to register here — operator policy decides what to trust.

## Reserved transparency log providers

For the Rekor side of the Sigstore path:

| Rekor URL | Operator | Notes |
| --------- | -------- | ----- |
| `https://rekor.sigstore.dev` | Sigstore public good | Default. |
| `https://rekor.sigstage.dev` | Sigstore staging | Test only. |

Private Rekor instances do not need to register; operator policy applies.

## Reserved DSSE payload types

For DSSE PAE envelopes ([`spec/v1.0/09-signatures.md §09-3`](spec/v1.0/09-signatures.md)), the `payload-type` field declares the semantic type of the canonicalized payload bytes. The following payload types are reserved by the MDA project and its registered vendor consumers.

| Payload type | Owner | Description |
| ------------ | ----- | ----------- |
| `application/vnd.mda.integrity+json` | MDA project | Standard MDA integrity envelope (§09-3.1). The signed bytes are the JCS-canonicalized `integrity` object. |
| `application/vnd.snoai-llmix.preset+json` | SnoAI LLMix | LLMix preset frontmatter payload, defined by the [`snoai-llmix` vendor namespace](https://github.com/sno-ai/llmix/blob/main/docs/mda-vendor-namespace.md). |

Vendor-defined payload types SHOULD follow the form `application/vnd.<vendor>.<doc-type>+json` per [RFC 6838 §3.2](https://www.rfc-editor.org/rfc/rfc6838#section-3.2) (vendor tree). The structured suffix is `+json`; `+jcs` is not IANA-registered and MUST NOT be used. The JCS-canonicalization contract for each payload-type is defined in the vendor's published documentation (see the per-namespace requirements below). To register a vendor payload type:

1. Open a PR adding a row to the table above.
2. The owning vendor MUST already have a registered namespace under "Registered namespaces" (or register it in the same PR).
3. Provide the upstream documentation URL describing what the payload bytes contain and how a verifier should interpret the `payload-type`.
4. The signature still satisfies `payload-digest == integrity.digest` (§09-2); the vendor `payload-type` declares semantic context, not a different digest target.

## Changelog

| Date       | Change                                                            |
| ---------- | ----------------------------------------------------------------- |
| 2026-05-07 | Initial registry. Seeded with vendor namespaces: `mda`, `claude-code`, `codex`, `hermes`, `opencode`, `openclaw`, `skills-sh`. Added standard `requires` keys (§10-3), reserved Sigstore OIDC issuers + Rekor instances (§09-4), and reserved DSSE payload types (§09-3). |
| 2026-05-07 | Registered the Provisional `snoai-llmix` vendor namespace and reserved `application/vnd.snoai-llmix.preset+json` for LLMix preset frontmatter payloads. |
