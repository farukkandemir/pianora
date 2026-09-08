/**
 * Thin helpers over fast-xml-parser's preserveOrder output.
 * MusicXML is order-sensitive inside <measure> (backup/forward/attributes
 * mid-measure), so we keep child order instead of collapsing to objects.
 */
import { XMLParser } from 'fast-xml-parser';

export type XNode = Record<string, unknown>;

const parser = new XMLParser({
  preserveOrder: true,
  ignoreAttributes: false,
  attributeNamePrefix: '',
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
  ignoreDeclaration: true,
  ignorePiTags: true,
  processEntities: true,
});

export function parseXml(xml: string): XNode[] {
  return parser.parse(xml) as XNode[];
}

export function tagOf(node: XNode): string {
  for (const k of Object.keys(node)) if (k !== ':@') return k;
  return '';
}

export function childrenOf(node: XNode): XNode[] {
  const v = node[tagOf(node)];
  return Array.isArray(v) ? (v as XNode[]) : [];
}

export function attrsOf(node: XNode): Record<string, string> {
  return (node[':@'] as Record<string, string> | undefined) ?? {};
}

export function textOf(node: XNode | undefined): string {
  if (!node) return '';
  return childrenOf(node)
    .filter((c) => '#text' in c)
    .map((c) => String(c['#text']))
    .join('');
}

export function child(node: XNode, name: string): XNode | undefined {
  return childrenOf(node).find((c) => tagOf(c) === name);
}

export function childText(node: XNode, name: string): string | undefined {
  const c = child(node, name);
  return c ? textOf(c) : undefined;
}

export function childrenNamed(node: XNode, name: string): XNode[] {
  return childrenOf(node).filter((c) => tagOf(c) === name);
}

export function hasChild(node: XNode, name: string): boolean {
  return child(node, name) !== undefined;
}

/** Walk a path of tag names, returning the first match at each level. */
export function find(node: XNode, ...path: string[]): XNode | undefined {
  let cur: XNode | undefined = node;
  for (const name of path) {
    if (!cur) return undefined;
    cur = child(cur, name);
  }
  return cur;
}

export function findRoot(nodes: XNode[], name: string): XNode | undefined {
  return nodes.find((n) => tagOf(n) === name);
}
