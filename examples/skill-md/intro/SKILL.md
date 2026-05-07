---
name: intro-example
description: Minimal MDA source demonstrating relationship-graph footnotes and metadata.mda.* MDA-extended fields. Use as a reference fixture when learning the MDA source format.
metadata:
  mda:
    title: Intro Example
    doc-id: c2cb4f0e-3e1f-4f5a-9b80-72d2c4d6c4f1
    author: Sno Lab
    tags: [example, intro, relationships]
    created-date: "2026-05-07T00:00:00Z"
    purpose: example
    relationships:
      - rel-type: parent
        doc-id: spec-skill-md-v1.0
        rel-desc: MDA SKILL.md target schema
  claude-code:
    allowed-tools: "Read"
---

# Intro

This is the compiled SKILL.md form of `examples/source-only/intro.mda`. It
demonstrates how MDA-extended top-level frontmatter fields are relocated under
`metadata.mda.*` on compile, and how relationship footnotes are mirrored to
`metadata.mda.relationships`. The output is byte-for-byte acceptable to any
agentskills.io v1 consumer.

## A relationship

This document references the SKILL.md target schema as its conceptual parent[^skill-md-spec].

[^skill-md-spec]: {"rel-type": "parent", "doc-id": "spec-skill-md-v1.0", "rel-desc": "MDA SKILL.md target schema"}
