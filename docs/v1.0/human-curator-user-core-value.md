# MDA v1.0 — Core value for human authors and curators

For: humans who write, curate, ship, or evaluate agent-facing instruction libraries. Domain experts collaborating with AI agents, library maintainers, adoption decision-makers.

Every claim below traces to a section of `spec/v1.0/`. Where consumer-side adoption isn't there yet, the claim says so inline. The full gap is in [`what-v1.0-does-not-ship.md`](what-v1.0-does-not-ship.md).

Six points, framed around the pain you actually hit shipping agent-facing instruction artifacts in 2026.

---

## 1. One source, multiple drop-in target outputs

In 2026 a single instruction asset routinely needs to ship as `SKILL.md` for the agentskills.io v1 ecosystem, `AGENTS.md` for the AAIF-aligned ecosystem, and `MCP-SERVER.md` for MCP servers. Kept as separate copies, those duplicates drift.

A single `.mda` source compiles to one or more `.md` outputs whose target schema is selected by filename literal (§01-2.2, §01-3). `SKILL.md` is loadable by every agentskills.io v1 consumer per §06-targets/skill-md §06-1 (Claude Code, OpenCode, OpenAI Codex, Hermes Agent, OpenClaw, skills.sh, Cursor, Windsurf). `AGENTS.md` is loadable by AAIF consumers per §06-targets/agents-md §06-1 (Codex CLI, GitHub Copilot, Cursor, Windsurf, Amp, Devin, Gemini CLI, VS Code, Jules, Factory). `MCP-SERVER.md` ships with its `mcp-server.json` sidecar (§06-targets/mcp-server-md). `CLAUDE.md` is the stub target (§06-targets/claude-md). Each output is independently validated against JSON Schema 2020-12 with `unevaluatedProperties: false` (§02, §06).

**Hedge.** v1.0 covers the agentskills.io and AAIF subset of the 2026 fragmentation. It does **not** target Cursor MDC, Windsurf rules, Continue, Aider, or `*.instructions.md`. Those still need parallel maintenance. Vendor-specific behavior under `metadata.<vendor>.*` may or may not be honored by any given consumer (§04-5).

---

## 2. Tamper-evidence and publisher attribution for shared artifacts

Pulling skills from directories like skills.sh or agentskills.io creates a prompt-injection supply chain. A poisoned Markdown file can impersonate a trusted author, and the body content can direct the consuming agent to act against its operator.

MDA v1.0 specifies a reproducible `integrity` digest derived through JCS canonicalization with a multi-file boundary literal (§08-3), DSSE PAE-enveloped `signatures[]` with Sigstore OIDC keyless as the default and `did:web` + `mda-keys.json` as an air-gap fallback (§09-1, §09-3, §09-4, §09-5), and the runner-enforced cross-field check that every `signatures[].payload-digest` equals `integrity.digest` byte-for-byte (§07-2.1, §09-2). A verifier rederives the digest, looks up Rekor inclusion, verifies the Fulcio certificate chain, and applies an OIDC identity allow-list against operator policy (§09-4.2, §09-7). The uniform self-describing `<algorithm>:<hex>` digest format applies across `integrity.digest`, `signatures[].payload-digest`, and `depends-on.digest` (§08-2).

**Hedge.** v1.0 specifies the contract. It does **not** ship a turnkey verifier. Operators currently glue `cosign` and a JCS library themselves. Sigstore-path verification depends on Fulcio and Rekor reachability. Reserved Sigstore OIDC issuers in `REGISTRY.md` are recognition, not blanket trust. Unsigned authoring still works; signing is opt-in per artifact.

---

## 3. Machine-readable dependency graph and version pinning for reproducibility

An author who composes one skill on top of another can have a working setup on Tuesday and a broken one on Thursday because a dependency changed without a compatible version or content anchor.

MDA v1.0 specifies `metadata.mda.version` constrained to SemVer 2.0.0 (§02-3.2), `metadata.mda.depends-on` with a restricted version-range grammar (exact + caret only) and an optional `digest` pin in self-describing `<algorithm>:<hex>` form (§03-3, §03-3.1, §03-3.2), and a normative resolver obligation to refuse load when the resolved artifact's `integrity.digest` does not equal the declared pin (§03-3.3). Document-graph relationships (`parent`, `child`, `related`, `cites`, `supports`, `contradicts`, `extends`) live separately as typed Markdown footnotes, mirrored to `metadata.mda.relationships` whose order matches the body's first-reference order (§03-2, §03-2.1, §03-4).

**Hedge.** v1.0 defines resolver behavior but does **not** ship a working resolver implementation, and does not ship a central artifact registry. Early adopters write their own glue against the schemas. If the resolver story slips, the author has at least documented the intended dependency graph in machine-readable frontmatter that downstream tooling can inspect or ignore.

---

## 4. LLM-mediated authoring — domain experts can ship without learning every runtime's frontmatter

A legal, finance, medical, DevOps, or data subject-matter expert can write the body of an instruction document. They can't realistically track each vendor's frontmatter shape, progressive-disclosure rules, and namespace conventions.

MDA's design priority is **P0 (AI-agent authorability) > P1 (human authorability) > P2 (tooling convenience)** (§0.5). The v1.0 contract requires an LLM with only the spec in context, no MDA tooling, and no examples from prior turns, to be able to produce conforming output (§0.6). The three equivalent authoring modes (Agent, Human, Compiled) let the expert collaborate with an agent that wraps the body in conforming MDA. Standard `requires` keys and vendor namespaces are governed by a single `REGISTRY.md`, so the agent has one authoritative table to consult.

**Hedge.** P0 is a design constraint and a conformance target. It's not yet evidence from large-scale arbitrary LLM output in production. If the LLM-mediated path produces a non-conforming artifact, the body content survives independently as plain Markdown. The expert has worked with one disciplined Markdown subset, not an exotic format.

---

## 5. Vendor lock-in shrinks but does not disappear

Moving a working library between Claude Code, Codex, OpenCode, and the other agentskills.io v1 consumers currently means translating frontmatter, tool allowlists, file layout assumptions, and invocation descriptions by hand.

MDA v1.0 makes the **portable surface** portable. Filename selects the target schema (§01-2.2). Structured open-standard fields and MDA-extended fields are uniform across consumers. Per-runtime configuration is isolated under `metadata.<vendor>.*` (§04-1). MDA-aware tools preserve unknown vendor namespaces, vendor loaders read only their own namespace, and consumers must not reject a document solely because it contains an unregistered kebab-case namespace (§04-5, §04-5.1). The portable contract is the MDA spec plus target schemas, with registry-governed vendor namespaces (`REGISTRY.md`) instead of a single vendor-owned extension surface.

**Hedge.** The vendor-specific surface stays vendor-specific by design. `metadata.claude-code.allowed-tools` doesn't translate to a Cursor concept. MDA shifts the migration cost from "rewrite the whole library" to "rewrite the vendor blocks". It doesn't eliminate it. Authors still hand-curate vendor blocks, and vendors still decide what they honor. Adopting MDA shifts some coordination to the spec and registry maintainers rather than eliminating coordination.

---

## 6. Strict validation catches "almost conformant" artifacts before they ship

Agents often produce skill files that look valid to a human but contain one misspelled field, an unquoted version that YAML 1.1 coerces to a number, an MDA-extended field at the top level of a target output, or a non-portable capability key. Most current skill formats silently accept these.

MDA v1.0 catches them at validation time. JSON Schema 2020-12 with `unevaluatedProperties: false` on every target schema (§02, §06). Normative quoted-timestamp and SemVer 2.0.0 constraints (§02-3.1, §02-3.2). A 35-fixture conformance suite that includes negative-path fixtures for each rule (§07, `conformance/manifest.yaml`). A runner-enforced cross-field semantic check that `signatures[].payload-digest` equals `integrity.digest` byte-for-byte (§07-2.1, §09-2). This level of strictness is unusual for an agent-format YAML.

**Hedge.** Strictness pushes failure earlier (to the validator) instead of letting silent runtime drift hit users later. The cost is that sloppy artifacts get rejected at validation rather than activation, and authors have to take frontmatter seriously even in early drafts.

---

## v1.0 scope honesty

This page describes the contract. The gap between the contract and the consumer-side ecosystem (no bundled verifier, no shipped resolver, no coverage of Cursor MDC / Windsurf rules / Continue / Aider) lives in [`what-v1.0-does-not-ship.md`](what-v1.0-does-not-ship.md).

**The author-side value of MDA v1.0 is a contract that lets you ship one source into multiple ecosystems with explicit dependency, capability, and trust semantics. Provided you treat the unshipped consumer-side pieces as work in progress, not as commitments already kept.**
