/**
 * TypeScript type definitions for MAGI (.mda) document components.
 *
 * These types reflect the MAGI specification for front matter,
 * ai-script blocks, and footnote relationships.
 */

/** MAGI Front Matter — YAML metadata block */
export interface MagiFrontMatter {
  /** Unique document identifier (UUID recommended) */
  'doc-id': string;
  /** Document title */
  title: string;
  /** Short summary or abstract */
  description?: string;
  /** Classification tags */
  tags?: string[];
  /** Document purpose (e.g., "Tutorial", "Reference", "Specification") */
  purpose?: string;
  /** ISO 8601 creation timestamp */
  'created-date'?: string;
  /** ISO 8601 last update timestamp */
  'updated-date'?: string;
  /** Additional custom metadata */
  [key: string]: unknown;
}

/** AI Script Block — embedded processing instructions */
export interface MagiAiScript {
  /** Unique script identifier */
  'script-id': string;
  /** Prompt or instruction for the LLM */
  prompt: string;
  /** Execution priority: "high" | "medium" | "low" */
  priority?: 'high' | 'medium' | 'low';
  /** Whether to execute automatically when document is processed */
  'auto-run'?: boolean;
  /** Target AI provider */
  provider?: string;
  /** Target model name */
  'model-name'?: string;
  /** Model parameters */
  parameters?: {
    temperature?: number;
    'max-tokens'?: number;
    [key: string]: unknown;
  };
  /** Execution environment */
  'runtime-env'?: 'server' | 'client' | 'edge';
  /** Output format */
  'output-format'?: 'markdown' | 'json' | 'text' | 'structured';
}

/** Footnote Relationship — typed document link */
export interface MagiRelationship {
  /** Relationship type */
  'rel-type': 'parent' | 'child' | 'cites' | 'related' | 'translation-of' | 'supersedes';
  /** Target document ID */
  'doc-id': string;
  /** Human-readable relationship description */
  'rel-desc'?: string;
}

/** Parsed MAGI Document */
export interface MagiDocument {
  /** Parsed front matter */
  frontMatter: MagiFrontMatter;
  /** Markdown body content (without front matter and ai-script blocks) */
  body: string;
  /** Extracted ai-script blocks */
  scripts: MagiAiScript[];
  /** Extracted footnote relationships */
  relationships: MagiRelationship[];
}
