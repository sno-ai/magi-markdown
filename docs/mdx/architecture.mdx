# AIMD Architecture: Integrating Content, Metadata, and AI Instructions

## Introduction

AI Markdown (AIMD) provides a robust architectural framework for extending standard Markdown. It is designed to seamlessly integrate structured metadata, actionable AI instructions, and explicit document relationships directly within human-readable content. This architecture ensures backward compatibility with standard Markdown tooling while unlocking advanced capabilities for AI-driven systems, particularly in areas like Retrieval-Augmented Generation (RAG), intelligent documentation platforms, and autonomous agent workflows.

The core principle is *enhancement through optionality*. AIMD introduces distinct components that can be adopted individually or collectively, allowing for incremental integration based on specific needs.

## Architectural Components

AIMD's architecture layers structured data onto standard Markdown using distinct, parseable components:

### 1. YAML Front Matter (Document-Level Metadata)

*   **Purpose:** To provide a standardized, machine-readable header containing metadata about the entire document. This context is invaluable for content management systems, search indexing, RAG retrieval filtering, and providing high-level context to AI models *before* they process the main content.
*   **Syntax:** A valid YAML block enclosed by triple-dashed lines (`---`) located at the very beginning of the `.aimd` file.
*   **Functionality:** Defines key-value pairs representing document attributes. Standard fields include `doc-id` (preferably a UUID), `title`, `description`, `tags`, `created-date`, `updated-date`, `source-url`, `audience`, `purpose`, and `entities`. The schema is extensible, allowing for custom metadata relevant to specific domains or applications.
*   **Processing:** AIMD-aware parsers identify and extract this block, parsing the YAML content into a structured data object (e.g., a dictionary or map). Standard Markdown parsers typically ignore it or render it as literal text.
*   **Example (Illustrating Kebab-Case and ISO 8601 Dates):**
    ```yaml
    ---
    doc-id: "38f5a922-81b2-4f1a-8d8c-3a5be4ea7511" # UUID Recommended
    title: "AIMD Architecture Overview"
    description: "Details the core components and philosophy of the AIMD format."
    tags: ["architecture", "markdown", "ai", "specification"]
    created-date: "2024-01-15T10:00:00Z"
    updated-date: "2024-07-27T14:30:00Z"
    audience: ["Developers", "Architects"]
    purpose: "Technical Documentation"
    ---
    ```

### 2. `ai-script` Code Blocks (Embedded AI Instructions)

*   **Purpose:** To embed specific, actionable instructions or prompts for AI agents or LLMs directly within the flow of the Markdown content, providing contextually relevant guidance.
*   **Syntax:** Standard Markdown fenced code blocks with the language identifier `ai-script`. The content within the block MUST be a valid JSON object.
*   **Functionality:** Allows authors to specify fine-grained tasks (e.g., summarize the preceding paragraph, extract entities from the following table, translate this section) or configure AI behavior (e.g., set generation parameters like temperature, specify desired output format, define execution priority). Key fields include `script-id`, `prompt`, `priority`, `auto-run`, `provider`, `model-name`, `parameters`, `runtime-env`, and `output-format`.
*   **Processing:** AIMD-aware systems scan the Markdown content for these blocks, parse the enclosed JSON, and queue the instructions for potential execution by an appropriate AI agent or LLM, often relating the instruction to the surrounding content based on proximity or explicit references. Standard renderers display these as regular code blocks.
*   **Example (Illustrating Kebab-Case and New Fields):**
    ````markdown
    Here is a complex paragraph detailing quantum physics concepts...

    ```ai-script
    {
      "script-id": "simplify-physics-para-001",
      "prompt": "Explain the main concepts in the preceding paragraph in simple terms, suitable for a general audience.",
      "priority": "medium",
      "auto-run": false,
      "provider": "anthropic",
      "model-name": "claude-3-haiku",
      "parameters": {
        "max-tokens": 150,
        "temperature": 0.7
      },
      "output-format": "markdown"
    }
    ```
    ````
*   **Processing Hint:** An optional HTML comment `<!-- AI-PROCESSOR: ... -->` before or after the block can explicitly signal to processors that the block contains non-displayable instructions, though parsing should primarily rely on the `ai-script` language identifier.

### 3. Markdown Footnotes with JSON Payloads (Document Relationships)

*   **Purpose:** To define explicit, typed relationships between the current document and other documents or external resources using standard Markdown footnote syntax, enabling the construction of knowledge graphs.
*   **Syntax:** Utilizes the standard `[^ref-id]` inline reference marker and a corresponding `[^ref-id]: ...` definition line. The definition part *must* contain a single JSON object enclosed in backticks (` `` `).
*   **Functionality:** The JSON payload within the backticks defines the relationship, specifying the `rel-type` (e.g., `parent`, `child`, `related`, `cites`, `supports`, `contradicts`), the target `doc-id` (linking to the Front Matter of another AIMD document) or a `source-url` for external resources, and a human-readable `rel-desc`. Optional fields like `rel-strength` and `context` can add further nuance.
*   **Processing:** AIMD-aware systems parse these footnote definitions, extracting the JSON payloads to build a relationship graph or provide contextual links during RAG or agent operation. Standard Markdown parsers render them as conventional footnotes, with the JSON string appearing as the footnote content.
*   **Example (Illustrating Kebab-Case):**
    ```markdown
    This architecture builds upon established Markdown principles[^md-guide] and complements the core specification[^core-spec].

    [^md-guide]: `{"rel-type": "citation", "source-url": "https://daringfireball.net/projects/markdown/", "rel-desc": "Based on original Markdown syntax"}`
    [^core-spec]: `{"rel-type": "related", "doc-id": "spec-doc-uuid-123", "rel-desc": "References the core AIMD specification v1.1"}`
    ```

## Processing Flow & Integration Philosophy

1.  **Parsing:** An AIMD processor first identifies and extracts the YAML Front Matter. It then scans the remaining content for `ai-script` blocks and footnote definitions containing JSON payloads, parsing their structured data. The text content excluding these special blocks constitutes the core human-readable Markdown.
2.  **Contextualization:** The extracted metadata, instructions, and relationships provide rich context for subsequent AI processing (e.g., RAG retrieval, agent task execution, knowledge graph population).
3.  **Execution (Optional):** AI instructions within `ai-script` blocks can be selectively executed based on their `priority`, `auto-run` status, and application logic.
4.  **Rendering:** For human consumption, the core Markdown content is rendered using standard libraries, potentially augmented or modified based on the results of executed AI instructions. Front Matter, `ai-script` blocks, and relationship definitions are typically omitted from the final user-facing view unless specifically included for debugging or transparency.

**Philosophy:**

*   **Graceful Degradation:** AIMD remains valid Markdown. Non-AIMD-aware tools can still render the content meaningfully.
*   **Progressive Enhancement:** Users can start with plain Markdown and incrementally add Front Matter, `ai-script`, or relationships as needed.
*   **Extensibility:** The YAML and JSON structures allow for custom fields beyond the standard specification to accommodate domain-specific requirements.

This layered architecture makes AIMD a flexible and powerful format for creating AI-ready content without sacrificing human readability or compatibility with the existing Markdown ecosystem.
