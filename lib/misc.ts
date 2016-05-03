import {VNode} from './vnode';

type VNodeList = Array<VNode|VNodeList[]>;

export function flattenVNodes(nodes: VNodeList) : VNode[] {
  let copy = nodes.slice(0);
  let flatten = [];
  while (copy.length > 0) {
    const item = copy.shift();
    if (item.constructor === VNode) {
      flatten.push(item)
    } else {
      copy = item.concat(copy)
    }
  }
  return flatten
}
