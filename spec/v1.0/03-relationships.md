# §03 — Relationships

> **Status:** Stable
> **Schemas:**
> - [`schemas/relationship-footnote.schema.json`](../../schemas/relationship-footnote.schema.json)
> - [`schemas/_defs/depends-on.schema.json`](../../schemas/_defs/depends-on.schema.json)
> - [`schemas/_defs/version-range.schema.json`](../../schemas/_defs/version-range.schema.json)
> **Depends on:** §00, §02

## §03-1 Synopsis

MDA defines explicit, typed relationships between documents using two complementary mechanisms:

1. **Inline relationship footnotes** — standard Markdown footnotes whose payload is a JSON object. Authored in the body, mirrored to frontmatter. Edges are typed (`parent`, `child`, `cites`, …) and human-readable in context.
2. **`depends-on` declarations** — frontmatter-only edges with SemVer ranges and optional content-digest pinning. Used when one artifact functionally requires another at runtime.

Both mechanisms make MDA documents directly graph-ready: relationship edges are machine-readable without custom parsing of prose.

## §03-2 Inline footnote relationships

The relationship lives in the body of the source as a standard Markdown footnote definition:

```markdown
This document outlines changes[^ref1] and implications[^ref2].

[^ref1]: {"rel-type": "parent", "doc-id": "UUID-of-parent-doc", "rel-desc": "Derived from SEC docs"}
[^ref2]: {"rel-type": "related", "doc-id": "UUID-of-related-doc", "rel-desc": "Provides context"}
```

Rules:

- The footnote ID (e.g. `ref1`) MUST be unique within the document.
- The footnote definition's content MUST be a single JSON object that conforms to `schemas/relationship-footnote.schema.json`.
- The footnote MAY appear anywhere a Markdown footnote is legal (typically at the end of the document).

### §03-2.1 Footnote payload fields

| Field | Type | Required | Notes |
| ----- | ---- | -------- | ----- |
| `rel-type` | enum | yes | One of `parent`, `child`, `related`, `cites`, `supports`, `contradicts`, `extends`. |
| `doc-id` | string | yes | Target document's `doc-id` (UUID recommended). |
| `rel-desc` | string | no | Human-readable description. |
| `rel-strength` | number [0,1] | no | Confidence/relevance. |
| `bi-directional` | boolean | no | Whether the link implies an inverse from the target. |
| `context` | object | no | Free-form scoping details (`section`, `relevance`, etc.). |

### §03-2.2 Relationship types — informative guidance

| Type | Direction | Typical use |
| ---- | --------- | ----------- |
| `parent` | this ← target | This document is derived from or scoped under the target. |
| `child` | this → target | This document defines or owns the target. |
| `related` | symmetric | Two documents discuss overlapping topics. |
| `cites` | this → target | This document references the target as evidence/source. |
| `supports` | this → target | This document provides evidence for the target's claim. |
| `contradicts` | this → target | This document disputes the target's claim. |
| `extends` | this → target | This document adds capability or scope to the target. |

For non-trivial graphs, prefer `cites` over `related` (more precise) and prefer `parent`/`child` over both (most precise).

## §03-3 `depends-on` declarations

A `.mda` source MAY declare functional runtime dependencies on other MDA artifacts. In source frontmatter the field MAY appear at the top level as `depends-on:` (the source schema accepts both top-level placement and nesting under `metadata.mda.depends-on` for source-side authoring convenience); in any compiled `.md` output it MUST be relocated under `metadata.mda.depends-on` per §01-4. Unlike footnote relationships (which describe documentary lineage), `depends-on` describes resolution: a consumer that activates this artifact MUST be able to resolve every entry to a concrete artifact that satisfies the version constraint.

### §03-3.1 Shape

```yaml
metadata:
  mda:
    depends-on:
      - name: pdf-tools
        version-range: "^1.2.0"
        digest: "sha256:a4f9c0d2e8b3a1..."   # optional pinning
      - name: web-fetch
        version-range: "1.0.3"               # exact pin
```

| Field | Type | Required | Notes |
| ----- | ---- | -------- | ----- |
| `name` | string | yes | Kebab-case identifier of the depended-upon artifact (matches that artifact's top-level `name`). |
| `version-range` | string | yes | A valid range per §03-3.2. |
| `digest` | string | no | Content digest pin in `<algorithm>:<hex>` form. When present, the resolved artifact's `integrity.digest` (§08) MUST match. |

Schema: `_defs/depends-on.schema.json`.

### §03-3.2 `version-range` grammar (normative, restricted)

To keep agent and human authoring unambiguous, MDA v1.0 admits a **strict subset** of SemVer range syntax:

| Form | Meaning | Example |
| ---- | ------- | ------- |
| Exact | The single SemVer 2.0.0 version. | `1.2.0` |
| Caret | Any version `>=X.Y.Z` and `<(X+1).0.0` (compatible-with-next-major). For 0.x, caret behaves as `~` per SemVer convention: `^0.2.3` ⇒ `>=0.2.3 <0.3.0`. | `^1.2.0` |

Out of scope for v1.0:

- Tilde ranges (`~1.2.0`)
- Compound ranges (`>=1.2.0 <2.0.0`, `||`, hyphen ranges)
- Wildcards (`1.x`, `*`)
- Pre-release matching across boundaries

A range that fails to parse as one of the two forms MUST be rejected by the source schema. Schema: `_defs/version-range.schema.json`.

### §03-3.3 Resolution and conformance

A consumer (or build/install tool) that resolves `depends-on`:

- MUST locate an artifact whose `name` matches and whose `metadata.mda.version` satisfies the range per §03-3.2.
- MUST, when `digest` is present, verify that the resolved artifact's `integrity.digest` equals the declared `digest` and refuse to load on mismatch.
- SHOULD prefer the highest satisfying version when multiple candidates exist.
- MAY fail closed (refuse to activate) when no satisfying artifact is found; this is the recommended default.

A circular `depends-on` graph is not defined behavior; tools SHOULD detect and reject cycles.

### §03-3.4 Why `depends-on` is separate from footnotes

Footnote relationships describe the document graph (lineage, citation, contradiction). `depends-on` describes the runtime graph (what must be resolvable for this artifact to function). Mixing the two would force every consumer to walk the document graph at activation time even when only the runtime graph matters.

## §03-4 Frontmatter mirror of footnote relationships

When the `.mda` source contains one or more relationship footnotes, the compiler MUST emit the same payloads as an array under `metadata.mda.relationships` in the output frontmatter. This is normative: SKILL-only consumers, knowledge-graph indexers, and other readers that do not parse Markdown footnotes rely on the mirror.

The compiler MAY also preserve the footnote definitions verbatim in the output body. Standard Markdown footnotes degrade gracefully in every consumer.

### §03-4.1 Mirror shape

```yaml
metadata:
  mda:
    relationships:
      - rel-type: parent
        doc-id: UUID-of-parent-doc
        rel-desc: Derived from SEC docs
      - rel-type: related
        doc-id: UUID-of-related-doc
        rel-desc: Provides context
```

The order of entries in the mirror MUST follow the order in which the corresponding footnote references first appear in the body.

### §03-4.2 Conformance

A compiled output that contains relationship footnotes in its body MUST also contain the mirror. A compiled output that contains the mirror MAY omit the footnotes from the body. Both forms are conformant; the mirror is the authoritative machine-readable copy.

A `.mda` source MAY also include the mirror directly (Agent and Human modes commonly do), in which case the compiler MUST verify that the mirror agrees with the footnotes and reject on mismatch.

## §03-5 Examples

See `examples/source-only/intro-example.mda` for footnote use, the matching `examples/skill-md/intro/SKILL.md` for the mirrored frontmatter, and `examples/skill-md/pdf-tools/SKILL.md` (when added) for `depends-on` with both range and digest pinning.

Conformance fixtures live under `conformance/valid/` (`03-relationships-with-mirror`) and `conformance/compile/` (mirror requirement and depends-on resolution).
