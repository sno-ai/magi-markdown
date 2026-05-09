# 📝 MDA Open Spec — エージェントのための Markdown

> エージェント向けドキュメントのための Markdown スーパーセット。**ひとつのソース、複数のターゲット** — 主要なエージェントランタイムがすでに読み込んでいる `.md` ファイル群へとコンパイルできます。**ロード時に改ざん検出可能** — すべての成果物は再現可能なコンテンツダイジェストを保持し、署名済みの成果物は Sigstore に裏付けられた署名を保持します。これにより、ドキュメントを読み込むエージェントもレビューする人間も、署名のない blob を信用する必要がなくなります。

[![Latest release](https://img.shields.io/github/v/release/sno-ai/mda?include_prereleases&label=release&color=blue)](https://github.com/sno-ai/mda/releases/latest)
[![License](https://img.shields.io/github/license/sno-ai/mda)](https://github.com/sno-ai/mda/blob/main/LICENSE)
[![Docs](https://img.shields.io/badge/docs-mda.sno.dev-3b82f6)](https://mda.sno.dev)
[![GitHub stars](https://img.shields.io/github/stars/sno-ai/mda?style=flat&color=yellow)](https://github.com/sno-ai/mda/stargazers)

**他の言語で読む:** [English](../../README.md) · [中文](README.zh-CN.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [Français](README.fr.md) · [Русский](README.ru.md) · [한국어](README.ko.md) · **日本語** · [हिन्दी](README.hi.md)

## MDA とは

これまで、同じスキルを 4 回出荷していました。agentskills.io ランタイム向けに `SKILL.md` として 1 回。AAIF エコシステム向けに `AGENTS.md` として 1 回。サイドカー JSON を伴う `MCP-SERVER.md` として 1 回。そして `CLAUDE.md` として 1 回。同じ内容で、4 種類のフロントマター形式。ひとつを更新して他を忘れれば、1 か月後にはこの 4 つのファイルは少しずつ異なる指示書へと静かにずれていきます。

`.mda` をひとつだけ書いてください。残りはコンパイラが生成します。

![ひとつの .mda ソースを決定論的なパイプラインで SKILL.md、AGENTS.md、MCP-SERVER.md、CLAUDE.md にコンパイルする様子](../../images/hero-compile-pipeline.png)

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

そして、これら 4 つのファイルは「誰が署名したか」を語れません。`SKILL.md` を読み込むエージェントには、内容があなたの書いたものと一致しているかを検証する手段がなく、`AGENTS.md` をレビューするキュレーターには、マージからロードまでの間に誰の手を経たかを知る術がありません。標準のフロントマター形式にはコンテンツダイジェストや署名を置く場所がないため、信頼の判断は静かに「リポジトリをなんとなく信じる」へと退行してしまいます。

MDA はフロントマター自体に、JCS で正規化された `integrity.digest` と、DSSE 封筒に包まれ Sigstore に裏付けられた `signatures[]` を運びます。両側 — ロード時のエージェントもレビュー時の人間も — リポジトリへの感覚ではなく、目の前の成果物に対して本物の信頼の判断を下せます。改ざん検出と署名者検証は、後付けではなく契約として最初から組み込まれています。

![標準 Markdown に対する MDA の 3 つの追加要素: リッチなフロントマター、型付きフットノート関係性、署名されたアイデンティティ](../../images/three-additions.png)

`.mda` は標準 Markdown に 3 つのことを追加します。すべて任意です。

1. **リッチな YAML フロントマター。** オープン標準の `name` と `description` のベースラインに加え、MDA は `doc-id`、`version`、`requires`、`depends-on`、`relationships`、`tags` を運びます。エージェント対応のツールはこれらをルーティング、依存関係解決、グラフ走査に利用します。[`spec/v1.0/02-frontmatter.md`](../../spec/v1.0/02-frontmatter.md) と [`spec/v1.0/10-capabilities.md`](../../spec/v1.0/10-capabilities.md) を参照してください。
2. **型付きフットノート関係性。** ペイロードが JSON オブジェクトである標準 Markdown のフットノート: `parent`、`child`、`related`、`cites`、`supports`、`contradicts`、`extends`。コンパイル時に本文の出現順で `metadata.mda.relationships` にミラーされます。[`spec/v1.0/03-relationships.md`](../../spec/v1.0/03-relationships.md) を参照してください。
3. **暗号学的アイデンティティ。** JCS で正規化された `integrity` ダイジェストに、DSSE 封筒で Sigstore に裏付けられた `signatures[]` を加えたもの。コンパイル後の `.md` は、後付けではなく再現可能な改ざん検出を最初から備えます。[`spec/v1.0/08-integrity.md`](../../spec/v1.0/08-integrity.md) と [`spec/v1.0/09-signatures.md`](../../spec/v1.0/09-signatures.md) を参照してください。

オープン標準のフロントマターしか持たない `.mda` ソースは、そのまま `.md` にコンパイルされます。MDA は、プロジェクトに必要な分だけ使えばよいのです。

## この仕様が存在する理由

正直なところを書きます。私は同じスキルを 4 回出荷し続けていました。同じ内容を 4 つのラッパーで。各ランタイムは、先頭にどんなフロントマターが属し、何がベンダー固有とみなされるかについて、それぞれの考えを持っていました。`SKILL.md` と `AGENTS.md` の間で段落をコピー&ペーストして、それらが乖離していくのを 3 回か 4 回見届けたあたりで、私はこれを書き始めました。

実のところ、最悪なのは重複ではありません。最悪なのは、これらのフォーマットでは表現できないことです。「このスキルはあのスキルに依存する。バージョンは `^1.2.0`、コンテンツダイジェストはこれ」とは言えません。「このファイルはこのアイデンティティで、この Rekor インデックスで署名された」とは言えません。「このドキュメントとあのドキュメントの関係は `cites` ではなく `supports` だ」とは言えません。それを置く場所がないので、情報は本文の散文に紛れ込み、エージェントも人間も確実には扱えなくなります。

MDA はそれらを、JSON Schema で検証可能な形でフロントマターとフットノートに置きます。Markdown 本文は変わらずレンダリングされます。標準フィールドは変わらずロードされます。新しいものはすべて任意。それがすべてです。

長い説明として、より深く掘り下げる 2 つのドキュメントがあります。両方ともすべての主張を仕様の該当節に遡ってトレースし、現状のエコシステムの欠落をその場で指摘しています。導入を判断する立場の方は、ぜひ読んでください。

- [**`docs/v1.0/ai-agent-core-value.md`**](../../docs/v1.0/ai-agent-core-value.md) — ランタイム、ハーネス、バリデーター、ディスパッチャー向けに整理された 5 つのポイント。MDA がロード時にエージェントへ与えるもの: 型付きディスパッチのための構造化された `requires`、ロード時の検証可能な信頼、機械可読なグラフエッジ、ファイル名ベースの 1 ルックアップによるターゲットディスパッチ、エージェント生成出力とコンパイラ生成出力に対する同一の検証コントラクト。
- [**`docs/v1.0/human-curator-user-core-value.md`**](../../docs/v1.0/human-curator-user-core-value.md) — エージェント向け指示書ライブラリを書き、キュレートする人々のために整理された 6 つのポイント。MDA が出荷時に著者へ与えるもの: 1 つのソースから複数のエコシステムへ、改ざん検出と発行者の帰属、機械可読な依存グラフとバージョン固定、各ランタイムのフロントマターを学ばずに済む LLM 介在の執筆、より小さな (ゼロではない) ベンダーロックイン、出荷前にほぼ準拠した成果物を捕捉する厳格な検証。

## 3 つのオーサリングモード

MDA 成果物は 3 通りの方法で生成できます。検証においては等価です。

1. **エージェントモード** — AI エージェントが直接 `.md` を書きます。短期的な主要ユースケース。
2. **ヒューマンモード** — 人間が直接 `.md` を書き、integrity を追加し、DSSE/Rekor 対応の署名経路で署名します。
3. **コンパイルモード** — 著者が `.mda` ソースを書き、MDA コンパイラが 1 つ以上の `.md` 出力を生成します。

どの経路を取っても、成果物は同じ JSON Schema 2020-12 ターゲットスキーマと同じ適合性スイートに照らして判定されます。「これはエージェントから来たものだから」という第 2 のコードパスは存在しません。

リファレンス CLI を使わない手作業およびエージェント生成の経路については [`docs/create-sign-verify-mda.md`](../../docs/create-sign-verify-mda.md) を、優先順位とモードの規範的な記述については [`spec/v1.0/00-overview.md §0.5–§0.6`](../../spec/v1.0/00-overview.md) を参照してください。

## 最小の例

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

これは `pdf-tools/SKILL.md` にコンパイルされます。ソースはすでに厳格なターゲット形状に収まっており、MDA 拡張のフィールドはすべて `metadata.mda.*` の下にネストされているため、コンパイルは事実上のリネームです。さらなる作例は [`examples/`](../../examples/) と [`docs/mda-examples/`](../../docs/mda-examples/) にあります。

## 互換性

コンパイル後の `SKILL.md` は、agentskills.io v1 の主要なコンシューマーから読み込めます:

- **Claude Code** — https://code.claude.com/docs/en/skills
- **OpenCode** — https://opencode.ai/docs/skills/
- **OpenAI Codex** — https://developers.openai.com/codex/skills
- **Hermes Agent** — https://hermes-agent.nousresearch.com/docs/user-guide/features/skills
- **OpenClaw** — https://docs.openclaw.ai/tools/skills
- **skills.sh / Skills Directory** — https://www.skillsdirectory.com/
- **Cursor**、**Windsurf**、その他 2026 年の SKILL.md コンシューマー

コンパイル後の `AGENTS.md` は AAIF 整合のエコシステム (Linux Foundation の Agentic AI Foundation) に着地します: Codex CLI、GitHub Copilot、Cursor、Windsurf、Amp、Devin、Gemini CLI、VS Code、Jules、Factory。

ベンダーごとの拡張は予約済みの `metadata.<vendor>.*` 名前空間の下に配置されます。ローダーは自身の名前空間のみを読み、コンシューマーは未登録の名前空間を運んでいることだけを理由にドキュメントを拒否してはなりません。名前空間レジストリ、標準の `requires` キー、予約済みの Sigstore OIDC 発行者、予約済みの DSSE `payload-type` 値については [`REGISTRY.md`](../../REGISTRY.md) を参照してください。

## Open Spec

規範的な MDA Open Spec は [**SPEC.md**](../../SPEC.md) → [`spec/v1.0/`](../../spec/v1.0/) にあります。

- [§00 Overview](../../spec/v1.0/00-overview.md) — 用語、RFC 2119、P0 > P1 > P2 の優先順位、3 つのオーサリングモード、ガバナンス、バージョニング
- [§01 Source and output](../../spec/v1.0/01-source-and-output.md)
- [§02 Frontmatter](../../spec/v1.0/02-frontmatter.md)
- [§03 Relationships](../../spec/v1.0/03-relationships.md) — フットノート + `depends-on` + バージョン/ダイジェスト固定
- [§04 Platform namespaces](../../spec/v1.0/04-platform-namespaces.md)
- [§05 Progressive disclosure](../../spec/v1.0/05-progressive-disclosure.md)
- [§06 Target schemas](../../spec/v1.0/06-targets/) — `SKILL.md`、`AGENTS.md`、`MCP-SERVER.md`、`CLAUDE.md`
- [§07 Conformance](../../spec/v1.0/07-conformance.md)
- [§08 Integrity](../../spec/v1.0/08-integrity.md)
- [§09 Signatures](../../spec/v1.0/09-signatures.md) — Sigstore OIDC をデフォルト、did:web をフォールバック
- [§10 Capabilities](../../spec/v1.0/10-capabilities.md) — `metadata.mda.requires`
- [§11 Implementer's Guide](../../spec/v1.0/11-implementer-guide.md) (参考情報)
- [§12 Sigstore tooling integration](../../spec/v1.0/12-sigstore-tooling.md) (参考情報)
- [§13 Trusted Runtime Profile](../../spec/v1.0/13-trusted-runtime.md) — 本番検証と trust policy

JSON Schema は [`schemas/`](../../schemas/) にあります — `frontmatter-source`、`frontmatter-skill-md`、`frontmatter-agents-md`、`frontmatter-mcp-server-md`、`relationship-footnote`、`mda-trust-policy`、加えて `integrity`、`signature`、`requires`、`depends-on`、`version-range` のための共有 `_defs/`。適合性フィクスチャと検証ランナーは [`conformance/`](../../conformance/) にあります (`node scripts/validate-conformance.mjs`)。

## リファレンス実装

TypeScript 製の CLI は [`apps/cli/`](../../apps/cli/) にあります (npm パッケージ: `@markdown-ai/cli`)。アーキテクチャ仕様は [`apps/cli/IMPL-SPEC.md`](../../apps/cli/IMPL-SPEC.md) です。CLI は `v1.0.0-rc.N` タグを通じて成熟していきます。最終的な `1.0.0` は、CLI が適合性スイートの 100% を通過した時点で着地します。

![v1.0 はコントラクト — スキーマ、適合性、コンパイラ — を出荷し、検証器、リゾルバ、レジストリ、グラフインデクサ、ランタイムルーティングは将来のエコシステム作業として残る](../../images/status-contract-and-ecosystem.png)

## 現状について、正直に

v1.0 が出荷するのは**コントラクト**であり、その周囲のエコシステム全体ではありません。

**今日できること:** `.mda` を書き、それを 1 つ以上の準拠する `.md` 出力にコンパイルし、ターゲット JSON Schema と適合性スイートに対して検証できます。

**まだ構築中のもの:**

- 署名のためのバンドル済み検証器はまだ出荷されていません。運用者は現在、JCS ライブラリと DSSE/Rekor 対応の Sigstore 署名・検証ツールを組み合わせて使っています。
- 動作する依存関係リゾルバと中央成果物レジストリはまだ存在しません。
- `metadata.mda.relationships` を消費するグラフインデクサは出荷されていません。
- `metadata.mda.requires` を介してルーティングする 2026 年のマルチエージェントハーネスは、現時点では知られていません。
- v1.0 は agentskills.io と AAIF のサブセットをカバーします。Cursor MDC、Windsurf rules、Continue、Aider、`*.instructions.md` は対象外です。これらは依然として並行メンテナンスが必要です。

今日あなたが書く `.mda` は、上に挙げたすべてのランタイムで読み込める準拠 `.md` 出力を引き続き生成します。検証、解決、グラフ走査の部分は進行中の作業です。それらを追加交渉なしに構築できるようにするコントラクトこそが、v1.0 で凍結されるものです。

仕様とコンシューマー側エコシステムの間にある全体の隔たりについては、[`docs/v1.0/what-v1.0-does-not-ship.md`](../../docs/v1.0/what-v1.0-does-not-ship.md) を参照してください。誠実な仕様凍結とマーケティング上の凍結との区別 — このプロジェクトが守ろうとしているのは、その区別です。

## コントリビュート

コントリビューションを歓迎します。Open Spec やベンダーレジストリへの大きな変更は、コードよりも先にディスカッションから始めてください。[`CONTRIBUTING.md`](../../CONTRIBUTING.md)、[`CODE_OF_CONDUCT.md`](../../CODE_OF_CONDUCT.md)、[`SECURITY.md`](../../SECURITY.md) を参照してください。ベンダー名前空間の割り当てについては [`REGISTRY.md`](../../REGISTRY.md) を参照してください。直近の変更は [`CHANGELOG.md`](../../CHANGELOG.md) に記録されています。

## ライセンス

- Open Spec のコンテンツ (`spec/`、`REGISTRY.md`、`SPEC.md`): [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/)
- スキーマ (`schemas/`)、ツーリング、リファレンス実装: [Apache-2.0](../../LICENSE)

## 関連リンク

- ドキュメントサイト: https://mda.sno.dev
- 仕様に関するディスカッション: https://github.com/sno-ai/mda/discussions
