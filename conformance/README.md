# MDA conformance suite

A reference set of fixtures for validators and compilers. Every fixture is bound to one or more spec rules in `manifest.yaml` so a failing run identifies which rule fired.

## Layout

```
conformance/
├── manifest.yaml          # Binds fixture → rule id → expected verdict
├── valid/                 # MUST pass source-side validation
├── invalid/               # MUST fail validation; reason in manifest
└── compile/               # MUST compile to expected output (per-fixture subdir)
```

## How to use

A conforming MDA validator MUST:

1. Load `manifest.yaml`.
2. For each entry under `valid/`: validate the file against the schemas indicated in its `against` list. Verdict MUST be **accept**.
3. For each entry under `invalid/`: validate the file. Verdict MUST be **reject** AND the rejection reason MUST cite the spec rule listed in `rules`.
4. For each entry under `compile/`: read `input.mda`, compile to the named target, and compare the output tree to `expected/` byte-for-byte (after YAML-key-order normalization).

A run that disagrees with the manifest on any entry is a non-conformance.

## Adding fixtures

When a new spec rule is added, add at least one `valid/` and one `invalid/` fixture exercising it. Update `manifest.yaml` in the same PR.

Numbering convention:

- `01..10` — valid frontmatter, body, and resource fixtures
- `11..20` — invalid source fixtures
- `21..30` — compile-direction fixtures
- `31..40` — output-side validation fixtures (compiled `.md` against target schema)

The compiler's CI MUST run this suite on every PR.
