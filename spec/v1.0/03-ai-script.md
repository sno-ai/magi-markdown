# §03 — ai-script

> **Status:** Draft
> **Schema:** [`schemas/ai-script.schema.json`](../../schemas/ai-script.schema.json)
> **Depends on:** §00 (terminology), §01 (source/output), §02 (frontmatter)

## §03-1 Synopsis

`ai-script` is MDA's mechanism for embedding structured LLM/agent instructions inside a document. It exists in two forms:

- **Inline form** — a fenced code block with info-string `ai-script` inside a `.mda` source.
- **Externalized form** — a JSON file at `scripts/<script-id>.ai-script.json` inside a compiled output package.

The two forms are equivalent. The MDA compiler converts inline → externalized when emitting outputs that disallow non-standard fences (every target schema in v1.0).

## §03-2 Inline form (source)

### §03-2.1 Syntax

````markdown
```ai-script
{
  "script-id": "summary-request",
  "prompt": "Summarize the preceding section.",
  "priority": "medium",
  "auto-run": true,
  "output-format": "markdown"
}
```
````

The block:

- MUST be a standard Markdown fenced code block with info-string exactly `ai-script`.
- MUST contain a single JSON object that conforms to `schemas/ai-script.schema.json`.
- SHOULD be preceded by an HTML comment of the form `<!-- AI-PROCESSOR: ... -->` so legacy renderers and human readers know the block is not for them. The comment is informational; absence is not a conformance failure.

### §03-2.2 Where it MAY appear

Anywhere in the body of a `.mda` source (between the closing `---` of the frontmatter and the end of file). Multiple blocks per document are allowed, each with a unique `script-id`.

### §03-2.3 Where it MUST NOT appear

- In any compiled output (target schemas forbid the `ai-script` fence in body content).
- Inside another fenced block (no nesting).

## §03-3 Externalized form (output)

### §03-3.1 File layout

For every inline `ai-script` block whose `script-id` is `S` in the source, the compiler MUST produce the file `scripts/S.ai-script.json` in the output directory:

```
<name>/
├── SKILL.md
└── scripts/
    ├── summary-request.ai-script.json
    └── classify-tone.ai-script.json
```

The file content is the same JSON object that appeared between the fences, validated against `schemas/ai-script.schema.json`.

### §03-3.2 Body reference

The body location where the inline block appeared MUST be replaced by a Markdown reference to the externalized file. The recommended replacement is a short paragraph:

```markdown
See `scripts/summary-request.ai-script.json` for the auto-run summary instruction
applied to the preceding section.
```

The exact wording is not normative. What is normative is that the relative path appears in the body so consumers can discover the script without reading the directory listing.

### §03-3.3 `script-id` constraints

- MUST match `^[a-z0-9]+([-_.][a-z0-9]+)*$`, length 1-128.
- MUST be unique within the document/skill.
- MUST equal the basename of the externalized file (without the `.ai-script.json` suffix).

## §03-4 Field reference

The `ai-script` payload schema is normative; the table below is informative guidance.

| Field | Type | Required | Notes |
| ----- | ---- | -------- | ----- |
| `script-id` | string | yes | Kebab/snake/dot-segmented lowercase. |
| `prompt` | string | yes | The instruction text. |
| `priority` | enum | no | `high` \| `medium` \| `low`. Default `medium`. |
| `auto-run` | boolean | no | Default `false`. |
| `provider` | string | no | Provider hint. |
| `model-name` | string | no | Model hint. |
| `system-prompt` | string | no | |
| `parameters` | object | no | Provider-specific, free-form. |
| `retry-times` | integer | no | 0-100. |
| `runtime-env` | string | no | Hint for execution environment. |
| `output-format` | enum | no | `text` \| `markdown` \| `json` \| `image-url`. |
| `output-schema` | object | no | JSON Schema for output; implies `output-format=json`. |
| `stream` | boolean | no | Default `false`. |
| `interactive-type` | enum | no | `button` \| `inputbox`. |
| `interactive-label` | string | no | UI label. |
| `interactive-placeholder` | string | no | Inputbox placeholder. |

## §03-5 Round-trip guarantee

The compile transformation between inline and externalized form MUST be lossless and reversible. Specifically:

- Every field in the inline JSON appears verbatim in the externalized JSON.
- The `script-id` value uniquely identifies the source location.
- A future v1.1+ reverse compiler MUST be able to recover the inline form from the externalized form plus the body reference.

## §03-6 Rationale

- **Why externalize at all?** Because the SKILL.md target (and every other v1.0 target) requires pure standard Markdown body. A non-standard fence makes the file fail upstream validators and renders awkwardly in third-party consumers.
- **Why not just remove `ai-script` from MDA entirely?** Because in `.mda` sources it is the most ergonomic place to attach an instruction to a specific spot in the prose. Externalizing on compile preserves the authoring ergonomics without paying the interop cost.
- **Why JSON in an MDA source rather than YAML?** YAML inside YAML frontmatter is parseable but error-prone (indentation interleaving). JSON inside a fenced block is unambiguous and matches the externalized file format byte-for-byte.

## §03-7 Examples

See `examples/source-only/intro.mda` for the inline form and `examples/skill-md/intro/scripts/` for its externalized counterpart.

Conformance fixture `21-mda-with-ai-script` (under `conformance/compile/`) exercises the full transformation.
