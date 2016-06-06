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

  sync(a: VNode, b: VNode, renderFlags: number, owner?: Component<any, any>): void {
    _syncVNodes(a, b, this.flags | renderFlags, owner);
  }
}

/**
 * Sync two VNodes
 *
 * When node `a` is synced with node `b`, `a` node should be considered as destroyed, and any access to it after sync
 * is an undefined behavior.
 */
function _syncVNodes(a: VNode, b: VNode, renderFlags: number, owner: Component<any, any> | undefined): void {
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

  b.ref = a.ref;

  if ((flags & VNodeFlags.Text) !== 0) {
    if (a._props !== b._props) {
      a.ref!.nodeValue = b._props as string;
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
        (owner!.descriptor._tag as VModel<any>).update(ref, a._props, b._props);
      }
    }

    if ((a._flags & VNodeFlags.InputElement) === 0) {
      if (a._children !== b._children) {
        _syncChildren(
          a,
          a._children as VNode[] | string,
          b._children as VNode[] | string,
          renderFlags,
          owner);
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

    if (((flags & VNodeFlags.ImmutableProps) === 0) || a._props !== b._props) {
      if ((renderFlags & RenderFlags.ShallowUpdate) === 0) {
        schedulerUpdateComponent(scheduler, component, (flags & VNodeFlags.BindOnce) === 0 ? b._props : undefined);
      }
    }
  }

  vNodeFreeze(b);
}


/**
 * Check if two nodes can be synced.
 *
 * Two nodes can be synced when their flags, tags and keys are identical.
 */
function _canSyncVNodes(a: VNode, b: VNode): boolean {
  return (a._flags === b._flags &&
          a._tag === b._tag &&
          a._key === b._key);
}

/**
 * Sync old children list with the new one.
 */
function _syncChildren(parent: VNode, a: VNode[]|string, b: VNode[]|string, renderFlags: number,
    owner: Component<any, any> | undefined): void {
  let aNode: VNode;
  let bNode: VNode;
  let i = 0;
  let synced = false;

  if (typeof a === "string") {
    if (b === null) {
      parent.ref!.removeChild(parent.ref!.firstChild);
    } else if (typeof b === "string") {
      const c = parent.ref!.firstChild;
      if (c) {
        c.nodeValue = b;
      } else {
        parent.ref!.textContent = b;
      }
    } else {
      parent.ref!.removeChild(parent.ref!.firstChild);
      while (i < b.length) {
        vNodeInsertChild(parent, b[i++], null, renderFlags, owner);
      }
    }
  } else if (typeof b === "string") {
    if (a !== null) {
      while (i < a.length) {
        vNodeRemoveChild(parent, a[i++], owner);
      }
    }
    parent.ref!.textContent = b;
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
            _syncVNodes(aNode, bNode, renderFlags, owner);
          } else {
            vNodeReplaceChild(parent, bNode, aNode, renderFlags, owner);
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
                  "state, you can remove this error message with VNode method disableChildrenShapeError().");
              }
            }
            while (i < b.length) {
              bNode = b[i++];
              if (_canSyncVNodes(aNode, bNode)) {
                _syncVNodes(aNode, bNode, renderFlags, owner);
                synced = true;
                break;
              }
              vNodeInsertChild(parent, bNode, aNode.ref, renderFlags, owner);
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
                _syncVNodes(aNode, bNode, renderFlags, owner);
                synced = true;
                break;
              }
              vNodeInsertChild(parent, bNode, aNode.ref, renderFlags, owner);
            }
          }
          if (synced) {
            while (i < b.length) {
              vNodeInsertChild(parent, b[i++], null, renderFlags, owner);
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
                  "state, you can remove this error message with VNode method disableChildrenShapeError().");
              }
            }
            while (i < a.length) {
              aNode = a[i++];
              if (_canSyncVNodes(aNode, bNode)) {
                _syncVNodes(aNode, bNode, renderFlags, owner);
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
                _syncVNodes(aNode, bNode, renderFlags, owner);
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
            vNodeInsertChild(parent, bNode, null, renderFlags, owner);
          }
        } else {
          // a and b have more than 1 child.
          if ((parent._flags & VNodeFlags.TrackByKeyChildren) === 0) {
            _syncChildrenNaive(parent, a, b, renderFlags, owner);
          } else {
            _syncChildrenTrackByKeys(parent, a, b, renderFlags, owner);
          }
        }
      }
    } else if (b !== null && b.length > 0) {
      // a is empty, insert all children from b.
      for (i = 0; i < b.length; i++) {
        vNodeInsertChild(parent, b[i], null, renderFlags, owner);
      }
    }
  }
}

/**
 * Sync children naive way.
 *
 * Any heuristics that is used in this algorithm is an undefined behaviour, and external dependencies should not rely on
 * any knowledge about this algorithm, because it can be changed in any time.
 *
 * This naive algorithm is quite simple:
 *
 *  A: -> [a a c d e g g] <-
 *  B: -> [a a f d c g] <-
 *
 * It starts by iterating over old children list `A` and new children list `B` from both ends.
 *
 *  A: -> [a b c d e g g] <-
 *  B: -> [a b f d c g] <-
 *
 * When it find nodes that have the same key, tag and flags, it will sync them. Node "a" and "b" on the right side, and
 * node "g" on the right side will be synced.
 *
 *  A: -> [c d e g]
 *  B: -> [f d c]
 *
 * Then it start iterating over old and new children lists from the left side and check if nodes can be synced. Nodes
 * "c" and "f" can't be synced, remove node "c" and insert new node "f".
 *
 *  A: -> [d e g]
 *  B: -> [d c]
 *
 * Node "d" is synced.
 *
 *  A: -> [e g]
 *  B: -> [c]
 *
 * Node "e" removed, node "c" inserted.
 *
 *  A: -> [g]
 *  B:    []
 *
 * Length of the old list is larger than length of the new list, remove remaining nodes from the old list.
 *
 */
function _syncChildrenNaive(parent: VNode, a: VNode[], b: VNode[], renderFlags: number,
    owner: Component<any, any> | undefined): void {
  let aStart = 0;
  let bStart = 0;
  let aEnd = a.length - 1;
  let bEnd = b.length - 1;
  let aNode: VNode;
  let bNode: VNode;
  let nextPos: number;
  let next: Node | null;

  // Sync similar nodes at the beginning.
  while (aStart <= aEnd && bStart <= bEnd) {
    aNode = a[aStart];
    bNode = b[bStart];

    if (!_canSyncVNodes(aNode, bNode)) {
      break;
    }

    aStart++;
    bStart++;

    _syncVNodes(aNode, bNode, renderFlags, owner);
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

    _syncVNodes(aNode, bNode, renderFlags, owner);
  }

  if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
    if ((aStart <= aEnd || bStart <= bEnd) &&
      ((parent._debugProperties.flags & VNodeDebugFlags.DisabledChildrenShapeError) === 0)) {
      printError(
        "VNode sync children: children shape is changing, you should enable tracking by key with " +
        "VNode method trackByKeyChildren(children).\n" +
        "If you certain that children shape changes won't cause any problems with losing " +
        "state, you can remove this error message with VNode method disableChildrenShapeError().");
    }
  }

  // Iterate over the remaining nodes and if they have the same type, then sync, otherwise just
  // remove the old node and insert the new one.
  while (aStart <= aEnd && bStart <= bEnd) {
    aNode = a[aStart++];
    bNode = b[bStart++];
    if (_canSyncVNodes(aNode, bNode)) {
      _syncVNodes(aNode, bNode, renderFlags, owner);
    } else {
      vNodeReplaceChild(parent, bNode, aNode, renderFlags, owner);
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
      vNodeInsertChild(parent, b[bStart++], next, renderFlags, owner);
    } while (bStart <= bEnd);
  }
}

/**
 * Sync children with track by keys algorithm.
 *
 * This algorithm finds a minimum number of DOM operations. It works in several steps:
 *
 * 1. Find common suffix and prefix, and perform simple moves on the edges.
 *
 * This optimization technique is searching for nodes with identical keys by simultaneously iterating over nodes in the
 * old children list `A` and new children list `B` from both sides:
 *
 *  A: -> [a b c d e f g] <-
 *  B: -> [a b f d c g] <-
 *
 * Here we can skip nodes "a" and "b" at the begininng, and node "g" at the end.
 *
 *  A: -> [c d e f] <-
 *  B: -> [f d c] <-
 *
 * At this position it will try to look at the opposite edge, and if there is a node with the same key at the opposite
 * edge, it will perform simple move operation. Node "c" is moved to the right edge, and node "f" is moved to the left
 * edge.
 *
 *  A: -> [d e] <-
 *  B: -> [d] <-
 *
 * Now it will try again to find common prefix and suffix, node "d" is the same, so we can skip it.
 *
 *  A: [e]
 *  B: []
 *
 * Here it will check if the size of one of the list is equal to zero, and if length of the old children list is zero,
 * it will insert all remaining nodes from the new list, or if length of the new children list is zero, it will remove
 * all remaining nodes from the old list.
 *
 * This simple optimization technique will cover most of the real world use cases, even reversing the children list,
 * except for sorting.
 *
 * When algorithm couldn't find a solution with this simple optimization technique, it will go to the next step of the
 * algorithm. For example:
 *
 *  A: -> [a b c d e f g] <-
 *  B: -> [a c b h f e g] <-
 *
 * Nodes "a" and "g" at the edges are the same, skipping them.
 *
 *  A: -> [b c d e f] <-
 *  B: -> [c b h f e] <-
 *
 * Here we are stuck, so we need to switch to the next step.
 *
 * 2. Look for removed and inserted nodes, and simultaneously check if one of the nodes is moved.
 *
 * First we create an array `P` with the length of the new children list and assign to each position value `-1`, it has
 * a meaning of a new node that should be inserted. Later we will assign node positions in the old children list to this
 * array.
 *
 *  A: [b c d e f]
 *  B: [c b h f e]
 *  P: [. . . . .] // . == -1
 *
 * Then we need to build an index `I` that maps keys with node positions of the remaining nodes from the new children
 * list.
 *
 *  A: [b c d e f]
 *  B: [c b h f e]
 *  P: [. . . . .] // . == -1
 *  I: {
 *    c: 0,
 *    b: 1,
 *    h: 2,
 *    f: 3,
 *    e: 4,
 *  }
 *  last = 0
 *
 * With this index, we start to iterate over the remaining nodes from the old children list and check if we can find a
 * node with the same key in the index. If we can't find any node, it means that it should be removed, otherwise we
 * assign position of the node in the old children list to the positions array.
 *
 *  A: [b c d e f]
 *      ^
 *  B: [c b h f e]
 *  P: [. 0 . . .] // . == -1
 *  I: {
 *    c: 0,
 *    b: 1, <-
 *    h: 2,
 *    f: 3,
 *    e: 4,
 *  }
 *  last = 1
 *
 * When we assigning positions to the positions array, we also keep a position of the last seen node in the new children
 * list, if the last seen position is larger than current position of the node at the new list, then we are switching
 * `moved` flag to `true`.
 *
 *  A: [b c d e f]
 *        ^
 *  B: [c b h f e]
 *  P: [1 0 . . .] // . == -1
 *  I: {
 *    c: 0, <-
 *    b: 1,
 *    h: 2,
 *    f: 3,
 *    e: 4,
 *  }
 *  last = 1 // last > 0; moved = true
 *
 * The last position `1` is larger than current position of the node at the new list `0`, switching `moved` flag to
 * `true`.
 *
 *  A: [b c d e f]
 *          ^
 *  B: [c b h f e]
 *  P: [1 0 . . .] // . == -1
 *  I: {
 *    c: 0,
 *    b: 1,
 *    h: 2,
 *    f: 3,
 *    e: 4,
 *  }
 *  moved = true
 *
 * Node with key "d" doesn't exist in the index, removing node.
 *
 *  A: [b c d e f]
 *            ^
 *  B: [c b h f e]
 *  P: [1 0 . . 3] // . == -1
 *  I: {
 *    c: 0,
 *    b: 1,
 *    h: 2,
 *    f: 3,
 *    e: 4, <-
 *  }
 *  moved = true
 *
 * Assign position for `e`.
 *
 *  A: [b c d e f]
 *              ^
 *  B: [c b h f e]
 *  P: [1 0 . 4 3] // . == -1
 *  I: {
 *    c: 0,
 *    b: 1,
 *    h: 2,
 *    f: 3, <-
 *    e: 4,
 *  }
 *  moved = true
 *
 * Assign position for 'f'.
 *
 * At this point we are checking if `moved` flag is on, or if the length of the old children list minus the number of
 * removed nodes isn't equal to the length of the new children list. If any of this conditions is true, then we are
 * going to the next step.
 *
 * 3. Find minimum number of moves if `moved` flag is on, or insert new nodes if the length is changed.
 *
 * When `moved` flag is on, we need to find the
 * [longest increasing subsequence](http://en.wikipedia.org/wiki/Longest_increasing_subsequence) in the positions array,
 * and move all nodes that doesn't belong to this subsequence.
 *
 *  A: [b c d e f]
 *  B: [c b h f e]
 *  P: [1 0 . 4 3] // . == -1
 *  LIS:     [1 4]
 *  moved = true
 *
 * Now we just need to simultaneously iterate over the new children list and LIS from the end and check if the current
 * position is equal to a value from LIS.
 *
 *  A: [b c d e f]
 *  B: [c b h f e]
 *              ^  // new_pos == 4
 *  P: [1 0 . 4 3] // . == -1
 *  LIS:     [1 4]
 *              ^  // new_pos == 4
 *  moved = true
 *
 * Node "e" stays at the same place.
 *
 *  A: [b c d e f]
 *  B: [c b h f e]
 *            ^    // new_pos == 3
 *  P: [1 0 . 4 3] // . == -1
 *  LIS:     [1 4]
 *            ^    // new_pos != 1
 *  moved = true
 *
 * Node "f" is moved, move it before the next node "e".
 *
 *  A: [b c d e f]
 *  B: [c b h f e]
 *          ^      // new_pos == 2
 *  P: [1 0 . 4 3] // . == -1
 *          ^      // old_pos == -1
 *  LIS:     [1 4]
 *            ^
 *  moved = true
 *
 * Node "h" has a `-1` value in the positions array, insert new node "h".
 *
 *  A: [b c d e f]
 *  B: [c b h f e]
 *        ^        // new_pos == 1
 *  P: [1 0 . 4 3] // . == -1
 *  LIS:     [1 4]
 *            ^    // new_pos == 1
 *  moved = true
 *
 * Node "b" stays at the same place.
 *
 *  A: [b c d e f]
 *  B: [c b h f e]
 *      ^          // new_pos == 0
 *  P: [1 0 . 4 3] // . == -1
 *  LIS:     [1 4]
 *          ^      // new_pos != undefined
 *  moved = true
 *
 * Node "c" is moved, move it before the next node "b".
 *
 * When moved flag is off, we don't need to find LIS, and we just iterate over the new children list and check its
 * current position in the positions array, if it is `-1`, then we insert new node.
 *
 * That is how children reconciliation algorithm is working in one of the fastest virtual dom libraries :)
 */
function _syncChildrenTrackByKeys(parent: VNode, a: VNode[], b: VNode[], renderFlags: number,
    owner: Component<any, any> | undefined): void {
  let aStart = 0;
  let bStart = 0;
  let aEnd = a.length - 1;
  let bEnd = b.length - 1;
  let aStartNode = a[aStart];
  let bStartNode = b[bStart];
  let aEndNode = a[aEnd];
  let bEndNode = b[bEnd];
  let i: number;
  let j: number | undefined;
  let k: number | undefined;
  let stop = false;
  let nextPos: number;
  let next: Node | null;
  let aNode: VNode;
  let bNode: VNode;
  let lastTarget = 0;
  let pos: number;
  let node: VNode;
  let removed: boolean;

  // Step 1
  outer: do {
    stop = true;

    // Sync nodes with the same key at the beginning.
    while (aStartNode._key === bStartNode._key) {
      if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
        if (!_canSyncVNodes(aStartNode, bStartNode)) {
          throw new Error("VNode sync children failed: cannot sync two different children with the same key.");
        }
      }
      _syncVNodes(aStartNode, bStartNode, renderFlags, owner);
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
      _syncVNodes(aEndNode, bEndNode, renderFlags, owner);
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
      _syncVNodes(aStartNode, bEndNode, renderFlags, owner);
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
      // In a real-world scenarios there is a higher chance that next node after the move will be the same, so we
      // immediately jump to the start of this prefix/suffix algo.
      continue outer;
    }

    // Move and sync nodes from right to left.
    while (aEndNode._key === bStartNode._key) {
      if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
        if (!_canSyncVNodes(aEndNode, bStartNode)) {
          throw new Error("VNode sync children failed: cannot sync two different children with the same key.");
        }
      }
      _syncVNodes(aEndNode, bStartNode, renderFlags, owner);
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
      vNodeInsertChild(parent, b[bStart++], next, renderFlags, owner);
    }
  } else if (bStart > bEnd) {
    // All nodes from b are synced, remove the rest from a.
    while (aStart <= aEnd) {
      vNodeRemoveChild(parent, a[aStart++], owner);
    }
  // Step 2
  } else {
    let aLength = aEnd - aStart + 1;
    let bLength = bEnd - bStart + 1;
    const sources = new Array<number>(bLength);

    // Mark all nodes as inserted.
    for (i = 0; i < bLength; i++) {
      sources[i] = -1;
    }

    let moved = false;
    let removeOffset = 0;

    // When children lists are small, we are using naive O(N) algorithm to find if child is removed.
    if ((bLength <= 4) || ((aLength * bLength) <= 16)) {
      k = 0; // visited
      for (i = aStart; i <= aEnd; i++) {
        removed = true;
        aNode = a[i];
        if (k < bLength) {
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
              _syncVNodes(aNode, bNode, renderFlags, owner);
              k++;
              removed = false;
              break;
            }
          }
        }
        if (removed) {
          vNodeRemoveChild(parent, aNode, owner);
          removeOffset++;
        }
      }
    } else {
      const keyIndex = new Map<any, number>();
      k = 0; // visited

      for (i = bStart; i <= bEnd; i++) {
        node = b[i];
        keyIndex.set(node._key, i);
      }

      for (i = aStart; i <= aEnd; i++) {
        removed = true;
        aNode = a[i];

        if (k < bLength) {
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
            _syncVNodes(aNode, bNode, renderFlags, owner);
            k++;
            removed = false;
          }
        }
        if (removed) {
          vNodeRemoveChild(parent, aNode, owner);
          removeOffset++;
        }
      }
    }

    // Step 3
    if (moved) {
      const seq = _lis(sources);
      j = seq.length - 1;
      for (i = bLength - 1; i >= 0; i--) {
        if (sources[i] === -1) {
          pos = i + bStart;
          node = b[pos];
          nextPos = pos + 1;
          next = nextPos < b.length ? b[nextPos].ref : null;
          vNodeInsertChild(parent, node, next, renderFlags, owner);
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
          vNodeInsertChild(parent, node, next, renderFlags, owner);
        }
      }
    }
  }
}

/**
 * Slightly modified Longest Increased Subsequence algorithm, it ignores items that have -1 value, they're representing
 * new items.
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
function syncStaticShapeAttrs(node: Element, a: {[key: string]: any} | null, b: {[key: string]: any} | null): void {
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
      if (!b!.hasOwnProperty(key)) {
        throw new Error("Failed to update attrs with static shape: attrs object have dynamic shape.");
      }
    }
    const bValue = b![key];
    if (a![key] !== bValue) {
      setAttr(node, key, bValue);
    }
  }

  if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
    keys = Object.keys(b);
    for (i = 0; i < keys.length; i++) {
      key = keys[i];
      if (!a!.hasOwnProperty(key)) {
        throw new Error("Failed to update attrs with static shape: attrs object have dynamic shape.");
      }
    }
  }
}

/**
 * Sync attributes with dynamic shape.
 */
function syncDynamicShapeAttrs(node: Element, a: {[key: string]: any} | null, b: {[key: string]: any} | null): void {
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
