# MAGI (.mda) to MDX (.mdx) Conversion

This document outlines the technical approach for converting MAGI (`.mda`) files into MDX (`.mdx`) format. The goal is to leverage the strengths of both formats: MAGI for structured AI guidance and MDX for rich, interactive web content.

The conversion process focuses on mapping the three core MAGI components (Front Matter, `ai-script` blocks, Footnote Relationships) into functional MDX equivalents.

## 1. Front Matter Conversion

MAGI's YAML Front Matter can be directly mapped to MDX's front matter.

**MAGI (`.mda`):**

```yaml
---
doc-id: "38f5a922-81b2-4f1a-8d8c-3a5be4ea7511"
title: "Introduction to MAGI"
description: "Explains the MAGI format."
tags: ["markdown", "ai", "rag"]
created-date: "2024-01-15T09:00:00Z"
updated-date: "2024-06-01T15:30:00Z"
# ... other fields
---

Standard Markdown content...
```

**MDX (`.mdx`):**

```yaml
---
docId: "38f5a922-81b2-4f1a-8d8c-3a5be4ea7511" # Note: Consider consistent casing (e.g., camelCase)
title: "Introduction to MAGI"
description: "Explains the MAGI format."
tags: ["markdown", "ai", "rag"]
createdDate: "2024-01-15T09:00:00Z"
updatedDate: "2024-06-01T15:30:00Z"
# ... other fields mapped
---

import { SomeComponent } from '@/components';

Standard Markdown content...

<SomeComponent data={frontmatter} />
```

**Implementation Notes:**

*   A script or pre-processor during the build step should parse the MAGI YAML front matter and inject it into the MDX file's front matter section.
*   **Case Convention:** Decide on a consistent case convention for front matter keys within the MDX context. While MAGI uses kebab-case (e.g., `doc-id`), JavaScript/TypeScript typically uses camelCase (e.g., `docId`). Converting to camelCase (`frontmatter.docId`) is often more idiomatic for component logic. However, keeping kebab-case and accessing via bracket notation (`frontmatter['doc-id']`) is also valid. This conversion, if done, should happen during the pre-processing step. Ensure consistency throughout your MDX components.
*   Field names might need case conversion (e.g., kebab-case in MAGI to camelCase in MDX JavaScript/TypeScript environments) for easier consumption.
*   The MDX environment can then access this data via `frontmatter` or similar mechanisms provided by the MDX loader/framework.

## 2. Footnote Relationship Conversion

MAGI uses JSON within Markdown footnotes to define typed relationships. In MDX, these can be converted into enhanced links or custom React components.

**MAGI (`.mda`):**

```markdown
This document references specifications[^spec1] and related guides[^guide2].

[^spec1]: `{"rel-type": "cites", "doc-id": "SPEC-UUID-123", "rel-desc": "Cites the core specification"}`
[^guide2]: `{"rel-type": "related", "source-url": "https://example.com/guide", "rel-desc": "Related implementation guide"}`
```

**MDX (`.mdx`) Conversion Strategies:**

**Strategy A: Enhanced `<a>` tags:**

Convert footnotes into standard Markdown links, potentially adding custom `data-*` attributes to hold the relationship metadata.

```mdx
import { Tooltip } from '@/components'; // Example component

This document references specifications<Tooltip content='{"rel-type": "cites", "doc-id": "SPEC-UUID-123", "rel-desc": "Cites the core specification"}'><sup>[1]</sup></Tooltip> and related guides<Tooltip content='{"rel-type": "related", "source-url": "https://example.com/guide", "rel-desc": "Related implementation guide"}'><sup>[2]</sup></Tooltip>.

{/* Link rendering could be handled by a Remark/Rehype plugin or post-processing */}
{/* Actual links would point to resolved internal paths or external URLs */}

[1]: /path/to/spec/SPEC-UUID-123 (Cites the core specification)
[2]: https://example.com/guide (Related implementation guide)
```

**Strategy B: Custom React Component:**

Replace the footnote reference directly with a custom React component that handles linking and potentially displays relationship information (e.g., on hover).

```mdx
import { DocLink } from '@/components';

This document references specifications <DocLink docId="SPEC-UUID-123" relType="cites" relDesc="Cites the core specification" /> and related guides <DocLink sourceUrl="https://example.com/guide" relType="related" relDesc="Related implementation guide" />.

{/* The DocLink component would handle rendering the link text/number and tooltip/popover logic. */}
```

**Implementation Notes:**

*   Requires a pre-processing step (e.g., a Remark/Rehype plugin) to parse the footnote JSON and transform the Markdown AST (Abstract Syntax Tree).
*   Needs a mechanism to resolve `doc-id` references to actual URL paths within the MDX site structure.
*   Strategy B offers more flexibility for custom UI and behavior around linked documents.

## 3. `ai-script` Block Conversion

This is the most complex conversion, transforming declarative JSON instructions into executable TypeScript/JavaScript logic within MDX. The conversion depends heavily on the `auto-run` field.

**MAGI (`.mda`):**

```markdown
Some context before the script.

```ai-script
{
  "script-id": "summary-request-001",
  "prompt": "Summarize the preceding section.",
  "priority": "medium",
  "auto-run": true, // Or false
  "provider": "openai",
  "model-name": "gpt-4o",
  "parameters": { "temperature": 0.7 },
  "output-format": "markdown",
  // Added fields for interactive mode:
  "interactive-type": "button",
  "interactive-label": "Generate Summary"
}
```

Some context after the script.
```

**MDX (`.mdx`) Conversion:**

The conversion process needs to generate appropriate TypeScript/JavaScript code, potentially leveraging MDX features like Server Components (in Next.js) or custom directives.

**Core Steps:**

1.  **Parsing:** Extract the JSON object from the `ai-script` block.
2.  **Context Injection:** Implement a mechanism (likely a Remark/Rehype plugin) to capture the surrounding Markdown content (e.g., the preceding section) and make it available to the generated code.
3.  **Code Generation (Conditional):**
    *   **If `auto-run` is `true` (or default and intended): Server-Side Execution**
        *   Generate TypeScript code designed to run server-side (during build or request time).
        *   This code imports necessary API clients (e.g., OpenAI SDK).
        *   It retrieves API keys securely from environment variables (`process.env.OPENAI_API_KEY`).
        *   It combines the `prompt` with the injected context.
        *   It calls the specified AI provider/model API with the `parameters`.
        *   It receives the response and renders it according to `output-format` (e.g., using a Markdown renderer component for `markdown`).
        *   **Example Structure (Conceptual - depends on framework):**
            ```typescript jsx
            import { AIClient } from '@/lib/ai'; // Your AI client wrapper
            import { MarkdownRenderer } from '@/components'; // Component to render Markdown

            // --- Potentially generated by pre-processor ---
            async function AIScriptRunner_summary_request_001() {
              const apiKey = process.env.OPENAI_API_KEY;
              if (!apiKey) {
                return <div className="error">AI Provider not configured.</div>;
              }
              const context = "Some context before the script."; // Injected context
              const promptData = { /* Parsed JSON from ai-script */ };
              const fullPrompt = `${context}\\n\\n${promptData.prompt}`; // Example context combination

              try {
                // Pass system prompt, schema, etc., to the AI client
                const response = await AIClient.generate({
                   prompt: fullPrompt,
                   systemPrompt: promptData.systemPrompt, // Pass system prompt
                   schema: promptData.outputSchema, // Pass schema for structured output
                   stream: false, // Server-side streaming might be complex; default to false here
                   // ... other params from promptData.parameters
                });

                // Handle structured output (if schema was provided)
                if (promptData.outputSchema) {
                   // Assuming response is already a parsed object
                   return <pre>{JSON.stringify(response, null, 2)}</pre>;
                } else if (promptData.outputFormat === 'markdown') {
                   return <MarkdownRenderer content={response} />; // Assuming response is markdown string
                } else {
                   return <pre>{response}</pre>; // Assuming response is text string
                }
              } catch (error) {
                console.error("AI Script Error:", error);
                return <div className="error">Error running AI script.</div>;
              }
            }
            // --- End generated code ---

            // In MDX body:
            <AIScriptRunner_summary_request_001 />
            ```

    *   **If `auto-run` is `false`: Client-Side Interactive Component**
        *   Generate a React component (client component).
        *   The component type is determined by `interactive-type` (e.g., `<button>`).
        *   The component label is set by `interactive-label`.
        *   An `onClick` (or similar) handler triggers the AI request *in the browser*.
        *   This requires a client-side API route (e.g., `/api/ai-generate`) to securely handle the API call and key management on the server.
        *   The component manages loading states and displays the response (formatted according to `output-format`).
        *   The surrounding context might need to be passed as a prop to the component or fetched separately if needed by the prompt.
        *   **Example Structure (Conceptual):**
            ```typescript jsx
            'use client'; // Directive for client component

            import React, { useState } from 'react';
            import { MarkdownRenderer } from '@/components';

            // --- Potentially generated by pre-processor ---
            function InteractiveAIScript_summary_request_001({ initialContext }) {
              const [isLoading, setIsLoading] = useState(false);
              const [error, setError] = useState(null);
              const [result, setResult] = useState(null); // Could hold string or object
              const [streamedContent, setStreamedContent] = useState(''); // For streamed text
              const [inputValue, setInputValue] = useState(''); // State for input box
              const scriptData = { /* Parsed JSON from ai-script */ };

              const handleSubmit = async (event) => {
                event.preventDefault(); // Prevent form submission if using a form
                setIsLoading(true);
                setError(null);
                setResult(null);
                setStreamedContent(''); // Reset streamed content

                try {
                  // Use streaming if requested and supported by the API route
                  if (scriptData.stream) {
                     const response = await fetch('/api/ai-generate-stream', { // Use a dedicated streaming route
                       method: 'POST',
                       headers: { 'Content-Type': 'application/json' },
                       body: JSON.stringify({
                         promptData: scriptData,
                         context: initialContext,
                         userInput: inputValue
                       }),
                     });
                     if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
                     if (!response.body) throw new Error('Streaming response body unavailable.');

                     // Process the stream (example using Vercel AI SDK's readStreamableValue)
                     const reader = response.body.getReader();
                     const decoder = new TextDecoder();
                     while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        const chunk = decoder.decode(value, { stream: true });
                        setStreamedContent(prev => prev + chunk);
                     }
                     // Optionally parse final streamed content if it represents an object
                     // if (scriptData.outputSchema) setResult(JSON.parse(streamedContent));

                  } else {
                     // Non-streaming request
                     const response = await fetch('/api/ai-generate', { // Original non-streaming route
                       method: 'POST',
                       headers: { 'Content-Type': 'application/json' },
                       body: JSON.stringify({
                         promptData: scriptData, // Includes system-prompt, schema, etc.
                         context: initialContext,
                         userInput: inputValue
                       }),
                     });
                     if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
                     const data = await response.json(); // Expecting { result: '...'/'{}', format: '...' }
                     setResult(data); // Store the complete result object/string
                  }

                } catch (err) {
                  setError(err.message);
                } finally {
                  setIsLoading(false);
                }
              };

              const componentType = scriptData.interactiveType || 'button';
              const label = scriptData.interactiveLabel || (componentType === 'inputbox' ? 'Submit' : 'Run AI Script');
              const placeholder = scriptData.interactivePlaceholder || (componentType === 'inputbox' ? 'Enter input...' : '');

              return (
                // Using a form for inputbox type for better accessibility
                <form onSubmit={handleSubmit} className="ai-script-interactive">
                  {componentType === 'inputbox' && (
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder={placeholder}
                      disabled={isLoading}
                      aria-label="AI Input"
                    />
                  )}

                  {componentType === 'button' && (
                    <button type="button" onClick={handleSubmit} disabled={isLoading}>
                      {isLoading ? 'Processing...' : label}
                    </button>
                  )}

                  {componentType === 'inputbox' && (
                    <button type="submit" disabled={isLoading}>
                      {isLoading ? 'Processing...' : label}
                    </button>
                  )}
                  {/* Add other interactive types if needed */}

                  {error && <div className="error">{error}</div>}

                  {/* Render streamed content if applicable */}
                  {streamedContent && !result && (
                    <div className="result stream">
                      {scriptData.outputFormat === 'markdown' ? (
                         <MarkdownRenderer content={streamedContent} />
                      ) : (
                         <pre>{streamedContent}</pre>
                      )}
                    </div>
                  )}

                  {/* Render final result (non-streamed or structured) */}
                  {result && (
                    <div className="result final">
                      {/* Handle structured JSON output */}
                      {scriptData.outputSchema && typeof result.content === 'object' ? (
                        <pre>{JSON.stringify(result.content, null, 2)}</pre>
                      ) : result.format === 'markdown' ? (
                        <MarkdownRenderer content={result.content} />
                      ) : (
                        <pre>{result.content}</pre>
                      )}
                    </div>
                  )}
                </form>
              );
            }
            // --- End generated code ---

            // In MDX body:
            <InteractiveAIScript_summary_request_001 initialContext={"Some context before the script."} />
            ```

4.  **Fallback Handling:**
    *   If API keys are missing for server-side execution, display an error message or render nothing.
    *   If the client-side API route is unavailable or fails, the interactive component should display an error state.
    *   Consider adding a configuration option to disable `ai-script` execution entirely during conversion.

**Implementation Notes:**

*   This conversion requires sophisticated MDX pre-processing (Remark/Rehype plugins) capable of AST manipulation, context capture, and code generation.
*   Careful management of server-side vs. client-side logic is crucial, especially regarding API keys, context availability, and potentially different API endpoints for streaming vs. non-streaming requests.
*   The design of the client-side API routes (`/api/ai-generate`, `/api/ai-generate-stream`) is critical for security and correctly interpreting the `ai-script` parameters (including `system-prompt`, `output-schema`, `stream`, etc.).
*   Error handling and loading states are essential for a good user experience, including handling potential errors during streaming.

This technical document provides a blueprint for the MAGI-to-MDX conversion process, highlighting the key considerations for each component type. The actual implementation will depend heavily on the specific MDX framework and tooling used.
