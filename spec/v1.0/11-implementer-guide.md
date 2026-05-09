# §11 — Implementer's Guide (informative)

> **Status:** Informative. Pseudocode patterns to help independent implementations of MDA validators, verifiers, and consumers converge on identical observable behavior. Nothing in this section adds normative requirements; every requirement referenced here is normatively defined in §02–§10 and §13.

## §11-1 Why this section exists

MDA v1.0 is a contract, not a reference implementation. The reference TypeScript CLI under `apps/cli/` is one of many valid implementations; third-party validators, verifiers, and runtime consumers are equally welcome. Independent implementations naturally diverge on:

- The order of validation steps (schema first, integrity first, signatures first?)
- Where to fail fast vs accumulate errors
- Which checks are mandatory vs optional
- How to layer custom project-specific validation (e.g. a project-defined Zod or pydantic schema sitting on top of MDA's structural rules)

The pseudocode below is the **recommended canonical loader algorithm**. Implementations that follow it produce the same accept/reject decision for any given file, with the same error category, in every step where MDA defines the behavior. Implementations MAY deviate (e.g. parallelize independent checks, fail-fast vs collect-errors) provided the final decision matches.

## §11-2 Canonical loader algorithm (recommended)

```
function loadMdaArtifact(file_bytes, target, target_schema, options):
    # `target` carries metadata about the destination format:
    #   - target.mode             : "source" (.mda) | "output" (.md)
    #   - target.allowsBodyOnly   : true for AGENTS.md per §06-targets/agents-md
    #                               (frontmatter-free is conformant); false elsewhere
    #   - target.isMultiFile      : true for MCP-SERVER.md per §06-targets/mcp-server-md

    # === Stage A: Extract (no I/O, no crypto) ===
    # §02-1.1 normative algorithm. Returns frontmatter_str = "" (empty string,
    # per §02-1.1 step 4) when the file has no opening "---\n" fence; the body
    # then carries the entire file. Raises `unterminated-frontmatter` when an
    # opening fence has no matching closing fence, or `invalid-encoding` when
    # bytes are not valid UTF-8.
    frontmatter_str, body_str = extractFrontmatter(file_bytes)

    # Frontmatter-free body-only path (§06-targets/agents-md).
    # AGENTS.md MAY ship without a YAML frontmatter block at all; in that case
    # there is nothing to YAML-parse, nothing to schema-check, and nothing to
    # canonicalize beyond the body itself.
    if frontmatter_str == "":
        if not target.allowsBodyOnly:
            REJECT "missing-required-frontmatter"
        return {frontmatter: {}, body: body_str}

    # YAML parse
    frontmatter = parseYaml(frontmatter_str)
    if parse failed:
        REJECT "frontmatter-yaml-parse-error"

    # === Stage B: Structural validation ===
    # §02 source-permissive or output-strict schema, depending on target.
    # `target_schema` is selected by the caller from `schemas/`:
    #   target.mode == "source"  → frontmatter-source.schema.json
    #   target.mode == "output"  → frontmatter-<target>.schema.json
    schemaErrors = validateAgainstJsonSchema(frontmatter, target_schema)
    if schemaErrors:
        REJECT "schema-violation", details=schemaErrors

    # §02-3.1: ISO 8601 fields MUST be quoted strings (caught by schema:type:string)
    # §02-3.2: version MUST be a quoted SemVer string (caught by schema)
    # §02-3.3: requires keys MUST be kebab-case (caught by schema patternProperties)

    # === Stage C: Cross-field semantic checks ===
    # §09-2: signatures[].payload-digest MUST equal integrity.digest
    if frontmatter.signatures and frontmatter.integrity:
        for sig in frontmatter.signatures:
            if sig.payload-digest != frontmatter.integrity.digest:
                REJECT "signature-digest-mismatch"
    elif frontmatter.signatures and not frontmatter.integrity:
        REJECT "signatures-without-integrity"

    # === Stage D: Integrity verification (optional unless required by profile) ===
    # `trusted-runtime` is the production profile from §13. It makes integrity
    # and signatures fail-closed requirements instead of best-effort checks.
    trusted_runtime = options.profile == "trusted-runtime"
    require_integrity = trusted_runtime or options.requireIntegrity
    require_signatures = trusted_runtime or options.requireSignatures

    integrity_verified = false

    if require_integrity and not frontmatter.integrity:
        REJECT "missing-required-integrity"

    # `integrity` MAY appear without `signatures[]`; the verifier still checks it.
    if (options.verifyIntegrity or require_integrity or options.verifySignatures) and frontmatter.integrity:
        # §08-3 canonicalization. The helper MUST:
        #   1. Strip top-level `integrity` and `signatures[]` from `frontmatter`
        #      (§08-3.1) before serializing; it does NOT mutate the caller's copy.
        #   2. JCS-canonicalize the stripped frontmatter (§08-3.2).
        #   3. Normalize and append the body bytes (§08-3.3).
        #   4. For multi-file targets, append the §08-3.4 boundary and the next
        #      file's canonical bytes; pass the sibling files via the helper.
        canonical_bytes = canonicalizeArtifact(
            frontmatter,
            body_str,
            multiFileSiblings = target.isMultiFile ? options.siblingFiles : None
        )
        computed_digest = hash(canonical_bytes, frontmatter.integrity.algorithm)
        expected = parseDigest(frontmatter.integrity.digest)
        if computed_digest != expected.hex:
            REJECT "integrity-mismatch"
        integrity_verified = true

    # === Stage E: Signature verification (optional unless required by profile) ===
    if require_signatures and (not frontmatter.signatures or len(frontmatter.signatures) == 0):
        REJECT "missing-required-signature"

    if (options.verifySignatures or require_signatures) and frontmatter.signatures:
        # Signatures prove who signed the declared digest. They do not prove the
        # current artifact bytes still match that digest. A verifier that treats
        # signatures as a trust gate MUST verify integrity first (§13-2).
        if not integrity_verified:
            REJECT "missing-required-integrity"

        trusted_signer_identities = set()

        for sig in frontmatter.signatures:
            # §09-3.1 PAE envelope reconstruction. When sig.payload-type is
            # absent the verifier MUST use the default `application/vnd.mda.integrity+json`
            # (§09-2). The payload bytes are the JCS form of the (un-stripped)
            # `integrity` object exactly as it appears in the frontmatter.
            payload_type = sig.payload-type or "application/vnd.mda.integrity+json"
            pae = constructDssePae(
                payload-type  = payload_type,
                payload-bytes = jcsCanonicalize(frontmatter.integrity)
            )
            if sig.signer starts with "sigstore-oidc:":
                # §09-4.2 verification flow
                rekor_entry = fetchRekorEntry(sig.rekor-log-id, sig.rekor-log-index)
                if rekor_entry == null:
                    REJECT "rekor-inclusion-failure"
                if rekor_entry.kind != "dsse-v0.0.1":
                    REJECT "rekor-entry-type-mismatch"
                if not verifyRekorInclusion(rekor_entry, options.rekorRoots):
                    REJECT "rekor-inclusion-failure"
                cert = extractFulcioCert(rekor_entry)
                if not verifyFulcioChain(cert, options.sigstoreRoot):
                    REJECT "fulcio-chain-failure"
                if not verifyEcdsaOrEd25519(pae, sig.signature, cert.publicKey):
                    REJECT "signature-verification-failure"
                if trustPolicyMatches(
                    options.trustPolicy,
                    type = "sigstore-oidc",
                    issuer = cert.oidcIssuer,
                    subject = cert.oidcSubject
                ):
                    trusted_signer_identities.add(
                        "sigstore-oidc:" + cert.oidcIssuer + "\n" + cert.oidcSubject
                    )
            elif sig.signer starts with "did-web:":
                # §09-5.2 verification flow
                domain = parseDidWebDomain(sig.signer)
                if domain == null:
                    REJECT "unknown-signer-method"
                if options.trustPolicy and not trustPolicyMatches(
                    options.trustPolicy,
                    type = "did-web",
                    domain = domain
                ):
                    continue
                keys = httpsGet("https://" + domain + "/.well-known/mda-keys.json")
                key = lookupKeyById(keys, sig.key-id)
                if not verifyEcdsaOrEd25519(pae, sig.signature, key.public-key):
                    REJECT "signature-verification-failure"
                if trustPolicyMatches(
                    options.trustPolicy,
                    type = "did-web",
                    domain = domain
                ):
                    trusted_signer_identities.add("did-web:" + domain)
            else:
                REJECT "unknown-signer-method"

        min_signatures = options.trustPolicy?.minSignatures or options.minSignatures or 1
        if require_signatures and len(trusted_signer_identities) == 0:
            REJECT "no-trusted-signature"
        if require_signatures and len(trusted_signer_identities) < min_signatures:
            REJECT "insufficient-trusted-signatures"

    # === Stage F: Capability requirements (optional, gated by options) ===
    # The `requires` block lives in different locations in source vs output mode:
    #   source mode  → frontmatter.requires           (top-level, §02-2 source)
    #   output mode  → frontmatter.metadata.mda.requires (lifted, §02-2 output)
    requires_block = (
        frontmatter.requires
            if target.mode == "source"
            else frontmatter.metadata?.mda?.requires
    )
    if options.enforceRequires and requires_block:
        # §10-4 consumer behavior
        for key, value in requires_block:
            if isStandardKey(key):
                if not satisfies(key, value, options.environment):
                    REJECT "requires-not-satisfied", key=key
            # unknown keys: silently OK (§10-4)

    # === Stage G: Project-specific validation (out of scope for MDA) ===
    # E.g. Zod / pydantic schema for metadata.<vendor>.* substructures.
    # MDA does not constrain this layer.
    if options.projectSchema:
        projectErrors = options.projectSchema.validate(frontmatter)
        if projectErrors:
            REJECT "project-schema-violation"

    return {frontmatter, body: body_str}
```

## §11-3 Recommended error category vocabulary

For interoperable error reporting between MDA tools and downstream observability, the following error categories are RECOMMENDED. Implementations MAY add their own categories; consumers SHOULD recognize at least these.

| Category | Meaning | Spec section |
|----------|---------|--------------|
| `frontmatter-yaml-parse-error` | YAML syntax invalid | §02-1.1 |
| `unterminated-frontmatter` | Opening `---` without matching closing fence | §02-1.1 step 5 |
| `invalid-encoding` | Non-UTF-8 bytes | §02-1.1 step 2 |
| `missing-required-frontmatter` | Target requires frontmatter but file has none (e.g. SKILL.md, MCP-SERVER.md). AGENTS.md is the only Tier-1/Tier-2 target that admits a body-only file. | §02, §06-targets/* |
| `schema-violation` | JSON Schema 2020-12 validation failed | §02 |
| `signature-digest-mismatch` | `payload-digest != integrity.digest` | §09-2 |
| `signatures-without-integrity` | `signatures[]` present without `integrity` | §09-2 |
| `integrity-mismatch` | Computed digest != declared digest | §08-4 |
| `rekor-entry-type-mismatch` | Sigstore Rekor entry not `dsse-v0.0.1` | §09-4.2 |
| `rekor-inclusion-failure` | Rekor entry missing or inclusion proof did not verify against the configured log root | §09-4.2 |
| `fulcio-chain-failure` | Fulcio certificate chain did not verify to the configured Sigstore root | §09-4.2 |
| `signature-verification-failure` | Cryptographic signature did not verify on the PAE envelope | §09-4.2, §09-5.2 |
| `missing-required-integrity` | The selected verifier profile requires `integrity`, but the artifact does not declare it or has not successfully verified it before signature trust decisions. | §13 |
| `missing-required-signature` | The selected verifier profile requires at least one signature, but `signatures[]` is absent or empty. | §13 |
| `insufficient-trusted-signatures` | Fewer than the configured `minSignatures` distinct signer identities verified and matched the trust policy. | §13 |
| `no-trusted-signature` | Signatures verified cryptographically, but none matched the configured trust policy. | §13 |
| `trust-policy-violation` | Trust policy file is malformed, unsupported, or impossible to satisfy. | §13 |
| `unknown-signer-method` | `signer` prefix is neither `sigstore-oidc:` nor `did-web:` | §09-2 |
| `requires-not-satisfied` | Standard `requires` key cannot be honored | §10-4 |
| `project-schema-violation` | Vendor / project-specific schema (non-MDA) | out of scope |

## §11-4 Layering project-specific schemas (informative)

Real-world consumers often combine MDA's structural rules with their own runtime schema (e.g. Zod for TypeScript, pydantic for Python) over `metadata.<vendor>.*` substructures. The recommended layering:

1. **MDA structural validation** (Stages B + C above) — the universal interop floor.
2. **Project schema validation** (Stage G) — runtime types specific to the consumer's domain (e.g. an LLM-config preset's `model` / `provider` / `temperature` shape under `metadata.<vendor>.*`).

The two layers do not overlap: MDA enforces top-level structure and reserved fields; the project schema enforces vendor-namespace contents that MDA intentionally does not parse (§04-5.1). Implementations MUST NOT use a project schema to override MDA structural rules (e.g. a project schema MUST NOT permit `unevaluatedProperties: true` on a target output).

## §11-5 Implementations that read MDA without verifying (informative)

Many consumers will read MDA artifacts without performing integrity or signature verification (e.g. a SKILL.md loader that just wants `name` and `description`). Such consumers MUST still:

- Apply §02-1.1 frontmatter extraction
- Apply target-schema validation (Stage B)
- Apply §09-2 cross-field check IF they observe both `integrity` and `signatures[]` (a consumer that sees a mismatch and silently loads anyway is misleading)

They MAY skip Stages D, E, F, G. They SHOULD document which stages they apply.
Consumers that skip Stage D or Stage E are not running the §13
`trusted-runtime` profile and MUST NOT present the loaded artifact as trusted
signed configuration.

A consumer that wants tamper detection without identity attestation MAY perform Stage D (`integrity` verification) without performing Stage E (`signatures[]` verification). The two stages are independent: `integrity` MAY appear without `signatures[]`, and a verifier that does so still benefits from §08 reproducibility. The reverse is not permitted: §09-2 forbids `signatures[]` without `integrity`, and Stage C catches it before any cryptographic work.

## §11-6 Reference implementations

The following implementations follow this guide:

- `apps/cli/` — TypeScript reference CLI (npm `@markdown-ai/cli`). Architecture spec at `apps/cli/IMPL-SPEC.md`.

Third-party implementations are encouraged. Implementations that pass the conformance suite (§07) and follow the algorithm above SHOULD be listed in `REGISTRY.md` under "Reference implementations" once a follow-up registry section is added.
