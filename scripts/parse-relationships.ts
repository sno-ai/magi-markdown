/**
 * Parse MDA footnote relationships from markdown content.
 *
 * MDA footnotes follow the pattern (both forms are valid per spec):
 *   [^refN]: {"rel-type": "...", "doc-id": "...", "rel-desc": "..."}
 *   [^refN]: `{"rel-type": "...", "doc-id": "...", "rel-desc": "..."}`
 *
 * Per the MDA spec, `source-url` may be used instead of `doc-id` for
 * linking to external resources.
 *
 * This utility extracts all typed relationships from a MDA document.
 */

export interface MdaRelationship {
  refKey: string;
  relType: string;
  /** Present when the target is another MDA document. */
  docId?: string;
  /** Present when the target is an external URL (alternative to docId). */
  sourceUrl?: string;
  relDesc?: string;
  relStrength?: number;
  biDirectional?: boolean;
}

/**
 * Matches both bare and backtick-wrapped JSON footnote definitions:
 *   [^ref]: {...}
 *   [^ref]: `{...}`
 */
const FOOTNOTE_REGEX = /^\[\^(\w+)\]:\s*`?({.+?})`?$/gm;

/**
 * Extract all MDA relationships from document content.
 *
 * @param content - Raw markdown/MDA file content
 * @returns Array of parsed relationships
 *
 * @example
 * ```ts
 * const content = fs.readFileSync('doc.mda', 'utf-8');
 * const rels = parseRelationships(content);
 * // [{ refKey: "ref1", relType: "parent", docId: "UUID-123", relDesc: "..." }]
 * ```
 */
export function parseRelationships(content: string): MdaRelationship[] {
  const relationships: MdaRelationship[] = [];
  let match: RegExpExecArray | null;

  // Reset regex state before each use
  FOOTNOTE_REGEX.lastIndex = 0;

  while ((match = FOOTNOTE_REGEX.exec(content)) !== null) {
    const refKey = match[1];
    const jsonStr = match[2];

    try {
      const data = JSON.parse(jsonStr);
      const relType: string = data['rel-type'];
      const docId: string | undefined = data['doc-id'];
      const sourceUrl: string | undefined = data['source-url'];

      // rel-type is always required; at least one of doc-id or source-url must be present
      if (!relType || (!docId && !sourceUrl)) continue;

      const rel: MdaRelationship = { refKey, relType };
      if (docId) rel.docId = docId;
      if (sourceUrl) rel.sourceUrl = sourceUrl;
      if (data['rel-desc']) rel.relDesc = data['rel-desc'];
      if (typeof data['rel-strength'] === 'number') rel.relStrength = data['rel-strength'];
      if (typeof data['bi-directional'] === 'boolean') rel.biDirectional = data['bi-directional'];

      relationships.push(rel);
    } catch {
      // Not a valid MDA relationship footnote — skip
    }
  }

  return relationships;
}

/**
 * Build an adjacency list from relationships across multiple documents.
 *
 * @param docs - Map of doc-id to their parsed relationships
 * @returns Adjacency list: doc-id -> [{ targetId, relType }]
 */
export function buildRelationshipGraph(
  docs: Map<string, MdaRelationship[]>
): Map<string, Array<{ targetId: string; relType: string }>> {
  const graph = new Map<string, Array<{ targetId: string; relType: string }>>();

  for (const [docId, rels] of docs) {
    if (!graph.has(docId)) graph.set(docId, []);
    for (const rel of rels) {
      const targetId = rel.docId ?? rel.sourceUrl;
      if (targetId) {
        graph.get(docId)!.push({ targetId, relType: rel.relType });
      }
    }
  }

  return graph;
}
