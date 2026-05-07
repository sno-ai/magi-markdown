# §06-targets/mcp-server-md — MCP-SERVER.md target schema

> **Status:** Stable (Tier 2)
> **Schema:** [`schemas/frontmatter-mcp-server-md.schema.json`](../../../schemas/frontmatter-mcp-server-md.schema.json)
> **Upstream standard:** AAIF-stewarded Model Context Protocol — https://modelcontextprotocol.io/
> **Depends on:** §00, §01, §02, §03, §04, §05

## §06-1 Synopsis

This section is the **target schema** the MDA compiler emits when producing a file named `MCP-SERVER.md`. It is MDA's first-class description format for an MCP server, intended as the discovery and trust surface that an MCP client (Claude Desktop, Codex, OpenCode, Cursor, Windsurf, internal agent platforms) reads before deciding whether to launch the server.

`MCP-SERVER.md` is a **two-file artifact**: a Markdown file plus a sidecar JSON file (`mcp-server.json`) containing the machine-readable server configuration. The Markdown file is the human- and agent-readable description; the JSON file is the machine-readable launch spec. Both files MUST be co-located.

## §06-2 Directory layout

```
<server-name>/
├── MCP-SERVER.md     # required: frontmatter + Markdown description
├── mcp-server.json   # required: sidecar machine-readable launch spec
└── ...               # optional additional files (README, scripts/, etc.)
```

### §06-2.1 Directory name

The package directory name MUST equal the frontmatter `name` field.

### §06-2.2 Sidecar requirement

`mcp-server.json` MUST exist at the same directory level as `MCP-SERVER.md`. The sidecar is owned by the AAIF-stewarded MCP specification, which evolves independently of MDA. MDA does NOT ship a sidecar JSON Schema and does NOT validate the sidecar against the upstream MCP schema.

What MDA *does* require: the three fields it must read to enforce the cross-file checks in §06-2.3. Compilers and validators MUST check these as a JSON parse + key/type test:

| Sidecar field | Type | Required by MDA | Notes |
| ------------- | ---- | --------------- | ----- |
| `name` | string | yes | Server identifier; MUST equal frontmatter `name` (§06-2.3). |
| `version` | string | yes | SemVer 2.0.0; consumers use this for `depends-on` resolution (§03-3). |
| `transport` | string | yes | One of `stdio`, `http`, `sse` (extensible by the MCP spec). |

Any additional fields the MCP project defines MAY appear and MUST be preserved verbatim by MDA tooling.

### §06-2.3 Cross-file consistency

The compiler MUST verify that:

- `MCP-SERVER.md` frontmatter `name` equals `mcp-server.json`'s `name`.
- When `integrity` is present in the frontmatter, the digest covers both files in the order `MCP-SERVER.md`, `mcp-server.json` (see §08).

## §06-3 Frontmatter

The emitted `MCP-SERVER.md` MUST start with YAML frontmatter delimited by `---` lines. The strict shape is enforced by `schemas/frontmatter-mcp-server-md.schema.json` (`unevaluatedProperties: false`).

### §06-3.1 Required fields

| Field | Constraint |
| ----- | ---------- |
| `name` | Kebab-case identifier (§02-2.1); matches package directory name (§06-2.1) and `mcp-server.json` server identifier. |
| `description` | 1-1024 chars; SHOULD describe what the server does AND what tools/resources it exposes. |

### §06-3.2 Optional fields

| Field | Constraint |
| ----- | ---------- |
| `license` | (§02-2.3) |
| `compatibility` | (§02-2.4) |
| `metadata` | Free-form key→object map; MDA-extended fields nest under `metadata.mda.*`, per-vendor fields under `metadata.<vendor>.*` (§04). |
| `integrity` | (§02-2.7, §08); covers both `MCP-SERVER.md` and `mcp-server.json`. |
| `signatures` | (§02-2.8, §09); `integrity` REQUIRED when present. |

`allowed-tools` is NOT permitted at the top level of an MCP-SERVER.md output.

### §06-3.3 Forbidden top-level fields

Every MDA-extended field MUST nest under `metadata.mda.*`. The schema enforces this with `unevaluatedProperties: false`.

## §06-4 Body

The Markdown body following the frontmatter:

- MUST be standard Markdown.
- SHOULD describe each exposed tool and resource: name, intended use, input/output shape, side effects, and any required environment variables.
- SHOULD include an "Authorization required" section that an installer can surface to the user.
- MAY contain standard Markdown footnotes `[^id]: ...` for relationships (§03-2).

The §05 progressive-disclosure tier discipline applies, with the MCP-specific reading: the `mcp-server.json` sidecar is a tier-1-equivalent artifact (a client reads it once at install/launch), while the Markdown body is tier-2.

## §06-5 Footnote relationship handling

When the source contains MDA relationship footnotes (§03-2):

- The compiler MAY preserve the footnote definitions verbatim in the body.
- The compiler MUST also serialize the same payloads to `metadata.mda.relationships` in the output frontmatter (§03-4).

## §06-6 Validation

The MDA compiler and validator MUST:

1. Validate `MCP-SERVER.md` frontmatter against `schemas/frontmatter-mcp-server-md.schema.json`.
2. Parse `mcp-server.json` as JSON and verify the `name` / `version` / `transport` fields per §06-2.2 (string types, present, non-empty). MDA does not validate the rest of the sidecar.
3. Verify the cross-file consistency rules in §06-2.3.

A compile that produces an inconsistent pair MUST exit non-zero.

## §06-7 Conformance summary

An emitted MCP-SERVER package is conformant iff:

1. It lives at `<name>/MCP-SERVER.md` with the directory name matching frontmatter `name`. (§06-2.1)
2. `<name>/mcp-server.json` exists, parses as JSON, has `name`/`version`/`transport` strings (§06-2.2), and the `name` matches the Markdown frontmatter (§06-2.3).
3. Top-level frontmatter contains only the fields listed in §06-3.1 and §06-3.2, with `name` and `description` required. (`unevaluatedProperties: false` enforced.)
4. All MDA-extended frontmatter is nested under `metadata.mda.*`; all per-vendor fields under `metadata.<vendor>.*`. (§06-3.3, §04)
5. Body is standard Markdown. (§06-4)
6. If the source had relationship footnotes, the `metadata.mda.relationships` mirror MUST be present in frontmatter. (§06-5, §03-4)
7. If `signatures[]` is present, `integrity` MUST also be present, MUST cover both `MCP-SERVER.md` and `mcp-server.json`, and every signature's `payload-digest` MUST equal `integrity.digest`. (§08, §09)

## §06-8 Examples

See `examples/mcp-server/` (when added) for a minimal conformant pair and one that exercises tool/resource documentation, environment variables, and signed integrity.

## §06-9 Rationale

- **Why a sidecar JSON file?** MCP clients already expect a machine-readable launch spec (command, args, env, transport). Trying to encode that in YAML frontmatter would force every client to add a YAML parser; the JSON sidecar matches what every client already reads.
- **Why does integrity cover both files?** Because tampering with either file changes the trust posture: a Markdown-only signature would let an attacker swap the sidecar's `command` while keeping the human-visible description honest. The combined digest closes that gap (see §08).
- **Why is this Tier 2 in v1.0 and not Tier 1?** Adoption pattern. As of 2026-Q2, MCP server descriptions are still proliferating in ad-hoc forms; MDA wants observable demand and at least two independent implementations before declaring the schema Tier 1. The path to Tier 1 is editorial (no breaking change required).
