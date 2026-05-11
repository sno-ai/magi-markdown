# @markdown-ai/cli

`@markdown-ai/cli` installs one command: `mda`.

It helps you create, validate, compile, sign, verify, and release Markdown AI
(MDA) artifacts. The main job is simple: keep the source clean, keep the output
predictable, and give humans or AI agents a clear next step when something is
wrong.

Most users start with one `.mda` source file. From that file, the CLI can emit
the Markdown files agent systems already understand: `SKILL.md`, `AGENTS.md`,
and `MCP-SERVER.md`.

## Install

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

Running `mda` with no arguments prints help. It does not write files, validate
files, sign anything, verify anything, or touch the network.

## Quick Start

Create a source file:

```sh
mda init hello-skill --out hello.mda
```

Validate it:

```sh
mda validate hello.mda
```

Compile it into agent-readable Markdown:

```sh
mda compile hello.mda --target SKILL.md AGENTS.md --out-dir out --integrity
```

Validate the output:

```sh
mda validate out/SKILL.md --target SKILL.md
mda validate out/AGENTS.md --target AGENTS.md
mda integrity verify out/SKILL.md --target SKILL.md
```

That is the everyday flow. Create the source. Check it. Compile it. Check what
came out.

## LLMix Secure Release Quick Path

For LLMix releases, most teams should start with the GitHub Actions profile. It
matches the CI identity shape people already expect from package provenance:
GitHub Actions OIDC identity, explicit Sigstore/Rekor evidence, and a local
policy pinned to repository, workflow, and ref.

```sh
mda init --template llmix-preset --module search_summary --preset openai_fast --provider openai --model gpt-5-mini --out authoring/search_summary/openai_fast.mda
mda validate authoring/search_summary/openai_fast.mda --target source
mda integrity compute authoring/search_summary/openai_fast.mda --target source --write
mda llmix trust policy --profile github-actions --repo owner/repo --workflow release.yml --ref refs/heads/main --out gha-policy.json
mda sign authoring/search_summary/openai_fast.mda --profile github-actions --repo owner/repo --workflow release.yml --ref refs/heads/main --rekor --offline-sigstore-fixture sigstore-evidence.json --out authoring/search_summary/openai_fast.signed.mda
mda verify authoring/search_summary/openai_fast.signed.mda --policy gha-policy.json --offline-sigstore-fixture sigstore-evidence.json --json
mda llmix release plan --source authoring --registry-dir registry --policy gha-policy.json --offline-sigstore-fixture sigstore-evidence.json --out release-plan.json
# Run the LLMix publisher with trustedRuntime: true. mda does not publish registry files.
mda llmix trust manifest --registry-dir registry --registry-root registry/snapshots/current/registry-root.json --release-plan release-plan.json --policy gha-policy.json --derive-root-digest --out release/llmix-trust.json --offline-sigstore-fixture sigstore-evidence.json
mda llmix trust snippets --manifest release/llmix-trust.json --format json --out release/llmix-trust-snippet.json
mda doctor llmix --source authoring --registry-dir registry --manifest release/llmix-trust.json --offline-sigstore-fixture sigstore-evidence.json
```

The `--offline-sigstore-fixture` option is the CLI 1.1 deterministic evidence
input for local and CI gates. Production release automation can keep using
GitHub Actions keyless signing and Sigstore/Rekor evidence; this CLI gate makes
that evidence explicit and repeatable.

## AI Agent Usage

Use `--json` when another program is driving the CLI.

Human output is meant to be read. JSON output is meant to be used. It gives
stable fields:

- `ok`
- `command`
- `exitCode`
- `summary`
- `artifacts`
- `diagnostics`
- `nextActions`

Recommended agent flow:

```sh
mda validate task.mda --target source --json
mda compile task.mda --target SKILL.md AGENTS.md MCP-SERVER.md --out-dir out --integrity --json
mda validate out/SKILL.md --target SKILL.md --json
mda validate out/AGENTS.md --target AGENTS.md --json
mda validate out/MCP-SERVER.md --target MCP-SERVER.md --json
mda integrity verify out/SKILL.md --target SKILL.md --json
```

Agent rules:

- Treat exit code `0` and `ok: true` as success.
- Treat any non-zero exit as a stop signal.
- Read `diagnostics[0].code` before parsing messages.
- Use `artifacts` and `nextActions` to decide the next command.
- Pass `--target` when a Markdown filename is not exact.
- Write generated files into a temp or staging directory first.

The CLI is a good external gate. Application runtime loaders should still keep
their own verifier hooks instead of shelling out to `mda`.

## Secure Release Flow

For signed MDA and LLMix releases, the default path is GitHub Actions OIDC plus
Sigstore/Rekor evidence:

```sh
mda llmix trust policy --profile github-actions --repo owner/repo --workflow release.yml --ref refs/heads/main --out gha-policy.json
mda sign release.mda --profile github-actions --repo owner/repo --workflow release.yml --ref refs/heads/main --rekor --offline-sigstore-fixture sigstore-evidence.json --out release.signed.mda
mda verify release.signed.mda --policy gha-policy.json --offline-sigstore-fixture sigstore-evidence.json --json
mda llmix release plan --source authoring --registry-dir registry --policy gha-policy.json --offline-sigstore-fixture sigstore-evidence.json --out release-plan.json
mda llmix trust manifest --registry-dir registry --registry-root registry/snapshots/current/registry-root.json --release-plan release-plan.json --policy gha-policy.json --derive-root-digest --out release/llmix-trust.json --offline-sigstore-fixture sigstore-evidence.json
mda llmix trust snippets --manifest release/llmix-trust.json --format json --out release/llmix-trust-snippet.json
mda doctor llmix --source authoring --registry-dir registry --manifest release/llmix-trust.json --offline-sigstore-fixture sigstore-evidence.json
```

Use did:web as an advanced or alternate signing profile when your team manages
release keys and DID documents directly.

Keep private keys and deployment trust manifests outside the registry directory.
Trust authority should live outside `config/llm/`. The CLI checks that because
it is the kind of mistake that looks fine until it matters.

## Common Commands

| Command                                                                        | Use it for                                                                            |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| `mda`                                                                          | Print help.                                                                           |
| `mda init <name> --out <file.mda>`                                             | Create a source scaffold.                                                             |
| `mda init --template llmix-preset ...`                                         | Create an LLMix preset source scaffold.                                               |
| `mda validate <file> [--target <target>]`                                      | Validate source or generated Markdown.                                                |
| `mda compile <file.mda> --target SKILL.md AGENTS.md --out-dir out --integrity` | Compile source into agent-readable artifacts.                                         |
| `mda canonicalize <file> --target <target>`                                    | Produce deterministic canonical bytes.                                                |
| `mda integrity compute <file> --target <target>`                               | Compute a stable digest.                                                              |
| `mda integrity verify <file> --target <target>`                                | Check the declared digest against current content.                                    |
| `mda sign <file> --profile did-web ...`                                        | Sign an artifact with explicit did:web key material.                                  |
| `mda sign <file> --profile github-actions ...`                                 | Sign with explicit GitHub Actions Sigstore/Rekor evidence.                            |
| `mda verify <file> --policy <policy.json>`                                     | Verify signatures against a local trust policy and explicit evidence.                 |
| `mda llmix release plan ...`                                                   | Verify signed LLMix presets and write a deterministic release plan.                   |
| `mda llmix trust manifest ...`                                                 | Verify signed registry-root evidence and write an external deployment trust manifest. |
| `mda llmix trust snippets ...`                                                 | Generate deployment snippets from the external trust manifest.                        |
| `mda doctor llmix ...`                                                         | Check an LLMix secure-release state before deployment.                                |
| `mda conformance --level V --json`                                             | Run validation conformance.                                                           |
| `mda conformance --level C --json`                                             | Run compile/equality conformance.                                                     |

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
- any other Markdown filename should pass `--target`

## Full Manual

Read [HOW-TO-USE.md](./HOW-TO-USE.md) for the complete manual. It covers the
human flow, AI agent JSON flow, signing, verification, LLMix secure release,
MCP sidecars, integrity commands, global flags, exit codes, and conformance.

For the broader project context, read the repository
[README](https://github.com/sno-ai/mda#readme) and the
[MDA Open Spec](https://github.com/sno-ai/mda/blob/main/SPEC.md).

## Status

This is the 1.1 reference CLI for the Markdown AI / MDA artifact format.

The useful path is covered: author `.mda`, validate it, compile it, validate the
outputs, run integrity checks, sign and verify release artifacts with explicit
GitHub Actions Sigstore/Rekor evidence or did:web key material, and use the
LLMix release/manifest/snippet/doctor commands before publishing or handing
files to an agent.
