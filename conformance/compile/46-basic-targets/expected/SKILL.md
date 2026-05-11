---
name: compile-basic
description: Basic compiler conformance fixture.
allowed-tools: Read Bash(echo:*)
metadata:
  snoai-llmix:
    module: search_summary
    preset: openai_fast
    common:
      provider: openai
      model: gpt-5-mini
  mda:
    requires:
      network: none
---

# Compile basic

Use this fixture to confirm target projection.
