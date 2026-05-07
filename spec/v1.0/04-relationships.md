# §04 — Relationships

> **Status:** Draft
> **Schema:** [`schemas/relationship-footnote.schema.json`](../../schemas/relationship-footnote.schema.json)
> **Depends on:** §00, §02

## §04-1 Synopsis

MDA defines explicit, typed relationships between documents using standard Markdown footnotes whose payload is a JSON object. This makes MDA documents directly graph-ready: the relationship edges are machine-readable without custom parsing of prose.

## §04-2 Footnote syntax

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

## §04-3 Payload fields

| Field | Type | Required | Notes |
| ----- | ---- | -------- | ----- |
| `rel-type` | enum | yes | One of `parent`, `child`, `related`, `cites`, `supports`, `contradicts`, `extends`. |
| `doc-id` | string | yes | Target document's `doc-id` (UUID recommended). |
| `rel-desc` | string | no | Human-readable description. |
| `rel-strength` | number [0,1] | no | Confidence/relevance. |
| `bi-directional` | boolean | no | Whether the link implies an inverse from the target. |
| `context` | object | no | Free-form scoping details (`section`, `relevance`, etc.). |

## §04-4 Output mirror requirement

When the `.mda` source contains one or more relationship footnotes, the compiler MUST emit the same payloads as an array under `metadata.mda.relationships` in the output frontmatter. This is normative: SKILL-only consumers, knowledge-graph indexers, and other readers that do not parse Markdown footnotes rely on the mirror.

The compiler MAY also preserve the footnote definitions verbatim in the output body. Standard Markdown footnotes degrade gracefully in every consumer.

### §04-4.1 Mirror shape

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

### §04-4.2 Conformance

A compiled output that contains relationship footnotes in its body MUST also contain the mirror. A compiled output that contains the mirror MAY omit the footnotes from the body. Both forms are conformant; the mirror is the authoritative machine-readable copy.

## §04-5 Relationship types — informative guidance

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

## §04-6 Examples

See `examples/source-only/intro.mda` for footnote use, and the matching `examples/skill-md/intro/SKILL.md` for the mirrored frontmatter.

Conformance fixtures: `03-relationships-with-mirror` (valid) and the compile fixture under `conformance/compile/` exercises the mirror requirement.
