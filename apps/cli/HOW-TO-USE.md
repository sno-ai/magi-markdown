# Markdown AI CLI Manual

`@markdown-ai/cli` gives you one command: `mda`.

Use it to create, validate, compile, sign, verify, and release Markdown AI
(MDA) artifacts. The CLI is built for two readers at the same time: a human at a
terminal, and an AI agent that needs stable JSON and clear next actions.

The short version:

```sh
mda init hello-skill --out hello.mda
mda validate hello.mda
mda compile hello.mda --target SKILL.md AGENTS.md --out-dir out --integrity
mda validate out/SKILL.md --target SKILL.md
mda integrity verify out/SKILL.md --target SKILL.md
```

That is the center of the tool. Everything else is there to make the same flow
safer, more explicit, or easier to automate.

## Install And Help

Run without installing:

```sh
npx @markdown-ai/cli --help
```

Install globally:

```sh
npm install -g @markdown-ai/cli
mda --help
```

The installed binary is `mda`.

Running `mda` with no arguments prints help. It does not validate, write, sign,
verify, or touch the network.

## Main Human Flow

Start with a source file:

```sh
mda init hello-skill --out hello.mda
```

Open `hello.mda`. Edit the name, description, metadata, and body. Then validate
it:

```sh
mda validate hello.mda
```

Compile it:

```sh
mda compile hello.mda --target SKILL.md AGENTS.md --out-dir out --integrity
```

Validate the emitted files:

```sh
mda validate out/SKILL.md --target SKILL.md
mda validate out/AGENTS.md --target AGENTS.md
mda integrity verify out/SKILL.md --target SKILL.md
```

Human output includes `Next:` guidance when the next command is obvious. You can
turn that off with `--no-next`:

```sh
mda validate hello.mda --no-next
```

## Main AI Agent Flow

Use `--json` almost every time.

Human output is for eyes. JSON output is for code. It contains stable fields:

- `ok`
- `command`
- `exitCode`
- `summary`
- `artifacts`
- `diagnostics`
- `nextActions`

Recommended authoring flow:

```sh
mda init task-skill --out task.mda --json
mda validate task.mda --target source --json
mda compile task.mda --target SKILL.md AGENTS.md MCP-SERVER.md --out-dir out --integrity --json
mda validate out/SKILL.md --target SKILL.md --json
mda validate out/AGENTS.md --target AGENTS.md --json
mda validate out/MCP-SERVER.md --target MCP-SERVER.md --json
mda integrity verify out/SKILL.md --target SKILL.md --json
```

Agent rules:

- Continue only when `ok` is `true` and `exitCode` is `0`.
- Stop on any non-zero exit.
- Read `diagnostics[0].code` before reading human messages.
- Use `artifacts` for paths produced by a command.
- Use `nextActions` for the next safe command.
- Pass `--target` when the filename is not exact.
- Write generated files into a temp or staging directory first.

Do not scrape human text when JSON is available. That is noise in the signal
chain. The JSON is the signal.

## Targets

Targets tell the CLI what kind of artifact a file is.

Allowed targets:

- `source`
- `SKILL.md`
- `AGENTS.md`
- `MCP-SERVER.md`
- `auto`

Auto-detection is exact:

- `*.mda` means `source`
- `SKILL.md` means `SKILL.md`
- `AGENTS.md` means `AGENTS.md`
- `MCP-SERVER.md` means `MCP-SERVER.md`
- any other Markdown filename needs `--target`

When in doubt, pass `--target`.

## MCP Sidecars

Plain validation of `MCP-SERVER.md` does not need a sidecar:

```sh
mda validate out/MCP-SERVER.md --target MCP-SERVER.md --json
```

Canonical bytes and integrity checks need the sidecar when the artifact is
multi-file:

```sh
mda canonicalize out/MCP-SERVER.md --target MCP-SERVER.md --sidecar out/mcp-server.json --json
mda integrity verify out/MCP-SERVER.md --target MCP-SERVER.md --sidecar out/mcp-server.json --json
```

## Integrity

Integrity is a stable fingerprint of the canonical artifact bytes. It tells you
whether the bytes changed. It does not prove who wrote them.

Compute a digest:

```sh
mda integrity compute hello.mda --target source --json
```

Write the digest into frontmatter:

```sh
mda integrity compute hello.mda --target source --write
```

Verify it later:

```sh
mda integrity verify hello.mda --target source
```

For compiled output:

```sh
mda compile hello.mda --target SKILL.md AGENTS.md MCP-SERVER.md --out-dir out --integrity --manifest out/compile-manifest.json
```

The compile manifest records source digest, output digests, compiler version,
capability summary, and compatibility diagnostics.

Use `--strict-compat` when warnings should block output:

```sh
mda compile hello.mda --target SKILL.md AGENTS.md --out-dir out --manifest out/compile-manifest.json --strict-compat
```

## Signing And Verification

Signing proves the artifact came from an expected signer. Verification checks
the signature, payload digest, and local trust policy.

### GitHub Actions Sigstore/Rekor

Most teams should start here. The production trust shape is GitHub Actions OIDC
identity, Sigstore/Rekor evidence, and a policy pinned to repository, workflow,
and exact ref.

The CLI 1.1 local gate is deterministic. It consumes explicit evidence through
`--offline-sigstore-fixture <path>` so signing, verification, release planning,
and doctor checks do not depend on hidden environment variables or live network
services.

Production shape:

- GitHub Actions keyless signing identity.
- Sigstore bundle or Rekor evidence retained with the release.
- Trust policy pinned to `repo`, `workflow`, and `ref`.

Offline and test shape:

- `--offline-sigstore-fixture <path>` supplies explicit replayable evidence.
- Tests and local release gates should use deterministic evidence files.

Create a GitHub Actions policy:

```sh
mda release trust policy --target llmix-registry --profile github-actions --repo owner/repo --workflow release.yml --ref refs/heads/main --out gha-policy.json
```

Sign with explicit GitHub Actions evidence:

```sh
mda sign release.mda --profile github-actions --repo owner/repo --workflow release.yml --ref refs/heads/main --rekor --offline-sigstore-fixture sigstore-evidence.json --out release.signed.mda
```

Verify with the same explicit evidence:

```sh
mda verify release.signed.mda --policy gha-policy.json --offline-sigstore-fixture sigstore-evidence.json --json
```

`mda verify --offline` is intentionally unsupported. Use
`--offline-sigstore-fixture <path>` so the evidence is visible in the command.
No hidden environment, no repo-local default key path.

### did:web

Use did:web when your team manages release keys and DID documents directly.

Create a did:web policy:

```sh
mda release trust policy --target llmix-registry --profile did-web --domain tools.example.com --out did-policy.json
```

Sign with explicit key material:

```sh
mda sign release.mda --profile did-web --did did:web:tools.example.com --key-id did:web:tools.example.com#release --key-file did-web-private.pem --out release.signed.mda
```

Verify with an explicit DID document:

```sh
mda verify release.signed.mda --policy did-policy.json --did-document did.json --json
```

There is a compatibility alias for older scripts:

```sh
mda sign release.mda --method did-web --key did-web-private.pem --identity tools.example.com --out release.signed.mda
```

## Release Workflow For LLMix Registry

The LLMix flow is there to help a user move from signed source presets to an
external deployment trust manifest. It does not publish the registry for you.
It tells you when the inputs are ready, then points to the next step.

### 1. Scaffold An LLMix Preset

```sh
mda init --template llmix-preset --module search_summary --preset openai_fast --provider openai --model gpt-5-mini --out authoring/search_summary/openai_fast.mda
```

Validate and add integrity:

```sh
mda validate authoring/search_summary/openai_fast.mda --target source
mda integrity compute authoring/search_summary/openai_fast.mda --target source --write
```

### 2. Sign And Verify The Source

```sh
mda release trust policy --target llmix-registry --profile github-actions --repo owner/repo --workflow release.yml --ref refs/heads/main --out gha-policy.json
mda sign authoring/search_summary/openai_fast.mda --profile github-actions --repo owner/repo --workflow release.yml --ref refs/heads/main --rekor --offline-sigstore-fixture sigstore-evidence.json --out authoring/search_summary/openai_fast.signed.mda
mda verify authoring/search_summary/openai_fast.signed.mda --policy gha-policy.json --offline-sigstore-fixture sigstore-evidence.json --json
```

### 3. Create The Release Plan

```sh
mda release prepare --target llmix-registry --source authoring --registry-dir registry --policy gha-policy.json --offline-sigstore-fixture sigstore-evidence.json --out release-plan.json
```

The release plan checks validation, integrity, signatures, signer identity, and
the expected registry entry identity. It writes deterministic release evidence.
It does not modify the registry and does not publish registry files.

After this step, run the LLMix publisher with `trustedRuntime: true`. The
publisher owns registry writes. After publishing or staging the registry, sign
the registry root. Then use `mda release finalize --target llmix-registry` to verify the signed
registry root and produce the external deployment trust manifest.

### 4. Create The External Trust Manifest

```sh
mda release finalize --target llmix-registry --registry-dir registry --registry-root registry/snapshots/current/registry-root.json --release-plan release-plan.json --policy gha-policy.json --derive-root-digest --out release/llmix-trust.json --offline-sigstore-fixture sigstore-evidence.json
```

The trust manifest must be outside the registry directory. The CLI rejects
direct paths, relative traversal, and symlink cases that put trust authority back
inside the registry.

### 5. Generate Deployment Snippets

```sh
mda release finalize --target llmix-registry --registry-dir registry --manifest release/llmix-trust.json --snippet-format json --snippet-out release/llmix-trust-snippet.json
mda release finalize --target llmix-registry --registry-dir registry --manifest release/llmix-trust.json --snippet-format env --snippet-out release/llmix-trust.env
mda release finalize --target llmix-registry --registry-dir registry --manifest release/llmix-trust.json --snippet-format kubernetes --snippet-out release/llmix-trust.yaml
```

Supported snippet formats:

- `json`
- `env`
- `kubernetes`
- `github-actions`
- `terraform`
- `typescript`
- `python`
- `rust`

Snippets reference external trust anchors. They do not tell you to put authority
inside `config/llm/`.

### 6. Run Doctor Before Deployment

```sh
mda doctor release --target llmix-registry --source authoring --registry-dir registry --release-plan release-plan.json --manifest release/llmix-trust.json --offline-sigstore-fixture sigstore-evidence.json
```

`doctor release` is read-only. It checks source readiness, registry root evidence,
signature trust, manifest placement, manifest schema, freshness, high-watermark,
and recovery next actions.

## Command Reference

Print help:

```sh
mda
mda --help
```

Create a source scaffold:

```sh
mda init <name> [--out <file>] [--json]
```

Create an LLMix preset source scaffold:

```sh
mda init --template llmix-preset --module <name> --preset <name> --provider <provider> --model <model> [--out <file>] [--json]
```

Validate a source or output file:

```sh
mda validate <file> [--target source|SKILL.md|AGENTS.md|MCP-SERVER.md|auto] [--json]
```

Compile a source file:

```sh
mda compile <file.mda> --target <target...> [--out-dir <dir>] [--integrity] [--manifest <path>] [--strict-compat] [--json]
```

Canonicalize a file:

```sh
mda canonicalize <file> [--target source|SKILL.md|AGENTS.md|MCP-SERVER.md|auto] [--sidecar <path>] [--json]
```

Compute integrity:

```sh
mda integrity compute <file> [--target source|SKILL.md|AGENTS.md|MCP-SERVER.md|auto] [--sidecar <path>] [--algorithm sha256|sha384|sha512] [--write] [--json]
```

Verify integrity:

```sh
mda integrity verify <file> [--target source|SKILL.md|AGENTS.md|MCP-SERVER.md|auto] [--sidecar <path>] [--json]
```

Sign an artifact:

```sh
mda sign <file> --profile did-web --did <did> --key-id <key-id> --key-file <path> (--out <file>|--in-place) [--json]
mda sign <file> --profile github-actions --repo <owner/repo> --workflow <workflow> --ref <ref> --rekor --offline-sigstore-fixture <path> (--out <file>|--in-place) [--json]
mda sign <file> --method did-web --key <path> --identity <domain> (--out <file>|--in-place) [--json]
```

Verify signatures:

```sh
mda verify <file> --policy <path> [--did-document <path>] [--offline-sigstore-fixture <path>] [--target source|SKILL.md|AGENTS.md|MCP-SERVER.md|auto] [--sidecar <path>] [--json]
```

Run release workflow helpers:

```sh
mda release trust policy --target llmix-registry --profile did-web --domain <domain> [--min-signatures <n>] [--out <file>] [--json]
mda release trust policy --target llmix-registry --profile github-actions --repo <owner/repo> --workflow <workflow> --ref <ref> [--out <file>] [--json]
mda release prepare --target llmix-registry --source <dir> --registry-dir <dir> --policy <path> --out <file> [--did-document <path>] [--offline-sigstore-fixture <path>] [--json]
mda release finalize --target llmix-registry --registry-dir <dir> --registry-root <file> --release-plan <file> --policy <path> (--expected-root-digest <digest>|--derive-root-digest) --out <file> [--did-document <path>] [--offline-sigstore-fixture <path>] [--json]
mda release finalize --target llmix-registry --registry-dir <dir> --manifest <path> --snippet-format json|env|kubernetes|github-actions|terraform|typescript|python|rust --snippet-out <path> [--json]
mda doctor release --target llmix-registry --source <dir> --registry-dir <dir> --release-plan <path> --manifest <path> [--did-document <path>] [--offline-sigstore-fixture <path>] [--json]
```

Run conformance:

```sh
mda conformance [--suite <path>] [--level V|C] [--json]
```

## Global Flags

- `--json` prints stable JSON only on stdout.
- `--quiet` suppresses non-essential human output.
- `--verbose` includes extra diagnostic context where available.
- `--no-color` disables ANSI color.
- `--no-next` hides human `Next:` guidance. JSON `nextActions` are unchanged.
- `-h`, `--help` prints help.

For agents, prefer `--json`. For humans, plain output is easier to read.

## Exit Codes

- `0`: success
- `1`: command ran, but validation or verification failed
- `2`: usage error, such as a missing argument, unknown flag, or ambiguous target
- `3`: IO or configuration error, such as overwrite refusal or unreadable policy
- `4`: internal bug

Agents should use the exit code and JSON fields together. Humans can usually
read the printed diagnostic and follow `Next:`.

## Conformance And Release Gates

Use validation conformance:

```sh
mda conformance --level V --json
```

Use compile/equality conformance:

```sh
mda conformance --level C --json
```

For local development of this CLI package, the useful gates are:

```sh
pnpm -C apps/cli build
pnpm -C apps/cli test
node scripts/validate-conformance.mjs
pnpm -C apps/cli smoke:package
```

The package smoke test installs the packed package in a temporary directory
outside the repository and runs the real `mda` binary. That matters. A local
source tree can hide problems a packed package cannot.

## Status

This is the 1.1 CLI.

The covered path is source authoring, validation, compile, integrity, GitHub
Actions Sigstore/Rekor signing evidence, did:web signing and verification,
LLMix release planning, external trust manifests, deployment snippets, doctor
checks, and Level V/Level C conformance.
