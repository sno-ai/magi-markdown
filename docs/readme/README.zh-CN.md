# 📝 MDA Open Spec — 面向 AI Agent 的 Markdown

> 面向 Agent 文档的 Markdown 超集。**一份源码，多端产物** —— 编译生成各主流 Agent 运行时已经在加载的 `.md` 文件。**加载即可验真** —— 每个产物都带有可复现的内容摘要，签名产物还附带锚定到 Sigstore 的签名，加载文档的 Agent 和审阅文档的人都不必再去信任一个未签名的二进制块。

[![Latest release](https://img.shields.io/github/v/release/sno-ai/mda?include_prereleases&label=release&color=blue)](https://github.com/sno-ai/mda/releases/latest)
[![License](https://img.shields.io/github/license/sno-ai/mda)](https://github.com/sno-ai/mda/blob/main/LICENSE)
[![Docs](https://img.shields.io/badge/docs-mda.sno.dev-3b82f6)](https://mda.sno.dev)
[![GitHub stars](https://img.shields.io/github/stars/sno-ai/mda?style=flat&color=yellow)](https://github.com/sno-ai/mda/stargazers)

**其他语言版本:** [English](../../README.md) · **中文** · [Deutsch](README.de.md) · [Español](README.es.md) · [Français](README.fr.md) · [Русский](README.ru.md) · [한국어](README.ko.md) · [日本語](README.ja.md) · [हिन्दी](README.hi.md)

## MDA 是什么

直到现在，同一个 skill 你都得发四遍。一遍是给 agentskills.io 系列运行时用的 `SKILL.md`，一遍是给 AAIF 生态用的 `AGENTS.md`，一遍是带 JSON 边车的 `MCP-SERVER.md`，再一遍是 `CLAUDE.md`。内容相同，frontmatter 形态却有四种。改了其中一份忘了同步其他几份，一个月后这四份文件就悄悄漂移成了四份略有差异的指令。

你只写一份 `.mda`，编译器负责产出剩下的一切。

![一份 .mda 源码经由确定性流水线编译为 SKILL.md、AGENTS.md、MCP-SERVER.md 和 CLAUDE.md](../../images/hero-compile-pipeline.png)

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

而这四份文件没办法说清楚自己是谁签的。加载 `SKILL.md` 的 Agent 没法验证内容是否就是你写下的那份；审阅 `AGENTS.md` 的策展人也没法知道在合并到加载之间，文件经手过谁的手。标准 frontmatter 形态根本没有放内容摘要或签名的地方，于是信任决策就悄悄退化成了"反正这个仓库我们信"。

MDA 直接在 frontmatter 里携带一份经 JCS 规范化的 `integrity.digest`，以及用 DSSE 封装、锚定到 Sigstore 的 `signatures[]`。两端 —— 加载时的 Agent 和审阅时的人 —— 都能就手中的具体产物做出真正的信任判断，而不是凭一种对仓库的感觉。可验真和签名验证写进了契约本身，不是事后再补的补丁。

![在标准 Markdown 之上的三项 MDA 增强：富 frontmatter、带类型的脚注关系、带签名的身份](../../images/three-additions.png)

`.mda` 在标准 Markdown 之上加了三样东西，全部可选。

1. **富 YAML frontmatter。** 在开放标准的 `name` 和 `description` 基线之上，MDA 还携带 `doc-id`、`version`、`requires`、`depends-on`、`relationships` 和 `tags`。具备 Agent 感知能力的工具会用这些字段做路由、依赖解析和图遍历。详见 [`spec/v1.0/02-frontmatter.md`](../../spec/v1.0/02-frontmatter.md) 和 [`spec/v1.0/10-capabilities.md`](../../spec/v1.0/10-capabilities.md)。
2. **带类型的脚注关系。** 标准 Markdown 脚注，载荷是一个 JSON 对象：`parent`、`child`、`related`、`cites`、`supports`、`contradicts`、`extends`。编译时按正文出现顺序映射到 `metadata.mda.relationships`。详见 [`spec/v1.0/03-relationships.md`](../../spec/v1.0/03-relationships.md)。
3. **密码学身份。** 一份经 JCS 规范化的 `integrity` 摘要，加上用 DSSE 封装、锚定到 Sigstore 的 `signatures[]`。编译产出的 `.md` 自带可复现的篡改检测能力，不用事后再加。详见 [`spec/v1.0/08-integrity.md`](../../spec/v1.0/08-integrity.md) 和 [`spec/v1.0/09-signatures.md`](../../spec/v1.0/09-signatures.md)。

只用了开放标准 frontmatter 字段的 `.mda` 源码，会原样编译成一份 `.md`。MDA 的能力，按项目所需用多少都行。

## 为什么会有这个项目

实话实说。我反复在把同一个 skill 发四遍。同样的内容，四个壳子。每个运行时都有一套自己的看法 —— 哪些字段属于顶层 frontmatter，哪些算厂商私有。当我第三、第四次在 `SKILL.md` 和 `AGENTS.md` 之间复制粘贴一段话、然后眼睁睁看着它们漂移之后，我开始动手写这个项目。

不过，重复其实还不是最糟糕的部分。最糟糕的是这些格式根本没法表达一些事情。你没法说"这个 skill 依赖那一个，版本约束 `^1.2.0`，内容摘要是这个"。你没法说"这个文件由这个身份签名，对应 Rekor 索引在这里"。你没法说"这个文档和那个文档之间的关系是 `supports`，不是 `cites`"。这些信息无处可放，最后只能塞进散文里，而 Agent 和人都没法据此做出可靠的判断。

MDA 把这些信息放进了 frontmatter 和脚注里，形态可以用 JSON Schema 校验。Markdown 正文照样渲染。标准字段照样加载。所有新东西都是可选的。这就是全部卖点。

想看长版本，可以读下面两份文档。它们的每一处论断都能追溯到规范的某个章节，并且会在文中点明当前生态的缺口。如果你正在评估是否要采用 MDA，建议读一读。

- [**`docs/v1.0/ai-agent-core-value.md`**](../../docs/v1.0/ai-agent-core-value.md) —— 面向运行时、harness、校验器和分发器的五个要点。MDA 在加载时给一个 Agent 带来了什么：用结构化 `requires` 做带类型的分发、加载即可验信任、机器可读的图边、基于文件名一次查找完成的目标分发，以及对 Agent 自己写的输出和编译器产出统一的校验契约。
- [**`docs/v1.0/human-curator-user-core-value.md`**](../../docs/v1.0/human-curator-user-core-value.md) —— 面向编写和策展 Agent 指令库的人的六个要点。MDA 在发版时给作者带来了什么：一份源码进入多个生态、可验真与发布者归属、机器可读的依赖图与版本锁定、由 LLM 协助创作而无需逐个学习每个运行时的 frontmatter、更小（不是零）的厂商锁定，以及在发版前就把"几乎合规"的产物拦下来的严格校验。

## 三种创作模式

MDA 产物可以通过三种方式产出，在校验层面它们等价。

1. **Agent 模式** —— AI Agent 直接写出 `.md`。短期内的主要场景。
2. **Human 模式** —— 人直接写 `.md`，再加上 integrity，并用能产生 DSSE/Rekor 输出的签名流程签名。
3. **Compiled 模式** —— 作者写 `.mda` 源码，由 MDA 编译器产出一个或多个 `.md`。

不论走哪条路，产物都按同一份 JSON Schema 2020-12 目标 schema 和同一套一致性测试集来评判。不存在一条专给"这是 Agent 写的"开的二等代码路径。

不依赖参考 CLI 的人工流程和 Agent 直写流程见 [`docs/create-sign-verify-mda.md`](../../docs/create-sign-verify-mda.md)；优先级与模式的规范性陈述见 [`spec/v1.0/00-overview.md §0.5–§0.6`](../../spec/v1.0/00-overview.md)。

## 最小示例

`pdf-tools.mda`：

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

会编译成 `pdf-tools/SKILL.md`。源码本身就已经处于严格的目标形态，所有 MDA 扩展字段都嵌套在 `metadata.mda.*` 之下，所以编译过程基本上就是改个文件名而已。更多完整示例见 [`examples/`](../../examples/) 和 [`docs/mda-examples/`](../../docs/mda-examples/)。

## 兼容性

编译产出的 `SKILL.md` 可被以下主流 agentskills.io v1 消费方加载：

- **Claude Code** — https://code.claude.com/docs/en/skills
- **OpenCode** — https://opencode.ai/docs/skills/
- **OpenAI Codex** — https://developers.openai.com/codex/skills
- **Hermes Agent** — https://hermes-agent.nousresearch.com/docs/user-guide/features/skills
- **OpenClaw** — https://docs.openclaw.ai/tools/skills
- **skills.sh / Skills Directory** — https://www.skillsdirectory.com/
- **Cursor**、**Windsurf**，以及其他 2026 年的 SKILL.md 消费方

编译产出的 `AGENTS.md` 落在与 AAIF 对齐的生态（Linux Foundation 旗下的 Agentic AI Foundation）：Codex CLI、GitHub Copilot、Cursor、Windsurf、Amp、Devin、Gemini CLI、VS Code、Jules、Factory。

各厂商的扩展字段位于保留的 `metadata.<vendor>.*` 命名空间下。加载方只读自己那个命名空间，并且不得仅仅因为文档里出现了一个未注册的命名空间就拒绝接受它。命名空间登记表、标准 `requires` 键、保留的 Sigstore OIDC 签发者，以及保留的 DSSE `payload-type` 值，详见 [`REGISTRY.md`](../../REGISTRY.md)。

## 开放规范

规范性的 MDA Open Spec 位于 [**SPEC.md**](../../SPEC.md) → [`spec/v1.0/`](../../spec/v1.0/)。

- [§00 Overview](../../spec/v1.0/00-overview.md) —— 术语、RFC 2119、P0 > P1 > P2 优先级、三种创作模式、治理、版本策略
- [§01 Source and output](../../spec/v1.0/01-source-and-output.md)
- [§02 Frontmatter](../../spec/v1.0/02-frontmatter.md)
- [§03 Relationships](../../spec/v1.0/03-relationships.md) —— 脚注 + `depends-on` + 版本/摘要锁定
- [§04 Platform namespaces](../../spec/v1.0/04-platform-namespaces.md)
- [§05 Progressive disclosure](../../spec/v1.0/05-progressive-disclosure.md)
- [§06 Target schemas](../../spec/v1.0/06-targets/) —— `SKILL.md`、`AGENTS.md`、`MCP-SERVER.md`、`CLAUDE.md`
- [§07 Conformance](../../spec/v1.0/07-conformance.md)
- [§08 Integrity](../../spec/v1.0/08-integrity.md)
- [§09 Signatures](../../spec/v1.0/09-signatures.md) —— 默认走 Sigstore OIDC，`did:web` 作为回退
- [§10 Capabilities](../../spec/v1.0/10-capabilities.md) —— `metadata.mda.requires`
- [§11 Implementer's Guide](../../spec/v1.0/11-implementer-guide.md)（参考性）
- [§12 Sigstore tooling integration](../../spec/v1.0/12-sigstore-tooling.md)（参考性）
- [§13 Trusted Runtime Profile](../../spec/v1.0/13-trusted-runtime.md) —— 生产环境校验模式与信任策略

JSON Schema 位于 [`schemas/`](../../schemas/) —— `frontmatter-source`、`frontmatter-skill-md`、`frontmatter-agents-md`、`frontmatter-mcp-server-md`、`relationship-footnote`、`mda-trust-policy`，以及共享的 `_defs/`，包含 `integrity`、`signature`、`requires`、`depends-on` 和 `version-range`。一致性测试用例与校验器位于 [`conformance/`](../../conformance/)（`node scripts/validate-conformance.mjs`）。

## 参考实现

TypeScript CLI 位于 [`apps/cli/`](../../apps/cli/)（npm 包：`@markdown-ai/cli`）。架构规范见 [`apps/cli/IMPL-SPEC.md`](../../apps/cli/IMPL-SPEC.md)。CLI 通过一系列 `v1.0.0-rc.N` 标签逐步成熟。当 CLI 100% 通过一致性测试集时，`1.0.0` 正式发布。

![v1.0 交付契约 —— schema、一致性测试和编译器；验签器、解析器、注册表、图索引器以及运行时路由属于后续生态工作](../../images/status-contract-and-ecosystem.png)

## 目前进展（坦诚版）

v1.0 交付的是**契约**，不是围绕它的整个生态。

**今天就能用的部分：** 你可以写一份 `.mda`、把它编译成一个或多个合规的 `.md`，并对照目标 JSON Schema 和一致性测试集进行校验。

**还在建设中的部分：**

- 内置的签名验签器尚未发布。运维当前需要把 JCS 库和能处理 DSSE/Rekor 的 Sigstore 签名/验签工具接起来用。
- 完整可用的依赖解析器和中心化产物注册表尚不存在。
- 消费 `metadata.mda.relationships` 的图索引器尚未发布。
- 目前还没有任何已知的 2026 年多 Agent harness 通过 `metadata.mda.requires` 做路由。
- v1.0 覆盖 agentskills.io 和 AAIF 子集，不针对 Cursor MDC、Windsurf 规则、Continue、Aider 或 `*.instructions.md`。它们仍需要并行维护。

你今天写的 `.mda` 仍然能产出在上面所列各运行时都能加载的合规 `.md`。验签、解析、图遍历这些部分还在路上。v1.0 锁定的，是让这些后续工作不必再次回炉协商的那份契约。

规范与消费侧生态之间的完整缺口，见 [`docs/v1.0/what-v1.0-does-not-ship.md`](../../docs/v1.0/what-v1.0-does-not-ship.md)。诚实的规范冻结，与营销意义上的"冻结"，是两回事 —— 这个项目力图守住的就是这个区别。

## 贡献

欢迎贡献。对 Open Spec 或厂商注册表的重大修改，请先发起讨论再写代码。详见 [`CONTRIBUTING.md`](../../CONTRIBUTING.md)、[`CODE_OF_CONDUCT.md`](../../CODE_OF_CONDUCT.md) 和 [`SECURITY.md`](../../SECURITY.md)。厂商命名空间的分配请见 [`REGISTRY.md`](../../REGISTRY.md)。近期变更记录在 [`CHANGELOG.md`](../../CHANGELOG.md)。

## 许可证

- Open Spec 内容（`spec/`、`REGISTRY.md`、`SPEC.md`）：[CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/)
- Schema（`schemas/`）、工具链与参考实现：[Apache-2.0](../../LICENSE)

## 相关链接

- 文档站点：https://mda.sno.dev
- 规范讨论：https://github.com/sno-ai/mda/discussions
