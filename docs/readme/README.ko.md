# 📝 MDA Open Spec — 에이전트를 위한 Markdown

> 에이전트 대상 문서를 위한 Markdown 슈퍼셋입니다. **하나의 소스, 다수의 대상** — 주요 에이전트 런타임이 이미 로드하고 있는 `.md` 파일들로 컴파일합니다. **로드 시점에 위변조를 탐지** — 모든 산출물은 재현 가능한 콘텐츠 다이제스트를 가지며, 서명된 산출물은 Sigstore에 고정된 서명을 함께 운반하므로, 문서를 로드하는 에이전트도 검토하는 사람도 서명되지 않은 블롭을 신뢰할 필요가 없습니다.

[![Latest release](https://img.shields.io/github/v/release/sno-ai/mda?include_prereleases&label=release&color=blue)](https://github.com/sno-ai/mda/releases/latest)
[![License](https://img.shields.io/github/license/sno-ai/mda)](https://github.com/sno-ai/mda/blob/main/LICENSE)
[![Docs](https://img.shields.io/badge/docs-mda.sno.dev-3b82f6)](https://mda.sno.dev)
[![GitHub stars](https://img.shields.io/github/stars/sno-ai/mda?style=flat&color=yellow)](https://github.com/sno-ai/mda/stargazers)

**다른 언어로 읽기:** [English](../../README.md) · [中文](README.zh-CN.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [Français](README.fr.md) · [Русский](README.ru.md) · **한국어** · [日本語](README.ja.md) · [हिन्दी](README.hi.md)

## MDA란 무엇인가

지금까지 같은 스킬을 네 번씩 배포해 왔습니다. agentskills.io 런타임을 위한 `SKILL.md`로 한 번, AAIF 생태계를 위한 `AGENTS.md`로 한 번, 사이드카 JSON이 딸린 `MCP-SERVER.md`로 한 번, 그리고 `CLAUDE.md`로 한 번. 같은 내용에 네 가지 frontmatter 형식. 하나를 갱신하고 나머지를 잊는 사이, 한 달이 지나면 네 파일은 어느새 조금씩 다른 지시 문서로 갈라져 있습니다.

이제 `.mda` 하나만 작성하면 됩니다. 컴파일러가 나머지를 만들어 냅니다.

![하나의 .mda 소스가 결정론적 파이프라인을 거쳐 SKILL.md, AGENTS.md, MCP-SERVER.md, CLAUDE.md로 컴파일되는 모습](../../images/hero-compile-pipeline.png)

```
                ┌─────────────────────────┐
                │   <name>.mda  (source)  │   ← MDA superset
                └────────────┬────────────┘
                             │  mda compile
                             ▼
   ┌─────────────────────────────────────────────────────────┐
   │ <name>/SKILL.md     (+ scripts/, references/, assets/)  │
   │ AGENTS.md                                               │
   │ <name>/MCP-SERVER.md  (+ mcp-server.json sidecar)       │
   │ CLAUDE.md                                               │
   └─────────────────────────────────────────────────────────┘
                       drop-in compatible
```

그리고 그 네 파일은 누가 서명했는지 말할 수단이 없습니다. `SKILL.md`를 로드하는 에이전트는 콘텐츠가 작성된 그대로인지 검증할 방법이 없고, `AGENTS.md`를 검토하는 큐레이터는 머지에서 로드 사이에 누구의 손을 거쳤는지 알 길이 없습니다. 표준 frontmatter 형식에는 콘텐츠 다이제스트나 서명을 둘 자리가 없으므로, 신뢰 결정은 결국 "어쨌든 이 저장소를 믿는다"라는 막연한 감각으로 떠넘겨집니다.

MDA는 frontmatter 안에 JCS 정규화된 `integrity.digest`와 DSSE 봉투 형식의 Sigstore 고정 `signatures[]`를 직접 운반합니다. 양쪽 — 로드 시점의 에이전트와 검토 시점의 사람 — 모두 저장소에 대한 막연한 느낌이 아니라 손에 쥔 산출물 자체에 대해 실질적인 신뢰 결정을 내릴 수 있습니다. 위변조 탐지와 서명자 검증이 나중에 덧붙이는 부속이 아니라, 계약 자체에 포함됩니다.

![표준 Markdown 위에 더해지는 MDA의 세 가지 요소: 풍부한 frontmatter, 타입이 지정된 footnote 관계, 서명된 정체성](../../images/three-additions.png)

`.mda`는 표준 Markdown 위에 세 가지를 더합니다. 모두 선택 사항입니다.

1. **풍부한 YAML frontmatter.** 오픈 표준의 `name`과 `description` 베이스라인 외에, MDA는 `doc-id`, `version`, `requires`, `depends-on`, `relationships`, `tags`를 운반합니다. 에이전트 대응 도구는 이 정보를 라우팅, 의존성 해결, 그래프 순회에 활용합니다. [`spec/v1.0/02-frontmatter.md`](../../spec/v1.0/02-frontmatter.md)와 [`spec/v1.0/10-capabilities.md`](../../spec/v1.0/10-capabilities.md)를 참고하세요.
2. **타입이 지정된 footnote 관계.** 페이로드가 JSON 객체인 표준 Markdown footnote입니다: `parent`, `child`, `related`, `cites`, `supports`, `contradicts`, `extends`. 컴파일 시 본문 순서대로 `metadata.mda.relationships`에 미러링됩니다. [`spec/v1.0/03-relationships.md`](../../spec/v1.0/03-relationships.md)를 참고하세요.
3. **암호학적 정체성.** JCS 정규화된 `integrity` 다이제스트와 DSSE 봉투 형식의 Sigstore 고정 `signatures[]`. 컴파일된 `.md`는 나중에 덧붙일 필요 없이 재현 가능한 위변조 탐지를 그대로 운반합니다. [`spec/v1.0/08-integrity.md`](../../spec/v1.0/08-integrity.md)와 [`spec/v1.0/09-signatures.md`](../../spec/v1.0/09-signatures.md)를 참고하세요.

오픈 표준 frontmatter만 가진 `.mda` 소스는 `.md`로 그대로 컴파일됩니다. 프로젝트에 필요한 만큼만 MDA를 사용하면 됩니다.

## 왜 이 프로젝트가 존재하는가

솔직한 이야기. 같은 스킬을 네 번씩 배포하는 일을 반복했습니다. 같은 내용에 네 가지 래퍼. 각 런타임마다 어떤 frontmatter가 최상단에 와야 하는지, 무엇이 벤더 고유인지에 대해 자기 의견이 있었습니다. `SKILL.md`와 `AGENTS.md` 사이에서 문단 하나를 세 번째인지 네 번째로 복사 붙여넣고 두 파일이 서로 갈라지는 것을 지켜본 시점에서, 이 프로젝트를 쓰기 시작했습니다.

사실 중복 자체가 가장 나쁜 부분은 아닙니다. 가장 나쁜 부분은 그런 형식들에서는 아예 표현할 수 없는 것들입니다. "이 스킬은 저 스킬의 `^1.2.0` 버전, 이 콘텐츠 다이제스트를 가진 것에 의존한다"라고 말할 수 없습니다. "이 파일은 이 식별자에 의해 이 Rekor 인덱스에서 서명되었다"라고 말할 수 없습니다. "이 문서와 저 문서의 관계는 `cites`가 아니라 `supports`다"라고 말할 수 없습니다. 그런 정보를 둘 자리가 없으니 산문에 묻혀 버리고, 결과적으로 에이전트도 사람도 그것을 신뢰성 있게 활용할 수 없습니다.

MDA는 그 정보들을 frontmatter와 footnote에, JSON Schema가 검증할 수 있는 형태로 담습니다. Markdown 본문은 여전히 렌더링됩니다. 표준 필드는 여전히 로드됩니다. 새로 더해진 것은 모두 선택 사항입니다. 핵심은 그게 전부입니다.

긴 버전이 필요하다면 두 문서가 더 깊이 들어갑니다. 둘 다 모든 주장을 스펙의 특정 절로 추적하며, 현재 생태계의 빈틈을 본문 안에서 그때그때 짚습니다. 도입을 검토 중이라면 읽어 보세요.

- [**`docs/v1.0/ai-agent-core-value.md`**](../../docs/v1.0/ai-agent-core-value.md) — 런타임, 하니스, 검증기, 디스패처를 위한 다섯 가지 포인트. 로드 시점에 MDA가 에이전트에 무엇을 주는지: 타입 디스패치를 위한 구조화된 `requires`, 로드 시점의 검증 가능한 신뢰, 기계 판독 가능한 그래프 엣지, 파일명 기반의 단일 조회 타깃 디스패치, 그리고 에이전트 작성 산출물과 컴파일러 산출물에 동일하게 적용되는 검증 계약.
- [**`docs/v1.0/human-curator-user-core-value.md`**](../../docs/v1.0/human-curator-user-core-value.md) — 에이전트 대상 지시 라이브러리를 작성하고 큐레이팅하는 사람들을 위한 여섯 가지 포인트. 배포 시점에 MDA가 작성자에게 무엇을 주는지: 하나의 소스로 여러 생태계 대응, 위변조 탐지와 발행자 표시, 기계 판독 가능한 의존성 그래프와 버전 핀, 모든 런타임의 frontmatter를 외우지 않고도 가능한 LLM 보조 작성, 더 작은 (제로는 아닌) 벤더 락인, 그리고 거의 적합한 듯한 산출물을 배포 전에 잡아내는 엄격한 검증.

## 세 가지 작성 방식

MDA 산출물은 세 가지 방식으로 만들 수 있습니다. 검증의 관점에서는 모두 동등합니다.

1. **에이전트 모드** — AI 에이전트가 `.md`를 직접 작성합니다. 단기적으로 가장 주요한 사용 사례입니다.
2. **사람 모드** — 사람이 `sha256sum`과 `cosign`을 사용해 `.md`를 직접 작성합니다.
3. **컴파일 모드** — 작성자가 `.mda` 소스를 작성하고, MDA 컴파일러가 하나 이상의 `.md` 출력을 생성합니다.

어떤 경로를 택하든, 산출물은 같은 JSON Schema 2020-12 타깃 스키마와 같은 적합성 스위트로 평가됩니다. "이건 에이전트가 만든 것"을 위한 별도의 코드 경로는 없습니다.

레퍼런스 CLI 없이 진행하는 수동 작성 및 에이전트 작성 경로에 대해서는 [`docs/manual-workflow.md`](../../docs/manual-workflow.md)를, 우선순위와 모드의 규범적 정의에 대해서는 [`spec/v1.0/00-overview.md §0.5–§0.6`](../../spec/v1.0/00-overview.md)를 참고하세요.

## 최소 예제

`pdf-tools.mda`:

```yaml
---
name: pdf-tools
description: Extract PDF text, fill forms, merge files. Use when handling PDFs.
metadata:
  mda:
    doc-id: 38f5a922-81b2-4f1a-8d8c-3a5be4ea7511
    title: PDF Tools
    version: "1.2.0"
    tags: [pdf, extraction]
---

# PDF Tools

…
```

`pdf-tools/SKILL.md`로 컴파일됩니다. 소스가 이미 엄격한 타깃 형태에 맞춰져 있고 모든 MDA 확장 필드가 `metadata.mda.*` 아래에 중첩되어 있어, 컴파일은 사실상 이름 변경에 가깝습니다. 더 많은 작동 예제는 [`examples/`](../../examples/)와 [`docs/mda-examples/`](../../docs/mda-examples/)에 있습니다.

## 호환성

컴파일된 `SKILL.md`는 주요 agentskills.io v1 컨슈머에서 로드할 수 있습니다.

- **Claude Code** — https://code.claude.com/docs/en/skills
- **OpenCode** — https://opencode.ai/docs/skills/
- **OpenAI Codex** — https://developers.openai.com/codex/skills
- **Hermes Agent** — https://hermes-agent.nousresearch.com/docs/user-guide/features/skills
- **OpenClaw** — https://docs.openclaw.ai/tools/skills
- **skills.sh / Skills Directory** — https://www.skillsdirectory.com/
- **Cursor**, **Windsurf**, 그리고 그 외 2026년 SKILL.md 컨슈머

컴파일된 `AGENTS.md`는 AAIF 정렬 생태계(Linux Foundation의 Agentic AI Foundation)에 적합합니다: Codex CLI, GitHub Copilot, Cursor, Windsurf, Amp, Devin, Gemini CLI, VS Code, Jules, Factory.

벤더별 확장은 예약된 `metadata.<vendor>.*` 네임스페이스에 위치합니다. 로더는 자기 네임스페이스만 읽으며, 컨슈머는 등록되지 않은 네임스페이스가 들어 있다는 이유만으로 문서를 거부해서는 안 됩니다. 네임스페이스 레지스트리, 표준 `requires` 키, 예약된 Sigstore OIDC 발급자, 예약된 DSSE `payload-type` 값에 대해서는 [`REGISTRY.md`](../../REGISTRY.md)를 참고하세요.

## Open Spec

규범적 MDA Open Spec은 [**SPEC.md**](../../SPEC.md) → [`spec/v1.0/`](../../spec/v1.0/)에 있습니다.

- [§00 Overview](../../spec/v1.0/00-overview.md) — 용어, RFC 2119, P0 > P1 > P2 우선순위, 세 가지 작성 방식, 거버넌스, 버전 관리
- [§01 Source and output](../../spec/v1.0/01-source-and-output.md)
- [§02 Frontmatter](../../spec/v1.0/02-frontmatter.md)
- [§03 Relationships](../../spec/v1.0/03-relationships.md) — footnote + `depends-on` + 버전/다이제스트 핀
- [§04 Platform namespaces](../../spec/v1.0/04-platform-namespaces.md)
- [§05 Progressive disclosure](../../spec/v1.0/05-progressive-disclosure.md)
- [§06 Target schemas](../../spec/v1.0/06-targets/) — `SKILL.md`, `AGENTS.md`, `MCP-SERVER.md`, `CLAUDE.md`
- [§07 Conformance](../../spec/v1.0/07-conformance.md)
- [§08 Integrity](../../spec/v1.0/08-integrity.md)
- [§09 Signatures](../../spec/v1.0/09-signatures.md) — Sigstore OIDC 기본, did:web 폴백
- [§10 Capabilities](../../spec/v1.0/10-capabilities.md) — `metadata.mda.requires`
- [§11 Implementer's Guide](../../spec/v1.0/11-implementer-guide.md) (informative)
- [§12 Sigstore tooling integration](../../spec/v1.0/12-sigstore-tooling.md) (informative)

JSON Schema는 [`schemas/`](../../schemas/)에 있습니다 — `frontmatter-source`, `frontmatter-skill-md`, `frontmatter-agents-md`, `frontmatter-mcp-server-md`, `relationship-footnote`, 그리고 `integrity`, `signature`, `requires`, `depends-on`, `version-range`를 위한 공유 `_defs/`. 적합성 픽스처와 검증 러너는 [`conformance/`](../../conformance/)에 있습니다 (`node scripts/validate-conformance.mjs`).

## 참조 구현

TypeScript CLI는 [`packages/mda/`](../../packages/mda/)에 있습니다 (npm 패키지: `@mda/cli`). 아키텍처 스펙은 [`packages/mda/IMPL-SPEC.md`](../../packages/mda/IMPL-SPEC.md)입니다. CLI는 `v1.0.0-rc.N` 태그를 거치며 성숙해집니다. 최종 `1.0.0`은 CLI가 적합성 스위트를 100% 통과하는 시점에 릴리스됩니다.

![v1.0은 계약 — 스키마, 적합성, 컴파일러 — 을 출시하며 검증기, 리졸버, 레지스트리, 그래프 인덱서, 런타임 라우팅은 향후 생태계 작업으로 남겨 둡니다](../../images/status-contract-and-ecosystem.png)

## 정직한 현재 상황

v1.0은 그 주변의 생태계 전체가 아니라 **계약**을 출시합니다.

**오늘 동작하는 것:** `.mda`를 작성하고, 하나 이상의 적합한 `.md` 출력으로 컴파일하고, 타깃 JSON Schema와 35개 픽스처 적합성 스위트로 검증할 수 있습니다.

**아직 만들고 있는 것:**

- 서명용 번들 검증기는 아직 출시되지 않았습니다. 운영자는 현재 `cosign`과 JCS 라이브러리를 직접 엮어 사용해야 합니다.
- 동작하는 의존성 리졸버와 중앙 산출물 레지스트리는 아직 존재하지 않습니다.
- `metadata.mda.relationships`를 소비하는 그래프 인덱서는 출시되지 않았습니다.
- `metadata.mda.requires`를 통해 라우팅하는 2026년 멀티 에이전트 하니스는 현재 알려져 있지 않습니다.
- v1.0은 agentskills.io와 AAIF 부분집합을 다룹니다. Cursor MDC, Windsurf rules, Continue, Aider, `*.instructions.md`는 대상으로 하지 않습니다. 이들은 여전히 별도로 유지보수해야 합니다.

오늘 작성한 `.mda`는 위에 나열된 모든 런타임에서 로드되는 적합한 `.md` 출력을 여전히 만들어 냅니다. 검증, 해결, 그래프 순회 부분이 진행 중인 작업입니다. 그 부분들이 추가 협상 없이 만들어질 수 있도록 해 주는 계약을, v1.0이 동결합니다.

스펙과 컨슈머 측 생태계 사이의 전체 격차에 대해서는 [`docs/v1.0/what-v1.0-does-not-ship.md`](../../docs/v1.0/what-v1.0-does-not-ship.md)를 참고하세요. 정직한 스펙 동결과 마케팅 동결의 구분 — 이 프로젝트가 지키려고 하는 것이 바로 그 구분입니다.

## 기여하기

기여를 환영합니다. Open Spec이나 벤더 레지스트리에 대한 큰 변경은 코드 작성 전에 먼저 논의로 시작하는 것이 좋습니다. [`CONTRIBUTING.md`](../../CONTRIBUTING.md), [`CODE_OF_CONDUCT.md`](../../CODE_OF_CONDUCT.md), [`SECURITY.md`](../../SECURITY.md)를 참고하세요. 벤더 네임스페이스 할당에 대해서는 [`REGISTRY.md`](../../REGISTRY.md)를 참고하세요. 최근 변경 사항은 [`CHANGELOG.md`](../../CHANGELOG.md)에 기록됩니다.

## 라이선스

- Open Spec 콘텐츠 (`spec/`, `REGISTRY.md`, `SPEC.md`): [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/)
- 스키마 (`schemas/`), 도구, 참조 구현: [Apache-2.0](../../LICENSE)

## 관련 링크

- 문서 사이트: https://mda.sno.dev
- 스펙 토론: https://github.com/sno-ai/mda/discussions
