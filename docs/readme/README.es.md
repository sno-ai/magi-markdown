# 📝 MDA Open Spec — Markdown para Agentes

> Un superconjunto de Markdown para documentos orientados a agentes. **Una fuente, múltiples destinos** — compila a los archivos `.md` que ya cargan los principales runtimes de agentes. **Detección de manipulación al cargar** — cada artefacto lleva un digest reproducible de su contenido, y los artefactos firmados llevan firmas ancladas en Sigstore, de modo que ni el agente que carga el documento ni la persona que lo revisa tiene que confiar en un blob sin firmar.

[![Latest release](https://img.shields.io/github/v/release/sno-ai/mda?include_prereleases&label=release&color=blue)](https://github.com/sno-ai/mda/releases/latest)
[![License](https://img.shields.io/github/license/sno-ai/mda)](https://github.com/sno-ai/mda/blob/main/LICENSE)
[![Docs](https://img.shields.io/badge/docs-mda.sno.dev-3b82f6)](https://mda.sno.dev)
[![GitHub stars](https://img.shields.io/github/stars/sno-ai/mda?style=flat&color=yellow)](https://github.com/sno-ai/mda/stargazers)

**Leer en otros idiomas:** [English](../../README.md) · [中文](README.zh-CN.md) · [Deutsch](README.de.md) · **Español** · [Français](README.fr.md) · [Русский](README.ru.md) · [한국어](README.ko.md) · [日本語](README.ja.md) · [हिन्दी](README.hi.md)

## Qué es MDA

Hasta ahora, publicabas la misma skill cuatro veces. Una como `SKILL.md` para los runtimes de agentskills.io. Otra como `AGENTS.md` para el ecosistema AAIF. Otra como `MCP-SERVER.md` con un JSON adjunto. Otra como `CLAUDE.md`. El mismo contenido, cuatro formas de frontmatter. Actualizas uno, te olvidas del resto y, al cabo de un mes, los cuatro archivos han ido derivando silenciosamente hacia cuatro instrucciones ligeramente distintas.

Tú escribes un único `.mda`. El compilador genera el resto.

![Una fuente .mda compilada mediante un pipeline determinista a SKILL.md, AGENTS.md, MCP-SERVER.md y CLAUDE.md](../../images/hero-compile-pipeline.png)

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

Y esos cuatro archivos no pueden decir quién los firmó. El agente que carga `SKILL.md` no tiene forma de verificar que el contenido coincide con lo que escribiste, y la persona que cura `AGENTS.md` no tiene forma de saber por qué manos ha pasado entre el merge y la carga. Las formas estándar de frontmatter no tienen un lugar donde colocar un digest del contenido o una firma, así que la decisión de confianza acaba reduciéndose, en silencio, a "confiamos en el repo, de algún modo".

MDA incluye en el propio frontmatter un `integrity.digest` canonicalizado con JCS y un `signatures[]` envuelto en DSSE y anclado en Sigstore. Ambos lados —el agente al cargar y la persona al revisar— pueden tomar una decisión de confianza real sobre el artefacto que tienen delante, no sobre una intuición acerca del repo. La detección de manipulación y la verificación del firmante forman parte del contrato, no son un añadido posterior.

![Tres adiciones de MDA sobre Markdown estándar: frontmatter rico, relaciones tipadas en footnotes, identidad firmada](../../images/three-additions.png)

`.mda` añade tres cosas sobre Markdown estándar. Todas opcionales.

1. **Frontmatter YAML rico.** Más allá de la base abierta de `name` y `description`, MDA incorpora `doc-id`, `version`, `requires`, `depends-on`, `relationships` y `tags`. Las herramientas conscientes de agentes los usan para enrutamiento, resolución de dependencias y recorrido del grafo. Consulta [`spec/v1.0/02-frontmatter.md`](../../spec/v1.0/02-frontmatter.md) y [`spec/v1.0/10-capabilities.md`](../../spec/v1.0/10-capabilities.md).
2. **Relaciones tipadas en footnotes.** Footnotes estándar de Markdown cuyo payload es un objeto JSON: `parent`, `child`, `related`, `cites`, `supports`, `contradicts`, `extends`. Al compilar se reflejan en `metadata.mda.relationships` en el orden del cuerpo. Consulta [`spec/v1.0/03-relationships.md`](../../spec/v1.0/03-relationships.md).
3. **Identidad criptográfica.** Un digest `integrity` canonicalizado con JCS más `signatures[]` envuelto en DSSE y anclado en Sigstore. El `.md` compilado lleva detección de manipulación reproducible sin atornillarla después. Consulta [`spec/v1.0/08-integrity.md`](../../spec/v1.0/08-integrity.md) y [`spec/v1.0/09-signatures.md`](../../spec/v1.0/09-signatures.md).

Una fuente `.mda` con solo el frontmatter abierto estándar compila sin cambios a un `.md`. Usa tanto o tan poco de MDA como necesite tu proyecto.

## Por qué existe

La versión honesta. Llevaba tiempo publicando la misma skill cuatro veces. Mismo contenido, cuatro envoltorios. Cada runtime tenía sus propias opiniones sobre qué frontmatter iba arriba y qué se consideraba específico de cada vendor. La tercera o cuarta vez que copié y pegué un párrafo entre `SKILL.md` y `AGENTS.md` y los vi derivar, empecé a escribir esto.

La cosa es que la duplicación no es lo peor. Lo peor es lo que no puedes expresar en ninguno de esos formatos. No puedes decir "esta skill depende de aquella, versión `^1.2.0`, con este digest de contenido". No puedes decir "este archivo fue firmado por esta identidad en este índice de Rekor". No puedes decir "la relación entre este documento y aquel es `supports`, no `cites`". No hay donde poner esa información, así que se queda en la prosa, donde ni los agentes ni las personas pueden actuar sobre ella de forma fiable.

MDA pone esas cosas en el frontmatter y los footnotes, en formas que un JSON Schema puede validar. El cuerpo Markdown se sigue renderizando. Los campos estándar se siguen cargando. Todo lo nuevo es opcional. Esa es la propuesta entera.

Si quieres la versión larga, dos documentos profundizan más. Ambos rastrean cada afirmación hasta una sección del spec, y ambos señalan inline las carencias actuales del ecosistema. Léelos si estás decidiendo si adoptarlo.

- [**`docs/v1.0/ai-agent-core-value.md`**](../../docs/v1.0/ai-agent-core-value.md) — cinco puntos planteados para runtimes, harnesses, validadores y dispatchers. Lo que MDA aporta a un agente al cargar: `requires` estructurado para dispatch tipado, confianza verificable al cargar, aristas de grafo legibles por máquina, dispatch por destino con una sola consulta basada en el nombre de archivo, y el mismo contrato de validación tanto para la salida escrita por agentes como para la emitida por el compilador.
- [**`docs/v1.0/human-curator-user-core-value.md`**](../../docs/v1.0/human-curator-user-core-value.md) — seis puntos planteados para las personas que escriben y curan bibliotecas de instrucciones para agentes. Lo que MDA aporta a un autor al publicar: una sola fuente para múltiples ecosistemas, detección de manipulación y atribución del editor, grafo de dependencias y fijado de versiones legibles por máquina, autoría mediada por LLM sin tener que aprender el frontmatter de cada runtime, menor (no nulo) lock-in de vendor, y validación estricta que detecta artefactos casi conformes antes de que se publiquen.

## Tres modos de creación

Los artefactos MDA pueden producirse de tres formas. Bajo validación son equivalentes.

1. **Modo agente** — un agente IA escribe el `.md` directamente. El caso de uso principal a corto plazo.
2. **Modo humano** — una persona escribe el `.md` directamente, con `sha256sum` y `cosign`.
3. **Modo compilado** — un autor escribe una fuente `.mda`; el compilador MDA emite uno o más `.md` de salida.

Tomes la ruta que tomes, el artefacto se evalúa contra el mismo target schema JSON Schema 2020-12 y la misma suite de conformidad. No hay un segundo camino para "esto vino de un agente".

Consulta [`docs/manual-workflow.md`](../../docs/manual-workflow.md) para las rutas manual y de autoría por agente sin la CLI de referencia, y [`spec/v1.0/00-overview.md §0.5–§0.6`](../../spec/v1.0/00-overview.md) para el enunciado normativo de prioridad y modos.

## Ejemplo mínimo

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

Compila a `pdf-tools/SKILL.md`. La fuente ya está en la forma estricta del destino, con cada campo extendido de MDA anidado bajo `metadata.mda.*`, así que la compilación es básicamente un renombrado. Hay más ejemplos trabajados en [`examples/`](../../examples/) y [`docs/mda-examples/`](../../docs/mda-examples/).

## Compatibilidad

Un `SKILL.md` compilado es cargable por los principales consumidores de agentskills.io v1:

- **Claude Code** — https://code.claude.com/docs/en/skills
- **OpenCode** — https://opencode.ai/docs/skills/
- **OpenAI Codex** — https://developers.openai.com/codex/skills
- **Hermes Agent** — https://hermes-agent.nousresearch.com/docs/user-guide/features/skills
- **OpenClaw** — https://docs.openclaw.ai/tools/skills
- **skills.sh / Skills Directory** — https://www.skillsdirectory.com/
- **Cursor**, **Windsurf** y otros consumidores de SKILL.md de 2026

Un `AGENTS.md` compilado encaja en el ecosistema alineado con AAIF (la Agentic AI Foundation de la Linux Foundation): Codex CLI, GitHub Copilot, Cursor, Windsurf, Amp, Devin, Gemini CLI, VS Code, Jules, Factory.

Las extensiones por vendor viven bajo namespaces reservados `metadata.<vendor>.*`. Los loaders solo leen su propio namespace, y los consumidores no deben rechazar un documento únicamente porque incluya uno no registrado. Consulta [`REGISTRY.md`](../../REGISTRY.md) para el registro de namespaces, las claves estándar de `requires`, los emisores OIDC de Sigstore reservados y los valores `payload-type` de DSSE reservados.

## La Open Spec

La MDA Open Spec normativa vive en [**SPEC.md**](../../SPEC.md) → [`spec/v1.0/`](../../spec/v1.0/).

- [§00 Overview](../../spec/v1.0/00-overview.md) — términos, RFC 2119, prioridad P0 > P1 > P2, los tres modos de creación, gobernanza, versionado
- [§01 Source and output](../../spec/v1.0/01-source-and-output.md)
- [§02 Frontmatter](../../spec/v1.0/02-frontmatter.md)
- [§03 Relationships](../../spec/v1.0/03-relationships.md) — footnotes + `depends-on` + fijado por versión/digest
- [§04 Platform namespaces](../../spec/v1.0/04-platform-namespaces.md)
- [§05 Progressive disclosure](../../spec/v1.0/05-progressive-disclosure.md)
- [§06 Target schemas](../../spec/v1.0/06-targets/) — `SKILL.md`, `AGENTS.md`, `MCP-SERVER.md`, `CLAUDE.md`
- [§07 Conformance](../../spec/v1.0/07-conformance.md)
- [§08 Integrity](../../spec/v1.0/08-integrity.md)
- [§09 Signatures](../../spec/v1.0/09-signatures.md) — Sigstore OIDC por defecto, did:web como alternativa
- [§10 Capabilities](../../spec/v1.0/10-capabilities.md) — `metadata.mda.requires`
- [§11 Implementer's Guide](../../spec/v1.0/11-implementer-guide.md) (informativo)
- [§12 Sigstore tooling integration](../../spec/v1.0/12-sigstore-tooling.md) (informativo)

Los JSON Schemas viven en [`schemas/`](../../schemas/) — `frontmatter-source`, `frontmatter-skill-md`, `frontmatter-agents-md`, `frontmatter-mcp-server-md`, `relationship-footnote`, más `_defs/` compartidos para `integrity`, `signature`, `requires`, `depends-on` y `version-range`. Los fixtures de conformidad y el runner de validación viven en [`conformance/`](../../conformance/) (`node scripts/validate-conformance.mjs`).

## Implementación de referencia

La CLI de TypeScript vive en [`packages/mda/`](../../packages/mda/) (paquete npm: `@mda/cli`). El spec de arquitectura es [`packages/mda/IMPL-SPEC.md`](../../packages/mda/IMPL-SPEC.md). La CLI madura a través de los tags `v1.0.0-rc.N`. La `1.0.0` final llegará cuando la CLI supere el 100 % de la suite de conformidad.

![v1.0 publica el contrato — schemas, conformidad y compilador — con verificador, resolver, registro, indexador de grafo y enrutamiento en runtime como trabajo futuro del ecosistema](../../images/status-contract-and-ecosystem.png)

## Estado, sin rodeos

v1.0 publica el **contrato**, no todo el ecosistema a su alrededor.

**Lo que funciona hoy:** puedes escribir un `.mda`, compilarlo a uno o más `.md` conformes y validarlos contra los target JSON Schemas y la suite de conformidad de 35 fixtures.

**Lo que aún se está construyendo:**

- Todavía no se publica un verificador integrado de firmas. Por ahora, los operadores combinan `cosign` y una librería JCS por su cuenta.
- Aún no existen un resolver de dependencias funcional ni un registro central de artefactos.
- No se publica todavía un indexador de grafo que consuma `metadata.mda.relationships`.
- No se conoce ningún harness multiagente de 2026 que enrute hoy a través de `metadata.mda.requires`.
- v1.0 cubre el subconjunto de agentskills.io y AAIF. No apunta a Cursor MDC, reglas de Windsurf, Continue, Aider ni `*.instructions.md`. Esos siguen requiriendo mantenimiento en paralelo.

El `.mda` que escribes hoy sigue produciendo `.md` conformes que cargan en todos los runtimes listados arriba. Las piezas de verificación, resolución y recorrido de grafo son trabajo en curso. Lo que v1.0 congela es el contrato que permite construirlas sin más negociación.

Para ver el hueco completo entre el spec y el ecosistema del lado consumidor, consulta [`docs/v1.0/what-v1.0-does-not-ship.md`](../../docs/v1.0/what-v1.0-does-not-ship.md). Esa distinción, entre un congelado de spec honesto y un congelado de marketing, es la que este proyecto intenta mantener.

## Contribuir

Las contribuciones son bienvenidas. Los cambios mayores en la Open Spec o en el registro de vendors deberían empezar como una discusión antes que como código. Consulta [`CONTRIBUTING.md`](../../CONTRIBUTING.md), [`CODE_OF_CONDUCT.md`](../../CODE_OF_CONDUCT.md) y [`SECURITY.md`](../../SECURITY.md). Para la asignación de namespaces de vendor, consulta [`REGISTRY.md`](../../REGISTRY.md). Los cambios recientes se registran en [`CHANGELOG.md`](../../CHANGELOG.md).

## Licencia

- Contenido de la Open Spec (`spec/`, `REGISTRY.md`, `SPEC.md`): [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/)
- Schemas (`schemas/`), tooling e implementaciones de referencia: [Apache-2.0](../../LICENSE)

## Relacionado

- Sitio de documentación: https://mda.sno.dev
- Discusión del spec: https://github.com/sno-ai/mda/discussions
