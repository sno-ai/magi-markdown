/**
 * TypeScript type definitions for MDA (.mda) document components.
 *
 * Mirrors docs/specification.md. All fields are optional unless the spec
 * explicitly marks them Required, with the single exception that footnote
 * relationships must carry rel-type plus one of doc-id or source-url.
 */

/** MDA Front Matter — YAML metadata block. All fields optional per spec. */
export interface MdaFrontMatter {
  /** Unique document identifier (UUID recommended). Required when other docs link to this one via footnotes. */
  'doc-id'?: string;
  /** Document title */
  title?: string;
  /** Short summary or abstract */
  description?: string;
  /** Primary author's name */
  author?: string;
  /** Unique identifier for the author (CUID2 or UUID recommended) */
  'author-id'?: string;
  /** URL for a primary cover image */
  image?: string;
  /** URLs for additional images */
  'images-list'?: string[];
  /** ISO 8601 timestamp the document was originally published */
  'published-date'?: string;
  /** Classification tags */
  tags?: string[];
  /** ISO 8601 timestamp the document was originally created */
  'created-date'?: string;
  /** ISO 8601 timestamp the document was last updated */
  'updated-date'?: string;
  /** ISO 8601 timestamp after which content should be considered outdated */
  'expired-date'?: string;
  /** File or URL patterns this metadata applies to (e.g., ["docs/**\/*.ts"]) */
  globs?: string[];
  /** Intended audience(s) (e.g., ["developers", "end-users"]) */
  audience?: string[];
  /** Document purpose (e.g., "Tutorial", "Reference", "Specification") */
  purpose?: string;
  /** Key named entities mentioned (people, places, organizations, concepts) */
  entities?: string[];
  /** Human-readable summary of the relationships defined in footnotes */
  relationships?: string[];
  /** Original source URL if the content was sourced from the web */
  'source-url'?: string;
  /** Custom fields are allowed but may be ignored by standard processors */
  [key: string]: unknown;
}

/** Recommended runtime-env hints. Free-form strings (e.g., URLs, "docker") are also valid per spec. */
export type MdaRuntimeEnv = 'server' | 'browser' | 'edge' | (string & {});

/** Recommended output-format values. Free-form strings are allowed for extensibility. */
export type MdaOutputFormat =
  | 'markdown'
  | 'text'
  | 'json'
  | 'image-url'
  | (string & {});

/** AI Script Block — embedded processing instructions */
export interface MdaAiScript {
  /** Unique script identifier within the document */
  'script-id': string;
  /** Prompt or instruction for the LLM */
  prompt: string;
  /** Execution priority */
  priority?: 'high' | 'medium' | 'low';
  /** Whether to execute automatically when the document is processed */
  'auto-run'?: boolean;
  /** Target AI provider hint (e.g., "openai", "anthropic", "google") */
  provider?: string;
  /** Target model name hint (e.g., "gpt-4o", "claude-3-opus") */
  'model-name'?: string;
  /** System-level instructions or context for the AI model */
  'system-prompt'?: string;
  /** Provider-specific parameters passed through to the model API */
  parameters?: {
    temperature?: number;
    'max-tokens'?: number;
    [key: string]: unknown;
  };
  /** Hint for the maximum number of retry attempts on failure */
  'retry-times'?: number;
  /** Suggested execution environment or endpoint */
  'runtime-env'?: MdaRuntimeEnv;
  /** Desired output format for the LLM response */
  'output-format'?: MdaOutputFormat;
  /** JSON Schema describing the expected output structure (implies output-format = "json") */
  'output-schema'?: Record<string, unknown>;
  /** Hint to stream the response if supported */
  stream?: boolean;
  /** Type of interactive component to render when auto-run is false */
  'interactive-type'?: 'button' | 'inputbox' | (string & {});
  /** Label for the interactive component (e.g., button text) */
  'interactive-label'?: string;
  /** Placeholder text when interactive-type is "inputbox" */
  'interactive-placeholder'?: string;
}

/** Recommended rel-type values from docs/specification.md. Custom strings are allowed. */
export type MdaRelType =
  | 'citation'
  | 'parent'
  | 'child'
  | 'related'
  | 'contradicts'
  | 'supports'
  | 'extends'
  | (string & {});

/** Footnote Relationship — typed document link */
export interface MdaRelationship {
  /** Nature of the relationship */
  'rel-type': MdaRelType;
  /** Target MDA document's doc-id. Use either doc-id or source-url. */
  'doc-id'?: string;
  /** External resource URL. Use either doc-id or source-url. */
  'source-url'?: string;
  /** Human-readable description of the relationship */
  'rel-desc': string;
  /** Optional confidence/relevance score, 0.0 to 1.0 */
  'rel-strength'?: number;
  /** Optional hint that the relationship implies a reciprocal link back */
  'bi-directional'?: boolean;
  /** Optional structured context about the link's location/nature */
  context?: {
    section?: string;
    relevance?: string;
    [key: string]: unknown;
  };
}

/** Parsed MDA Document */
export interface MdaDocument {
  /** Parsed front matter */
  frontMatter: MdaFrontMatter;
  /** Markdown body content (front matter, ai-script blocks, and footnote definitions removed) */
  body: string;
  /** Extracted ai-script blocks */
  scripts: MdaAiScript[];
  /** Extracted footnote relationships */
  relationships: MdaRelationship[];
}
