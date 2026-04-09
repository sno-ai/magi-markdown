/**
 * Parse MAGI footnote relationships from markdown content.
 *
 * MAGI footnotes follow the pattern:
 *   [^refN]: {"rel-type": "...", "doc-id": "...", "rel-desc": "..."}
 *
 * This utility extracts all typed relationships from a MAGI document.
 */

export interface MagiRelationship {
  refKey: string;
  relType: string;
  docId: string;
  relDesc?: string;
}

const FOOTNOTE_REGEX = /^\[\^(\w+)\]:\s*({.+})$/gm;

/**
 * Extract all MAGI relationships from document content.
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
export function parseRelationships(content: string): MagiRelationship[] {
  const relationships: MagiRelationship[] = [];
  let match: RegExpExecArray | null;

  // Reset regex state
  FOOTNOTE_REGEX.lastIndex = 0;

  while ((match = FOOTNOTE_REGEX.exec(content)) !== null) {
    const refKey = match[1];
    const jsonStr = match[2];

    try {
      const data = JSON.parse(jsonStr);
      if (data['rel-type'] && data['doc-id']) {
        relationships.push({
          refKey,
          relType: data['rel-type'],
          docId: data['doc-id'],
          relDesc: data['rel-desc'],
        });
      }
    } catch {
      // Not a valid MAGI relationship footnote — skip
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
  docs: Map<string, MagiRelationship[]>
): Map<string, Array<{ targetId: string; relType: string }>> {
  const graph = new Map<string, Array<{ targetId: string; relType: string }>>();

  for (const [docId, rels] of docs) {
    if (!graph.has(docId)) graph.set(docId, []);
    for (const rel of rels) {
      graph.get(docId)!.push({ targetId: rel.docId, relType: rel.relType });
    }
  }

  return graph;
}
