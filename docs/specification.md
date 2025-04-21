# AIMD Specification

This document provides detailed specifications for the three optional components of AI Markdown (AIMD): YAML Front Matter, `ai-script` Code Blocks, and Markdown Footnotes for Relationships.

## 1. Front Matter Schema

Provides structured metadata using YAML syntax, enclosed by `---` delimiters at the beginning of the file.

**Fields:**

| Field           | Type          | Description                                                                 | Example                     | Required/Optional |
| --------------- | ------------- | --------------------------------------------------------------------------- | --------------------------- |-------------------|
| `doc-id`        | `string`      | A unique identifier (e.g., UUID) for this document. Crucial for relationships.| `"38f5a922-81b2-4f1a-8d8c-3a5be4ea7511"` | Optional          |
| `title`         | `string`      | The main title of the document.                                             | `"Introduction to AIMD"`      | Optional          |
| `description`   | `string`      | A brief summary or abstract of the document's content.                      | `"Explains the AIMD format."` | Optional          |
| `tags`          | `list[string]`| Keywords or categories for classification and retrieval.                    | `["markdown", "ai", "rag"]` | Optional          |
| `created_date`  | `date`        | ISO 8601 date (YYYY-MM-DD) when the document was originally created.        | `"2024-01-15"`              | Optional          |
| `updated_date`  | `date`        | ISO 8601 date (YYYY-MM-DD) when the document was last significantly updated.  | `"2024-06-01"`              | Optional          |
| `expired_date`  | `date`        | Optional ISO 8601 date (YYYY-MM-DD) when the content should be considered outdated. | `"2025-01-01"`              | Optional          |
| `globs`         | `string`      | File or URL patterns this metadata applies to (e.g., `docs/**/*.md`).     | `"*.md"`                    | Optional          |
| `audience`      | `string`      | Describes the intended audience (e.g., "developers", "end-users").          | `"Developers"`              | Optional          |
| `purpose`       | `string`      | The primary goal or objective of the document (e.g., "tutorial", "reference").| `"Reference"`               | Optional          |
| `entities`      | `list[string]`| Key named entities (people, places, organizations, concepts) mentioned.       | `["AIMD", "RAG", "LLM"]`    | Optional          |
| `relationships` | `list[string]`| High-level summary of relationships defined in footnotes (human-readable).  | `["Extends Markdown"]`      | Optional          |
| `source_url`    | `string`      | The original URL if the content was sourced from the web.                   | `"https://example.com/doc"` | Optional          |

*Note: While all fields are technically optional for basic AIMD validity, `doc-id` is highly recommended if using the Footnote relationship feature.*

## 2. AI Script Block (`ai-script`)

Embeds instructions for AI processing within standard Markdown fenced code blocks using the `ai-script` language identifier. The content is a JSON object.

**JSON Fields:**

| Field        | Type      | Description                                                                     | Example                  | Required/Optional |
|--------------|-----------|---------------------------------------------------------------------------------|--------------------------|-------------------|
| `script-id`  | `string`  | A unique identifier for this specific instruction block within the document.    | `"summary_request_001"`  | Required          |
| `prompt`     | `string`  | The actual prompt or command text intended for the LLM or AI agent.             | `"Summarize this section."` | Required          |
| `priority`   | `string`  | Helps prioritize execution if multiple instructions exist (e.g., "high", "medium", "low"). | `"medium"`             | Optional          |
| `auto-run`    | `boolean` | Indicates if an automated processing agent should execute this instruction.     | `true`                   | Optional          |
| `provider`   | `string`  | Specifies the target AI provider (e.g., "openai", "anthropic", "google").     | `"openai"`             | Optional          |
| `model-name` | `string`  | Specifies the target model name (e.g., "gpt-4o", "claude-3-opus").          | `"gpt-4o"`             | Optional          |

**Processing Hint:**

A comment like `<!-- AI-PROCESSOR: Content blocks marked with ```ai-script are instructions for AI systems and should not be presented to human users -->` can be included to guide processing systems.

**Alternative:** Instructions can also be passed externally via API metadata, which might be preferable for complex scenarios or managing many instructions.

## 3. Footnote Relationships

Leverages standard Markdown footnote syntax (`[^ref-id]` and `[^ref-id]: ...`) to define relationships between documents. The footnote definition contains a JSON payload.

**JSON Fields within Footnote Definition:**

| Field           | Type                             | Description                                                                    | Example                                           | Required/Optional |
|-----------------|----------------------------------|--------------------------------------------------------------------------------|---------------------------------------------------|-------------------|
| `rel_type`      | `string` (Enum recommended)      | Nature of the relationship. Recommended values: `citation`, `parent`, `child`, `related`, `contradicts`, `supports`, `extends`. | `"parent"`                                      | Required          |
| `doc_id`        | `string`                         | The unique `doc-id` (from Front Matter) of the target/related document.         | `"UUID-of-target-document"`                     | Required          |
| `rel_desc`      | `string`                         | A brief, human-readable description of why the documents are related.          | `"Derived from primary SEC documentation"`        | Required          |
| `rel_strength`  | `float` (0.0 to 1.0)             | Optional confidence score or relevance strength of the relationship.           | `0.8`                                             | Optional          |
| `bi_directional`| `boolean`                        | Optional: Indicates if the relationship implies a reciprocal link back.      | `true`                                            | Optional          |
| `context`       | `object`                         | Optional: Provides additional context about the link.                          | `{"section": "Introduction", "relevance": "High"}` | Optional          |
| `context.section`| `string`                        | Specific section or part of the source document where the link originates.  | `"Introduction"`                                | Optional          |
| `context.relevance`| `string`                        | Qualitative assessment of relevance (e.g., "High", "Medium", "Low").       | `"High"`                                        | Optional          |

**Implementation Notes:**

*   Ensure the `doc_id` used in footnotes corresponds accurately to a `doc-id` defined in the Front Matter of the target AIMD document.
*   Consistent use of `rel_type` values is important for building reliable knowledge graphs.
