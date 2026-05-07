---
name: compile-fixture-21
description: Source for compile fixture 21. Exercises MDA-extended frontmatter, an inline ai-script block, and a relationship footnote, all in one document.
metadata:
  mda:
    title: Compile Fixture 21
    doc-id: deadbeef-1234-1234-1234-1234deadbeef
    tags: [conformance, compile]
    relationships:
      - rel-type: parent
        doc-id: spec-skill-md-v1.0
        rel-desc: MDA SKILL.md target schema
---

# Compile fixture 21

The body holds an inline ai-script and a footnote relationship[^p].

See [`scripts/fx21-step.ai-script.json`](scripts/fx21-step.ai-script.json) for the
externalized script payload.

[^p]: {"rel-type": "parent", "doc-id": "spec-skill-md-v1.0", "rel-desc": "MDA SKILL.md target schema"}
