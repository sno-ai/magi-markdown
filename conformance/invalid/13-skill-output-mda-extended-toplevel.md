---
name: bad-skill-output
description: Compiled SKILL.md keeps `doc-id` at the top level instead of nesting under metadata.mda. Expected to be rejected by §06-targets/skill-md §06-3.3 (unevaluatedProperties:false).
doc-id: 99999999-9999-9999-9999-999999999999
---

# Bad SKILL output

A conformant compiler MUST relocate `doc-id` to `metadata.mda.doc-id`. This file
exists to verify that the strict SKILL.md target schema rejects the violation.
