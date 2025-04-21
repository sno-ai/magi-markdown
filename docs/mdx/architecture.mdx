# AIMD Architecture

AI Markdown (AIMD) extends standard Markdown by optionally incorporating three distinct components designed for enhanced AI processing and metadata management. These components integrate seamlessly with standard Markdown, ensuring human readability while providing structured information for machines.

## Core Components

AIMD's architecture revolves around adding structured data and instructions without breaking compatibility with existing Markdown tools.

### 1. YAML Front Matter (Optional Metadata)

*   **Purpose:** Provides structured metadata about the document itself.
*   **Syntax:** A block of YAML enclosed by triple-dashed lines (`---`) at the very beginning of the file.
*   **Functionality:** Contains key-value pairs defining attributes like `doc-id`, `title`, `description`, `tags`, creation/update dates, `source_url`, `audience`, `purpose`, `entities`, etc. This metadata is crucial for document management, search, retrieval (RAG), and providing context to LLMs.
*   **Example:**
    ```yaml
    ---
    doc-id: "38f5a922-81b2-4f1a-8d8c-3a5be4ea7511"
    title: "Introduction to AIMD"
    tags: ["markdown", "ai", "rag"]
    created_date: "2024-01-15"
    ---
    ```

### 2. `ai-script` Code Blocks (Optional Instructions)

*   **Purpose:** Embeds specific, machine-readable instructions or prompts for AI agents or LLMs directly within the Markdown content.
*   **Syntax:** Uses standard Markdown fenced code blocks with the language identifier `ai-script`. The content within the block is typically JSON.
*   **Functionality:** Allows authors to specify actions (e.g., summarize, extract, translate) or provide context/guidance (e.g., tone, priority) for AI processing related to the surrounding content. Key fields include `script-id`, `prompt`, `priority`, `auto-run`, `provider`, and `model-name`.
*   **Example:**
    ````markdown
    ```ai-script
    {
      "script-id": "summary_request_s9340164234",
      "prompt": "Summarize the preceding section.",
      "priority": "medium",
      "auto-run": true
    }
    ```
    ````
*   **Processing Hint:** A comment `<!-- AI-PROCESSOR: ... -->` can be used to instruct AI systems that these blocks are for them and not for human display.

### 3. Markdown Footnotes (Optional Relationships)

*   **Purpose:** Defines explicit relationships between the current document and other documents or concepts using standard Markdown footnote syntax.
*   **Syntax:** Uses the standard `[^ref-id]` inline reference and `[^ref-id]: ...` definition format. The definition part contains a JSON payload describing the relationship.
*   **Functionality:** Enables the creation of knowledge graphs by linking documents. The JSON payload specifies the `rel_type` (e.g., `parent`, `child`, `related`, `cites`), the `doc_id` of the target document, and optionally a `rel_desc`, `rel_strength`, and other contextual details. This provides valuable structural information for RAG and contextual understanding.
*   **Example:**
    ```markdown
    This document builds upon the concepts outlined in the main specification[^spec].

    [^spec]: {"rel_type": "parent", "doc_id": "spec-doc-uuid-123", "rel_desc": "References the core AIMD specification"}
    ```

## Integration

These three components are optional and can be used independently or in combination. A standard Markdown parser will render the Front Matter as text (or ignore it), display `ai-script` blocks as regular code blocks, and render footnotes normally. An AIMD-aware parser, however, can extract and utilize the structured data from these components for advanced processing.
