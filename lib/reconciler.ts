import {printError} from "./debug";
import {VNodeFlags, VNodeDebugFlags, RenderFlags, setAttr} from "./misc";
import {VNode, vNodeInsertChild, vNodeRemoveChild, vNodeReplaceChild, vNodeMoveChild, vNodeFreeze} from "./vnode";
import {VModel} from "./vmodel";
import {Component} from "./component";
import {scheduler, schedulerUpdateComponent} from "./scheduler";

/**
 * Virtual DOM Reconciler.
 *
 * @final
 */
export class Reconciler {
  /**
   * See `RenderFlags` for details.
   */
  flags: number;

  constructor() {
    this.flags = 0;
  }

  sync(a: VNode, b: VNode, owner: Component<any, any>, renderFlags: number): void {
    _syncVNodes(a, b, owner, this.flags | renderFlags);
  }
}

/**
 * Sync two VNodes
 *
 * When node `a` is synced with node `b`, `a` node should be considered as destroyed, and any access to it after sync
 * is an undefined behavior.
 */
function _syncVNodes(a: VNode, b: VNode, owner: Component<any, any>, renderFlags: number): void {
  if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
    if ((a._debugProperties.flags & (VNodeDebugFlags.Rendered | VNodeDebugFlags.Mounted)) === 0) {
      throw new Error("Failed to sync VNode: VNode should be rendered or mounted before sync.");
    }
    b._debugProperties.flags |= a._debugProperties.flags &
      (VNodeDebugFlags.Rendered | VNodeDebugFlags.Mounted |
        VNodeDebugFlags.Attached | VNodeDebugFlags.Detached);
  }

  const ref = a.ref as Element;
  const flags = a._flags;

  let component: Component<any, any>;
  let className: string;

  if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
    if (a._flags !== b._flags) {
      throw new Error(`Failed to sync VNode: flags does not match (old: ${a._flags}, new: ${b._flags}).`);
    }
    if (a._tag !== b._tag) {
      throw new Error(`Failed to sync VNode: tags does not match (old: ${a._tag}, new: ${b._tag}).`);
    }
    if (a._key !== b._key) {
      throw new Error(`Failed to sync VNode: keys does not match (old: ${a._key}, new: ${b._key}).`);
    }
    if (b.ref !== null && a.ref !== b.ref) {
      throw new Error("Failed to sync VNode: reusing VNodes isn't allowed unless it has the same ref.");
    }
  }

  b.ref = ref;

  if ((flags & VNodeFlags.Text) !== 0) {
    if (a._props !== b._props) {
      a.ref.nodeValue = b._props as string;
    }
  } else if ((flags & (VNodeFlags.Element | VNodeFlags.Root)) !== 0) {
    if ((flags & VNodeFlags.VModelUpdateHandler) === 0) {
      if (a._props !== b._props) {
        if ((a._flags & VNodeFlags.DynamicShapeProps) === 0) {
          syncStaticShapeProps(ref, a._props, b._props);
        } else {
          syncDynamicShapeProps(ref, a._props, b._props);
        }
      }
      if (a._attrs !== b._attrs) {
        if ((a._flags & VNodeFlags.DynamicShapeAttrs) === 0) {
          syncStaticShapeAttrs(ref, a._attrs, b._attrs);
        } else {
          syncDynamicShapeAttrs(ref, a._attrs, b._attrs);
        }
      }
      if (a._style !== b._style) {
        const style = (b._style === null) ? "" : b._style;
        if ((flags & VNodeFlags.Svg) === 0) {
          (ref as HTMLElement).style.cssText = style;
        } else {
          ref.setAttribute("style", style);
        }
      }

      if (a._className !== b._className) {
        className = (b._className === null) ? "" : b._className;
        if ((flags & VNodeFlags.Svg) === 0) {
          (ref as HTMLElement).className = className;
        } else {
          ref.setAttribute("class", className);
        }
      }

    } else if (a._props !== b._props) {
      if ((flags & VNodeFlags.Root) === 0) {
        (a._tag as VModel<any>).update(ref, a._props, b._props);
      } else {
        (owner.descriptor._tag as VModel<any>).update(ref, a._props, b._props);
      }
    }

    if ((a._flags & VNodeFlags.InputElement) === 0) {
      if (a._children !== b._children) {
        _syncChildren(
          a,
          a._children as VNode[] | string,
          b._children as VNode[] | string,
          owner,
          renderFlags);
      }
    } else {
      if ((flags & VNodeFlags.TextInputElement) !== 0) {
        if ((ref as HTMLInputElement).value !== b._children) {
          (ref as HTMLInputElement).value = b._children as string;
        }
      } else { // ((flags & VNodeFlags.CheckedInputElement) !== 0)
        if ((ref as HTMLInputElement).checked !== b._children) {
          (ref as HTMLInputElement).checked = b._children as boolean;
        }
      }
    }
  } else { // if ((flags & VNodeFlags.Component) !== 0)
    component = b.cref = a.cref as Component<any, any>;

    if (a._className !== b._className) {
      className = (b._className === null) ? "" : b._className;
      if ((flags & VNodeFlags.Svg) === 0) {
        (ref as HTMLElement).className = className;
      } else {
        ref.setAttribute("class", className);
      }
    }

    if ((renderFlags & RenderFlags.ShallowUpdate) === 0) {
      schedulerUpdateComponent(scheduler, component, (flags & VNodeFlags.BindOnce) === 0 ? b._props : undefined);
    }
  }

  vNodeFreeze(b);
}


/**
 * Check if two nodes can be synced.
 */
function _canSyncVNodes(a: VNode, b: VNode): boolean {
  return (a._flags === b._flags &&
          a._tag === b._tag &&
          a._key === b._key);
}

/**
 * Sync old children list with the new one.
 */
function _syncChildren(parent: VNode, a: VNode[]|string, b: VNode[]|string, owner: Component<any, any>,
     renderFlags: number): void {
  let aNode: VNode;
  let bNode: VNode;
  let i = 0;
  let synced = false;

  if (typeof a === "string") {
    if (b === null) {
      parent.ref.removeChild(parent.ref.firstChild);
    } else if (typeof b === "string") {
      let c = parent.ref.firstChild;
      if (c) {
        c.nodeValue = b;
      } else {
        parent.ref.textContent = b;
      }
    } else {
      parent.ref.removeChild(parent.ref.firstChild);
      while (i < b.length) {
        vNodeInsertChild(parent, b[i++], null, owner, renderFlags);
      }
    }
  } else if (typeof b === "string") {
    if (a !== null) {
      while (i < a.length) {
        vNodeRemoveChild(parent, a[i++], owner);
      }
    }
    parent.ref.textContent = b;
  } else {
    if (a !== null && a.length !== 0) {
      if (b === null || b.length === 0) {
        // b is empty, remove all children from a.
        while (i < a.length) {
          vNodeRemoveChild(parent, a[i++], owner);
        }
      } else {
        if (a.length === 1 && b.length === 1) {
          // Fast path when a and b have only one child.
          aNode = a[0];
          bNode = b[0];

          if (_canSyncVNodes(aNode, bNode)) {
            _syncVNodes(aNode, bNode, owner, renderFlags);
          } else {
            vNodeReplaceChild(parent, bNode, aNode, owner, renderFlags);
          }
        } else if (a.length === 1) {
          // Fast path when a have 1 child.
          aNode = a[0];
          if ((parent._flags & VNodeFlags.TrackByKeyChildren) === 0) {
            if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
              if ((parent._debugProperties.flags & VNodeDebugFlags.DisabledChildrenShapeError) === 0) {
                printError(
                  "VNode sync children: children shape is changing, you should enable tracking by key with " +
                  "VNode method trackByKeyChildren(children).\n" +
                  "If you certain that children shape changes won't cause any problems with losing " +
                  "state, you can remove parent warning with VNode method disableChildrenShapeError().");
              }
            }
            while (i < b.length) {
              bNode = b[i++];
              if (_canSyncVNodes(aNode, bNode)) {
                _syncVNodes(aNode, bNode, owner, renderFlags);
                synced = true;
                break;
              }
              vNodeInsertChild(parent, bNode, aNode.ref, owner, renderFlags);
            }
          } else {
            while (i < b.length) {
              bNode = b[i++];
              if (aNode._key === bNode._key) {
                if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
                  if (!_canSyncVNodes(aNode, bNode)) {
                    throw new Error("VNode sync children failed: cannot sync two different children with the" +
                                    " same key.");
                  }
                }
                _syncVNodes(aNode, bNode, owner, renderFlags);
                synced = true;
                break;
              }
              vNodeInsertChild(parent, bNode, aNode.ref, owner, renderFlags);
            }
          }
          if (synced) {
            while (i < b.length) {
              vNodeInsertChild(parent, b[i++], null, owner, renderFlags);
            }
          } else {
            vNodeRemoveChild(parent, aNode, owner);
          }
        } else if (b.length === 1) {
          // Fast path when b have 1 child.
          bNode = b[0];
          if ((parent._flags & VNodeFlags.TrackByKeyChildren) === 0) {
            if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
              if ((parent._debugProperties.flags & VNodeDebugFlags.DisabledChildrenShapeError) === 0) {
                printError(
                  "VNode sync children: children shape is changing, you should enable tracking by key with " +
                  "VNode method trackByKeyChildren(children).\n" +
                  "If you certain that children shape changes won't cause any problems with losing " +
                  "state, you can remove parent warning with VNode method disableChildrenShapeError().");
              }
            }
            while (i < a.length) {
              aNode = a[i++];
              if (_canSyncVNodes(aNode, bNode)) {
                _syncVNodes(aNode, bNode, owner, renderFlags);
                synced = true;
                break;
              }
              vNodeRemoveChild(parent, aNode, owner);
            }
          } else {
            while (i < a.length) {
              aNode = a[i++];
              if (aNode._key === bNode._key) {
                if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
                  if (!_canSyncVNodes(aNode, bNode)) {
                    throw new Error("VNode sync children failed: cannot sync two different children with the" +
                                    " same key.");
                  }
                }
                _syncVNodes(aNode, bNode, owner, renderFlags);
                synced = true;
                break;
              }
              vNodeRemoveChild(parent, aNode, owner);
            }
          }

          if (synced) {
            while (i < a.length) {
              vNodeRemoveChild(parent, a[i++], owner);
            }
          } else {
            vNodeInsertChild(parent, bNode, null, owner, renderFlags);
          }
        } else {
          // a and b have more than 1 child.
          if ((parent._flags & VNodeFlags.TrackByKeyChildren) === 0) {
            _syncChildrenNaive(parent, a, b, owner, renderFlags);
          } else {
            _syncChildrenTrackByKeys(parent, a, b, owner, renderFlags);
          }
        }
      }
    } else if (b !== null && b.length > 0) {
      // a is empty, insert all children from b.
      for (i = 0; i < b.length; i++) {
        vNodeInsertChild(parent, b[i], null, owner, renderFlags);
      }
    }
  }
}

/**
 * Sync children naive way.
 *
 * Any heuristics that is used in this algorithm is an undefined behaviour, and external dependencies should not rely on
 * any knowledge about this algorithm, because it can be changed in any time.
 */
function _syncChildrenNaive(parent: VNode, a: VNode[], b: VNode[], owner: Component<any, any>,
    renderFlags: number): void {
  let aStart = 0;
  let bStart = 0;
  let aEnd = a.length - 1;
  let bEnd = b.length - 1;
  let aNode: VNode;
  let bNode: VNode;
  let nextPos: number;
  let next: Node;

  // Sync similar nodes at the beginning.
  while (aStart <= aEnd && bStart <= bEnd) {
    aNode = a[aStart];
    bNode = b[bStart];

    if (!_canSyncVNodes(aNode, bNode)) {
      break;
    }

    aStart++;
    bStart++;

    _syncVNodes(aNode, bNode, owner, renderFlags);
  }

  // Sync similar nodes at the end.
  while (aStart <= aEnd && bStart <= bEnd) {
    aNode = a[aEnd];
    bNode = b[bEnd];

    if (!_canSyncVNodes(aNode, bNode)) {
      break;
    }

    aEnd--;
    bEnd--;

    _syncVNodes(aNode, bNode, owner, renderFlags);
  }

  if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
    if ((aStart <= aEnd || bStart <= bEnd) &&
      ((parent._debugProperties.flags & VNodeDebugFlags.DisabledChildrenShapeError) === 0)) {
      printError(
        "VNode sync children: children shape is changing, you should enable tracking by key with " +
        "VNode method trackByKeyChildren(children).\n" +
        "If you certain that children shape changes won't cause any problems with losing " +
        "state, you can remove parent warning with VNode method disableChildrenShapeError().");
    }
  }

  // Iterate through the remaining nodes and if they have the same type, then sync, otherwise just
  // remove the old node and insert the new one.
  while (aStart <= aEnd && bStart <= bEnd) {
    aNode = a[aStart++];
    bNode = b[bStart++];
    if (_canSyncVNodes(aNode, bNode)) {
      _syncVNodes(aNode, bNode, owner, renderFlags);
    } else {
      vNodeReplaceChild(parent, bNode, aNode, owner, renderFlags);
    }
  }

  if (aStart <= aEnd) {
    // All nodes from a are synced, remove the rest.
    do {
      vNodeRemoveChild(parent, a[aStart++], owner);
    } while (aStart <= aEnd);
  } else if (bStart <= bEnd) {
    // All nodes from b are synced, insert the rest.
    nextPos = bEnd + 1;
    next = nextPos < b.length ? b[nextPos].ref : null;
    do {
      vNodeInsertChild(parent, b[bStart++], next, owner, renderFlags);
    } while (bStart <= bEnd);
  }
}

/**
 * Sync children with track by keys algorithm.
 */
function _syncChildrenTrackByKeys(parent: VNode, a: VNode[], b: VNode[], owner: Component<any, any>,
    renderFlags: number): void {
  let aStart = 0;
  let bStart = 0;
  let aEnd = a.length - 1;
  let bEnd = b.length - 1;
  let aStartNode = a[aStart];
  let bStartNode = b[bStart];
  let aEndNode = a[aEnd];
  let bEndNode = b[bEnd];
  let i: number;
  let j: number;
  let stop = false;
  let nextPos: number;
  let next: Node;
  let aNode: VNode;
  let bNode: VNode;
  let lastTarget = 0;
  let pos: number;
  let node: VNode;

  // Algorithm that works on simple cases with basic list transformations.
  //
  // It tries to reduce the diff problem by simultaneously iterating from the beginning and the end of both
  // lists, if keys are the same, they"re synced, if node is moved from the beginning to the end of the
  // current cursor positions or vice versa it just performs move operation and continues to reduce the diff
  // problem.
  outer: do {
    stop = true;

    // Sync nodes with the same key at the beginning.
    while (aStartNode._key === bStartNode._key) {
      if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
        if (!_canSyncVNodes(aStartNode, bStartNode)) {
          throw new Error("VNode sync children failed: cannot sync two different children with the same key.");
        }
      }
      _syncVNodes(aStartNode, bStartNode, owner, renderFlags);
      aStart++;
      bStart++;
      if (aStart > aEnd || bStart > bEnd) {
        break outer;
      }
      aStartNode = a[aStart];
      bStartNode = b[bStart];
      stop = false;
    }

    // Sync nodes with the same key at the end.
    while (aEndNode._key === bEndNode._key) {
      if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
        if (!_canSyncVNodes(aEndNode, bEndNode)) {
          throw new Error("VNode sync children failed: cannot sync two different children with the same key.");
        }
      }
      _syncVNodes(aEndNode, bEndNode, owner, renderFlags);
      aEnd--;
      bEnd--;
      if (aStart > aEnd || bStart > bEnd) {
        break outer;
      }
      aEndNode = a[aEnd];
      bEndNode = b[bEnd];
      stop = false;
    }

    // Move and sync nodes from left to right.
    while (aStartNode._key === bEndNode._key) {
      if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
        if (!_canSyncVNodes(aStartNode, bEndNode)) {
          throw new Error("VNode sync children failed: cannot sync two different children with the same key.");
        }
      }
      _syncVNodes(aStartNode, bEndNode, owner, renderFlags);
      nextPos = bEnd + 1;
      next = nextPos < b.length ? b[nextPos].ref : null;
      vNodeMoveChild(parent, bEndNode, next, owner);
      aStart++;
      bEnd--;
      if (aStart > aEnd || bStart > bEnd) {
        break outer;
      }
      aStartNode = a[aStart];
      bEndNode = b[bEnd];
      stop = false;
      // In real-world scenarios there is a higher chance that next node after we move
      // parent one will be the same, so we are jumping to the top of parent loop immediately.
      continue outer;
    }

    // Move and sync nodes from right to left
    while (aEndNode._key === bStartNode._key) {
      if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
        if (!_canSyncVNodes(aEndNode, bStartNode)) {
          throw new Error("VNode sync children failed: cannot sync two different children with the same key.");
        }
      }
      _syncVNodes(aEndNode, bStartNode, owner, renderFlags);
      vNodeMoveChild(parent, bStartNode, aStartNode.ref, owner);
      aEnd--;
      bStart++;
      if (aStart > aEnd || bStart > bEnd) {
        break outer;
      }
      aEndNode = a[aEnd];
      bStartNode = b[bStart];
      stop = false;
      continue outer;
    }
  } while (!stop && aStart <= aEnd && bStart <= bEnd);

  if (aStart > aEnd) {
    // All nodes from a are synced, insert the rest from b.
    nextPos = bEnd + 1;
    next = nextPos < b.length ? b[nextPos].ref : null;
    while (bStart <= bEnd) {
      vNodeInsertChild(parent, b[bStart++], next, owner, renderFlags);
    }
  } else if (bStart > bEnd) {
    // All nodes from b are synced, remove the rest from a.
    while (aStart <= aEnd) {
      vNodeRemoveChild(parent, a[aStart++], owner);
    }
  } else {
    // Perform more complex sync algorithm on the remaining nodes.
    //
    // We start by marking all nodes from b as inserted, then we try to find all removed nodes and
    // simultaneously perform syncs on nodes that exists in both lists and replacing "inserted"
    // marks with the position of the node from list b in list a. Then we just need to perform
    // slightly modified LIS algorithm, that ignores "inserted" marks and find common subsequence and
    // move all nodes that doesn"t belong to parent subsequence, or insert if they have "inserted" mark.
    let aLength = aEnd - aStart + 1;
    let bLength = bEnd - bStart + 1;
    const sources = new Array<number>(bLength);

    // Mark all nodes as inserted.
    for (i = 0; i < bLength; i++) {
      sources[i] = -1;
    }

    let moved = false;
    let removeOffset = 0;

    // When lists a and b are small, we are using naive O(M*N) algorithm to find removed children.
    if (aLength * bLength <= 16) {
      for (i = aStart; i <= aEnd; i++) {
        let removed = true;
        aNode = a[i];
        for (j = bStart; j <= bEnd; j++) {
          bNode = b[j];
          if (aNode._key === bNode._key) {
            sources[j - bStart] = i;

            if (lastTarget > j) {
              moved = true;
            } else {
              lastTarget = j;
            }
            if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
              if (!_canSyncVNodes(aNode, bNode)) {
                throw new Error("VNode sync children failed: cannot sync two different children with the same key.");
              }
            }
            _syncVNodes(aNode, bNode, owner, renderFlags);
            removed = false;
            break;
          }
        }
        if (removed) {
          vNodeRemoveChild(parent, aNode, owner);
          removeOffset++;
        }
      }
    } else {
      const keyIndex = new Map<any, number>();

      for (i = bStart; i <= bEnd; i++) {
        node = b[i];
        keyIndex.set(node._key, i);
      }

      for (i = aStart; i <= aEnd; i++) {
        aNode = a[i];
        j = keyIndex.get(aNode._key);

        if (j !== undefined) {
          bNode = b[j];
          sources[j - bStart] = i;
          if (lastTarget > j) {
            moved = true;
          } else {
            lastTarget = j;
          }
          if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
            if (!_canSyncVNodes(aNode, bNode)) {
              throw new Error("VNode sync children failed: cannot sync two different children with the same key.");
            }
          }
          _syncVNodes(aNode, bNode, owner, renderFlags);
        } else {
          vNodeRemoveChild(parent, aNode, owner);
          removeOffset++;
        }
      }
    }

    if (moved) {
      const seq = _lis(sources);
      // All modifications are performed from the right to left, so we can use insertBefore method and use
      // reference to the html element from the next VNode. All Nodes from the right side should always be
      // in the correct state.
      j = seq.length - 1;
      for (i = bLength - 1; i >= 0; i--) {
        if (sources[i] === -1) {
          pos = i + bStart;
          node = b[pos];
          nextPos = pos + 1;
          next = nextPos < b.length ? b[nextPos].ref : null;
          vNodeInsertChild(parent, node, next, owner, renderFlags);
        } else {
          if (j < 0 || i !== seq[j]) {
            pos = i + bStart;
            node = b[pos];
            nextPos = pos + 1;
            next = nextPos < b.length ? b[nextPos].ref : null;
            vNodeMoveChild(parent, node, next, owner);
          } else {
            j--;
          }
        }
      }
    } else if (aLength - removeOffset !== bLength) {
      for (i = bLength - 1; i >= 0; i--) {
        if (sources[i] === -1) {
          pos = i + bStart;
          node = b[pos];
          nextPos = pos + 1;
          next = nextPos < b.length ? b[nextPos].ref : null;
          vNodeInsertChild(parent, node, next, owner, renderFlags);
        }
      }
    }
  }
}

/**
 * Slightly modified Longest Increased Subsequence algorithm, it ignores items that have -1 value.
 * They"re representing new items.
 *
 * This algorithm is used to find minimum number of move operations when updating children with explicit
 * keys.
 *
 * http://en.wikipedia.org/wiki/Longest_increasing_subsequence
 */
function _lis(a: number[]): number[] {
  const p = a.slice(0);
  const result: number[] = [];
  result.push(0);
  let u: number;
  let v: number;

  for (let i = 0, il = a.length; i < il; i++) {
    if (a[i] === -1) {
      continue;
    }

    let j = result[result.length - 1];
    if (a[j] < a[i]) {
      p[i] = j;
      result.push(i);
      continue;
    }

    u = 0;
    v = result.length - 1;

    while (u < v) {
      let c = ((u + v) / 2) | 0;
      if (a[result[c]] < a[i]) {
        u = c + 1;
      } else {
        v = c;
      }
    }

    if (a[i] < a[result[u]]) {
      if (u > 0) {
        p[i] = result[u - 1];
      }
      result[u] = i;
    }
  }

  u = result.length;
  v = result[u - 1];

  while (u-- > 0) {
    result[u] = v;
    v = p[v];
  }

  return result;
}

/**
 * Sync HTML attributes with static shape.
 */
function syncStaticShapeAttrs(node: Element, a: {[key: string]: any}, b: {[key: string]: any}): void {
  if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
    if (a === null || b === null) {
      throw new Error("Failed to update attrs with static shape: attrs object have dynamic shape.");
    }
  }

  let keys = Object.keys(a);
  let key: string;
  let i: number;

  for (i = 0; i < keys.length; i++) {
    key = keys[i];
    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      if (!b.hasOwnProperty(key)) {
        throw new Error("Failed to update attrs with static shape: attrs object have dynamic shape.");
      }
    }
    const bValue = b[key];
    if (a[key] !== bValue) {
      setAttr(node, key, bValue);
    }
  }

  if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
    keys = Object.keys(b);
    for (i = 0; i < keys.length; i++) {
      key = keys[i];
      if (!a.hasOwnProperty(key)) {
        throw new Error("Failed to update attrs with static shape: attrs object have dynamic shape.");
      }
    }
  }
}

/**
 * Sync attributes with dynamic shape.
 */
function syncDynamicShapeAttrs(node: Element, a: {[key: string]: any}, b: {[key: string]: any}): void {
  let i: number;
  let keys: string[];
  let key: string;

  if (a !== null) {
    if (b === null) {
      // b is empty, remove all attributes from a.
      keys = Object.keys(a);
      for (i = 0; i < keys.length; i++) {
        node.removeAttribute(keys[i]);
      }
    } else {
      // Remove and update attributes.
      keys = Object.keys(a);
      for (i = 0; i < keys.length; i++) {
        key = keys[i];
        if (b.hasOwnProperty(key)) {
          const bValue = b[key];
          if (a[key] !== bValue) {
            setAttr(node, key, bValue);
          }
        } else {
          node.removeAttribute(key);
        }
      }

      // Insert new attributes.
      keys = Object.keys(b);
      for (i = 0; i < keys.length; i++) {
        key = keys[i];
        if (!a.hasOwnProperty(key)) {
          setAttr(node, key, b[key]);
        }
      }
    }
  } else if (b !== null) {
    // a is empty, insert all attributes from b.
    keys = Object.keys(b);
    for (i = 0; i < keys.length; i++) {
      key = keys[i];
      setAttr(node, key, b[key]);
    }
  }
}

/**
 * Sync properties with static shape.
 */
function syncStaticShapeProps(node: Element, a: {[key: string]: any}, b: {[key: string]: any}): void {
  if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
    if (a === null || b === null) {
      throw new Error("Failed to update props with static shape: props object have dynamic shape.");
    }
  }

  let keys = Object.keys(a);
  let key: string;
  let i: number;

  for (i = 0; i < keys.length; i++) {
    key = keys[i];
    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      if (!b.hasOwnProperty(key)) {
        throw new Error("Failed to update props with static shape: props object have dynamic shape.");
      }
    }
    const bValue = b[key];
    if (a[key] !== bValue) {
      (node as {[key: string]: any})[key] = bValue;
    }
  }

  if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
    keys = Object.keys(b);
    for (i = 0; i < keys.length; i++) {
      key = keys[i];
      if (!a.hasOwnProperty(key)) {
        throw new Error("Failed to update attrs with static shape: attrs object have dynamic shape.");
      }
    }
  }
}

/**
 * Sync properties with dynamic shape.
 */
function syncDynamicShapeProps(node: Element, a: {[key: string]: any}, b: {[key: string]: any}): void {
  let i: number;
  let keys: string[];
  let key: string;

  if (a !== null) {
    if (b === null) {
      // b is empty, remove all attributes from a.
      keys = Object.keys(a);
      for (i = 0; i < keys.length; i++) {
        (node as {[key: string]: any})[keys[i]] = null;
      }
    } else {
      // Remove and update attributes.
      keys = Object.keys(a);
      for (i = 0; i < keys.length; i++) {
        key = keys[i];
        if (b.hasOwnProperty(key)) {
          const bValue = b[key];
          if (a[key] !== bValue) {
            (node as {[key: string]: any})[key] = bValue;
          }
        } else {
          (node as {[key: string]: any})[key] = null;
        }
      }

      // Insert new attributes.
      keys = Object.keys(b);
      for (i = 0; i < keys.length; i++) {
        key = keys[i];
        if (!a.hasOwnProperty(key)) {
          (node as {[key: string]: any})[key] = b[key];
        }
      }
    }
  } else if (b !== null) {
    // a is empty, insert all attributes from b.
    keys = Object.keys(b);
    for (i = 0; i < keys.length; i++) {
      key = keys[i];
      (node as {[key: string]: any})[key] = b[key];
    }
  }
}

export const reconciler = new Reconciler();
