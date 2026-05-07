# §08 — Integrity

> **Status:** Stable
> **Schema:** [`schemas/_defs/integrity.schema.json`](../../schemas/_defs/integrity.schema.json)
> **Depends on:** §00, §01, §02, §06-targets/*

## §08-1 Synopsis

The optional top-level `integrity` field in MDA frontmatter (§02-2.7) carries a single cryptographic hash that anchors the artifact's content for tamper detection. It is the foundation that signatures (§09) attest to: a signature without an integrity anchor signs nothing reproducible.

This chapter specifies (1) the field's schema, (2) the canonicalization rules that make the digest reproducible across implementations, (3) the bytes that go into the digest for each target, and (4) the verification procedure.

## §08-2 Field shape (normative)

```yaml
integrity:
  algorithm: sha256
  digest: "sha256:<lowercase-hex-string>"
```

| Field | Type | Required | Notes |
| ----- | ---- | -------- | ----- |
| `algorithm` | string | yes | One of `sha256`, `sha384`, `sha512`. v1.0 admits no other algorithms. |
| `digest` | string | yes | Self-describing digest in `<algorithm>:<lowercase-hex>` form. The `<algorithm>` prefix MUST equal the `algorithm` field. The hex portion length MUST match the algorithm (64, 96, 128 hex chars for sha256/384/512). The prefix matches the shape used by `metadata.mda.depends-on[].digest` (§03-3.3) so direct equality holds without normalization. |

Schema: `_defs/integrity.schema.json`. Unknown subfields are rejected (`additionalProperties: false`).

## §08-3 Canonicalization

To make the digest reproducible across YAML serializers, every implementation MUST canonicalize the artifact before hashing.

### §08-3.1 Step 1 — Strip the integrity and signatures fields

Remove the top-level `integrity` field and the entire top-level `signatures` array from the frontmatter before canonicalization. The digest covers the artifact as it would exist without the security envelope.

### §08-3.2 Step 2 — Canonicalize frontmatter to JCS

Convert the (stripped) frontmatter to JSON and serialize it via JCS (RFC 8785, JSON Canonicalization Scheme). JCS sorts object keys lexicographically, normalizes numbers, and uses minimal whitespace. The result is a deterministic UTF-8 byte sequence.

Implementation note: every mainstream language has a JCS library. The reference implementation in `packages/mda/` uses `@truestamp/canonify`.

### §08-3.3 Step 3 — Concatenate body bytes

Take the Markdown body as it appears after the closing `---` line of the frontmatter, normalized as follows:

1. Line endings: convert all `\r\n` to `\n` (LF).
2. Trailing whitespace: strip trailing spaces and tabs from each line.
3. Final newline: ensure exactly one terminating `\n`. If the body is empty, the body bytes are the empty string.

The frontmatter prefix (the literal bytes `---\n`), the JCS-canonicalized frontmatter object as a single JSON document followed by `\n`, and a separator line `---\n`, then the normalized body bytes, are concatenated in order to form the **canonical artifact bytes**.

Concretely:

```
canonical = b"---\n" + jcs(frontmatter) + b"\n---\n" + normalized_body
```

### §08-3.4 Step 4 — Multi-file artifacts

When the target is a multi-file artifact (currently only `MCP-SERVER.md`, see §06-targets/mcp-server-md §06-2.3), the canonical bytes are the concatenation of each file's canonical bytes in a fixed order, with each file separated by the literal byte sequence `b"\n--MDA-FILE-BOUNDARY--\n"`. The order is defined by the target spec section.

For `MCP-SERVER.md`, the order is:

1. `MCP-SERVER.md` (canonicalized per §08-3.1–§08-3.3)
2. `mcp-server.json` (canonicalized via JCS as a single JSON document, no body suffix)

### §08-3.5 Step 5 — Hash

Compute the digest using the algorithm declared in `integrity.algorithm` over the canonical bytes from §08-3.3 (single-file) or §08-3.4 (multi-file). Encode the result as lowercase hex and emit the field as `"<algorithm>:<hex>"` (e.g. `"sha256:a4f9c0…"`).

## §08-4 Verification (normative)

A verifier presented with an artifact that declares `integrity`:

1. MUST re-derive the canonical bytes per §08-3 (steps 1–4).
2. MUST compute the digest using the declared `algorithm`.
3. MUST compare the result to `integrity.digest` byte-for-byte.
4. MUST refuse the artifact (treat it as untrusted) on mismatch.

A verifier presented with an artifact that does NOT declare `integrity` MUST treat the artifact as unsigned and unanchored: any `signatures[]` present is invalid (§09 requires `integrity` when `signatures[]` is present), and the artifact is acceptable only if the operator's policy admits unsigned content.

## §08-5 When to compute integrity (informative)

- **Compiled mode**: the compiler emits `integrity` when the source declares an `integrity:` placeholder, when the compiler is invoked with `--integrity`, or when any `signatures[]` entry is being emitted.
- **Human mode**: an author SHOULD compute the digest with `sha256sum` or equivalent over the canonical bytes (the reference CLI exposes `mda canonicalize` to print them) and paste the result into the field.
- **Agent mode**: an authoring agent SHOULD use the same `mda canonicalize` step (or a JCS library directly) rather than guessing. Hashing without canonicalization will produce a digest that no verifier can reproduce.
- **Source-mode `.mda`**: `integrity` and `signatures[]` MAY appear in a `.mda` source. When they do, the digest is computed over the `.mda` bytes per §08-3 (single-file path); it anchors the source as authorial evidence. A source-mode digest is NOT comparable to the digest of any compiled `.md` output: compilation rewrites field placement (e.g. lifts MDA-extended fields under `metadata.mda.*`) and re-canonicalizes, producing different bytes. Verifiers MUST treat source-mode and output-mode anchors as independent.

## §08-6 Examples

```yaml
---
name: pdf-tools
description: Extract PDF text, fill forms, merge files. Use when handling PDFs.
integrity:
  algorithm: sha256
  digest: "sha256:a4f9c0d2e8b3a16e9c01b8f3d2a5c7b14e9f8a3d6c2b1e7f0a8d4c3b9e2f1a05"
metadata:
  mda:
    version: "1.2.0"
---
# PDF Tools
…
```

The fixtures `conformance/valid/05-integrity-sha256.mda` and `conformance/invalid/18-integrity-bad-digest-length.mda` exercise the field-shape acceptance and length-mismatch rejection paths. The signature/integrity equality rule (§09-2) is exercised by `conformance/invalid/19-signature-digest-mismatch.mda`.

## §08-7 Rationale

- **Why JCS rather than YAML-as-bytes?** Because YAML serializers disagree on key order, quoting, and number formatting. Canonicalizing through JSON via JCS removes every degree of freedom and is supported by RFC-grade libraries in every language MDA targets. The cost is one extra serializer dependency.
- **Why strip the `integrity` field before hashing?** Because including it would create a chicken-and-egg problem: the digest depends on its own value. Stripping it is the simplest fixed point.
- **Why include the body in the digest?** Because the body is the bulk of the artifact's semantic content; signing only the frontmatter would let an attacker rewrite the instructions without changing the trust signal. The cost is that any whitespace touch-up to the body invalidates the signature, which is a feature, not a bug.
- **Why the multi-file boundary literal?** A length-prefixed framing would be more robust but harder to author by hand. The literal sentinel matches Markdown intuition and is short enough to memorize. The boundary collision risk is negligible in practice; conformance tests check for it.
- **Why no SHA-3 or BLAKE3?** YAGNI for v1.0. Adding an algorithm later is a non-breaking patch (existing artifacts still verify under their declared algorithm).
