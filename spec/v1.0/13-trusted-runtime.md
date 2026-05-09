# §13 — Trusted Runtime Profile

> **Status:** Stable
> **Schema:** [`schemas/mda-trust-policy.schema.json`](../../schemas/mda-trust-policy.schema.json)
> **Depends on:** §08, §09, §11, [`REGISTRY.md`](../../REGISTRY.md)

## §13-1 Synopsis

The `trusted-runtime` profile is the MDA verification mode for production
systems that must only load artifacts approved by a known publisher identity.

Plain integrity and signature verification are independent building blocks:

- integrity proves the artifact bytes match the declared digest;
- signatures prove an identity signed that declared digest.

The `trusted-runtime` profile combines those checks into one fail-closed
decision so operators do not accidentally treat "verify signatures if present"
as "require trusted signed content".

Implementations MAY expose this profile as a CLI flag, a `trustedRuntime`
option, or a dedicated helper such as `verifyTrustedRuntime(...)`. A generic
`verifySignatures` option is not the same profile unless it also requires
integrity, requires at least one signature, applies a validated trust policy,
and enforces the `minSignatures` threshold defined here.

## §13-2 Required verifier behavior

A verifier running the `trusted-runtime` profile MUST reject an artifact when
any of the following is true:

1. `integrity` is missing.
2. `signatures[]` is missing or empty.
3. recomputing `integrity.digest` per §08 fails.
4. any checked signature has `payload-digest != integrity.digest`.
5. fewer than the policy's `minSignatures` distinct signer identities verify
   successfully and match the configured trust policy.
6. no verified signature matches the configured trust policy.
7. a Sigstore signature is required by policy and Rekor inclusion cannot be
   verified.
8. the artifact fails target schema or project-specific schema validation.

Signature verification in this profile MUST happen only after the integrity
check has succeeded. A verifier MUST NOT report an artifact as trusted merely
because a signature over the declared `integrity` object verifies; the declared
digest must first be proven to match the artifact bytes.

Schema validation and the cross-field `payload-digest == integrity.digest`
check apply to every entry in `signatures[]`; schema-invalid signature entries
still reject the artifact. Cryptographic verification then counts only
signatures that verify successfully and match the trust policy. Unverifiable,
untrusted, or duplicate signatures MUST NOT count toward `minSignatures`. A
verifier MAY report the most specific failure it saw while evaluating candidate
signatures, but the artifact-level trust decision is the threshold check over
distinct trusted identities.

An implementation that claims support for `trusted-runtime` MUST fail closed
for any signer method or trust-policy shape it cannot enforce. If a policy uses
a standard signer method, such as `did-web`, but the implementation has no
verifier for that method, the implementation MUST reject the policy or artifact
with `trust-policy-violation` and MUST NOT report the artifact as trusted.

## §13-3 Recommended CLI shape

Reference tools SHOULD expose the profile with a single obvious command:

```sh
mda verify --profile trusted-runtime \
  --policy mda-trust-policy.json \
  path/to/artifact.mda
```

This is equivalent to:

```text
require-integrity = true
require-signature = true
verify-integrity = true
verify-signatures = true
min-signatures = policy.minSignatures or 1
trust-policy = mda-trust-policy.json
```

Tools MAY expose the individual flags for advanced users, but documentation
SHOULD lead with the profile form.

## §13-4 Trust policy file

Production verifiers SHOULD accept a JSON policy file named
`mda-trust-policy.json`. The file shape is defined by
`schemas/mda-trust-policy.schema.json`.

GitHub Actions release example:

```json
{
  "version": 1,
  "trustedSigners": [
    {
      "type": "sigstore-oidc",
      "issuer": "https://token.actions.githubusercontent.com",
      "subject": "repo:sno-ai/llmix:ref:refs/tags/v2.0.0"
    }
  ],
  "rekor": {
    "url": "https://rekor.sigstore.dev"
  }
}
```

Human Google OIDC example:

```json
{
  "version": 1,
  "trustedSigners": [
    {
      "type": "sigstore-oidc",
      "issuer": "https://accounts.google.com",
      "subject": "maintainer@example.com"
    }
  ],
  "rekor": {
    "url": "https://rekor.sigstore.dev"
  }
}
```

Air-gap `did:web` example:

```json
{
  "version": 1,
  "trustedSigners": [
    {
      "type": "did-web",
      "domain": "tools.example.com"
    }
  ]
}
```

For Sigstore OIDC, issuer alone is never a sufficient trust decision. Shared
issuers such as GitHub Actions and GitLab CI can issue certificates for many
repositories. A trust policy MUST match both the issuer and the subject claim.
For GitHub Actions, the `subject` normally has a `repo:<owner>/<repo>:...`
shape; pin it to the repo and ref or workflow that is allowed to publish.

`minSignatures` is optional and defaults to `1`. When it is greater than `1`,
it counts distinct trusted signer identities, not duplicate signature entries.

For Sigstore policies, `rekor.url` is required and means Rekor inclusion is
required. There is no `required: false` switch. `did:web` policies do not use a
`rekor` block.

When a verifier uses an injected Rekor transport instead of constructing its
own HTTP client, that transport MUST be bound to the policy's `rekor.url`.
Passing `rekor.url` into the transport call, or constructing a transport scoped
to that URL and checking the URL before use, are both acceptable. Treating
`rekor.url` as documentation while fetching from an unrelated log is not
conformant.

The reserved issuer list in `REGISTRY.md` means "MDA recognizes this as an
on-topic Sigstore issuer"; it does not mean a verifier should trust every
identity from that issuer.

## §13-5 Error categories

Implementations SHOULD reuse the §11 error vocabulary and add these categories
when exposing `trusted-runtime` results:

| Category | Meaning |
| -------- | ------- |
| `missing-required-integrity` | The profile requires `integrity`, but the artifact does not declare it. |
| `missing-required-signature` | The profile requires at least one signature, but `signatures[]` is absent or empty. |
| `signature-digest-mismatch` | A signature's `payload-digest` does not equal `integrity.digest`. |
| `integrity-mismatch` | The recomputed artifact digest does not equal `integrity.digest`. |
| `rekor-entry-type-mismatch` | Sigstore Rekor entry is not `dsse-v0.0.1`. |
| `rekor-inclusion-failure` | Rekor entry is missing or its inclusion proof cannot be verified. |
| `signature-verification-failure` | Cryptographic signature verification failed. |
| `insufficient-trusted-signatures` | Fewer than `minSignatures` distinct signer identities verified successfully and matched the trust policy. |
| `no-trusted-signature` | Signatures verified cryptographically, but none matched the trust policy. |
| `trust-policy-violation` | The trust policy is malformed, unsupported, or impossible to satisfy. |

RC2 trusted-runtime tools SHOULD report policy mismatches as
`no-trusted-signature` or `insufficient-trusted-signatures`, because issuer-only
trust is not a valid policy model.

## §13-6 Previous-good runtime behavior

MDA defines artifact verification, not application rollout policy. Runtime
systems that refresh MDA-backed configuration MUST use this production shape:

1. verify new artifacts with `trusted-runtime`;
2. publish or activate only after verification succeeds;
3. if startup has no verified config, fail closed;
4. if a refresh fails after startup, keep serving the previous verified config
   and report the verification error.

This keeps a bad update from replacing a known-good runtime state while still
making the failure visible to operators.

Runtimes that do not refresh configuration after startup do not need a
previous-good cache; they still MUST fail closed when startup verification
fails.
