# Manual workflow

> **Audience:** Authors who want to produce conformant MDA output **without** the `@mda/cli` reference implementation. This document covers two of the three authoring modes from [`spec/v1.0/00-overview.md §0.6`](../spec/v1.0/00-overview.md): **Human mode** (you, with a text editor) and **Agent mode** (an AI agent, with this document loaded into its context).
>
> **Compiled mode** (writing `.mda` and running the compiler) is documented in [`packages/mda/IMPL-SPEC.md`](../packages/mda/IMPL-SPEC.md).

This document is the bootstrap path for a v1.0 ecosystem in which most authors do NOT have the reference compiler installed, and many authors are LLMs working from prompts. It is intentionally self-contained: every step here uses standard Unix tools (`sha256sum`, `cosign`) plus a JSON Canonicalization Scheme (JCS) helper.

---

## 1. Choose your target

You are writing **one of**:

| Target | Filename | When |
| ------ | -------- | ---- |
| SKILL.md | `<name>/SKILL.md` (+ `scripts/`, `references/`, `assets/` as needed) | You are publishing a skill that consumers (Claude Code, Codex, OpenCode, Hermes, Cursor, Windsurf, …) will activate on demand. |
| AGENTS.md | `AGENTS.md` at the repo root | You are giving repo-wide instructions to every agent that visits the repository (Codex CLI, Copilot, Cursor, Windsurf, Amp, Devin, Gemini CLI, VS Code, Jules, Factory). |
| MCP-SERVER.md | `<name>/MCP-SERVER.md` + `<name>/mcp-server.json` | You are describing an MCP server: what tools it exposes, how to launch it, what trust posture it ships with. |
| CLAUDE.md | `CLAUDE.md` | You are populating Claude Code's persistent project-memory file. v1.0 stub only; no schema enforcement. |

Pick exactly one per file. The schema you target is determined by the filename, not by the content.

---

## 2. Write the frontmatter

Open with `---` on the first line, then your YAML, then `---` on its own line.

### 2.1 Required fields (SKILL.md and MCP-SERVER.md)

```yaml
---
name: pdf-tools                                # kebab-case, 1-64 chars
description: Extract PDF text, fill forms, merge files. Use when handling PDFs.   # 1-1024 chars
---
```

### 2.2 AGENTS.md may omit frontmatter entirely

```markdown
# Agent instructions

Use 2-space indentation. Run `pnpm test` before pushing.
```

That is a complete, conformant AGENTS.md.

### 2.3 MDA-extended fields go under `metadata.mda`

In any compiled output (any `.md` file), the following fields MUST nest under `metadata.mda.*` — never at the top level:

`doc-id`, `title`, `version`, `requires`, `depends-on`, `tags`, `author`, `relationships`, `created-date`, `updated-date`.

Example:

```yaml
---
name: pdf-tools
description: Extract PDF text, fill forms, merge files. Use when handling PDFs.
metadata:
  mda:
    doc-id: 38f5a922-81b2-4f1a-8d8c-3a5be4ea7511
    title: PDF Tools
    version: "1.2.0"                           # quoted!
    tags: [pdf, extraction]
    requires:
      runtime: ["python>=3.11"]
      tools: ["Read", "Bash(pdftotext:*)"]
      network: none
    created-date: "2026-01-15T00:00:00Z"       # quoted!
---
```

### 2.4 Per-vendor fields go under `metadata.<vendor>`

```yaml
metadata:
  mda: { ... }
  claude-code:
    allowed-tools: "Read Bash(pdftotext:*) Bash(jq:*)"
  codex:
    display_name: "PDF Tools"
    allow_implicit_invocation: true
```

The MDA spec does not interpret per-vendor namespaces. Whatever the vendor's loader expects, you write here.

### 2.5 Quote your dates and your version

YAML 1.1 parsers will silently coerce `created-date: 2026-05-07T00:00:00Z` into a native datetime. The schema requires a string. Always quote:

```yaml
created-date: "2026-05-07T00:00:00Z"
version: "1.2.0"
```

---

## 3. Write the body

Standard Markdown. The body has no frontmatter.

- For SKILL.md: keep it focused. Heavy reference material belongs in `references/`. Executable code belongs in `scripts/`. Templates and fixtures belong in `assets/`.
- For AGENTS.md: cover coding conventions, build/test instructions, and operational notes.
- For MCP-SERVER.md: describe each tool and resource the server exposes, the input/output shape, side effects, and required environment variables.

### 3.1 Relationship footnotes

When you want to declare a typed link to another document, use a standard Markdown footnote whose payload is a JSON object:

```markdown
This skill builds on the parent doc[^p].

[^p]: {"rel-type": "parent", "doc-id": "11111111-1111-1111-1111-111111111111", "rel-desc": "Conceptual parent"}
```

Valid `rel-type` values: `parent`, `child`, `related`, `cites`, `supports`, `contradicts`, `extends`.

When you use one or more relationship footnotes, you MUST also mirror them under `metadata.mda.relationships` in the frontmatter:

```yaml
metadata:
  mda:
    relationships:
      - rel-type: parent
        doc-id: 11111111-1111-1111-1111-111111111111
        rel-desc: Conceptual parent
```

The order of mirror entries MUST match the order in which the footnote references first appear in the body.

---

## 4. (Optional) Add `integrity`

When you want a content hash anchor for tamper detection — and always when you intend to sign the file — compute a SHA-256 digest over the canonical bytes per [`spec/v1.0/08-integrity.md`](../spec/v1.0/08-integrity.md) and add:

```yaml
integrity:
  algorithm: sha256
  digest: "sha256:<64 lowercase hex chars>"
```

The `digest` value carries an `<algorithm>:` prefix that MUST match the `algorithm` field. This is the same shape used by `metadata.mda.depends-on[].digest` so consumers can compare them byte-for-byte.

### 4.1 Compute the canonical bytes by hand

The reference CLI exposes `mda canonicalize` for this. Without the CLI:

1. Strip `integrity` and `signatures` from the frontmatter (set them aside).
2. Convert the (stripped) frontmatter to JSON and run it through a JCS (RFC 8785) library:
   - JS: `@truestamp/canonify`
   - Python: `jcs` (PyPI)
   - Go: `gowebpki/jcs`
3. Normalize the body: convert `\r\n` to `\n`, strip trailing whitespace per line, ensure exactly one final `\n`.
4. Concatenate: `b"---\n" + JCS_OUT + b"\n---\n" + NORMALIZED_BODY`.
5. Hash with `sha256sum` (or your language's stdlib).

### 4.2 Multi-file artifacts (MCP-SERVER.md)

When the target is `MCP-SERVER.md`, the integrity digest covers BOTH the Markdown file AND the `mcp-server.json` sidecar, in that order, separated by `b"\n--MDA-FILE-BOUNDARY--\n"`. See [`spec/v1.0/08-integrity.md §08-3.4`](../spec/v1.0/08-integrity.md).

---

## 5. (Optional) Sign

The default signing path is **Sigstore OIDC keyless** via `cosign`. It does not require you to manage a long-lived signing key.

### 5.1 Construct the DSSE PAE envelope

```
PAE = "DSSEv1" + " " + len(payload-type) + " " + payload-type
              + " " + len(payload-bytes) + " " + payload-bytes
```

For MDA:
- `payload-type` = `application/vnd.mda.integrity+json`
- `payload-bytes` = JCS-canonicalized `{"algorithm":"sha256","digest":"sha256:<your-hex>"}` — the `digest` value MUST be the prefixed form, byte-for-byte identical to what you put under top-level `integrity.digest`.

### 5.2 Sign with cosign

```sh
echo -n "$PAE_BYTES" | cosign sign-blob - --output-signature sig.b64 --output-certificate cert.pem
```

Cosign opens an OIDC browser flow, mints a short-lived Fulcio cert, and submits the entry to Rekor.

### 5.3 Add the signature to your frontmatter

```yaml
signatures:
  - signer: "sigstore-oidc:<oidc-issuer-from-fulcio-cert>"
    key-id: "fulcio:<sha256-of-cert.pem>"
    payload-digest: "<same as integrity.digest>"
    algorithm: ecdsa-p256
    signature: "<contents of sig.b64>"
    rekor-log-id: "<from cosign output>"
    rekor-log-index: <from cosign output>
```

### 5.4 Air-gap alternative: did:web

If you cannot reach Sigstore, host a `mda-keys.json` document at `https://<your-domain>/.well-known/mda-keys.json` (schema: `schemas/_defs/mda-keys.schema.json`), sign the PAE bytes with the corresponding private key, and emit:

```yaml
signatures:
  - signer: "did-web:<your-domain>"
    key-id: "<fingerprint matching a key in mda-keys.json>"
    payload-digest: "<same as integrity.digest>"
    algorithm: ed25519
    signature: "<base64>"
```

`did:web` does NOT provide transparency-log inclusion guarantees. Use it only when Sigstore is unavailable.

---

## 6. Validate

You have three options, in increasing order of strictness.

### 6.1 Eyeball it

If your file matches the examples in this document and the targeted spec section, you are probably fine.

### 6.2 Run a JSON-Schema validator against the frontmatter

Extract the frontmatter, convert to JSON, validate against:
- `schemas/frontmatter-skill-md.schema.json` (for SKILL.md)
- `schemas/frontmatter-agents-md.schema.json` (for AGENTS.md)
- `schemas/frontmatter-mcp-server-md.schema.json` (for MCP-SERVER.md)

Any standard JSON Schema 2020-12 validator works (Ajv, jsonschema-py, gojsonschema, …).

### 6.3 Run the conformance suite

```sh
node scripts/validate-conformance.mjs
```

This is what CI runs against the in-tree fixtures. To validate YOUR file, point a JSON Schema 2020-12 validator at it as in §6.2 above; the runner does not accept arbitrary user files.

---

## 7. Common mistakes

- **Bare timestamps.** `created-date: 2026-05-07T00:00:00Z` (no quotes) gets coerced to a native date and breaks validation. Always quote.
- **Top-level MDA-extended fields.** `doc-id` and friends MUST nest under `metadata.mda.*` in compiled outputs. The strict schema rejects top-level placement.
- **`allowed-tools` at the top of AGENTS.md.** AGENTS.md does not define this field at the top level; place it under the relevant vendor namespace (e.g. `metadata.claude-code.allowed-tools`).
- **Footnotes without mirror.** If you use relationship footnotes in the body, the `metadata.mda.relationships` mirror is REQUIRED. The mirror order MUST match the footnote-reference order.
- **`signatures[]` without `integrity`.** The schema rejects this combination. Compute and include `integrity` whenever you sign.
- **Hashing without canonicalization.** A digest computed over raw YAML bytes will not match what verifiers reproduce. Always canonicalize via JCS first.
- **Compound version-range.** `>=1.2.0 <2.0.0` is NOT in the v1.0 admitted subset. Use `1.2.0` (exact) or `^1.2.0` (caret) only.

---

## 8. Agent-mode authoring (P0)

This section is a prompt template intended for an LLM that has been asked to produce a conformant MDA file. The agent SHOULD have THIS document and the relevant target spec section in its context.

> You are about to write an MDA `<TARGET>.md` file for the `<NAME>` artifact.
>
> 1. Decide which fields are required and which are optional for this target (see §2 above).
> 2. Place every MDA-extended field under `metadata.mda.*`. Place every per-vendor field under `metadata.<vendor>.*`.
> 3. Quote every date and the `version` field as YAML strings.
> 4. If you are writing relationship footnotes in the body, also write the `metadata.mda.relationships` mirror in the same order.
> 5. If the user asked for `integrity`, either (a) compute the canonical digest yourself per §4.1 above and emit the final `<algorithm>:<hex>` value, or (b) emit the file WITHOUT an `integrity` field and tell the human "I cannot compute the canonical digest from this turn; run `mda canonicalize | sha256sum` (or follow §4.1) and paste the result back." Never emit a placeholder digest — schema-valid placeholders falsely advertise tamper protection.
> 6. If the user asked for `signatures`, instruct the human to follow §5 above; do NOT fabricate signatures.
> 7. After writing, mentally validate against the target schema bullet-points in §6.2 and report any field you are unsure about.

Do not invent fields. The strict schemas reject unknown top-level fields.
