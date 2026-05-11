# 📝 MDA Open Spec — Markdown pour Agents

> Un sur-ensemble de Markdown pour les documents destinés aux agents. **Une seule source, plusieurs cibles** — compile vers les fichiers `.md` que tous les principaux runtimes d'agents savent déjà charger. **Inviolabilité vérifiable au chargement** — chaque artefact embarque une empreinte de contenu reproductible, et les artefacts signés portent des signatures ancrées dans Sigstore, de sorte que ni l'agent qui charge le document ni l'humain qui le relit n'a à faire confiance à un blob non signé.

[![Latest release](https://img.shields.io/badge/release-v1.0.0--rc.3-blue)](https://github.com/sno-ai/mda/releases/tag/v1.0.0-rc.3)
[![License](https://img.shields.io/github/license/sno-ai/mda)](https://github.com/sno-ai/mda/blob/main/LICENSE)
[![Docs](https://img.shields.io/badge/docs-mda.sno.dev-3b82f6)](https://mda.sno.dev)
[![GitHub stars](https://img.shields.io/github/stars/sno-ai/mda?style=flat&color=yellow)](https://github.com/sno-ai/mda/stargazers)

**Lire dans d'autres langues :** [English](../../README.md) · [中文](README.zh-CN.md) · [Deutsch](README.de.md) · [Español](README.es.md) · **Français** · [Русский](README.ru.md) · [한국어](README.ko.md) · [日本語](README.ja.md) · [हिन्दी](README.hi.md)

## Ce qu'est MDA

Jusqu'ici, tu livrais la même skill quatre fois. Une fois en `SKILL.md` pour les runtimes agentskills.io. Une fois en `AGENTS.md` pour l'écosystème AAIF. Une fois en `MCP-SERVER.md` avec un sidecar JSON. Une fois en `CLAUDE.md`. Même contenu, quatre formes de frontmatter. Tu mets à jour l'un, tu oublies les autres, et un mois plus tard, les quatre fichiers ont silencieusement divergé en quatre jeux d'instructions légèrement différents.

Tu écris un seul `.mda`. Le compilateur produit le reste.

![Une source .mda compilée par un pipeline déterministe en SKILL.md, AGENTS.md, MCP-SERVER.md et CLAUDE.md](../../images/hero-compile-pipeline.png)

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

Et ces quatre fichiers sont incapables de dire qui les a signés. L'agent qui charge `SKILL.md` n'a aucun moyen de vérifier que le contenu correspond à ce que tu as écrit, et le curateur qui relit `AGENTS.md` n'a aucun moyen de savoir entre quelles mains il est passé entre le merge et le chargement. Les frontmatter standards n'ont aucune place pour une empreinte de contenu ou une signature, donc la décision de confiance retombe discrètement sur un « on fait confiance au repo, sans trop savoir pourquoi ».

MDA embarque, dans le frontmatter même, un `integrity.digest` canonicalisé en JCS et des `signatures[]` enveloppées en DSSE et ancrées dans Sigstore. Les deux côtés — l'agent au chargement et l'humain à la revue — peuvent prendre une véritable décision de confiance face à l'artefact qu'ils ont en main, et non face à une intuition sur le repo. La détection d'altération et la vérification du signataire font partie du contrat, et non d'un ajout tardif.

![Trois ajouts MDA par-dessus le Markdown standard : frontmatter riche, relations de footnote typées, identité signée](../../images/three-additions.png)

`.mda` ajoute trois choses par-dessus le Markdown standard. Toutes optionnelles.

1. **Frontmatter YAML enrichi.** Au-delà du socle ouvert `name` et `description`, MDA porte `doc-id`, `version`, `requires`, `depends-on`, `relationships` et `tags`. Les outils qui comprennent les agents s'en servent pour le routage, la résolution de dépendances et le parcours de graphe. Voir [`spec/v1.0/02-frontmatter.md`](../../spec/v1.0/02-frontmatter.md) et [`spec/v1.0/10-capabilities.md`](../../spec/v1.0/10-capabilities.md).
2. **Relations de footnote typées.** Des footnotes Markdown standards dont la charge utile est un objet JSON : `parent`, `child`, `related`, `cites`, `supports`, `contradicts`, `extends`. Recopiées dans `metadata.mda.relationships` selon l'ordre du corps à la compilation. Voir [`spec/v1.0/03-relationships.md`](../../spec/v1.0/03-relationships.md).
3. **Identité cryptographique.** Une empreinte `integrity` canonicalisée en JCS, plus des `signatures[]` enveloppées en DSSE et ancrées dans Sigstore. Le `.md` compilé embarque une détection d'altération reproductible sans qu'on ait à la rajouter après coup. Voir [`spec/v1.0/08-integrity.md`](../../spec/v1.0/08-integrity.md) et [`spec/v1.0/09-signatures.md`](../../spec/v1.0/09-signatures.md).

Une source `.mda` qui n'utilise que le frontmatter du standard ouvert se compile telle quelle en un `.md`. Tu prends de MDA ce dont ton projet a besoin, ni plus ni moins.

## Pourquoi ce projet existe

La version honnête. Je n'arrêtais pas de livrer la même skill quatre fois. Même contenu, quatre emballages. Chaque runtime avait ses propres opinions sur ce qui devait figurer en tête du frontmatter et sur ce qui relevait du vendor-specific. La troisième ou la quatrième fois où j'ai copié-collé un paragraphe entre `SKILL.md` et `AGENTS.md` avant de les voir diverger, j'ai commencé à écrire ceci.

Le truc, c'est que la duplication n'est pas le pire. Le pire, c'est ce que tu ne peux dire dans aucun de ces formats. Tu ne peux pas dire « cette skill dépend de telle autre, en version `^1.2.0`, avec cette empreinte de contenu ». Tu ne peux pas dire « ce fichier a été signé par cette identité à tel index Rekor ». Tu ne peux pas dire « la relation entre ce document et celui-là, c'est `supports`, pas `cites` ». Il n'y a nulle part où mettre cette information, alors elle reste dans la prose, là où ni les agents ni les humains ne peuvent l'exploiter de manière fiable.

MDA met ces choses-là dans le frontmatter et dans les footnotes, dans des formes qu'un JSON Schema peut valider. Le corps Markdown s'affiche toujours. Les champs standards se chargent toujours. Tout ce qui est nouveau est optionnel. Voilà tout l'argument.

Pour la version longue, deux documents creusent le sujet. Tous deux rattachent chaque affirmation à une section de la spec, et tous deux pointent les manques actuels de l'écosystème au fil du texte. À lire si tu te demandes s'il faut adopter MDA.

- [**`docs/v1.0/ai-agent-core-value.md`**](../../docs/v1.0/ai-agent-core-value.md) — cinq points pensés pour les runtimes, les harnesses, les validateurs et les dispatchers. Ce que MDA apporte à un agent au chargement : un `requires` structuré pour le dispatch typé, une confiance vérifiable au chargement, des arêtes de graphe lisibles par machine, un dispatch de cible en une seule recherche par nom de fichier, et le même contrat de validation pour les sorties écrites par un agent et celles émises par un compilateur.
- [**`docs/v1.0/human-curator-user-core-value.md`**](../../docs/v1.0/human-curator-user-core-value.md) — six points pensés pour les personnes qui écrivent et curent des bibliothèques d'instructions destinées aux agents. Ce que MDA apporte à un auteur au moment de la livraison : une seule source vers plusieurs écosystèmes, l'inviolabilité vérifiable et l'attribution à l'éditeur, un graphe de dépendances et un pinning de version lisibles par machine, une rédaction médiatisée par LLM sans avoir à apprendre le frontmatter de chaque runtime, un vendor lock-in plus faible (pas nul), et une validation stricte qui rattrape les artefacts presque conformes avant qu'ils ne soient livrés.

## Trois modes d'écriture

Les artefacts MDA peuvent être produits de trois manières. Toutes équivalentes du point de vue de la validation.

1. **Mode agent** — un agent IA écrit directement le `.md`. Le cas d'usage principal à court terme.
2. **Mode humain** — un humain écrit directement le `.md`, ajoute l'integrity, puis signe avec un chemin de signature compatible DSSE/Rekor.
3. **Mode compilé** — un auteur écrit une source `.mda` ; le compilateur MDA en émet une ou plusieurs sorties `.md`.

Quel que soit le chemin, l'artefact est jugé sur le même target schema JSON Schema 2020-12 et sur la même suite de conformance. Il n'y a pas de second chemin de code pour « ça vient d'un agent ».

Voir [`docs/create-sign-verify-mda.md`](../../docs/create-sign-verify-mda.md) pour les chemins manuel et écrit-par-agent sans la CLI de référence, et [`spec/v1.0/00-overview.md §0.5–§0.6`](../../spec/v1.0/00-overview.md) pour l'énoncé normatif des priorités et des modes.

## Exemple minimal

`pdf-tools.mda` :

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

Compile vers `pdf-tools/SKILL.md`. La source est déjà dans la forme cible stricte, avec chaque champ étendu MDA niché sous `metadata.mda.*`, donc la compilation se résume essentiellement à un renommage. D'autres exemples travaillés se trouvent dans [`examples/`](../../examples/) et [`docs/mda-examples/`](../../docs/mda-examples/).

## Compatibilité

Un `SKILL.md` compilé est chargeable par les principaux consommateurs agentskills.io v1 :

- **Claude Code** — https://code.claude.com/docs/en/skills
- **OpenCode** — https://opencode.ai/docs/skills/
- **OpenAI Codex** — https://developers.openai.com/codex/skills
- **Hermes Agent** — https://hermes-agent.nousresearch.com/docs/user-guide/features/skills
- **OpenClaw** — https://docs.openclaw.ai/tools/skills
- **skills.sh / Skills Directory** — https://www.skillsdirectory.com/
- **Cursor**, **Windsurf** et les autres consommateurs SKILL.md de 2026

Un `AGENTS.md` compilé atterrit dans l'écosystème aligné AAIF (l'Agentic AI Foundation de la Linux Foundation) : Codex CLI, GitHub Copilot, Cursor, Windsurf, Amp, Devin, Gemini CLI, VS Code, Jules, Factory.

Les extensions par éditeur vivent sous des espaces de noms réservés `metadata.<vendor>.*`. Les loaders ne lisent que leur propre namespace, et un consommateur ne doit pas rejeter un document au seul motif qu'il porte un namespace non enregistré. Voir [`REGISTRY.md`](../../REGISTRY.md) pour le registre des namespaces, les clés `requires` standards, les issuers OIDC Sigstore réservés et les valeurs `payload-type` DSSE réservées.

## L'Open Spec

La spec normative MDA Open Spec se trouve dans [**SPEC.md**](../../SPEC.md) → [`spec/v1.0/`](../../spec/v1.0/).

- [§00 Overview](../../spec/v1.0/00-overview.md) — terminologie, RFC 2119, priorité P0 > P1 > P2, trois modes d'écriture, gouvernance, versioning
- [§01 Source and output](../../spec/v1.0/01-source-and-output.md)
- [§02 Frontmatter](../../spec/v1.0/02-frontmatter.md)
- [§03 Relationships](../../spec/v1.0/03-relationships.md) — footnotes + `depends-on` + pinning version/empreinte
- [§04 Platform namespaces](../../spec/v1.0/04-platform-namespaces.md)
- [§05 Progressive disclosure](../../spec/v1.0/05-progressive-disclosure.md)
- [§06 Target schemas](../../spec/v1.0/06-targets/) — `SKILL.md`, `AGENTS.md`, `MCP-SERVER.md`, `CLAUDE.md`
- [§07 Conformance](../../spec/v1.0/07-conformance.md)
- [§08 Integrity](../../spec/v1.0/08-integrity.md)
- [§09 Signatures](../../spec/v1.0/09-signatures.md) — Sigstore OIDC par défaut, repli did:web
- [§10 Capabilities](../../spec/v1.0/10-capabilities.md) — `metadata.mda.requires`
- [§11 Implementer's Guide](../../spec/v1.0/11-implementer-guide.md) (informatif)
- [§12 Sigstore tooling integration](../../spec/v1.0/12-sigstore-tooling.md) (informatif)
- [§13 Trusted Runtime Profile](../../spec/v1.0/13-trusted-runtime.md) — vérification de production et trust policy

Les JSON Schemas sont dans [`schemas/`](../../schemas/) — `frontmatter-source`, `frontmatter-skill-md`, `frontmatter-agents-md`, `frontmatter-mcp-server-md`, `relationship-footnote`, `mda-trust-policy`, plus le `_defs/` partagé pour `integrity`, `signature`, `requires`, `depends-on` et `version-range`. Les fixtures de conformance et le runner de validation sont dans [`conformance/`](../../conformance/) (`node scripts/validate-conformance.mjs`).

## Implémentation de référence

La CLI TypeScript se trouve dans [`apps/cli/`](../../apps/cli/) (paquet npm : `@markdown-ai/cli`). La spec d'architecture est dans [`apps/cli/IMPL-SPEC.md`](../../apps/cli/IMPL-SPEC.md). La CLI mûrit au fil des tags `v1.0.0-rc.N`. La `1.0.0` finale arrivera quand la CLI passera 100 % de la suite de conformance.

![v1.0 livre le contrat — schemas, conformance et compilateur — avec verifier, resolver, registry, indexeur de graphe et routage runtime comme chantiers à venir pour l'écosystème](../../images/status-contract-and-ecosystem.png)

## État du projet, en toute honnêteté

v1.0 livre le **contrat**, pas tout l'écosystème qui l'entoure.

**Ce qui marche aujourd'hui :** tu peux écrire un `.mda`, le compiler vers une ou plusieurs sorties `.md` conformes, et les valider contre les JSON Schemas cibles et la suite de conformance.

**Ce qui reste à construire :**

- Un verifier groupé pour les signatures n'est pas encore livré. Pour l'instant, les opérateurs assemblent une bibliothèque JCS avec des outils Sigstore de signature et vérification compatibles DSSE/Rekor.
- Un resolver de dépendances opérationnel et un registre central d'artefacts n'existent pas encore.
- Un indexeur de graphe qui consomme `metadata.mda.relationships` n'est pas livré.
- Aucun harness multi-agents de 2026 connu ne route aujourd'hui via `metadata.mda.requires`.
- v1.0 couvre le sous-ensemble agentskills.io et AAIF. Il ne vise pas Cursor MDC, les règles Windsurf, Continue, Aider, ni les `*.instructions.md`. Ceux-là demandent encore une maintenance parallèle.

Le `.mda` que tu écris aujourd'hui produit malgré tout des sorties `.md` conformes qui se chargent dans tous les runtimes listés plus haut. Les briques de vérification, de résolution et de parcours de graphe sont en cours. Le contrat qui permet de les construire sans nouvelle négociation, c'est ce que v1.0 fige.

Pour le delta complet entre la spec et l'écosystème côté consommateur, voir [`docs/v1.0/what-v1.0-does-not-ship.md`](../../docs/v1.0/what-v1.0-does-not-ship.md). Cette distinction, entre un gel de spec honnête et un gel marketing, c'est celle que ce projet essaie de tenir.

## Contribuer

Les contributions sont les bienvenues. Les changements majeurs à l'Open Spec ou au registre des éditeurs devraient commencer par une discussion avant d'écrire du code. Voir [`CONTRIBUTING.md`](../../CONTRIBUTING.md), [`CODE_OF_CONDUCT.md`](../../CODE_OF_CONDUCT.md) et [`SECURITY.md`](../../SECURITY.md). Pour l'attribution d'un namespace éditeur, voir [`REGISTRY.md`](../../REGISTRY.md). Les changements récents sont consignés dans [`CHANGELOG.md`](../../CHANGELOG.md).

## Licence

- Contenu de l'Open Spec (`spec/`, `REGISTRY.md`, `SPEC.md`) : [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/)
- Schémas (`schemas/`), outillage et implémentations de référence : [Apache-2.0](../../LICENSE)

## Liens connexes

- Site de documentation : https://mda.sno.dev
- Discussions sur la spec : https://github.com/sno-ai/mda/discussions
- Guide du dépôt lisible par les LLM : [`llms.txt`](../../llms.txt)
