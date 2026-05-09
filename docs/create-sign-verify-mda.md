# Create, Sign, and Verify MDA

> **Audience:** People and coding agents that need to ship an MDA artifact
> without learning every corner of the spec first.
>
> **Normative references:** authoring modes in
> [`§00-6`](../spec/v1.0/00-overview.md), integrity in
> [`§08`](../spec/v1.0/08-integrity.md), signatures in
> [`§09`](../spec/v1.0/09-signatures.md), Sigstore tooling in
> [`§12`](../spec/v1.0/12-sigstore-tooling.md), and production verification in
> [`§13`](../spec/v1.0/13-trusted-runtime.md).

This is the practical path:

1. Write the MDA file.
2. Add an `integrity` digest.
3. Sign that digest with Sigstore DSSE, or use `did:web` when Sigstore is not
   available.
4. Put the identities you trust in `mda-trust-policy.json`.
5. At runtime, verify with `--profile trusted-runtime` before loading the file.

The point is simple: a runtime should not load configuration just because a file
exists. It should load the file only after the bytes match the digest and the
digest was signed by an identity you chose to trust.

## 1. Write the MDA file

Pick the target you are producing:

| Target | Filename | Use it for |
| ------ | -------- | ---------- |
| Skill | `<name>/SKILL.md` | A portable skill for agent runtimes. |
| Agent instructions | `AGENTS.md` | Repo-wide instructions for coding agents. |
| MCP server | `<name>/MCP-SERVER.md` plus `<name>/mcp-server.json` | Tool server documentation and launch metadata. |
| Claude project memory | `CLAUDE.md` | Claude Code project memory. |

`SKILL.md` and `MCP-SERVER.md` need frontmatter:

```yaml
---
name: pdf-tools
description: Extract PDF text, fill forms, and merge files. Use when handling PDFs.
metadata:
  mda:
    title: PDF Tools
    version: "1.2.0"
    tags: [pdf, extraction]
---
```

`AGENTS.md` may be plain Markdown with no frontmatter:

```md
# Agent Instructions

Run `pnpm test` before pushing. Keep generated files out of commits.
```

Put MDA fields such as `title`, `version`, `tags`, `requires`, and
`depends-on` under `metadata.mda`. Put runtime-specific fields under that
runtime's namespace:

```yaml
metadata:
  mda:
    version: "1.2.0"
  claude-code:
    allowed-tools: "Read Bash(pdftotext:*)"
  codex:
    display_name: "PDF Tools"
```

Always quote dates and versions. Some YAML parsers turn unquoted dates into
native date objects, and the schemas expect strings.

## 2. Add integrity

`integrity` is the content hash. It lets a verifier answer: "Are these still the
same bytes the author meant to ship?"

```yaml
integrity:
  algorithm: sha256
  digest: "sha256:<64 lowercase hex chars>"
```

To compute the digest, use the canonical bytes defined in §08:

1. Temporarily remove top-level `integrity` and `signatures` from the
   frontmatter.
2. Convert the remaining frontmatter to JSON.
3. Canonicalize that JSON with JCS (RFC 8785).
4. Normalize the Markdown body to LF line endings and one final newline.
5. Hash the exact canonical byte sequence with SHA-256.
6. Put the prefixed digest back into `integrity.digest`.

If a tool provides `mda canonicalize`, use that instead of doing the steps by
hand.

For `MCP-SERVER.md`, the digest covers both the Markdown file and the
`mcp-server.json` sidecar. See §08-3.4.

## 3. Sign the digest

Signing answers: "Who approved this digest?"

The recommended public-internet path is Sigstore DSSE. Use a library or tool
that creates a Rekor `dsse-v0.0.1` entry for the DSSE payload described in
§09-3.1 and §12.

Do not use `cosign sign-blob` or `cosign attest-blob` for MDA signatures.
Today those commands create Rekor entry types that MDA verifiers must reject.
They can be useful for other workflows, but not for an MDA `signatures[]` entry.

The signed payload is the canonical JSON form of the `integrity` object:

```json
{"algorithm":"sha256","digest":"sha256:<64 lowercase hex chars>"}
```

After signing, add a `signatures[]` entry:

```yaml
signatures:
  - signer: "sigstore-oidc:https://token.actions.githubusercontent.com"
    key-id: "fulcio:<sha256-of-certificate>"
    payload-digest: "sha256:<same digest as integrity.digest>"
    algorithm: ecdsa-p256
    signature: "<base64 signature>"
    rekor-log-id: "<rekor log id>"
    rekor-log-index: 123456
```

The important rules:

- `payload-digest` must equal `integrity.digest` byte-for-byte.
- Sigstore signatures must include Rekor coordinates.
- Verifiers must reject Sigstore records that are not Rekor `dsse-v0.0.1`.

## 4. Choose who production trusts

Create a `mda-trust-policy.json` next to the runtime that loads the MDA file.
This file says which identities are allowed to ship configuration.

For a GitHub Actions release:

```json
{
  "version": 1,
  "minSignatures": 1,
  "trustedSigners": [
    {
      "type": "sigstore-oidc",
      "issuer": "https://token.actions.githubusercontent.com",
      "subject": "repo:sno-ai/llmix:ref:refs/tags/v2.0.0"
    }
  ],
  "rekor": {
    "url": "https://rekor.sigstore.dev",
    "required": true
  }
}
```

For a human maintainer signing with a Google account:

```json
{
  "version": 1,
  "minSignatures": 1,
  "trustedSigners": [
    {
      "type": "sigstore-oidc",
      "issuer": "https://accounts.google.com",
      "subject": "maintainer@example.com"
    }
  ],
  "rekor": {
    "url": "https://rekor.sigstore.dev",
    "required": true
  }
}
```

Do not trust a Sigstore issuer by itself. For example, GitHub Actions signs for
many repositories. A production policy must match both the issuer and the
subject.

## 5. Verify before loading

Production runtimes should use the trusted runtime profile:

```sh
mda verify --profile trusted-runtime \
  --policy mda-trust-policy.json \
  path/to/config.mda
```

That profile means:

- `integrity` is required;
- at least one signature is required;
- the content digest must be recomputed and match;
- signatures are checked only after the digest matches;
- at least one verified signature must match the trust policy;
- if verification fails, the runtime must not load the new file.

For long-running services, keep the previous verified config active when a
refresh fails. On first startup, if there is no verified config, fail closed.

## 6. Use `did:web` only when needed

If Sigstore is unavailable, publish a key file at:

```text
https://<your-domain>/.well-known/mda-keys.json
```

Then sign with the matching private key and emit:

```yaml
signatures:
  - signer: "did-web:tools.example.com"
    key-id: "<key fingerprint from mda-keys.json>"
    payload-digest: "sha256:<same digest as integrity.digest>"
    algorithm: ed25519
    signature: "<base64 signature>"
```

`did:web` does not use Rekor. Do not add `rekor-log-id` or `rekor-log-index` to
a `did:web` signature.

A `did:web` trust policy looks like this:

```json
{
  "version": 1,
  "minSignatures": 1,
  "trustedSigners": [
    {
      "type": "did-web",
      "domain": "tools.example.com"
    }
  ],
  "rekor": {
    "required": false
  }
}
```

## 7. Common mistakes

- Signing without `integrity`. MDA signatures sign the declared digest, so
  `integrity` must exist first.
- Hashing raw YAML. Hash the canonical bytes from §08, not whatever happens to
  be in your editor.
- Using `cosign sign-blob`. It does not produce the Rekor entry type MDA
  expects.
- Trusting only `https://token.actions.githubusercontent.com`. That trusts every
  GitHub Actions subject, not your repo.
- Adding Rekor fields to `did:web`. Rekor belongs to Sigstore signatures.
- Using `+jcs+json` in a DSSE payload type. MDA vendor payload types use
  `application/vnd.<vendor>.<doc-type>+json`; the JCS rule lives in the spec.

## 8. Agent prompt

When asking a coding agent to create or update an MDA file, give it this:

```text
Create or update this MDA artifact.

Follow docs/create-sign-verify-mda.md.
Use metadata.mda for MDA fields.
Quote versions and timestamps.
If adding signatures, first add integrity, then sign the integrity object.
For Sigstore, use a DSSE/Rekor dsse-v0.0.1 signing path. Do not use cosign
sign-blob or cosign attest-blob.
For production verification, include a mda-trust-policy.json example that
matches both Sigstore issuer and subject.
```
