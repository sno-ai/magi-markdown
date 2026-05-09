# §12 — Sigstore Tooling Integration (informative)

> **Status:** Informative. Concrete recipes for mapping between common Sigstore tooling output formats (`sigstore-python`, `sigstore-go`, `cosign`) and the MDA `signatures[]` entry shape (§09-2). The normative format remains §09; this section reduces the integration cost for implementations that wrap existing Sigstore tools.

## §12-1 Why this section exists

§09-9 explains why MDA chose DSSE PAE over a detached signature on the digest hex. In practice that choice constrains tooling: an MDA `signatures[]` entry is a DSSE-over-Rekor attestation, not a `sign-blob` over a flat hash. This section spells out which Sigstore client APIs produce a Rekor `dsse-v0.0.1` entry — the only entry type MDA verifiers accept (§09-4.2 step 3) — and which do not. Each subsection gives:

- The exact tooling command or API call
- The output format that tooling produces
- The field-by-field mapping into MDA's `signatures[]` shape

The order below is the recommended order of preference for new integrations.

## §12-2 sigstore-python (recommended)

`sigstore-python` exposes `sign_dsse(payload, payload_type)`, which constructs the DSSE PAE envelope per §09-3.1, signs it with the Fulcio-issued ephemeral key, and submits the envelope to Rekor as a `dsse-v0.0.1` entry. This matches MDA's expectations end-to-end with no client-side glue.

```python
from sigstore.sign import SigningContext
from sigstore.oidc import detect_credential

# payload_bytes = JCS canonical bytes of the integrity object (§09-3.1)
# Compute via: mda canonicalize --integrity-payload my-artifact.mda
payload_bytes = b'{"algorithm":"sha256","digest":"sha256:..."}'

ctx = SigningContext.production()
identity = detect_credential()
with ctx.signer(identity) as signer:
    bundle = signer.sign_dsse(
        payload=payload_bytes,
        payload_type="application/vnd.mda.integrity+json",
    )

# bundle is a sigstore.models.Bundle; serialize via bundle.to_json()
```

The returned `Bundle` follows the Sigstore Bundle v0.3 protobuf-JSON shape:

```jsonc
{
  "mediaType": "application/vnd.dev.sigstore.bundle.v0.3+json",
  "verificationMaterial": {
    "certificate": { "rawBytes": "<base64 cert>" },
    "tlogEntries": [{
      "logIndex": "87654321",
      "logId": { "keyId": "<base64 log-id>" },
      "kindVersion": { "kind": "dsse", "version": "0.0.1" },
      "inclusionProof": { ... },
      "canonicalizedBody": "<base64>"
    }]
  },
  "dsseEnvelope": {
    "payload": "<base64 payload-bytes>",
    "payloadType": "application/vnd.mda.integrity+json",
    "signatures": [{
      "sig": "<base64 signature>",
      "keyid": ""
    }]
  }
}
```

**Mapping to MDA `signatures[]` entry (§09-2):**

| MDA field | Source in Sigstore bundle | Transformation |
|-----------|---------------------------|----------------|
| `signer` | OIDC issuer claim from `verificationMaterial.certificate` | Decode the cert, read the OIDC issuer extension (OID `1.3.6.1.4.1.57264.1.8` for v2 issuers, or `1.3.6.1.4.1.57264.1.1` for v1 legacy), prefix with `sigstore-oidc:` |
| `key-id` | `verificationMaterial.certificate.rawBytes` | sha256 of cert DER bytes, lowercase hex, prefix with `fulcio:` |
| `payload-digest` | (must equal `integrity.digest`) | Copy from frontmatter `integrity.digest`; verify equality (§09-2) |
| `algorithm` | Cert public key algorithm | `ed25519`, `ecdsa-p256`, or `rsa-pss-sha256`; sigstore-python emits `ecdsa-p256` for keyless |
| `signature` | `dsseEnvelope.signatures[0].sig` | Base64 string, copy as-is |
| `payload-type` | `dsseEnvelope.payloadType` | Copy as-is. Omit when equal to the MDA default `application/vnd.mda.integrity+json` (§09-2). |
| `rekor-log-id` | `verificationMaterial.tlogEntries[0].logId.keyId` | Base64-decode, hex-encode |
| `rekor-log-index` | `verificationMaterial.tlogEntries[0].logIndex` | Parse string as integer |

Verifiers MUST also confirm `verificationMaterial.tlogEntries[0].kindVersion.kind == "dsse"` and `version == "0.0.1"` (§09-4.2 step 3) before accepting the entry.

## §12-3 sigstore-go

`sigstore-go` provides the equivalent producer API:

```go
import (
    "github.com/sigstore/sigstore-go/pkg/sign"
)

// payload is the JCS canonical bytes of the integrity object
bundle, err := sign.SignDSSE(payload, "application/vnd.mda.integrity+json", opts)
```

The returned bundle uses the same Sigstore Bundle v0.3 shape as §12-2, and the same field-by-field MDA mapping table applies.

## §12-4 cosign CLI (limited)

`cosign` is the most widely deployed Sigstore client, but its blob-signing flows do **not** produce a Rekor `dsse-v0.0.1` entry by default:

- `cosign sign-blob` signs the raw blob bytes and emits a Rekor `hashedrekord-v0.0.1` entry. MDA verifiers MUST refuse this entry type (§09-4.2 step 3).
- `cosign attest-blob` produces a DSSE attestation, but the resulting Rekor entry is `intoto-v0.0.2` (in-toto Statement payload type), not `dsse-v0.0.1`. MDA verifiers MUST also refuse this entry type.

There is no current `cosign` subcommand that emits a bare `dsse-v0.0.1` entry over an arbitrary `payloadType`. Operators who must use `cosign` have two options:

1. **Wrap a Sigstore SDK from a thin shim.** Call `sigstore-python` (§12-2) or `sigstore-go` (§12-3) from a small wrapper script. This is the recommended path for `cosign`-centric pipelines today.
2. **Track upstream cosign issues.** Sigstore is exploring a generic DSSE blob-signing flow under upstream issues (e.g. `sigstore/cosign#3464`). When that lands and emits `dsse-v0.0.1`, this section will be updated; until then, treat `cosign sign-blob` and `cosign attest-blob` outputs as **incompatible** with §09 and reject them at the `kindVersion` check.

`cosign verify-blob-attestation` MAY still be useful on the verification side to fetch and verify Rekor inclusion proofs, provided the operator independently confirms the entry kind is `dsse-v0.0.1`.

## §12-5 sigstore-rs (Rust)

The Rust client `sigstore-rs` is under active development. As of the v1.0 freeze date it does not expose a stable `sign_dsse` equivalent; integrations SHOULD wrap `sigstore-python` or `sigstore-go` from Rust until a stable Rust DSSE producer API ships. The verifier side of `sigstore-rs` is more mature and can be combined with a third-party DSSE PAE construction helper for `signatures[]` validation.

## §12-6 did:web fallback tooling (informative)

For the air-gap path (§09-5), no Sigstore tooling is involved. The recommended construction:

```python
# Producer side
import nacl.signing  # or cryptography for ECDSA
import base64

signing_key = nacl.signing.SigningKey.generate()
signature = signing_key.sign(pae_bytes).signature
sig_b64 = base64.standard_b64encode(signature).decode("ascii")

# Publish signing_key.verify_key as base64 in
# https://<your-domain>/.well-known/mda-keys.json
# with shape:
# { "keys": [{ "key-id": "<fingerprint>", "algorithm": "ed25519",
#              "public-key": "<base64-or-PEM>" }] }
```

The `mda-keys.json` schema is `schemas/_defs/mda-keys.schema.json` (§09-5.1). The `pae_bytes` are the DSSE PAE envelope per §09-3.1; a custom payload-type vendor SHOULD use its registered `application/vnd.<vendor>.<doc-type>+json` value in the PAE `payload-type` slot and copy it into `signatures[i].payload-type`.

**Verification side:**

```python
import nacl.signing, base64, requests

domain = signer_field.split(":")[1]  # "did-web:tools.example.com" → "tools.example.com"
# First require `domain` to match the operator trust policy (§09-5.2).
keys = requests.get(f"https://{domain}/.well-known/mda-keys.json").json()
key_entry = next(k for k in keys["keys"] if k["key-id"] == signature["key-id"])
public_key = nacl.signing.VerifyKey(base64.standard_b64decode(key_entry["public-key"]))
public_key.verify(pae_bytes, base64.standard_b64decode(signature["signature"]))
```

## §12-7 What this section does NOT cover

- **Private Sigstore deployments.** Operators running their own Fulcio + Rekor (e.g. enterprise air-gap with self-hosted transparency log) configure their tooling per the Sigstore project documentation. The MDA-side mapping (§12-2 table) applies regardless of which Sigstore deployment produced the bundle.
- **Hardware security modules.** Producing signatures with HSM-backed keys is outside MDA's scope; consult the HSM vendor's Sigstore integration guidance.
- **Key rotation cadence and trust policy.** §09-7 leaves operator policy to define key rotation, allowed issuers over time, and revocation handling.

## §12-8 Reference scripts

Reference helper scripts live in the MDA reference implementation:

- `scripts/sigstore-bundle-to-mda-signature.{py,sh}` — extract and map a Sigstore Bundle v0.3 (`sigstore-python` / `sigstore-go` output) to a YAML `signatures[]` entry suitable for splicing into frontmatter
- `scripts/mda-signature-to-sigstore-bundle.{py,sh}` — inverse, useful when handing off an MDA-signed artifact to a verifier that wants a Sigstore Bundle

These are convenience tooling, not normative requirements. Independent implementations MAY ship equivalent helpers under different names.
