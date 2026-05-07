/**
 * Parse a MDA (.mda) document into its three structured components:
 * front matter, ai-script blocks, and footnote relationships.
 *
 * Returns a MdaDocument matching the type definitions in types/mda.d.ts.
 *
 * @example
 * ```ts
 * import { readFileSync } from 'fs';
 * import { parseMdaDocument } from './parse-document';
 *
 * const content = readFileSync('doc.mda', 'utf-8');
 * const doc = parseMdaDocument(content);
 *
 * console.log(doc.frontMatter['doc-id']);   // "hello-world-001"
 * console.log(doc.scripts.length);           // 1
 * console.log(doc.relationships.length);     // 2
 * ```
 */

import type {
  MdaDocument,
  MdaFrontMatter,
  MdaAiScript,
  MdaRelationship,
} from '../types/mda';

// ---------------------------------------------------------------------------
// Front matter
// ---------------------------------------------------------------------------

const FRONT_MATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

/**
 * Extract and lightly parse the YAML front matter block.
 * Only the flat-field subset used by MdaFrontMatter is decoded here;
 * any unrecognised keys are carried through as raw strings.
 *
 * Supported YAML constructs:
 *   scalar:   key: value  /  key: "value"  /  key: 'value'
 *   sequence: key:\n  - item1\n  - item2
 */
export function parseFrontMatter(content: string): {
  frontMatter: MdaFrontMatter;
  rest: string;
} {
  const match = FRONT_MATTER_RE.exec(content);
  if (!match) {
    return { frontMatter: {}, rest: content };
  }

  const yaml = match[1];
  const rest = content.slice(match[0].length);
  const fm: Record<string, unknown> = {};

  const lines = yaml.split(/\r?\n/);
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Sequence value: previous key followed by list items
    const seqMatch = /^(\S[\w-]*):\s*$/.exec(line);
    if (seqMatch) {
      const key = seqMatch[1];
      const items: string[] = [];
      i++;
      while (i < lines.length && /^\s+-\s/.test(lines[i])) {
        items.push(stripQuotes(lines[i].replace(/^\s+-\s+/, '').split('#')[0].trim()));
        i++;
      }
      fm[key] = items;
      continue;
    }

    // Scalar value: key: value
    const scalarMatch = /^(\S[\w-]*):\s*(.*)$/.exec(line);
    if (scalarMatch) {
      const key = scalarMatch[1];
      const raw = scalarMatch[2].split('#')[0].trim();
      fm[key] = raw === '' ? undefined : stripQuotes(raw);
      i++;
      continue;
    }

    i++;
  }

  return {
    frontMatter: fm as unknown as MdaFrontMatter,
    rest,
  };
}

function stripQuotes(s: string): string {
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

// ---------------------------------------------------------------------------
// AI script blocks
// ---------------------------------------------------------------------------

// Matches fenced ```ai-script ... ``` blocks (non-greedy, multiline)
const AI_SCRIPT_RE = /```ai-script\r?\n([\s\S]*?)```/g;

/**
 * Extract all ai-script fenced code blocks from document content.
 * Returns the parsed scripts and the body with those blocks removed.
 */
export function parseAiScripts(content: string): {
  scripts: MdaAiScript[];
  bodyWithoutScripts: string;
} {
  const scripts: MdaAiScript[] = [];
  const bodyWithoutScripts = content.replace(AI_SCRIPT_RE, (_match, jsonStr: string) => {
    try {
      const data = JSON.parse(jsonStr.trim()) as Record<string, unknown>;
      if (typeof data['script-id'] === 'string' && typeof data['prompt'] === 'string') {
        scripts.push(data as unknown as MdaAiScript);
      }
    } catch {
      // malformed JSON — skip block but still remove it from body
    }
    return '';
  });

  return { scripts, bodyWithoutScripts };
}

// ---------------------------------------------------------------------------
// Relationships
// ---------------------------------------------------------------------------

// Handles both bare and backtick-wrapped JSON per MDA spec
const FOOTNOTE_RE = /^\[\^(\w+)\]:\s*`?({.+?})`?$/gm;

function parseRelationshipsFromContent(content: string): MdaRelationship[] {
  const relationships: MdaRelationship[] = [];
  let match: RegExpExecArray | null;
  FOOTNOTE_RE.lastIndex = 0;

  while ((match = FOOTNOTE_RE.exec(content)) !== null) {
    try {
      const data = JSON.parse(match[2]) as Record<string, unknown>;
      const relType = data['rel-type'] as MdaRelationship['rel-type'] | undefined;
      const docId = data['doc-id'] as string | undefined;
      const sourceUrl = data['source-url'] as string | undefined;
      const relDesc = data['rel-desc'] as string | undefined;

      // Per spec: rel-type and rel-desc are required; one of doc-id / source-url must be present.
      if (!relType || !relDesc || (!docId && !sourceUrl)) continue;

      const rel: MdaRelationship = { 'rel-type': relType, 'rel-desc': relDesc };
      if (docId) rel['doc-id'] = docId;
      if (sourceUrl) rel['source-url'] = sourceUrl;
      if (typeof data['rel-strength'] === 'number') rel['rel-strength'] = data['rel-strength'];
      if (typeof data['bi-directional'] === 'boolean') rel['bi-directional'] = data['bi-directional'];
      if (data.context && typeof data.context === 'object') {
        rel.context = data.context as MdaRelationship['context'];
      }
      relationships.push(rel);
    } catch {
      // skip invalid footnote JSON
    }
  }

  return relationships;
}

// ---------------------------------------------------------------------------
// Full document parser
// ---------------------------------------------------------------------------

/**
 * Parse a raw MDA document string into its structured components.
 *
 * Processing order:
 *   1. Strip front matter → MdaFrontMatter
 *   2. Strip ai-script blocks → MdaAiScript[]
 *   3. Parse footnote relationships from remaining body → MdaRelationship[]
 *   4. Trim blank lines from body
 */
export function parseMdaDocument(content: string): MdaDocument {
  const { frontMatter, rest } = parseFrontMatter(content);
  const { scripts, bodyWithoutScripts } = parseAiScripts(rest);
  const relationships = parseRelationshipsFromContent(bodyWithoutScripts);

  // Remove footnote definition lines from the visible body
  const body = bodyWithoutScripts
    .replace(/^\[\^\w+\]:\s*`?{.+?}`?\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return { frontMatter, body, scripts, relationships };
}
