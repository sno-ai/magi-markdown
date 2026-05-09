# §09 — Signatures

> **Status:** Stable
> **Schema:** [`schemas/_defs/signature.schema.json`](../../schemas/_defs/signature.schema.json)
> **Depends on:** §00, §02, §08
> **Registry:** Reserved Sigstore OIDC issuers and transparency log providers in [`REGISTRY.md`](../../REGISTRY.md)

## §09-1 Synopsis

The optional top-level `signatures[]` field in MDA frontmatter (§02-2.8) carries one or more publisher attestations binding an identity to the artifact's `integrity.digest` (§08). MDA's default signing path is **Sigstore OIDC keyless**: short-lived certificates issued by Fulcio, verified through Rekor's transparency log. An air-gap alternative is offered for environments that cannot reach Sigstore.

This chapter specifies (1) the field's schema, (2) the signing envelope (DSSE PAE), (3) the default Sigstore flow, (4) the air-gap alternative (`mda-keys.json` over `did:web`), and (5) the verification procedure.

## §09-2 Field shape (normative)

```yaml
signatures:
  - signer: "<method>:<identity>"
    key-id: "<method-specific-key-or-cert-handle>"
    payload-digest: "<algorithm>:<lowercase-hex>"
    algorithm: ed25519        # or ecdsa-p256, rsa-pss-sha256
    signature: "<base64>"
    rekor-log-id: "<optional, sigstore-only>"
    rekor-log-index: 9876543  # optional, sigstore-only
    payload-type: "application/vnd.mda.integrity+json"  # optional; vendor types per §09-3.1
```

| Field | Type | Required | Notes |
| ----- | ---- | -------- | ----- |
| `signer` | string | yes | `<method>:<identity>`. `method` is one of `sigstore-oidc`, `did-web`. |
| `key-id` | string | yes | Method-specific handle: Fulcio cert SHA-256 (Sigstore) or key fingerprint (did:web). |
| `payload-digest` | string | yes | MUST equal `integrity.digest` (§08), including the `<algorithm>:` prefix. Validators check byte-for-byte equality. |
| `algorithm` | string | yes | One of `ed25519`, `ecdsa-p256`, `rsa-pss-sha256`. |
| `signature` | string | yes | Base64 (standard, RFC 4648 §4) of the raw signature bytes over the DSSE PAE envelope. |
| `rekor-log-id` | string | no | Rekor transparency log identifier; required when `signer` starts with `sigstore-oidc:`. |
| `rekor-log-index` | integer | no | Rekor entry index; required when `signer` starts with `sigstore-oidc:`. |
| `payload-type` | string | no | DSSE `payloadType` declaring the semantic type of the signed payload (§09-3.1). When absent, MDA validators MUST treat the value as `application/vnd.mda.integrity+json`. Vendor-defined types follow RFC 6838 vendor tree: `application/vnd.<vendor>.<doc-type>+json`. Reserved entries listed in `REGISTRY.md`. |

Schema: `_defs/signature.schema.json`. Unknown subfields are rejected.

When `signatures[]` is present, the artifact MUST also declare `integrity` (§08), and every signature's `payload-digest` MUST equal `integrity.digest`. A validator MUST reject any artifact that violates this invariant.

## §09-3 Signing envelope — DSSE PAE

Signatures are computed over a DSSE Pre-Authentication Encoding (PAE) envelope, not directly over the artifact bytes. This prevents cross-protocol attacks and binds the signature to its semantic context.

### §09-3.1 PAE construction (normative)

```
PAE = "DSSEv1"
    + " " + len(payload-type)  + " " + payload-type
    + " " + len(payload-bytes) + " " + payload-bytes
```

For MDA, the default `payload-type` is `application/vnd.mda.integrity+json` and the `payload-bytes` are the JCS-canonicalized JSON of the form `{"algorithm":"<algo>","digest":"<algo>:<hex>"}` matching the top-level `integrity` exactly (the `digest` value carries the algorithm prefix per §08-2).

The bytes signed are the PAE bytes computed above. When `signatures[i].payload-type` (§09-2) is absent, producers and verifiers MUST use the default `application/vnd.mda.integrity+json` for the PAE `payload-type` slot.

**Vendor-defined payload types.** Applications that build on MDA's frontmatter conventions for their own canonical document types (e.g. a runtime LLM-config preset format, a workflow definition, an evaluation harness manifest) SHOULD declare `payload-type` (the optional `signatures[i].payload-type` field in §09-2) in the form `application/vnd.<vendor>.<doc-type>+json` per [RFC 6838 §3.2](https://www.rfc-editor.org/rfc/rfc6838#section-3.2) (vendor tree). The structured suffix is `+json` — note that `+jcs+json` is sometimes seen in informal documentation but `+jcs` is **not** an [IANA-registered structured suffix](https://www.iana.org/assignments/media-type-structured-suffix/media-type-structured-suffix.xhtml), so MDA does not use it. The JCS-canonicalization contract for each registered payload-type is defined in spec prose (this section for the MDA default; the vendor's own documentation for vendor types) rather than carried in the media-type identifier itself. Reserved payload types are listed in `REGISTRY.md` under "Reserved DSSE payload types"; vendors SHOULD register their payload type when registering their namespace under §04. A signature with a vendor-defined `payload-type` MUST still satisfy `payload-digest == integrity.digest` (§09-2); the vendor type declares the semantic context of the artifact, not a different digest target. Producers and verifiers MUST use the declared `payload-type` value verbatim in the PAE `payload-type` slot when computing or checking the envelope.

### §09-3.2 Why PAE rather than signing `integrity.digest` directly

PAE binds the digest to its declared payload type. Without PAE, an attacker who obtains a signature in one context (e.g. an SBOM tool that signs the same SHA-256 hex string) could replay it as an MDA signature. PAE makes the signed bytes carry "this is an MDA integrity assertion" explicitly.

## §09-4 Sigstore OIDC keyless flow (default)

This is the default path for both compiled and Human/Agent modes when network access is available.

### §09-4.1 Producing a signature

1. Ensure `integrity` has been computed per §08.
2. Construct the PAE envelope per §09-3.1.
3. Authenticate to Fulcio via OIDC (the user's identity provider; reserved issuers in `REGISTRY.md`).
4. Fulcio issues a short-lived (≤10 min) signing certificate bound to the OIDC identity claim.
5. Sign the PAE bytes with the ephemeral key.
6. Submit the DSSE envelope (PAE bytes + signature + cert) to Rekor as a `dsse-v0.0.1` entry type; record the returned `log-id` and `log-index`. Verifiers refuse non-`dsse-v0.0.1` entry types (§09-4.2 step 3); producers MUST therefore use this entry type, not `hashedrekord-v0.0.1` or `intoto-v0.0.2`.
7. Emit the signature entry with `signer = "sigstore-oidc:<oidc-issuer-url>"`, `key-id = "fulcio:<sha256-of-cert>"`, the rekor coordinates, and the base64 signature.

The ephemeral private key is discarded.

### §09-4.2 Verifying a Sigstore signature

1. Validate `signatures[i].payload-digest == integrity.digest`.
2. Reconstruct the PAE envelope from `integrity` per §09-3.1.
3. Look up the Rekor entry by `rekor-log-id` + `rekor-log-index`. The entry MUST be of type `dsse-v0.0.1`; verifiers MUST refuse other entry types (`hashedrekord-v0.0.1`, `intoto-v0.0.2`, etc.) as out-of-spec for MDA signatures.
4. Verify the inclusion proof against the Rekor log root (cached or freshly fetched per the verifier's policy).
5. Verify the Fulcio certificate chain to the Sigstore root.
6. Verify the signature on the PAE envelope using the certificate's public key.
7. Verify the certificate's OIDC identity claim against the operator's trust policy. A signature that verifies cryptographically but does not match policy is not trusted.

A verification failure at any step means this signature is not trusted. In the
`trusted-runtime` profile, §13 defines the artifact-level decision: only
distinct signatures that both verify and match policy count toward
`minSignatures`.

### §09-4.3 Reserved Sigstore parameters

The reserved set of OIDC issuers and the reserved set of Rekor instances are listed in `REGISTRY.md`. Adding to either set is an editorial change governed by the registry process. Verifiers are not required to trust every reserved issuer or instance; the reserved status only means "MDA recognizes this as a legitimate, on-topic Sigstore deployment."

## §09-5 Air-gap alternative — `did:web` + `mda-keys.json`

When Sigstore is unreachable (air-gapped CI, regulated environment, or when an operator's policy requires self-controlled keys), MDA admits a simplified non-keyless path.

### §09-5.1 Producing a `did:web` signature

1. The publisher hosts a JSON document at `https://<domain>/.well-known/mda-keys.json`. Schema: `schemas/_defs/mda-keys.schema.json` (`{ "keys": [{ "key-id": "<fingerprint>", "algorithm": "ed25519", "public-key": "<base64-or-PEM>" }] }`).
2. Compute the PAE envelope per §09-3.1.
3. Sign with the corresponding private key.
4. Emit the signature entry with `signer = "did-web:<domain>"`, `key-id = "<fingerprint>"`, no rekor fields.

### §09-5.2 Verifying a `did:web` signature

1. Validate `payload-digest == integrity.digest`.
2. Parse `<domain-from-signer>` from `signer`. If an operator trust policy is active, the domain MUST match that policy before the verifier performs any network fetch.
3. Fetch `https://<domain-from-signer>/.well-known/mda-keys.json` over HTTPS.
4. Look up the key by `key-id` in the document.
5. Verify the signature on the PAE envelope using that public key.

`did:web` provides identity-of-domain at the time of fetch. It does NOT provide transparency-log inclusion guarantees, so it MUST NOT be used where third-party tampering of past attestations is part of the threat model. Operators who need transparency MUST use the Sigstore path (or run their own air-gapped Rekor instance, which is out of scope for v1.0).

Implementations may use an injected `did:web` verifier instead of performing
the HTTPS fetch themselves. If a verifier exposes the `trusted-runtime` profile
but cannot verify `did:web`, it MUST reject matching policies or artifacts
fail-closed; it must not describe `did:web` as outside the v1.0 format.

## §09-6 Multiple signatures

The `signatures[]` array MAY contain entries from different signers (e.g. an author signature plus a reviewer signature plus a CI signature). All entries MUST share the same `payload-digest`. In the `trusted-runtime` profile (§13), `minSignatures` counts distinct trusted signer identities from the configured policy; duplicate entries for the same identity count once.

Role-specific quorum rules such as "one CI signature and one human reviewer signature" are out of scope for v1.0 unless a future trust-policy version adds them.

The order of entries is not significant.

## §09-7 Verification policy (informative)

This spec defines what a signature *is*, not *which signatures must be trusted*. Operators express trust through policy, typically:

- Allow-list of OIDC issuers and identity claims.
- Allow-list of Rekor instances.
- Allow-list of `did:web` domains.
- Minimum number of distinct trusted signer identities.
- Maximum age of Rekor entries.

The reference CLI in `apps/cli/` ships a default-deny policy with explicit allow-list flags; see `apps/cli/IMPL-SPEC.md`.

## §09-8 Examples

Sigstore-signed artifact:

```yaml
---
name: pdf-tools
description: Extract PDF text, fill forms, merge files. Use when handling PDFs.
integrity:
  algorithm: sha256
  digest: "sha256:a4f9c0d2e8b3a16e9c01b8f3d2a5c7b14e9f8a3d6c2b1e7f0a8d4c3b9e2f1a05"
signatures:
  - signer: "sigstore-oidc:https://accounts.google.com"
    key-id: "fulcio:9c4e7b2f1a05c3b9e2d6c2b1e7f0a8d4c3b9e2f1a05c3b9e2d6c2b1e7f0a8d4c"
    payload-digest: "sha256:a4f9c0d2e8b3a16e9c01b8f3d2a5c7b14e9f8a3d6c2b1e7f0a8d4c3b9e2f1a05"
    algorithm: ecdsa-p256
    signature: "MEUCIQDkX..."
    rekor-log-id: "c0d23b6c4f2..."
    rekor-log-index: 87654321
metadata:
  mda:
    version: "1.2.0"
---
```

`did:web`-signed artifact:

```yaml
---
name: pdf-tools
description: Extract PDF text, fill forms, merge files. Use when handling PDFs.
integrity:
  algorithm: sha256
  digest: "sha256:a4f9c0d2e8b3a16e9c01b8f3d2a5c7b14e9f8a3d6c2b1e7f0a8d4c3b9e2f1a05"
signatures:
  - signer: "did-web:tools.example.com"
    key-id: "ed25519-9c4e7b"
    payload-digest: "sha256:a4f9c0d2e8b3a16e9c01b8f3d2a5c7b14e9f8a3d6c2b1e7f0a8d4c3b9e2f1a05"
    algorithm: ed25519
    signature: "BASE64..."
metadata:
  mda:
    version: "1.2.0"
---
```

Conformance fixtures: `conformance/valid/sigstore-signed`, `conformance/valid/did-web-signed`, `conformance/invalid/signature-digest-mismatch`, `conformance/invalid/signature-without-integrity` (added in v1.0 conformance work).

## §09-9 Rationale

- **Why Sigstore as default rather than X.509 / GPG?** Because keyless flows match the OIDC identity already in use at every CI provider (GitHub Actions, GitLab CI, Buildkite). The author does not have to manage a long-lived signing key; the verifier checks an OIDC claim. Adoption friction is the lowest of any 2026-era signing scheme.
- **Why DSSE PAE rather than detached signature over the digest hex?** PAE binds the signature to its semantic payload type and prevents cross-protocol replay. The cost is one envelope construction step.
- **Why offer `did:web` at all?** Air-gapped environments and regulated industries cannot use Sigstore today. `did:web` covers them with a much simpler scheme. It is explicitly less robust and the spec says so.
- **Why not require Rekor inclusion proofs to be embedded in the signature?** Because the proof is large and needs to be re-verified against a current log root anyway. Storing only the coordinates keeps the artifact small; verifiers fetch the proof at verification time.
- **Why are signatures over the digest, not over the canonical bytes directly?** Because integrity (§08) is already over the canonical bytes. Signing the digest is one indirection that lets the signature be small and lets verifiers reuse the integrity-verification step. The PAE wrapper closes the cross-protocol risk that this indirection would otherwise create.
