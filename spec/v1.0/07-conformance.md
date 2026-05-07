# §07 — Conformance

> **Status:** Draft
> **Suite:** [`conformance/`](../../conformance/)
> **Manifest:** [`conformance/manifest.yaml`](../../conformance/manifest.yaml)

## §07-1 Synopsis

A conforming MDA implementation MUST pass the conformance suite at `conformance/` for the implementation level it claims (validator, compiler, or both). The suite binds every fixture to one or more spec rule IDs in `manifest.yaml`, so a failing run identifies the specific clause violated.

## §07-2 Conformance levels

An implementation declares one of the following levels:

### §07-2.1 Validator (level V)

A tool that reads `.mda` source files and/or `.md` outputs and reports validity against the relevant schemas and rules.

A level-V implementation MUST:

1. Accept every fixture under `conformance/valid/` per its `against` schema list.
2. Reject every fixture under `conformance/invalid/`. The `rules` field in `manifest.yaml` records the spec clauses each fixture exercises and is informative for humans triaging failures; implementations are not required to surface rule IDs in their output.
3. Report a non-zero exit status (or equivalent error signal) for every reject decision.

### §07-2.2 Compiler (level C)

A tool that reads a `.mda` source and emits one or more compiled `.md` outputs per §01-4.

A level-C implementation MUST:

1. Implement every level-V requirement (compilers must validate their input).
2. For every fixture under `conformance/compile/`: read `input.mda`, compile to the named target, and produce a directory tree byte-equivalent to `expected/` after YAML-key-order normalization.
3. Validate every emitted output against the appropriate target schema; refuse to emit invalid output.

## §07-3 Running the suite

The reference runner is shipped with the MDA tooling repo. Generic invocation:

```
mda conformance --suite conformance/ --level C
```

CI integrations MUST run the suite at level V at minimum on every PR, and at level C wherever the compiler is built.

## §07-4 Fixture index

The authoritative index is `conformance/manifest.yaml`. The shape of each entry:

```yaml
- id: "<numeric-prefix-and-slug>"
  path: <relative-path-to-fixture-or-dir>
  against: [<schema-or-rule-ids>]              # optional; omit for extraction-only fixtures
  extraction-expected: ok | no-frontmatter |    # optional; §02-1.1 extraction-time verdict
                       unterminated-frontmatter |
                       invalid-encoding |
                       frontmatter-yaml-parse-error
  semantic-checks: [signature-digest-equality]  # optional; cross-field rules JSON Schema cannot express
  verdict: accept | reject | equal
  rules: [§<section>-<clause>, ...]
  description: <one or two sentences>
```

`verdict: accept` and `verdict: reject` apply to validator-level fixtures (`valid/`, `invalid/`). `verdict: equal` applies to compiler-level fixtures (`compile/`) and asserts byte-equivalence to the `expected/` tree. `extraction-expected` opts a fixture into the §02-1.1 extraction-time verdict check (BOM, CRLF, body-with-`---`-horizontal-rule, empty body, body-only files, unterminated frontmatter, invalid UTF-8); when set, the runner asserts the extractor returns the named outcome before applying any schema. `semantic-checks` opts a fixture into cross-field semantic rules (currently only `signature-digest-equality`, §09-2).

## §07-5 Adding fixtures

When a new normative rule is added to the spec:

1. Add at least one `valid/` fixture exercising the rule's accept path.
2. Add at least one `invalid/` fixture exercising each rejection path.
3. Update `manifest.yaml` in the same PR.
4. If the rule changes compile behavior, add a `compile/` fixture too.

Numbering convention is documented in `conformance/README.md`. New rule contributions without fixtures will not be merged.

## §07-6 Compatibility with upstream conformance

Fixtures whose target is `SKILL.md` SHOULD also be runnable through the upstream `skills-ref validate` reference checker (https://github.com/agentskills/agentskills/tree/main/skills-ref). Where the two checkers disagree, the divergence MUST be tracked as an issue in this repo and resolved before the next spec patch release.
