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
3. For each entry under `invalid/`: validate the file. Verdict MUST be **reject**. Rule IDs are informative for humans; when `expected-error` is present, the rejection category MUST match it.
4. For each entry under `compile/`: read `input.mda`, compile to the named target, and compare the output tree to `expected/` byte-for-byte (after YAML-key-order normalization).

For trusted-runtime semantic fixtures, `verified-identities` records the
post-crypto identity that the runner should match against the trust policy.

A run that disagrees with the manifest on any entry is a non-conformance.

## Adding fixtures

When a new spec rule is added, add at least one `valid/` and one `invalid/` fixture exercising it. Update `manifest.yaml` in the same PR.

Numbering convention: fixture IDs are stable numeric slugs. Allocate the next
unused integer; do not infer fixture type from the number.

The compiler's CI MUST run this suite on every PR.
