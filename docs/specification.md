# MAGI Specification

This document provides detailed specifications for the three optional components of MAGI (Markdown for Agent Guidance & Instruction): YAML Front Matter, `ai-script` Code Blocks, and Markdown Footnotes for Relationships.

MAGI is designed to be saved in files with the `.mda` extension to clearly signal the presence of enhanced components. While standard Markdown files (`.md`) can contain MAGI elements for backward compatibility, processors optimized for MAGI might prioritize `.mda` files or treat `.md` files as standard Markdown, potentially ignoring `ai-script` blocks or footnote relationships unless explicitly configured to parse them.

The MAGI format, represented as a string, is suitable for transmission via REST APIs, either as request payloads (e.g., sending content to be processed) or response bodies (e.g., returning processed or generated content in MAGI format).

## 1. Front Matter Schema

Provides structured metadata using YAML syntax, enclosed by `---` delimiters at the very beginning of the `.mda` file.

**Fields:** Field names use kebab-case (e.g., `doc-id`, `created-date`).

| Field           | Type          | Description                                                                 | Example                     | Required/Optional | Notes                                    |
| --------------- | ------------- | --------------------------------------------------------------------------- | --------------------------- |-------------------|------------------------------------------|
| `doc-id`        | `string`      | A unique identifier (UUID format recommended) for this document. Crucial for `footnote relationships`.| `"38f5a922-81b2-4f1a-8d8c-3a5be4ea7511"` | Optional          | Strongly recommended for linking         |
| `title`         | `string`      | The main title of the document.                                             | `"Introduction to MAGI"`      | Optional          |                                          |
| `description`   | `string`      | A brief summary or abstract of the document's content.                      | `"Explains the MAGI format."` | Optional          |                                          |
| `tags`          | `list[string]`| Keywords or categories for classification and retrieval.                    | `["markdown", "ai", "rag"]` | Optional          |                                          |
| `created-date`  | `string`        | ISO 8601 timestamp (date and time with timezone recommended) when the document was originally created. | `"2024-01-15T09:00:00Z"`              | Optional          | e.g., `YYYY-MM-DDTHH:mm:ssZ`             |
| `updated-date`  | `string`        | ISO 8601 timestamp when the document was last significantly updated.      | `"2024-06-01T15:30:00Z"`              | Optional          |                                          |
| `expired-date`  | `string`        | Optional ISO 8601 timestamp when the content should be considered outdated. | `"2025-01-01T00:00:00Z"`              | Optional          |                                          |
| `globs`         | `list[string]`| File or URL patterns this metadata applies to (e.g., `["docs/**/*.md", "*.ts"]`). | `["*.mda", "!legacy/*"]`   | Optional          | Used for external/meta `.mda` files      |
| `audience`      | `list[string]`| Describes the intended audience(s) (e.g., `["developers", "end-users"]`).| `["Developers"]`              | Optional          |                                          |
| `purpose`       | `string`      | The primary goal or objective of the document (e.g., "tutorial", "reference").| `"Reference"`               | Optional          |                                          |
| `entities`      | `list[string]`| Key named entities (people, places, organizations, concepts) mentioned.       | `["MAGI", "RAG", "LLM"]`    | Optional          | Useful for RAG filtering/extraction    |
| `relationships` | `list[string]`| High-level summary of relationships defined in footnotes (human-readable).  | `["Extends Markdown"]`      | Optional          | Primarily for human readers              |
| `source-url`    | `string`      | The original URL if the content was sourced or derived from the web.         | `"https://example.com/doc"` | Optional          |                                          |

*Note: While all fields are technically optional for basic `.mda` validity, `doc-id` is essential if using the Footnote relationship feature.* Custom fields are allowed but may be ignored by standard processors.

## 2. AI Script Block (`ai-script`)

Embeds instructions for AI processing within standard Markdown fenced code blocks using the `ai-script` language identifier. The content **must** be a single, valid JSON object. Field names within the JSON use kebab-case (e.g., `script-id`, `model-name`).

**JSON Fields:**

| Field        | Type      | Description                                                                     | Example                     | Required/Optional | Notes                                      |
|--------------|-----------|---------------------------------------------------------------------------------|-----------------------------|-------------------|--------------------------------------------|
| `script-id`  | `string`  | A unique identifier for this specific instruction block within the document.    | `"summary-request-001"`     | Required          | Should be unique within the `.mda` file      |
| `prompt`     | `string`  | The actual prompt or command text intended for the LLM or AI agent.             | `"Summarize this section."`    | Required          |                                            |
| `priority`   | `string`  | Helps prioritize execution if multiple instructions exist (e.g., "high", "medium", "low"). | `"medium"`                | Optional          | Default behavior is application-specific |
| `auto-run`   | `boolean` | Hint indicating if an automated processing agent should execute this instruction without explicit user trigger. | `true`                      | Optional          | Default is usually `false`                 |
| `provider`   | `string`  | Suggests the target AI provider (e.g., "openai", "anthropic", "google", "local-llm"). | `"openai"`                | Optional          |                                            |
| `model-name` | `string`  | Suggests the target model name (e.g., "gpt-4o", "claude-3-opus-20240229"). | `"gpt-4o"`                | Optional          |                                            |
| `system-prompt`| `string`  | Optional system-level instructions or context for the AI model.        | `"Act as a helpful assistant."` | Optional          | Prepended or handled specially by the runtime |
| `parameters` | `object`  | A JSON object containing provider-specific parameters (e.g., temperature, max tokens). | `{"temperature": 0.7}` | Optional          | Passed directly to the model API       |
| `retry-times`| `integer` | Optional hint for the maximum number of retry attempts on failure.       | `3`                         | Optional          | Runtime should interpret this hint. Default behavior is runtime-specific. |
| `runtime-env`| `string`  | Suggests the ideal runtime context or endpoint for execution (e.g., "server", "browser", "edge", API URL). | `"server"`                | Optional          | Hint for the processing system           |
| `output-format`| `string`| Desired format for the output (e.g., "markdown", "text", "json", "image-url"). | `"markdown"`              | Optional          | Processor should attempt to conform. Implied "json" if `output-schema` is used. |
| `output-schema`| `object`  | Optional JSON Schema object defining the expected structure of the output. | `{"type": "object", ...}` | Optional          | Strongly implies `output-format: "json"`. Used for structured data extraction. |
| `stream`     | `boolean` | Optional hint to the runtime to stream the response if possible.        | `true`                      | Optional          | Default is `false`. Primarily for text output. |
| `interactive-type` | `string` | Type of interactive component to render if `auto-run` is false (e.g., "button", "inputbox"). | `"button"` | Optional | Used for client-side triggered execution. If "inputbox", an input field and submit button (using `interactive-label`) are rendered. |
| `interactive-label`| `string` | Label text for the interactive component (e.g., button text, typically for the submit button). | `"Run Summary"` | Optional | Used when `interactive-type` is specified. |
| `interactive-placeholder` | `string` | Placeholder text for the input field when `interactive-type` is "inputbox". | `"Enter your query..."` | Optional | Used only when `interactive-type` is "inputbox". |

**Processing Hint:**

A comment like `<!-- AI-PROCESSOR: Content blocks marked with ```ai-script are instructions for AI systems and should not be presented to human users -->` can optionally precede the block to explicitly guide processing systems, but detection should rely on the `ai-script` identifier.

**Alternative:** Instructions can also be passed externally (e.g., via API metadata alongside the MAGI content string) for separation of concerns, especially in complex multi-agent systems.

## 3. Footnote Relationships

Leverages standard Markdown footnote syntax (`[^ref-id]` and `[^ref-id]: ...`) to define typed relationships between the current document and other resources. The footnote definition **must** contain a single JSON object enclosed in backticks (`` ` ``).

**JSON Fields within Footnote Definition:** Field names use kebab-case (e.g., `rel-type`, `doc-id`).

| Field           | Type                             | Description                                                                    | Example                                           | Required/Optional | Notes                                                   |
|-----------------|----------------------------------|--------------------------------------------------------------------------------|---------------------------------------------------|-------------------|---------------------------------------------------------|
| `rel-type`      | `string` (Enum recommended)      | Nature of the relationship. Recommended values: `citation`, `parent`, `child`, `related`, `contradicts`, `supports`, `extends`. | `"parent"`                                      | Required          |                                                         |
| `doc-id`        | `string`                         | The unique `doc-id` (from Front Matter) of the target/related `.mda` document. Use *either* `doc-id` or `source-url`. | `"UUID-of-target-document"`                     | Conditional       | Required if not using `source-url`                      |
| `source-url`    | `string`                         | The URL of the target/related external resource. Use *either* `doc-id` or `source-url`. | `"https://example.com/related-article"`        | Conditional       | Required if not using `doc-id`                           |
| `rel-desc`      | `string`                         | A brief, human-readable description of why the documents/resources are related. | `"Derived from primary SEC documentation"`        | Required          |                                                         |
| `rel-strength`  | `float` (0.0 to 1.0)             | Optional confidence score or relevance strength of the relationship.           | `0.8`                                             | Optional          |                                                         |
| `bi-directional`| `boolean`                        | Optional: Indicates if the relationship implies a reciprocal link back (interpretation depends on processor). | `true`                                            | Optional          | Default is usually `false`                              |
| `context`       | `object`                         | Optional: Provides additional structured context about the link's location/nature. | `{"section": "Introduction", "relevance": "High"}` | Optional          |                                                         |
| `context.section`| `string`                       | Specific section/heading in the source document where the link originates. | `"Introduction"`                                | Optional          | Within `context` object                            |
| `context.relevance`| `string`                      | Qualitative assessment of relevance (e.g., "High", "Medium", "Low"). | `"High"`                                        | Optional          | Within `context` object                            |

**Implementation Notes:**

*   Ensure the `doc-id` used in footnotes corresponds accurately to a `doc-id` defined in the Front Matter of the target `.mda` document for internal links.
*   Consistent use of `rel-type` values is crucial for building reliable knowledge graphs.
*   Standard Markdown parsers will render the footnote with the backticks and JSON string as the literal content. MAGI-aware parsers extract and interpret the JSON.
