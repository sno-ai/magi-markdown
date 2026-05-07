---
name: intro-summary
description: Summarize the preceding section of an MDA document into 2-3 actionable bullets. Use when an MDA author wants a quick recap surfaced inline.
metadata:
  mda:
    title: Intro Summary
    doc-id: c2cb4f0e-3e1f-4f5a-9b80-72d2c4d6c4f1
    author: Sno Lab
    tags: [example, summary, intro]
    created-date: 2026-05-07T00:00:00Z
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
exercises every MDA-extended construct in miniature and is byte-for-byte
acceptable to any agentskills.io v1 consumer.

## A relationship

This document references the SKILL.md target schema as its conceptual parent[^skill-md-spec].

## A script reference

The auto-run instruction that summarizes this section lives at
[`scripts/intro-recap.ai-script.json`](scripts/intro-recap.ai-script.json).

[^skill-md-spec]: {"rel-type": "parent", "doc-id": "spec-skill-md-v1.0", "rel-desc": "MDA SKILL.md target schema"}
