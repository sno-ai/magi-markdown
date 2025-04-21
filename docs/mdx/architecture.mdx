# MAGI Architecture: Integrating Content, Metadata, and AI Instructions

## Introduction

MAGI (Markdown for Agent Guidance & Instruction) provides a robust architectural framework for extending standard Markdown. It is designed to seamlessly integrate structured metadata, actionable AI instructions, and explicit document relationships directly within human-readable content. This architecture ensures backward compatibility with standard Markdown tooling while unlocking advanced capabilities for AI-driven systems, particularly in areas like Retrieval-Augmented Generation (RAG), intelligent documentation platforms, and autonomous agent workflows. MAGI files typically use the `.mda` extension.

The core principle is *enhancement through optionality*. MAGI introduces distinct components that can be adopted individually or collectively, allowing for incremental integration based on specific needs.

## Architectural Components

MAGI's architecture layers structured data onto standard Markdown using distinct, parseable components:

![MAGI: Three Major Components](/images/three-parts.svg)

### 1. YAML Front Matter (Document-Level Metadata)

*   **Purpose:** To provide a standardized, machine-readable header containing metadata about the entire document. This context is invaluable for content management systems, search indexing, RAG retrieval filtering, and providing high-level context to AI models *before* they process the main content.
*   **Syntax:** A valid YAML block enclosed by triple-dashed lines (`---`) located at the very beginning of the `.mda` file.
*   **Functionality:** Defines key-value pairs representing document attributes. Key fields include `doc-id` (UUID format strongly recommended for reliable linking), `title`, `description`, `tags`, `created-date`, `updated-date` (both preferably in ISO 8601 format), `source-url`, `audience`, `purpose`, and `entities`. The schema uses kebab-case for multi-word field names (e.g., `created-date`) and is extensible for custom metadata.
*   **Processing:** MAGI-aware parsers identify and extract this block, parsing the YAML content into a structured data object (e.g., a dictionary or map). Standard Markdown parsers typically ignore it or render it as literal text.
*   **Example (Illustrating Kebab-Case and ISO 8601 Dates):**
    ```yaml
    ---
    doc-id: "38f5a922-81b2-4f1a-8d8c-3a5be4ea7511" # UUID Recommended
    title: "MAGI Architecture Overview"
    description: "Details the core components and philosophy of the MAGI format."
    tags: ["architecture", "markdown", "ai", "specification", "magi"]
    created-date: "2024-01-15T10:00:00Z" # ISO 8601 Format
    updated-date: "2024-07-27T14:30:00Z" # ISO 8601 Format
    audience: ["Developers", "Architects"]
    purpose: "Technical Documentation"
    source-url: "https://example.com/original-source" # Optional: If derived
    entities: ["MAGI", "RAG", "YAML", "JSON"] # Optional: Key concepts
    ---
    ```

### 2. `ai-script` Code Blocks (Embedded AI Instructions)

*   **Purpose:** To embed specific, actionable instructions or prompts for AI agents or LLMs directly within the flow of the Markdown content, providing contextually relevant guidance.
*   **Syntax:** Standard Markdown fenced code blocks with the language identifier `ai-script`. The content within the block MUST be a valid JSON object. Field names within the JSON generally use kebab-case (e.g., `script-id`, `model-name`).
*   **Functionality:** Allows authors to specify fine-grained tasks (e.g., summarize the preceding paragraph, extract entities from the following table, translate this section) or configure AI behavior (e.g., set generation parameters like temperature, specify desired output format, define execution priority). Key fields include `script-id` (unique within the document), `prompt`, `priority`, `auto-run`, `provider`, `model-name`, `parameters`, `runtime-env`, and `output-format`.
*   **Processing:** MAGI-aware systems scan the Markdown content for these blocks, parse the enclosed JSON, and queue the instructions for potential execution by an appropriate AI agent or LLM, often relating the instruction to the surrounding content based on proximity or explicit references (though explicit references are not part of the current spec). Standard renderers display these as regular code blocks.
*   **Example (Illustrating Kebab-Case and Spec Fields):**
    ```markdown
    Here is a complex paragraph detailing quantum physics concepts...

    <!-- AI-PROCESSOR: Content blocks marked with ```ai-script are instructions for AI systems and should not be presented to human users -->
    ```ai-script
    {
      "script-id": "simplify-physics-para-001",
      "prompt": "Explain the main concepts in the preceding paragraph in simple terms, suitable for a general audience.",
      "priority": "medium",
      "auto-run": false,
      "provider": "anthropic",
      "model-name": "claude-3-haiku-20240307", // Example specific model version
      "parameters": {
        "max-tokens": 150,
        "temperature": 0.7
      },
      "runtime-env": "server", // Hint for execution location
      "output-format": "markdown" // Desired output type
    }
    ```

    More human-readable Markdown follows...
    ```
*   **Processing Hint:** An optional HTML comment `<!-- AI-PROCESSOR: ... -->` before or after the block can explicitly signal to processors that the block contains non-displayable instructions, though parsing should primarily rely on the `ai-script` language identifier for robustness.

### 3. Markdown Footnotes with JSON Payloads (Document Relationships)

*   **Purpose:** To define explicit, typed relationships between the current document and other documents or external resources using standard Markdown footnote syntax, enabling the construction of knowledge graphs.
*   **Syntax:** Utilizes the standard `[^ref-id]` inline reference marker and a corresponding `[^ref-id]: ...` definition line. The definition part *must* contain a single JSON object enclosed in backticks (`` ` ``). Field names within the JSON use kebab-case (e.g., `rel-type`, `doc-id`, `rel-desc`).
*   **Functionality:** The JSON payload within the backticks defines the relationship, specifying the `rel-type` (e.g., `parent`, `child`, `related`, `cites`, `supports`, `contradicts`), the target `doc-id` (linking to the Front Matter `doc-id` of another `.mda` document) or a `source-url` for external resources, and a human-readable `rel-desc`. Optional fields like `rel-strength`, `bi-directional`, and `context` can add further nuance.
*   **Processing:** MAGI-aware systems parse these footnote definitions, extracting the JSON payloads to build a relationship graph or provide contextual links during RAG or agent operation. Standard Markdown parsers render them as conventional footnotes, with the JSON string (including backticks) appearing as the footnote content.
*   **Example (Illustrating Kebab-Case and `source-url`):**
    ```markdown
    This architecture builds upon established Markdown principles[^md-guide] and complements the core MAGI specification[^core-spec].

    [^md-guide]: `{"rel-type": "citation", "source-url": "https://daringfireball.net/projects/markdown/", "rel-desc": "Based on original Markdown syntax"}`
    [^core-spec]: `{"rel-type": "related", "doc-id": "spec-doc-uuid-123", "rel-desc": "References the core MAGI specification v1.1", "rel-strength": 0.9, "context": {"section": "Overview"}}`
    ```

## Processing Flow & Integration Philosophy

1.  **Parsing:** A MAGI processor first identifies and extracts the YAML Front Matter. It then scans the remaining content for `ai-script` blocks and footnote definitions containing JSON payloads (within backticks), parsing their structured data. The text content excluding these special blocks constitutes the core human-readable Markdown.
2.  **Contextualization:** The extracted metadata (Front Matter), instructions (`ai-script`), and relationships (Footnotes) provide rich context for subsequent AI processing (e.g., RAG retrieval, agent task execution, knowledge graph population).
3.  **Execution (Optional):** AI instructions within `ai-script` blocks can be selectively executed by an agent or processing pipeline based on their `priority`, `auto-run` status, `runtime-env` hints, and application logic.
4.  **Rendering:** For human consumption, the core Markdown content is rendered using standard libraries. The structured components (Front Matter, `ai-script` blocks, relationship definitions) are typically *omitted* from the final user-facing view, unless specifically included for debugging or transparency (e.g., displaying the `rel-desc` from footnotes as hover text).

**Philosophy:**

*   **Graceful Degradation:** MAGI (`.mda`) remains valid Markdown. Non-MAGI-aware tools can still render the content meaningfully, displaying Front Matter as text, `ai-script` as code blocks, and footnotes normally (including the raw JSON string).
*   **Progressive Enhancement:** Users can start with plain Markdown and incrementally add Front Matter, `ai-script`, or relationships as needed to leverage MAGI features.
*   **Extensibility:** The YAML and JSON structures allow for custom fields beyond the standard specification to accommodate domain-specific requirements, although parsers might ignore unknown fields.

This layered architecture makes MAGI a flexible and powerful format for creating AI-ready content without sacrificing human readability or compatibility with the existing Markdown ecosystem.
