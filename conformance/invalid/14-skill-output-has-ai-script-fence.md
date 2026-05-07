---
name: bad-fence-output
description: Compiled SKILL.md body contains an inline ai-script fence; expected to be rejected by §07-4 (body MUST NOT contain ai-script fence) and §03-2.3 (ai-script MUST NOT appear in compiled outputs).
---

# Bad fence output

A conformant compiler MUST externalize ai-script blocks (§03-3). The block below
is illegal in any compiled output.

```ai-script
{
  "script-id": "should-have-been-externalized",
  "prompt": "This block should never appear in a compiled SKILL.md."
}
```
