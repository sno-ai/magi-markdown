# §10 — Capabilities (`metadata.mda.requires`)

> **Status:** Stable
> **Schema:** [`schemas/_defs/requires.schema.json`](../../schemas/_defs/requires.schema.json)
> **Registry:** Standard `requires` keys in [`REGISTRY.md`](../../REGISTRY.md)
> **Depends on:** §00, §02, §04

## §10-1 Synopsis

The `metadata.mda.requires` field declares the runtime capabilities an MDA artifact needs in order to function. It is the machine-readable counterpart to the free-text `compatibility` field (§02-2.4): consumers can decide programmatically whether they can satisfy the artifact's requirements before activating it.

`requires` is intentionally **open key-value**: standard keys (defined in `REGISTRY.md`) capture the common cases, and authors MAY add new keys without coordination. Consumers ignore unknown keys without error.

## §10-2 Field shape

```yaml
metadata:
  mda:
    requires:
      runtime: ["python>=3.11"]
      tools: ["Read", "Bash"]
      network: none
      packages: ["pdftotext", "jq"]
      model: { min-context: 100000 }
      cost-hints: { tokens-per-call: 5000 }
```

| Constraint | Rule |
| ---------- | ---- |
| Type | Object (key → arbitrary value). |
| Keys | Each key MUST be a kebab-case identifier (`^[a-z0-9]+(-[a-z0-9]+)*$`, length 1-64). |
| Values | Free-form per key. Standard keys define their own value shape (§10-3). |
| Unknown keys | A consumer MUST NOT reject the artifact solely because `requires` contains an unknown key. The consumer SHOULD log/surface the unknown key. |

Schema: `_defs/requires.schema.json`. The schema enforces only key shape; the per-key value shapes are documented here and (where stable) cross-referenced from `REGISTRY.md`.

## §10-3 Standard keys (normative shape, optional usage)

The following keys are defined in this spec. Authors are NOT required to use them, but when they DO use them they MUST use the shapes defined below. The current registry summary is in [`REGISTRY.md` "Standard `requires` keys (capabilities)"](../../REGISTRY.md#standard-requires-keys-capabilities).

### §10-3.1 `runtime`

- Value: array of runtime constraint strings.
- Each string SHOULD be of the form `<runtime>[<comparator><version>]`, e.g. `python>=3.11`, `node>=20`, `bun`, `deno>=2`, `rust>=1.75`.
- MDA itself is language-neutral. The runtime token is whatever identifier the consumer ecosystem already uses; MDA does not parse or validate it beyond the string shape above.
- Multiple entries are AND-combined.

### §10-3.2 `tools`

- Value: array of strings naming tools the artifact uses. MDA does NOT parse the entries: each string is opaque pass-through.
- Authors SHOULD prefer bare tool names (e.g. `["Read", "Write", "Bash"]`) for cross-runtime portability.
- Vendor-specific micro-syntaxes (e.g. Claude Code's `Bash(jq:*)` glob form) MAY appear verbatim, but they are uninterpreted by MDA and consumers MUST NOT rely on cross-vendor portability of such entries. When an author needs a vendor's whitelist syntax to be authoritative, place it under that vendor's namespace instead — e.g. `metadata.claude-code.allowed-tools` (§04).

### §10-3.3 `network`

- Value: one of:
  - `none` — the artifact MUST NOT make outbound network calls.
  - `local` — the artifact MAY contact loopback / RFC1918 addresses only.
  - `public` — the artifact MAY contact public internet.
  - Array of host glob strings — the artifact MAY contact only the listed hosts (e.g. `["api.example.com", "*.s3.amazonaws.com"]`).

### §10-3.4 `packages`

- Value: array of OS-or-language-package identifiers required at runtime.
- Examples: `["pdftotext", "imagemagick"]` (system), `["@example/pkg@^2"]` (npm).
- This key is informational; consumers MAY use it to drive an installer but are not required to.

### §10-3.5 `model`

- Value: object with optional fields:
  - `min-context` (integer) — minimum context window in tokens the consumer's LLM should provide.
  - `tools-required` (boolean) — whether the artifact requires the consumer's LLM to support tool use.
  - `vision` (boolean) — whether the artifact requires multimodal vision input.

### §10-3.6 `cost-hints`

- Value: object with optional fields:
  - `tokens-per-call` (integer) — typical token cost of one activation.
  - `seconds-per-call` (integer) — typical wall-clock cost of one activation.
  - `paid-apis` (array of strings) — names of paid APIs this artifact calls (`openai`, `anthropic`, `stripe`).

These fields are advisory. Consumers MAY surface them in install dialogs.

## §10-4 Consumer behavior (normative)

A consumer that reads `requires`:

- MUST NOT reject the artifact solely because `requires` contains a key the consumer does not recognize.
- MUST, for every standard key the consumer DOES recognize, attempt to satisfy the constraint or refuse to activate the artifact and surface a clear "missing capability" message.
- MUST treat the absence of `requires` as "no machine-readable requirements declared." It is NOT equivalent to `network: none` or any other restrictive default.
- SHOULD prefer `requires` over the free-text `compatibility` (§02-2.4) when both are present and they conflict; `compatibility` is human-readable narration, `requires` is the machine contract.

## §10-5 Why open key-value (rationale)

- **Match the vendor-namespace philosophy.** §04 already lets vendors add namespaces under `metadata.<vendor>` without coordination. Forcing `requires` into a closed enum would create the only closed surface in MDA, which is inconsistent.
- **The risk of LLM-invented inconsistent keys is real but bounded.** The standard-keys registry in `REGISTRY.md` gives agents a strong default; the prompt template in `docs/manual-workflow.md` lists the standard keys verbatim. Observed inconsistency that becomes load-bearing graduates into a registered standard key (no breaking change).
- **The cost of being wrong is low.** Unknown keys are ignored. The worst case is "consumer cannot decide programmatically; falls back to `compatibility`." The best case is rapid evolution without spec churn.

## §10-6 Examples

A skill that needs Python 3.11, two CLI tools, and no network:

```yaml
metadata:
  mda:
    requires:
      runtime: ["python>=3.11"]
      tools: ["Read", "Bash"]
      network: none
      packages: ["pdftotext", "jq"]
  claude-code:
    allowed-tools: "Read Bash(pdftotext:*) Bash(jq:*)"
```

The same skill expressed with a Node.js / TypeScript runtime instead — the `requires` shape is identical, only the runtime token and packages change:

```yaml
metadata:
  mda:
    requires:
      runtime: ["node>=20"]
      tools: ["Read", "Bash"]
      network: ["registry.npmjs.org"]
      packages: ["@example/sdk@^2", "tsx"]
  claude-code:
    allowed-tools: "Read Bash(pnpm:*) Bash(tsx:*)"
```

The `tools` list above is portable across runtimes; the Claude-Code-specific `Bash(...:*)` glob form lives under its vendor namespace where the intended consumer will read it.

A skill that needs internet to a specific allow-list and a vision-capable LLM:

```yaml
metadata:
  mda:
    requires:
      network: ["api.openai.com", "api.anthropic.com"]
      model:
        min-context: 200000
        vision: true
        tools-required: true
      cost-hints:
        tokens-per-call: 12000
        paid-apis: ["openai", "anthropic"]
```

A skill that uses a non-standard key under the rationale "consumer that recognizes it can act":

```yaml
metadata:
  mda:
    requires:
      runtime: ["python>=3.11"]
      gpu: { vram-gb: 16, cuda: ">=12.0" }   # not a standard key in v1.0
```

A consumer that does not recognize `gpu` ignores it without error. A consumer that does recognize it (e.g. a GPU-aware orchestrator) checks the constraint.
