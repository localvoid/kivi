import { VNode } from "./vnode";

export type VNodeRecursiveListValue = VNode | VNodeRecursiveList | null;
export interface VNodeRecursiveList extends Array<VNodeRecursiveListValue> { }

/**
 * Recursively flattens VNode arrays and skips null nodes.
 */
export function normalizeVNodes(nodes: VNodeRecursiveList): VNode[] {
  let copy = nodes.slice(0);
  const flatten = [] as VNode[];
  while (copy.length > 0) {
    const item = copy.shift();
    if (item !== null) {
      if (item!.constructor === VNode) {
        flatten.push(item as any);
      } else {
        copy = (item as any).concat(copy);
      }
    }
  }
  return flatten;
}
