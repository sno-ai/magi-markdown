# 📝 MDA Open Spec — Markdown für Agenten

> Eine Markdown-Erweiterung für agentenseitige Dokumente. **Eine Quelle, viele Ziele** — kompiliere in genau die `.md`-Dateien, die jede gängige Agent-Runtime ohnehin lädt. **Manipulationssicher beim Laden** — jedes Artefakt trägt einen reproduzierbaren Inhalts-Digest, und signierte Artefakte tragen Sigstore-verankerte Signaturen, sodass weder der ladende Agent noch der prüfende Mensch einem unsignierten Blob blind vertrauen muss.

[![Latest release](https://img.shields.io/github/v/release/sno-ai/mda?include_prereleases&label=release&color=blue)](https://github.com/sno-ai/mda/releases/latest)
[![License](https://img.shields.io/github/license/sno-ai/mda)](https://github.com/sno-ai/mda/blob/main/LICENSE)
[![Docs](https://img.shields.io/badge/docs-mda.sno.dev-3b82f6)](https://mda.sno.dev)
[![GitHub stars](https://img.shields.io/github/stars/sno-ai/mda?style=flat&color=yellow)](https://github.com/sno-ai/mda/stargazers)

**In anderen Sprachen lesen:** [English](../../README.md) · [中文](README.zh-CN.md) · **Deutsch** · [Español](README.es.md) · [Français](README.fr.md) · [Русский](README.ru.md) · [한국어](README.ko.md) · [日本語](README.ja.md) · [हिन्दी](README.hi.md)

## Was MDA ist

Bislang hast du dieselbe Skill viermal ausgeliefert. Einmal als `SKILL.md` für die agentskills.io-Runtimes. Einmal als `AGENTS.md` für das AAIF-Ökosystem. Einmal als `MCP-SERVER.md` mit einem Sidecar-JSON. Einmal als `CLAUDE.md`. Gleicher Inhalt, vier Frontmatter-Formen. Du aktualisierst eine, vergisst die anderen, und einen Monat später sind aus den vier Dateien klammheimlich vier leicht unterschiedliche Anweisungsdateien geworden.

Du schreibst eine `.mda`. Der Compiler liefert den Rest.

![Eine .mda-Quelle wird über eine deterministische Pipeline zu SKILL.md, AGENTS.md, MCP-SERVER.md und CLAUDE.md kompiliert](../../images/hero-compile-pipeline.png)

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

Und diese vier Dateien können nicht sagen, wer sie signiert hat. Der Agent, der `SKILL.md` lädt, hat keine Möglichkeit zu prüfen, ob der Inhalt dem entspricht, was du geschrieben hast, und der Kurator, der `AGENTS.md` durchsieht, weiß nicht, durch wessen Hände sie zwischen Merge und Laden gegangen ist. Die üblichen Frontmatter-Formen haben keinen Platz für einen Inhalts-Digest oder eine Signatur, also fällt die Vertrauensentscheidung stillschweigend auf „Wir vertrauen dem Repo, irgendwie."

MDA trägt einen JCS-kanonisierten `integrity.digest` und DSSE-verpackte, Sigstore-verankerte `signatures[]` direkt im Frontmatter selbst. Beide Seiten — der Agent beim Laden und der Mensch beim Review — können eine echte Vertrauensentscheidung anhand des konkreten Artefakts treffen, nicht anhand eines Bauchgefühls zum Repo. Manipulationssicherheit und Signer-Verifikation gehören zum Vertrag, nicht zu einem nachträglichen Anbau.

![Drei MDA-Erweiterungen oberhalb von Standard-Markdown: reichhaltiges Frontmatter, typisierte Footnote-Beziehungen, signierte Identität](../../images/three-additions.png)

`.mda` fügt drei Dinge auf Standard-Markdown hinzu. Alle davon optional.

1. **Reichhaltiges YAML-Frontmatter.** Über die offene Standardbasis aus `name` und `description` hinaus trägt MDA `doc-id`, `version`, `requires`, `depends-on`, `relationships` und `tags`. Agentenfähige Tools nutzen sie für Routing, Abhängigkeitsauflösung und Graph-Traversierung. Siehe [`spec/v1.0/02-frontmatter.md`](../../spec/v1.0/02-frontmatter.md) und [`spec/v1.0/10-capabilities.md`](../../spec/v1.0/10-capabilities.md).
2. **Typisierte Footnote-Beziehungen.** Standard-Markdown-Fußnoten, deren Payload ein JSON-Objekt ist: `parent`, `child`, `related`, `cites`, `supports`, `contradicts`, `extends`. Beim Kompilieren in der Reihenfolge des Body-Texts nach `metadata.mda.relationships` gespiegelt. Siehe [`spec/v1.0/03-relationships.md`](../../spec/v1.0/03-relationships.md).
3. **Kryptografische Identität.** Ein JCS-kanonisierter `integrity`-Digest plus DSSE-verpackte, Sigstore-verankerte `signatures[]`. Die kompilierte `.md` trägt reproduzierbare Manipulationserkennung, ohne dass sie nachträglich draufgeschnallt werden muss. Siehe [`spec/v1.0/08-integrity.md`](../../spec/v1.0/08-integrity.md) und [`spec/v1.0/09-signatures.md`](../../spec/v1.0/09-signatures.md).

Eine `.mda`-Quelle, die nur das offene Standard-Frontmatter verwendet, kompiliert unverändert in eine `.md`. Nutze so viel oder so wenig MDA, wie dein Projekt braucht.

## Warum es das gibt

Die ehrliche Version. Ich habe immer wieder dieselbe Skill viermal ausgeliefert. Gleicher Inhalt, vier Verpackungen. Jede Runtime hatte ihre eigene Meinung darüber, welches Frontmatter oben hingehört und was als herstellerspezifisch gilt. Beim dritten oder vierten Mal, als ich einen Absatz zwischen `SKILL.md` und `AGENTS.md` herauskopierte und dann zusah, wie sie auseinanderdrifteten, fing ich an, das hier zu schreiben.

Die Sache ist, die Duplikation ist nicht das Schlimmste. Das Schlimmste ist, was du in keinem dieser Formate ausdrücken kannst. Du kannst nicht sagen „diese Skill hängt von jener ab, Version `^1.2.0`, mit diesem Inhalts-Digest." Du kannst nicht sagen „diese Datei wurde von dieser Identität bei diesem Rekor-Index signiert." Du kannst nicht sagen „die Beziehung zwischen diesem Dokument und jenem ist `supports`, nicht `cites`." Es gibt keinen Ort für diese Information, also landet sie im Fließtext, wo weder Agenten noch Menschen verlässlich darauf reagieren können.

MDA bringt diese Dinge ins Frontmatter und in die Fußnoten, in Formen, die ein JSON Schema validieren kann. Der Markdown-Body rendert weiterhin. Die Standardfelder werden weiterhin geladen. Alles Neue ist optional. Das ist die ganze Idee.

Für die ausführliche Version gehen zwei Dokumente tiefer. Beide führen jede Behauptung auf einen Spec-Abschnitt zurück und benennen aktuelle Lücken im Ökosystem direkt im Text. Lies sie, wenn du entscheidest, ob du MDA einsetzen willst.

- [**`docs/v1.0/ai-agent-core-value.md`**](../../docs/v1.0/ai-agent-core-value.md) — fünf Punkte, zugeschnitten auf Runtimes, Harnesses, Validatoren und Dispatcher. Was MDA einem Agenten beim Laden gibt: strukturiertes `requires` für typisierten Dispatch, verifizierbares Vertrauen beim Laden, maschinenlesbare Graphkanten, dateinamenbasiertes Target-Dispatch mit einem einzigen Lookup und denselben Validierungsvertrag für agentenerstellte und compilergenerierte Ausgabe.
- [**`docs/v1.0/human-curator-user-core-value.md`**](../../docs/v1.0/human-curator-user-core-value.md) — sechs Punkte, zugeschnitten auf die Menschen, die agentenseitige Anweisungsbibliotheken schreiben und kuratieren. Was MDA einem Autor beim Ausliefern gibt: eine Quelle in mehrere Ökosysteme, Manipulationssicherheit und Publisher-Zurechnung, maschinenlesbarer Abhängigkeitsgraph und Versions-Pinning, LLM-vermitteltes Authoring, ohne das Frontmatter jeder Runtime einzeln lernen zu müssen, geringere (nicht null) Vendor-Lock-in und strenge Validierung, die fast-konforme Artefakte vor dem Ausliefern abfängt.

## Drei Autorenmodi

MDA-Artefakte können auf drei Wegen entstehen. Sie sind unter Validierung gleichwertig.

1. **Agent-Modus** — ein KI-Agent schreibt die `.md` direkt. Der primäre Anwendungsfall in nächster Zeit.
2. **Human-Modus** — ein Mensch schreibt die `.md` direkt, ergänzt Integrity und signiert über einen DSSE/Rekor-fähigen Signaturpfad.
3. **Compiled-Modus** — ein Autor schreibt eine `.mda`-Quelle; der MDA-Compiler erzeugt eine oder mehrere `.md`-Ausgaben.

Welchen Weg du auch nimmst, das Artefakt wird gegen dasselbe JSON Schema 2020-12-Zielschema und dieselbe Conformance-Suite gemessen. Es gibt keinen zweiten Codepfad für „das hier kam von einem Agenten."

Siehe [`docs/create-sign-verify-mda.md`](../../docs/create-sign-verify-mda.md) für die manuellen und agentenerstellten Pfade ohne die Referenz-CLI sowie [`spec/v1.0/00-overview.md §0.5–§0.6`](../../spec/v1.0/00-overview.md) für die normative Festlegung von Priorität und Modi.

## Minimales Beispiel

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

Kompiliert zu `pdf-tools/SKILL.md`. Die Quelle sitzt bereits in der strikten Zielform, mit jedem MDA-erweiterten Feld unter `metadata.mda.*` verschachtelt — der Compile ist also im Wesentlichen ein Rename. Weitere ausgearbeitete Beispiele findest du in [`examples/`](../../examples/) und [`docs/mda-examples/`](../../docs/mda-examples/).

## Kompatibilität

Eine kompilierte `SKILL.md` ist von den wichtigsten agentskills.io-v1-Konsumenten ladbar:

- **Claude Code** — https://code.claude.com/docs/en/skills
- **OpenCode** — https://opencode.ai/docs/skills/
- **OpenAI Codex** — https://developers.openai.com/codex/skills
- **Hermes Agent** — https://hermes-agent.nousresearch.com/docs/user-guide/features/skills
- **OpenClaw** — https://docs.openclaw.ai/tools/skills
- **skills.sh / Skills Directory** — https://www.skillsdirectory.com/
- **Cursor**, **Windsurf** und weitere SKILL.md-Konsumenten aus 2026

Eine kompilierte `AGENTS.md` landet im AAIF-konformen Ökosystem (der Agentic AI Foundation der Linux Foundation): Codex CLI, GitHub Copilot, Cursor, Windsurf, Amp, Devin, Gemini CLI, VS Code, Jules, Factory.

Herstellerspezifische Erweiterungen leben unter reservierten `metadata.<vendor>.*`-Namespaces. Loader lesen nur ihren eigenen Namespace, und Konsumenten dürfen ein Dokument nicht allein deshalb ablehnen, weil es einen unregistrierten Namespace trägt. Siehe [`REGISTRY.md`](../../REGISTRY.md) für das Namespace-Register, die Standard-`requires`-Schlüssel, reservierte Sigstore-OIDC-Issuer und reservierte DSSE-`payload-type`-Werte.

## Die Open Spec

Die normative MDA Open Spec liegt unter [**SPEC.md**](../../SPEC.md) → [`spec/v1.0/`](../../spec/v1.0/).

- [§00 Übersicht](../../spec/v1.0/00-overview.md) — Begriffe, RFC 2119, Priorität P0 > P1 > P2, drei Autorenmodi, Governance, Versionierung
- [§01 Quelle und Ausgabe](../../spec/v1.0/01-source-and-output.md)
- [§02 Frontmatter](../../spec/v1.0/02-frontmatter.md)
- [§03 Relationships](../../spec/v1.0/03-relationships.md) — Fußnoten + `depends-on` + Versions-/Digest-Pinning
- [§04 Plattform-Namespaces](../../spec/v1.0/04-platform-namespaces.md)
- [§05 Progressive Disclosure](../../spec/v1.0/05-progressive-disclosure.md)
- [§06 Zielschemata](../../spec/v1.0/06-targets/) — `SKILL.md`, `AGENTS.md`, `MCP-SERVER.md`, `CLAUDE.md`
- [§07 Conformance](../../spec/v1.0/07-conformance.md)
- [§08 Integrity](../../spec/v1.0/08-integrity.md)
- [§09 Signatures](../../spec/v1.0/09-signatures.md) — Sigstore OIDC als Default, did:web als Fallback
- [§10 Capabilities](../../spec/v1.0/10-capabilities.md) — `metadata.mda.requires`
- [§11 Implementer's Guide](../../spec/v1.0/11-implementer-guide.md) (informativ)
- [§12 Sigstore-Tooling-Integration](../../spec/v1.0/12-sigstore-tooling.md) (informativ)
- [§13 Trusted Runtime Profile](../../spec/v1.0/13-trusted-runtime.md) — Produktionsprüfung und Trust Policy

JSON Schemas liegen in [`schemas/`](../../schemas/) — `frontmatter-source`, `frontmatter-skill-md`, `frontmatter-agents-md`, `frontmatter-mcp-server-md`, `relationship-footnote`, `mda-trust-policy`, plus geteilte `_defs/` für `integrity`, `signature`, `requires`, `depends-on` und `version-range`. Conformance-Fixtures und der Validation-Runner liegen in [`conformance/`](../../conformance/) (`node scripts/validate-conformance.mjs`).

## Referenzimplementierung

Die TypeScript-CLI liegt in [`apps/cli/`](../../apps/cli/) (npm-Paket: `@markdown-ai/cli`). Die Architektur-Spec ist [`apps/cli/IMPL-SPEC.md`](../../apps/cli/IMPL-SPEC.md). Die CLI reift über die `v1.0.0-rc.N`-Tags. Das finale `1.0.0` landet, wenn die CLI 100 % der Conformance-Suite besteht.

![v1.0 liefert den Vertrag — Schemata, Conformance und Compiler — Verifier, Resolver, Registry, Graph-Indexer und Runtime-Routing sind künftige Ökosystem-Arbeit](../../images/status-contract-and-ecosystem.png)

## Stand der Dinge — ehrlich

v1.0 liefert den **Vertrag**, nicht das gesamte Ökosystem drumherum.

**Was heute funktioniert:** du kannst eine `.mda` schreiben, sie zu einer oder mehreren konformen `.md`-Ausgaben kompilieren und sie gegen die Ziel-JSON-Schemata sowie die Conformance-Suite validieren.

**Was noch gebaut wird:**

- Ein gebündelter Verifier für Signaturen ist noch nicht ausgeliefert. Operatoren kombinieren aktuell eine JCS-Bibliothek mit DSSE/Rekor-fähigen Sigstore-Signatur- und Verifikationswerkzeugen.
- Ein funktionierender Dependency-Resolver und ein zentrales Artefakt-Register existieren noch nicht.
- Ein Graph-Indexer, der `metadata.mda.relationships` konsumiert, ist nicht ausgeliefert.
- Es ist kein 2026er Multi-Agent-Harness bekannt, das heute über `metadata.mda.requires` routet.
- v1.0 deckt die agentskills.io- und AAIF-Teilmenge ab. Es zielt nicht auf Cursor MDC, Windsurf-Rules, Continue, Aider oder `*.instructions.md`. Diese brauchen weiterhin parallele Pflege.

Die `.mda`, die du heute schreibst, erzeugt nach wie vor konforme `.md`-Ausgaben, die in jeder oben gelisteten Runtime laden. Die Teile für Verifikation, Auflösung und Graph-Traversierung sind in Arbeit. Was v1.0 einfriert, ist der Vertrag, der es erlaubt, sie ohne weitere Verhandlung zu bauen.

Für die vollständige Lücke zwischen Spec und konsumentenseitigem Ökosystem siehe [`docs/v1.0/what-v1.0-does-not-ship.md`](../../docs/v1.0/what-v1.0-does-not-ship.md). Genau diese Unterscheidung — zwischen einem ehrlichen Spec-Freeze und einem Marketing-Freeze — versucht dieses Projekt zu wahren.

## Mitwirken

Beiträge sind willkommen. Größere Änderungen an der Open Spec oder am Vendor-Register sollten als Diskussion beginnen, bevor Code entsteht. Siehe [`CONTRIBUTING.md`](../../CONTRIBUTING.md), [`CODE_OF_CONDUCT.md`](../../CODE_OF_CONDUCT.md) und [`SECURITY.md`](../../SECURITY.md). Für die Vergabe von Vendor-Namespaces siehe [`REGISTRY.md`](../../REGISTRY.md). Aktuelle Änderungen sind in [`CHANGELOG.md`](../../CHANGELOG.md) protokolliert.

## Lizenz

- Open-Spec-Inhalte (`spec/`, `REGISTRY.md`, `SPEC.md`): [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/)
- Schemata (`schemas/`), Tooling und Referenzimplementierungen: [Apache-2.0](../../LICENSE)

## Verwandte Links

- Dokumentationsseite: https://mda.sno.dev
- Spec-Diskussion: https://github.com/sno-ai/mda/discussions
