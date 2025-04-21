# AIMD Developer Guide: Encoding & Decoding

This guide provides examples of how to programmatically encode (create) and decode (parse) AI Markdown (AIMD) documents in different environments.

## Core Concepts

*   **Encoding:** Combining separate pieces of information (metadata, content, AI instructions, relationships) into the AIMD string format.
*   **Decoding:** Parsing an AIMD string to extract its distinct components (Front Matter, main Markdown content, `ai-script` blocks, Footnote relationships).

Common libraries used:
*   **YAML Parsers:** For handling the Front Matter (e.g., `js-yaml` in Node.js, `PyYAML` in Python).
*   **Markdown Parsers:** For processing the main content and potentially identifying code blocks and footnotes (e.g., `marked`, `markdown-it` in Node.js; `markdown`, `mistune` in Python). Regular expressions can also be used for simpler extraction tasks.
*   **JSON Parsers:** Built-in functionality in most languages (`JSON.parse`/`JSON.stringify` in JS, `json` module in Python).

---

## TypeScript / JavaScript Examples

Libraries needed: `gray-matter` (for front matter), `marked` (or similar Markdown parser, optional but helpful).

```bash
npm install gray-matter marked
# or
pnpm add gray-matter marked
# or
yarn add gray-matter marked
```

### Encoding AIMD

```typescript
import matter from 'gray-matter';
import { marked } from 'marked'; // Optional: only if you need to process markdown itself

interface FrontMatterData {
  'doc-id': string;
  title: string;
  tags?: string[];
  [key: string]: any; // Allow other fields
}

interface AIScript {
  'script-id': string;
  prompt: string;
  priority?: 'high' | 'medium' | 'low';
  [key: string]: any;
}

interface Relationship {
  rel_type: string;
  doc_id: string;
  rel_desc: string;
  [key: string]: any;
}

function encodeAimd(
  frontMatter: FrontMatterData,
  mainContent: string,
  aiScripts: AIScript[] = [],
  relationships: { [key: string]: Relationship } = {}
): string {
  // 1. Format Front Matter
  // gray-matter stringify automatically adds the --- delimiters
  // Pass an empty string as content because we'll append our actual content later.
  let aimdString = matter.stringify('', frontMatter);

  // Append a newline if not already present
  if (!aimdString.endsWith('\\n')) {
      aimdString += '\\n';
  }

  // 2. Append Main Content
  aimdString += mainContent.trim() + '\\n\\n';

  // 3. Append AI Scripts
  aiScripts.forEach(script => {
    // Note the template literal for easier multiline strings and JSON block
    aimdString += \`\`\`ai-script
${JSON.stringify(script, null, 2)}
\`\`\`

\`; // Add extra newline after the block
  });

  // 4. Append Footnote Relationships
  Object.entries(relationships).forEach(([refId, relationship]) => {
    aimdString += \`[^${refId}]: \`${JSON.stringify(relationship)}\`\`;
  });

  return aimdString.trim();
}

// --- Example Usage ---
const myFrontMatter: FrontMatterData = {
  'doc-id': 'doc-abc-123',
  title: 'My Example Document',
  tags: ['example', 'guide']
};

const myContent = \`
# Main Section

This is the primary content.

It references another document[^ref1].
\`;

const myScripts: AIScript[] = [
  {
    'script-id': 'summary-01',
    prompt: 'Summarize the above section.',
    priority: 'medium'
  }
];

const myRelationships: { [key: string]: Relationship } = {
  ref1: {
    rel_type: 'related',
    doc_id: 'doc-xyz-789',
    rel_desc: 'Provides background information'
  }
};

const aimdOutput = encodeAimd(myFrontMatter, myContent, myScripts, myRelationships);
console.log(aimdOutput);

/* Expected Output:
---
'doc-id': doc-abc-123
title: My Example Document
tags:
  - example
  - guide
---

# Main Section

This is the primary content.

It references another document[^ref1].

```ai-script
{
  "script-id": "summary-01",
  "prompt": "Summarize the above section.",
  "priority": "medium"
}
```

[^ref1]: `{"rel_type":"related","doc_id":"doc-xyz-789","rel_desc":"Provides background information"}`
*/
```

### Decoding AIMD

```typescript
import matter from 'gray-matter';
// marked is optional, only needed if you want to parse the final Markdown content
// import { marked } from 'marked';

// Interfaces (AIScript, Relationship) assumed to be defined as in Encoding example

interface DecodedAimd {
  frontMatter: { [key: string]: any };
  content: string; // Raw Markdown content (without frontmatter, scripts, footnotes)
  aiScripts: AIScript[];
  relationships: { [key: string]: Relationship };
}

// Improved Regex - handles potential spaces around ```ai-script
// Still basic, might need refinement for edge cases like escaped backticks within JSON
const aiScriptRegex = /^\s*```ai-script\s*\n([\s\S]*?)\n\s*```\s*$/gm;
const footnoteRegex = /^\[\^(.+?)\]:\s*`({.*?})`$/gm; // Match footnotes with backticked JSON

function decodeAimd(aimdString: string): DecodedAimd {
  // 1. Extract Front Matter and Content
  const { data: frontMatter, content: rawContent } = matter(aimdString);

  let remainingContent = rawContent;

  // 2. Extract AI Scripts
  const aiScripts: AIScript[] = [];
  remainingContent = remainingContent.replace(aiScriptRegex, (match, scriptContent) => {
    try {
      aiScripts.push(JSON.parse(scriptContent));
    } catch (e) {
      console.error('Failed to parse AI script JSON:', e, '\nContent:', scriptContent);
      // Keep the block in content if it fails to parse
      return match;
    }
    // Return empty string to remove the block from remaining content
    return '';
  });
  remainingContent = remainingContent.trim();

  // 3. Extract Footnote Relationships
  const relationships: { [key: string]: Relationship } = {};
  remainingContent = remainingContent.replace(footnoteRegex, (match, refId, relationshipJson) => {
    try {
      relationships[refId] = JSON.parse(relationshipJson);
      // Return empty string to remove the footnote definition
      return '';
    } catch (e) {
      console.error(\`Failed to parse relationship JSON for [^\${refId}]:\`, e, '\\nContent:', relationshipJson);
      // Keep the line if parse fails
      return match;
    }
  });
  remainingContent = remainingContent.trim(); // Trim again after removals

  return {
    frontMatter,
    content: remainingContent,
    aiScripts,
    relationships
  };
}

// --- Example Usage ---
const aimdInput = \`
---
'doc-id': doc-abc-123
title: My Example Document
tags:
  - example
  - guide
---

# Main Section

This is the primary content.

It references another document[^ref1].

\`\`\`ai-script
{
  "script-id": "summary-01",
  "prompt": "Summarize the above section.",
  "priority": "medium"
}
\`\`\`

Some more text here.

[^ref1]: `{"rel_type":"related","doc_id":"doc-xyz-789","rel_desc":"Provides background information"}`
[^ref2]: `{"rel_type":"child","doc_id":"doc-child-456","rel_desc":"Details section A"}`
\`;

const decoded = decodeAimd(aimdInput);
console.log(JSON.stringify(decoded, null, 2));

/* Corrected Expected Output:
{
  "frontMatter": {
    "doc-id": "doc-abc-123",
    "title": "My Example Document",
    "tags": [
      "example",
      "guide"
    ]
  },
  "content": "# Main Section\\n\\nThis is the primary content.\\n\\nIt references another document[^ref1].\\n\\nSome more text here.",
  "aiScripts": [
    {
      "script-id": "summary-01",
      "prompt": "Summarize the above section.",
      "priority": "medium"
    }
  ],
  "relationships": {
    "ref1": {
      "rel_type": "related",
      "doc_id": "doc-xyz-789",
      "rel_desc": "Provides background information"
    },
    "ref2": {
      "rel_type": "child",
      "doc_id": "doc-child-456",
      "rel_desc": "Details section A"
    }
  }
}
*/
```

---

## Python Examples

Libraries needed: `python-frontmatter` (handles YAML front matter), `markdown` (optional, for Markdown processing), `PyYAML` (usually a dependency of frontmatter).

```bash
pip install python-frontmatter markdown PyYAML
```

### Encoding AIMD

```python
import frontmatter
import json
from io import StringIO # Use StringIO for string manipulation

def encode_aimd(front_matter_dict, main_content, ai_scripts_list=[], relationships_dict={}):
    """Encodes AIMD components into a string."""

    # 1. Create a post object with front matter
    # Content is initially empty, we'll add it manually
    post = frontmatter.Post(content='', **front_matter_dict)

    # Export metadata using YAMLHandler to get the YAML string
    # Use StringIO as the file-like object for export
    with StringIO() as file_like_object:
        frontmatter.dump(post, file_like_object)
        aimd_string = file_like_object.getvalue()

    # Ensure there's a newline after frontmatter if matter.dump added one
    if not aimd_string.endswith('\n'):
        aimd_string += '\n'
    # Ensure separation between front matter and content
    if not aimd_string.endswith('\n\n'):
         aimd_string = aimd_string.strip() + '\n\n'


    # 2. Append Main Content
    aimd_string += main_content.strip() + '\n\n'

    # 3. Append AI Scripts
    for script in ai_scripts_list:
        aimd_string += "```ai-script\n"
        aimd_string += json.dumps(script, indent=2) + '\n'
        aimd_string += "```\n\n" # Add extra newline after the block

    # 4. Append Footnote Relationships
    for ref_id, relationship in relationships_dict.items():
        # Standard footnote format includes a space after the colon
        aimd_string += f"[^{ref_id}]: `{json.dumps(relationship)}`\n"

    return aimd_string.strip()

# --- Example Usage ---
my_front_matter = {
    'doc-id': 'doc-abc-123',
    'title': 'My Example Document',
    'tags': ['example', 'guide']
}

my_content = """
# Main Section

This is the primary content.

It references another document[^ref1].
"""

my_scripts = [
    {
        'script-id': 'summary-01',
        'prompt': 'Summarize the above section.',
        'priority': 'medium'
    }
]

my_relationships = {
    'ref1': {
        'rel_type': 'related',
        'doc_id': 'doc-xyz-789',
        'rel_desc': 'Provides background information'
    }
}

aimd_output = encode_aimd(my_front_matter, my_content, my_scripts, my_relationships)
print(aimd_output)

# Expected output is similar to the TypeScript example
```

### Decoding AIMD

```python
import frontmatter
import json
import re

# Updated Regex using standard flags
ai_script_regex = re.compile(r"^\s*```ai-script\s*\n(.*?)\n\s*```\s*$", re.DOTALL | re.MULTILINE)
footnote_regex = re.compile(r"^\[\^(.+?)\]:\s*`({.*?})`$", re.MULTILINE)

def decode_aimd(aimd_string):
    """Decodes an AIMD string into its components."""

    # 1. Extract Front Matter and Content
    try:
        # Use loads to parse the string directly
        post = frontmatter.loads(aimd_string)
        fm = post.metadata
        raw_content = post.content
    except Exception as e:
        print(f"Error parsing front matter: {e}")
        fm = {}
        # Fallback if no front matter, assume entire string is content
        raw_content = aimd_string

    remaining_content = raw_content

    # 2. Extract AI Scripts using re.sub with a function
    ai_scripts = []
    def script_replacer(match):
        script_json_str = match.group(1)
        try:
            script_json = json.loads(script_json_str)
            ai_scripts.append(script_json)
            return '' # Remove the block if successfully parsed
        except json.JSONDecodeError as e:
            print(f"Failed to parse AI script JSON: {e}\nContent: {script_json_str[:100]}...")
            return match.group(0) # Keep block if parsing fails

    remaining_content = ai_script_regex.sub(script_replacer, remaining_content).strip()

    # 3. Extract Footnote Relationships using re.sub with a function
    relationships = {}
    def footnote_replacer(match):
        ref_id = match.group(1)
        rel_json_str = match.group(2)
        try:
            relationship_json = json.loads(rel_json_str)
            relationships[ref_id] = relationship_json
            return '' # Remove the line if successfully parsed
        except json.JSONDecodeError as e:
            print(f"Failed to parse relationship JSON for [^{ref_id}]: {e}\nContent: {rel_json_str}")
            return match.group(0) # Keep line if parsing fails

    remaining_content = footnote_regex.sub(footnote_replacer, remaining_content).strip()

    return {
        'front_matter': fm,
        'content': remaining_content,
        'ai_scripts': ai_scripts,
        'relationships': relationships
    }

# --- Example Usage ---
aimd_input = """
---
doc-id: doc-abc-123
title: My Example Document
tags:
  - example
  - guide
---

# Main Section

This is the primary content.

It references another document[^ref1].

```ai-script
{
  "script-id": "summary-01",
  "prompt": "Summarize the above section.",
  "priority": "medium"
}
```

Some more text here.

[^ref1]: `{"rel_type":"related","doc_id":"doc-xyz-789","rel_desc":"Provides background information"}`
[^ref2]: `{"rel_type":"child","doc_id":"doc-child-456","rel_desc":"Details section A"}`
"""

decoded = decode_aimd(aimd_input)
print(json.dumps(decoded, indent=2))

# Expected output is similar to the TypeScript example
```

---

## Command Line / API (`url2md` Example)

This example focuses on *generating* AIMD using the reference implementation's API, rather than complex command-line parsing.

### Generating AIMD from a URL (Encoding via Service)

This uses the `url2md` Cloudflare worker API described in the main `README.md`.

```bash
# Replace <your-worker-domain> with the actual deployed worker URL
WORKER_URL="https://<your-worker-domain>/convert"
TARGET_URL="https://example.com"

# Request JSON response (default, which contains AIMD string)
curl -X POST "$WORKER_URL" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "'"$TARGET_URL"'",
    "htmlDetails": false,
    "subpages": false,
    "llmFilter": false
  }'

# To get plain text AIMD directly:
curl -X POST "$WORKER_URL" \\
  -H "Content-Type: application/json" \\
  -H "Accept: text/plain" \\
  -d '{"url": "'"$TARGET_URL"'"}' # Simpler quoting for shell

# Example with more options:
curl -X POST "$WORKER_URL" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API",
    "htmlDetails": true,
    "llmFilter": true
  }'
```

### Decoding AIMD via Command Line (Conceptual)

Directly decoding complex AIMD with standard command-line tools (`grep`, `sed`, `awk`, etc.) is challenging and error-prone, especially parsing nested JSON within Markdown.

A robust approach would involve:

1.  **Extracting Front Matter:** Use tools like `yq` or a script that reads lines between `---` delimiters and pipes to a YAML parser.
2.  **Extracting `ai-script`:** Use `awk` or `sed` to find ` ```ai-script ... ``` ` blocks and extract the JSON content, then pipe to `jq` for validation/processing.
3.  **Extracting Footnotes:** Use `grep` or `awk` to find lines matching `^\\\[^...]:\\s*{.*}` and extract the JSON part, then pipe to `jq`.
4.  **Separating Content:** Isolate the remaining lines as the main Markdown content.

For practical command-line use, it's often better to write a small script (e.g., in Python or Node.js using the libraries above) that takes the AIMD file/string as input and outputs the parsed components in a desired format (like separate files or a structured JSON output).
