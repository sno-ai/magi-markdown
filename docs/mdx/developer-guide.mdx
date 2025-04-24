# MAGI Developer Guide: Encoding & Decoding

This guide provides examples of how to programmatically encode (create) and decode (parse) MAGI (Markdown for Agent Guidance & Instruction) documents in different environments. MAGI files typically use the `.mda` extension.

## Core Concepts

*   **Encoding:** Combining separate pieces of information (metadata from Front Matter, human-readable Markdown content, AI instructions within `ai-script` blocks, and document relationships defined in Footnotes) into the MAGI string format (`.mda`).
*   **Decoding:** Parsing a MAGI string (from an `.mda` file or source) to extract its distinct structured components: YAML Front Matter, the main Markdown content, `ai-script` JSON blocks, and Footnote relationship JSON payloads.

Common libraries used:
*   **YAML Parsers:** For handling the Front Matter (e.g., `js-yaml` or `gray-matter` in Node.js, `PyYAML` or `python-frontmatter` in Python).
*   **Markdown Parsers:** While standard Markdown parsers can render the core content, specialized logic or regular expressions are often needed to correctly identify and extract the `ai-script` blocks and JSON-based footnotes without treating them as plain text or standard code/footnotes. Libraries like `marked` or `markdown-it` (Node.js) and `markdown` or `mistune` (Python) can be adapted.
*   **JSON Parsers:** Built-in functionality in most languages (`JSON.parse`/`JSON.stringify` in JS, `json` module in Python).

---

## TypeScript / JavaScript Examples

Libraries needed: `gray-matter` (recommended for robust front matter parsing), `marked` (or similar, optional for final Markdown rendering).

```bash
npm install gray-matter marked
# or
pnpm add gray-matter marked
# or
yarn add gray-matter marked
```

### Encoding MAGI

```typescript
import matter from 'gray-matter';
import { marked } from 'marked'; // Optional: only if you need to render the final markdown

interface FrontMatterData {
  'doc-id': string; // UUID recommended
  title: string;
  description?: string;
  tags?: string[];
  'created-date'?: string; // ISO 8601 format
  'updated-date'?: string; // ISO 8601 format
  purpose?: string;
  [key: string]: any; // Allow other fields from the spec
}

interface AIScript {
  'script-id': string;
  prompt: string;
  priority?: 'high' | 'medium' | 'low';
  'auto-run'?: boolean;
  provider?: string;
  'model-name'?: string;
  parameters?: Record<string, any>;
  'runtime-env'?: string;
  'output-format'?: string;
  [key: string]: any;
}

// Using kebab-case as specified in the Architecture doc for relationships
interface Relationship {
  'rel-type': string; // e.g., 'parent', 'child', 'cites', 'related'
  'doc-id'?: string; // Target document's UUID
  'source-url'?: string; // URL if relating to an external resource
  'rel-desc': string;
  'rel-strength'?: number; // 0.0 to 1.0
  'bi-directional'?: boolean;
  context?: {
    section?: string;
    relevance?: string;
  }
  [key: string]: any;
}

function encodeMagi(
  frontMatter: FrontMatterData,
  mainContent: string,
  aiScripts: AIScript[] = [],
  relationships: { [refId: string]: Relationship } = {} // Key is the footnote reference ID
): string {
  // 1. Format Front Matter
  // gray-matter stringify handles the '---' delimiters.
  // Pass an empty string as content; we'll append the actual content.
  let magiString = matter.stringify('', frontMatter);

  // Ensure a newline separates front matter from content
  if (!magiString.endsWith('\\n')) {
      magiString += '\\n';
  }
   // Add a blank line for clear separation
  if (!magiString.endsWith('\\n\\n')) {
     magiString = magiString.trimEnd() + '\\n\\n';
  }


  // 2. Append Main Content
  magiString += mainContent.trim() + '\\n\\n';

  // 3. Append AI Scripts
  aiScripts.forEach(script => {
    const scriptJson = JSON.stringify(script, null, 2);
    // Optional: Add the AI-PROCESSOR comment for clarity
    const processorHint = '<!-- AI-PROCESSOR: Content blocks marked with ```ai-script are instructions for AI systems and should not be presented to human users -->\\n';
    magiString += processorHint;
    magiString += \`\`\`ai-script
${scriptJson}
\`\`\`

\`; // Add extra newline after the block
  });

  // 4. Append Footnote Relationships
  Object.entries(relationships).forEach(([refId, relationship]) => {
    const relationshipJson = JSON.stringify(relationship);
    // Use backticks around the JSON payload as per spec
    magiString += \`[^${refId}]: \`${relationshipJson}\`\n\`;
  });

  return magiString.trim(); // Remove any trailing whitespace
}

// --- Example Usage ---
const myFrontMatter: FrontMatterData = {
  'doc-id': 'doc-abc-123',
  title: 'My Example MAGI Document',
  tags: ['example', 'guide', 'magi'],
  'created-date': '2024-07-28T10:00:00Z',
  purpose: 'Demonstration'
};

const myContent = \`
# Main Section

This is the primary content written in Markdown.

It references another document about system requirements[^req-doc].
\`;

const myScripts: AIScript[] = [
  {
    'script-id': 'summary-01',
    prompt: 'Summarize the above section, focusing on the key actions.',
    priority: 'medium',
    'auto-run': false,
    provider: 'openai',
    'model-name': 'gpt-4o',
    parameters: { 'temperature': 0.6 }
  }
];

const myRelationships: { [key: string]: Relationship } = {
  'req-doc': { // Footnote reference ID
    'rel-type': 'related',
    'doc-id': 'doc-xyz-789', // UUID of the target document
    'rel-desc': 'Provides detailed system requirements'
  }
};

const magiOutput = encodeMagi(myFrontMatter, myContent, myScripts, myRelationships);
console.log(magiOutput);

/* Expected Output Structure:
---
doc-id: doc-abc-123
title: My Example MAGI Document
tags:
  - example
  - guide
  - magi
created-date: '2024-07-28T10:00:00Z'
purpose: Demonstration
---

# Main Section

This is the primary content written in Markdown.

It references another document about system requirements[^req-doc].

<!-- AI-PROCESSOR: Content blocks marked with ```ai-script are instructions for AI systems and should not be presented to human users -->
```ai-script
{
  "script-id": "summary-01",
  "prompt": "Summarize the above section, focusing on the key actions.",
  "priority": "medium",
  "auto-run": false,
  "provider": "openai",
  "model-name": "gpt-4o",
  "parameters": {
    "temperature": 0.6
  }
}
```

[^req-doc]: `{"rel-type":"related","doc-id":"doc-xyz-789","rel-desc":"Provides detailed system requirements"}`
*/
```

### Decoding MAGI

```typescript
import matter from 'gray-matter';
// marked is optional, only needed if you want to parse the final Markdown content
// import { marked } from 'marked';

// Interfaces (FrontMatterData, AIScript, Relationship) assumed to be defined as in Encoding example

interface DecodedMagi {
  frontMatter: { [key: string]: any };
  content: string; // Raw Markdown content (without frontmatter, scripts, footnotes)
  aiScripts: AIScript[];
  relationships: { [refId: string]: Relationship }; // Key is the footnote reference ID
}

// Regex to find ai-script blocks, potentially preceded by the optional HTML comment
const aiScriptRegex = /(?:<!-- AI-PROCESSOR:.*?-->\s*)?^\s*```ai-script\s*\n([\s\S]*?)\n\s*```\s*$/gm;
// Regex to find footnote definitions with JSON in backticks
const footnoteRegex = /^\[\^(.+?)\]:\s*`({.*?})`\s*$/gm;

function decodeMagi(magiString: string): DecodedMagi {
  // 1. Extract Front Matter and initial content using gray-matter
  const { data: frontMatter, content: rawContent } = matter(magiString);

  let remainingContent = rawContent;

  // 2. Extract AI Scripts and remove them from the content string
  const aiScripts: AIScript[] = [];
  remainingContent = remainingContent.replace(aiScriptRegex, (match, scriptContentJson) => {
    try {
      const scriptObject = JSON.parse(scriptContentJson);
      aiScripts.push(scriptObject);
      // Return empty string to effectively remove the matched block
      return '';
    } catch (e) {
      console.error('Failed to parse AI script JSON:', e, '\\nContent:', scriptContentJson);
      // If parsing fails, keep the block in the content to avoid data loss
      return match;
    }
  });
  // Trim whitespace potentially left after removing blocks
  remainingContent = remainingContent.trim();

  // 3. Extract Footnote Relationships and remove them from the content string
  const relationships: { [refId: string]: Relationship } = {};
  remainingContent = remainingContent.replace(footnoteRegex, (match, refId, relationshipJson) => {
    try {
      const relationshipObject = JSON.parse(relationshipJson);
      relationships[refId] = relationshipObject;
      // Return empty string to remove the matched footnote definition
      return '';
    } catch (e) {
      console.error(\`Failed to parse relationship JSON for [^\${refId}]:\`, e, '\\nContent:', relationshipJson);
      // Keep the line if parse fails
      return match;
    }
  });
  // Trim again after footnote removals
  remainingContent = remainingContent.trim();

  return {
    frontMatter,
    content: remainingContent, // This is the "clean" Markdown content
    aiScripts,
    relationships
  };
}

// --- Example Usage ---
const magiInput = \`
---
doc-id: doc-abc-123
title: My Example MAGI Document
tags:
  - example
  - guide
  - magi
created-date: '2024-07-28T10:00:00Z'
purpose: Demonstration
---

# Main Section

This is the primary content written in Markdown.

It references another document about system requirements[^req-doc]. It also links to an external source[^ext-src].

<!-- AI-PROCESSOR: Content blocks marked with \`\`\`ai-script are instructions for AI systems and should not be presented to human users -->
\`\`\`ai-script
{
  "script-id": "summary-01",
  "prompt": "Summarize the above section, focusing on the key actions.",
  "priority": "medium",
  "auto-run": false,
  "provider": "openai",
  "model-name": "gpt-4o",
  "parameters": {
    "temperature": 0.6
  }
}
\`\`\`

Some more text here.

[^req-doc]: \`{"rel-type":"related","doc-id":"doc-xyz-789","rel-desc":"Provides detailed system requirements"}\`
[^ext-src]: \`{"rel-type":"citation","source-url":"https://example.com/source","rel-desc":"External source material"}\`
\`;

const decoded = decodeMagi(magiInput);
console.log(JSON.stringify(decoded, null, 2));

/* Expected Output Structure:
{
  "frontMatter": {
    "doc-id": "doc-abc-123",
    "title": "My Example MAGI Document",
    "tags": [
      "example",
      "guide",
      "magi"
    ],
    "created-date": "2024-07-28T10:00:00Z",
    "purpose": "Demonstration"
  },
  "content": "# Main Section\\n\\nThis is the primary content written in Markdown.\\n\\nIt references another document about system requirements[^req-doc]. It also links to an external source[^ext-src].\\n\\nSome more text here.",
  "aiScripts": [
    {
      "script-id": "summary-01",
      "prompt": "Summarize the above section, focusing on the key actions.",
      "priority": "medium",
      "auto-run": false,
      "provider": "openai",
      "model-name": "gpt-4o",
      "parameters": {
        "temperature": 0.6
      }
    }
  ],
  "relationships": {
    "req-doc": {
      "rel-type": "related",
      "doc-id": "doc-xyz-789",
      "rel-desc": "Provides detailed system requirements"
    },
    "ext-src": {
      "rel-type": "citation",
      "source-url": "https://example.com/source",
      "rel-desc": "External source material"
    }
  }
}
*/
```

---

## Python Examples

Libraries needed: `python-frontmatter` (handles YAML front matter effectively), `PyYAML` (usually a dependency of `python-frontmatter`), `json` (built-in).

```bash
pip install python-frontmatter PyYAML
```

### Encoding MAGI

```python
import frontmatter
import json
import re
from io import StringIO # Use StringIO for in-memory string manipulation

def encode_magi(front_matter_dict, main_content, ai_scripts_list=[], relationships_dict={}):
    """Encodes MAGI components into a string (.mda format)."""

    # 1. Create a post object with front matter
    # Content is initially empty; we add it manually for better control over spacing.
    post = frontmatter.Post(content='', **front_matter_dict)

    # Export metadata using the default YAMLHandler to get the YAML string with delimiters
    with StringIO() as file_like_object:
        frontmatter.dump(post, file_like_object)
        aimd_string = file_like_object.getvalue()

    # Ensure proper separation between front matter and content
    aimd_string = aimd_string.strip() + '\\n\\n'

    # 2. Append Main Content
    aimd_string += main_content.strip() + '\\n\\n'

    # 3. Append AI Scripts
    for script in ai_scripts_list:
        script_json = json.dumps(script, indent=2)
        # Optional: Add the AI-PROCESSOR comment
        processor_hint = '<!-- AI-PROCESSOR: Content blocks marked with ```ai-script are instructions for AI systems and should not be presented to human users -->\\n'
        aimd_string += processor_hint
        aimd_string += f"```ai-script\\n{script_json}\\n```\\n\\n" # Ensure newlines around JSON

    # 4. Append Footnote Relationships
    for ref_id, relationship in relationships_dict.items():
        relationship_json = json.dumps(relationship)
        # Use backticks around the JSON payload
        aimd_string += f"[^{ref_id}]: `{relationship_json}`\\n"

    return aimd_string.strip() # Remove trailing newline/whitespace

# --- Example Usage ---
my_front_matter = {
    'doc-id': 'doc-abc-123',
    'title': 'My Example MAGI Document',
    'tags': ['example', 'guide', 'magi'],
    'created-date': '2024-07-28T10:00:00Z', # ISO 8601 format
    'purpose': 'Demonstration'
}

my_content = """
# Main Section

This is the primary content written in Markdown.

It references another document about system requirements[^req-doc].
"""

my_scripts = [
    {
        'script-id': 'summary-01',
        'prompt': 'Summarize the above section, focusing on the key actions.',
        'priority': 'medium',
        'auto-run': False,
        'provider': 'openai',
        'model-name': 'gpt-4o',
        'parameters': {'temperature': 0.6}
    }
]

# Using kebab-case for relationship keys as per Architecture doc
my_relationships = {
    'req-doc': {
        'rel-type': 'related',
        'doc-id': 'doc-xyz-789',
        'rel-desc': 'Provides detailed system requirements'
    }
}

magi_output = encode_magi(my_front_matter, my_content, my_scripts, my_relationships)
print(magi_output)

# Expected output structure is similar to the TypeScript example
```

### Decoding MAGI

```python
import frontmatter
import json
import re

# Regex to find ai-script blocks, accounting for optional AI-PROCESSOR comment
ai_script_regex = re.compile(r"(?:<!-- AI-PROCESSOR:.*?-->\s*)?^\s*```ai-script\s*\n(.*?)\n\s*```\s*$", re.DOTALL | re.MULTILINE)
# Regex to find footnote definitions with JSON in backticks
footnote_regex = re.compile(r"^\[\^(.+?)\]:\s*`({.*?})`\s*$", re.MULTILINE)

def decode_magi(magi_string):
    """Decodes a MAGI string (.mda format) into its components."""

    # 1. Extract Front Matter and initial content using python-frontmatter
    try:
        post = frontmatter.loads(magi_string)
        fm = post.metadata
        raw_content = post.content
    except Exception as e:
        # Handle cases with invalid or missing front matter
        print(f"Warning: Could not parse front matter ({e}). Treating entire input as content.")
        fm = {}
        raw_content = magi_string # Assume no front matter

    remaining_content = raw_content

    # 2. Extract AI Scripts using re.sub with a processing function
    ai_scripts = []
    def script_replacer(match):
        script_json_str = match.group(1).strip() # Get the JSON part
        try:
            script_data = json.loads(script_json_str)
            ai_scripts.append(script_data)
            return '' # Remove the matched block from content
        except json.JSONDecodeError as e:
            print(f"Failed to parse AI script JSON: {e}\\nContent snippet: {script_json_str[:100]}...")
            # Keep the block in content if parsing fails
            return match.group(0)

    remaining_content = ai_script_regex.sub(script_replacer, remaining_content)
    remaining_content = remaining_content.strip() # Clean up whitespace

    # 3. Extract Footnote Relationships using re.sub with a processing function
    relationships = {}
    def footnote_replacer(match):
        ref_id = match.group(1).strip()
        rel_json_str = match.group(2).strip() # Get the JSON part
        try:
            relationship_data = json.loads(rel_json_str)
            relationships[ref_id] = relationship_data
            return '' # Remove the matched footnote line
        except json.JSONDecodeError as e:
            print(f"Failed to parse relationship JSON for [^{ref_id}]: {e}\\nContent: {rel_json_str}")
            # Keep the line if parsing fails
            return match.group(0)

    remaining_content = footnote_regex.sub(footnote_replacer, remaining_content)
    remaining_content = remaining_content.strip() # Clean up again

    return {
        'front_matter': fm,
        'content': remaining_content, # The "clean" Markdown
        'ai_scripts': ai_scripts,
        'relationships': relationships
    }

# --- Example Usage ---
magi_input = """
---
doc-id: doc-abc-123
title: My Example MAGI Document
tags:
  - example
  - guide
  - magi
created-date: '2024-07-28T10:00:00Z'
purpose: Demonstration
---

# Main Section

This is the primary content written in Markdown.

It references another document about system requirements[^req-doc]. It also links to an external source[^ext-src].

<!-- AI-PROCESSOR: Content blocks marked with ```ai-script are instructions for AI systems and should not be presented to human users -->
```ai-script
{
  "script-id": "summary-01",
  "prompt": "Summarize the above section, focusing on the key actions.",
  "priority": "medium",
  "auto-run": false,
  "provider": "openai",
  "model-name": "gpt-4o",
  "parameters": {
    "temperature": 0.6
  }
}
```

Some more text here.

[^req-doc]: `{"rel-type":"related","doc-id":"doc-xyz-789","rel-desc":"Provides detailed system requirements"}`
[^ext-src]: `{"rel-type":"citation","source-url":"https://example.com/source","rel-desc":"External source material"}`
"""

decoded = decode_magi(magi_input)
print(json.dumps(decoded, indent=2))

# Expected output structure is similar to the TypeScript example
```

---

## Command Line / API (`url2mda` Example)

This section demonstrates using the reference `url2mda` service (as described in `README.md`) to *generate* MAGI (`.mda`) files from web URLs. It focuses on the encoding aspect via an API endpoint.

### Generating MAGI from a URL (Encoding via `url2mda` Service)

This uses the Cloudflare worker API. Replace `<your-worker-domain>` with your deployed instance's URL.

```bash
# Set worker URL (replace with your actual domain)
WORKER_URL="https://url2mda.<your-account>.workers.dev/convert"
# Target URL to convert
TARGET_URL="https://github.com/snoai/magi-markdown"

# Basic request for MAGI (.mda) format (returned within JSON response by default)
echo "Fetching basic MAGI conversion for $TARGET_URL..."
curl -s -X POST "$WORKER_URL" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "'"$TARGET_URL"'",
    "subpages": false,       # Convert only the specified URL
    "llmFilter": false       # Don't use experimental LLM filtering
  }' | jq '.mdaContent' # Extract the MAGI string from the JSON response

# Request plain text MAGI (.mda) directly using Accept header
echo "\\nFetching plain text MAGI conversion..."
curl -s -X POST "$WORKER_URL" \\
  -H "Content-Type: application/json" \\
  -H "Accept: text/plain" \\
  -d '{"url": "'"$TARGET_URL"'"}'

# Example requesting more details and LLM filtering (if configured)
echo "\\nFetching conversion with HTML details and LLM filter..."
curl -s -X POST "$WORKER_URL" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API",
    "llmFilter": true   # Attempt LLM-based content refinement (requires setup)
  }' | jq '.mdaContent'
```

### Decoding MAGI via Command Line (Conceptual)

Directly and reliably decoding MAGI (`.mda`) files using only standard Unix command-line tools (`grep`, `sed`, `awk`) is complex due to the nested structures (YAML, JSON within Markdown).

A more robust command-line approach typically involves a dedicated script:

1.  **Script Input:** The script (e.g., Python, Node.js using the libraries above) accepts a `.mda` file path or piped input.
2.  **Parsing Logic:** It uses libraries like `python-frontmatter` or `gray-matter`, combined with regular expressions or custom parsing logic, to extract the Front Matter, `ai-script` blocks, footnote relationships, and main content.
3.  **Structured Output:** The script outputs the extracted components in a machine-readable format, such as a single JSON object containing all parts, or separate files for each component (e.g., `metadata.yaml`, `content.md`, `scripts.json`, `relationships.json`).

**Example Python Script Snippet (Conceptual):**

```python
# Example: cli_decoder.py (requires decode_magi function from above)
import sys
import json
# from your_module import decode_magi # Assuming decode_magi is available

if __name__ == "__main__":
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
        with open(file_path, 'r', encoding='utf-8') as f:
            magi_content = f.read()
    else:
        # Read from stdin if no file provided
        magi_content = sys.stdin.read()

    decoded_data = decode_magi(magi_content)
    # Output the structured data as JSON to stdout
    print(json.dumps(decoded_data, indent=2))

# Usage: python cli_decoder.py input.mda > output.json
# Or: cat input.mda | python cli_decoder.py > output.json
```

This scripted approach provides a reliable way to integrate MAGI parsing into command-line workflows.
