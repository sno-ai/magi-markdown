---
title: "Developer Guide"
description: "Building MDA-aware tools: parsing, validation, integrity, and signatures."
---

# Developer Guide

This guide is for developers building MDA-aware tools — validators, loaders, harnesses, graph indexers, signing pipelines. It's a practical orientation, not a replacement for the spec.

**Required reading first.**

- [§02 Frontmatter](https://github.com/sno-ai/mda/blob/main/spec/v1.0/02-frontmatter.md) — open-standard floor + MDA-extended fields under `metadata.mda.*`. The §02-1.1 frontmatter-extraction algorithm is normative.
- [§07 Conformance](https://github.com/sno-ai/mda/blob/main/spec/v1.0/07-conformance.md) — Levels V (validator) and C (compiler). Cross-field check: `signatures[].payload-digest == integrity.digest`.
- [§08 Integrity](https://github.com/sno-ai/mda/blob/main/spec/v1.0/08-integrity.md) — JCS canonicalization, multi-file boundary literal, self-describing `<algorithm>:<hex>` digest format.
- [§09 Signatures](https://github.com/sno-ai/mda/blob/main/spec/v1.0/09-signatures.md) — DSSE PAE envelope, Sigstore default, `did:web` air-gap fallback. Rekor entry type pinned to `dsse-v0.0.1`.
- [§11 Implementer's Guide](https://github.com/sno-ai/mda/blob/main/spec/v1.0/11-implementer-guide.md) — informative loader pseudocode and error-vocabulary.
- [§12 Sigstore tooling](https://github.com/sno-ai/mda/blob/main/spec/v1.0/12-sigstore-tooling.md) — informative mapping from `sigstore-python` / `sigstore-go` to MDA `signatures[]`.

The reference implementation lives in [`apps/cli/`](https://github.com/sno-ai/mda/tree/main/apps/cli) (TypeScript, npm `@markdown-ai/cli`). Architecture and module layout are documented in [`apps/cli/IMPL-SPEC.md`](https://github.com/sno-ai/mda/blob/main/apps/cli/IMPL-SPEC.md).

## Pipeline at a glance

A consumer or validator runs five steps on every artifact:

1. **Frontmatter extraction.** Per §02-1.1: strip optional UTF-8 BOM, normalize CRLF→LF, find the opening `---`, find the closing `---` on its own line (not as a horizontal rule inside the body), parse the YAML 1.2 between them. Empty body and body-only files are explicit cases.
2. **Schema validation.** The target schema is selected by the filename literal — `SKILL.md`, `AGENTS.md`, `MCP-SERVER.md`, or `CLAUDE.md`. JSON Schema 2020-12 with `unevaluatedProperties: false`. Unknown top-level fields fail fast.
3. **Cross-field semantic checks.** The conformance runner enforces `signatures[].payload-digest == integrity.digest` byte-for-byte and the §02-1.1 edge cases.
4. **Integrity rederivation (if signed).** JCS-canonicalize the canonical bytes (with multi-file boundary literal for skills bundling scripts/references/assets), hash, compare to declared `integrity.digest`.
5. **Signature verification (if signed and policy-wired).** Verify the DSSE PAE envelope. For Sigstore signatures: look up Rekor inclusion, verify the Fulcio certificate chain and signature, then apply the operator trust policy. For `did:web`: match the signer domain against policy before fetching `mda-keys.json`, then verify the signature against the listed keys.

## TypeScript: minimal validator

Validator skeleton — extract frontmatter, pick the target schema, validate, perform the cross-field check.

```typescript
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import yaml from "js-yaml";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);

const SCHEMA_BY_FILENAME: Record<string, string> = {
  "SKILL.md": "frontmatter-skill-md.schema.json",
  "AGENTS.md": "frontmatter-agents-md.schema.json",
  "MCP-SERVER.md": "frontmatter-mcp-server-md.schema.json",
  "CLAUDE.md": "frontmatter-claude-md.schema.json",
};

function extractFrontmatter(raw: string): { frontmatter: unknown; body: string } {
  // §02-1.1: strip BOM, normalize CRLF→LF
  const normalized = raw.replace(/^﻿/, "").replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) {
    return { frontmatter: null, body: normalized };
  }
  // Closing fence on its own line, not a horizontal rule mid-body.
  const closingIdx = normalized.indexOf("\n---\n", 4);
  if (closingIdx === -1) {
    throw new Error("unterminated-frontmatter");
  }
  const yamlSrc = normalized.slice(4, closingIdx);
  const body = normalized.slice(closingIdx + 5);
  return { frontmatter: yaml.load(yamlSrc, { schema: yaml.JSON_SCHEMA }), body };
}

function validateArtifact(path: string, schemas: Record<string, object>) {
  const filename = basename(path);
  const schemaPath = SCHEMA_BY_FILENAME[filename];
  if (!schemaPath) {
    throw new Error(`unknown-target: ${filename}`);
  }
  const raw = readFileSync(path, "utf8");
  const { frontmatter } = extractFrontmatter(raw);

  const validate = ajv.compile(schemas[schemaPath]);
  if (!validate(frontmatter)) {
    return { ok: false, errors: validate.errors };
  }

  // Cross-field check (§07-2.1).
  const fm = frontmatter as { metadata?: { mda?: { integrity?: { digest?: string }; signatures?: Array<{ "payload-digest"?: string }> } } };
  const integrity = fm.metadata?.mda?.integrity?.digest;
  const sigs = fm.metadata?.mda?.signatures ?? [];
  for (const sig of sigs) {
    if (sig["payload-digest"] !== integrity) {
      return { ok: false, errors: [{ keyword: "payload-digest-mismatch" }] };
    }
  }

  return { ok: true };
}
```

## Python: minimal validator

```python
from pathlib import Path
import yaml
import jsonschema

SCHEMA_BY_FILENAME = {
    "SKILL.md": "frontmatter-skill-md.schema.json",
    "AGENTS.md": "frontmatter-agents-md.schema.json",
    "MCP-SERVER.md": "frontmatter-mcp-server-md.schema.json",
    "CLAUDE.md": "frontmatter-claude-md.schema.json",
}

def extract_frontmatter(raw: str) -> tuple[dict | None, str]:
    # §02-1.1: BOM strip, CRLF normalize.
    normalized = raw.lstrip("﻿").replace("\r\n", "\n")
    if not normalized.startswith("---\n"):
        return None, normalized
    closing = normalized.find("\n---\n", 4)
    if closing == -1:
        raise ValueError("unterminated-frontmatter")
    yaml_src = normalized[4:closing]
    body = normalized[closing + 5:]
    # YAML 1.2 only (§02-1.1): yes/no/on/off must round-trip as strings.
    return yaml.safe_load(yaml_src), body

def validate_artifact(path: Path, schemas: dict[str, dict]) -> dict:
    schema_key = SCHEMA_BY_FILENAME.get(path.name)
    if schema_key is None:
        raise ValueError(f"unknown-target: {path.name}")
    raw = path.read_text(encoding="utf-8")
    frontmatter, _ = extract_frontmatter(raw)

    try:
        jsonschema.validate(frontmatter, schemas[schema_key])
    except jsonschema.ValidationError as exc:
        return {"ok": False, "error": exc.message}

    mda = (frontmatter or {}).get("metadata", {}).get("mda", {})
    integrity = (mda.get("integrity") or {}).get("digest")
    for sig in mda.get("signatures", []):
        if sig.get("payload-digest") != integrity:
            return {"ok": False, "error": "payload-digest-mismatch"}

    return {"ok": True}
```

## Computing integrity

The `integrity.digest` is a hash over the JCS-canonicalized canonical bytes of the artifact. JCS (RFC 8785) is a deterministic JSON serialization that produces byte-identical output for semantically equal JSON. The §08 algorithm:

1. Build the canonical JSON view of the artifact: `{ "frontmatter": <parsed YAML as JSON>, "body": <body string> }`.
2. For multi-file artifacts (skills bundling scripts, references, assets), include each file as `{ "path": <relative path>, "content": <bytes-as-base64> }` entries with the multi-file boundary literal documented in §08-3.
3. JCS-canonicalize the resulting JSON.
4. Hash with the declared algorithm. The digest is `<algorithm>:<hex>`, e.g. `sha256:7f3c8e2b...`.
5. Compare byte-for-byte to the `integrity.digest` declared in frontmatter.

Self-describing format: the same `<algorithm>:<hex>` is used in `signatures[].payload-digest` and `depends-on.digest`.

## Verifying Sigstore signatures

For each entry in `signatures[]` where `signer` starts with `sigstore-oidc:` (§09-4.2):

1. Confirm `payload-digest == integrity.digest`. The conformance runner enforces this; a verifier should rely on it explicitly, not inherit it from upstream validation.
2. Look up the entry in Rekor by `rekor-log-id` and `rekor-log-index`. Verify inclusion against the log root.
3. Verify the Fulcio certificate chain to the Sigstore root of trust.
4. Verify the DSSE PAE envelope signature with the leaf certificate public key.
5. Apply the operator trust policy to the issuer and subject.

`@markdown-ai/cli` and the verifier helpers in `apps/cli/` glue a JCS helper and DSSE-capable signing/verification helpers. For the create-sign-verify guide with standard hashing and DSSE-capable signing tools, see [`docs/create-sign-verify-mda.md`](https://github.com/sno-ai/mda/blob/main/docs/create-sign-verify-mda.md).

## Conformance suite

The fixtures at [`conformance/manifest.yaml`](https://github.com/sno-ai/mda/blob/main/conformance/manifest.yaml) bind spec rules to positive and negative fixtures. Run them locally:

```bash
node scripts/validate-conformance.mjs
```

When you build a new validator or compiler, run it against the fixtures. A green pass on the conformance suite is the prerequisite for claiming v1.0 conformance.

## Vendor namespaces

Per-vendor configuration goes under `metadata.<vendor>.*`. Loaders read only their own namespace. Consumers MUST NOT reject a document solely because it carries an unregistered kebab-case namespace (§04-5.1). The registry of assigned namespaces, standard `requires` keys, reserved Sigstore OIDC issuers, and reserved DSSE `payload-type` values lives at [`REGISTRY.md`](https://github.com/sno-ai/mda/blob/main/REGISTRY.md).

## What v1.0 doesn't ship

The contract is locked. The consumer-side ecosystem that enforces or routes through it is mostly nascent — no bundled verifier, no shipped resolver, no graph indexer, no shipped harness routing through `metadata.mda.requires`. For the truthful gap, see [What v1.0 doesn't ship](https://github.com/sno-ai/mda/blob/main/ai-doc/what-v1.0-does-not-ship.md). The contract that lets those consumer-side pieces be built without further negotiation is what v1.0 freezes.

## Next

- [Specification](/mdx/specification) — entry point with every §.
- [Create, sign, and verify MDA](https://github.com/sno-ai/mda/blob/main/docs/create-sign-verify-mda.md) — hand-author and sign without the reference CLI.
- [Reference implementation](https://github.com/sno-ai/mda/tree/main/apps/cli) — TypeScript CLI source.
- [IMPL-SPEC](https://github.com/sno-ai/mda/blob/main/apps/cli/IMPL-SPEC.md) — reference-implementation architecture.
