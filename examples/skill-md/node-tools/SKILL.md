---
name: node-tools
description: Run a TypeScript script via tsx to fetch an HTTP endpoint and stream the response. Use when you need a small Node.js helper for HTTP calls.
metadata:
  mda:
    title: Node Tools
    doc-id: 8c1a4d96-2e7b-44a3-9f1c-3d6f8b2a9e10
    author: Sno Lab
    tags: [example, typescript, node]
    created-date: "2026-05-07T00:00:00Z"
    version: "1.0.0"
    requires:
      runtime: ["node>=20"]
      tools: ["Read", "Bash"]
      network: ["api.example.com"]
      packages: ["tsx", "undici"]
    relationships:
      - rel-type: cites
        doc-id: spec-capabilities-v1.0
        rel-desc: MDA capabilities (metadata.mda.requires) reference
  claude-code:
    allowed-tools: "Read Bash(pnpm:*) Bash(tsx:*)"
---

# Node Tools

This is the compiled SKILL.md form of `examples/source-only/node-tools.mda`.
The MDA-extended top-level fields are relocated under `metadata.mda.*`, and
the typed footnote is mirrored to `metadata.mda.relationships`. The output is
acceptable to any agentskills.io v1 consumer.

A consumer that recognizes `metadata.mda.requires` (§10) can decide
programmatically whether it can satisfy `runtime: ["node>=20"]`,
`network: ["api.example.com"]`, and the `tsx` / `undici` packages before
activating the skill.

## A relationship

This skill cites the MDA capabilities specification[^capabilities-spec].

[^capabilities-spec]: {"rel-type": "cites", "doc-id": "spec-capabilities-v1.0", "rel-desc": "MDA capabilities (metadata.mda.requires) reference"}
