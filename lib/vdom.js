'use strict';

var Scheduler = require('./scheduler');
var ENV = require('./env');

/** Flag indicating that [VNode] is [Text]. */
var V_TEXT = 1;
/** Flag indicating that [VNode] is [Element]. */
var V_ELEMENT = 2;
/** Flag indicating that [VNode] is [Component]. */
var V_COMPONENT = 4;
/** Flag indicating that [VNode] is root element of the [Component]. */
var V_ROOT = 8;
/** Flag indicating that [VNode] represents node that is in svg namespace. */
var V_SVG = 16;

/**
 * Virtual DOM Node.
 *
 * @param flags Flags.
 * @param key Key that should be unique among its siblings. If the key is
 *   `null`, it means that the key is implicit. When [key] is implicit, all
 *   siblings should also have implicit keys, otherwise it will result in
 *   undefined behaviour in "production" mode, or runtime error in
 *   "development" mode.
 * @param tag Tag should contain tag name if [VNode] represents an element, or
 *   reference to the [componentConstructor] if it represents a
 *   [Component].
 * @param data Data that should be passed to [Component]s. Data is transferred
 *   to the [Component] using `set data(P data)` setter. When [VNode]
 *   represents an element, [data] is used as a cache for className string
 *   that was built from [type] and [classes] properties.
 * @constructor
 */
function VNode(flags, key, tag, data) {
  this.flags = flags;
  this.key = key;
  this.tag = tag;
  this.data = data;

  /**
   * Immutable class name
   * @type {string}
   */
  this.type = null;
  /**
   * Attributes
   * @type {Object<string,string>}
   */
  this.attrs = null;
  /**
   * Style
   * @type {Object<string,string>}
   */
  this.style = null;
  /**
   * Classes
   * @type {Array<string>}
   */
  this.classes = null;
  /**
   * List of children nodes. When [VNode] represents a [Component], children
   * nodes are transferred to the [Component] with
   * `Component.updateChildren(c)` method.
   * @type {Array<VNode>}
   */
  this.children = null;
  /**
   * Reference to the [Node]. It will be available after [VNode] is
   * [vNodeCreate]d or [vNodeUpdate]d. Each time [VNode] is updated, reference to the
   * [Node] is passed from the previous node to the new one.
   * @type {Node}
   */
  this.ref = null;
  /**
   * Reference to the [Component]. It will be available after [VNode] is
   * [vNodeCreate]d or [vNodeUpdate]d. Each time [VNode] is updated, reference to the
   * [Component] is passed from the previous node to the new one.
   * @type {Component}
   */
  this.cref = null;
}

VNode.TEXT = V_TEXT;
VNode.ELEMENT = V_ELEMENT;
VNode.COMPONENT = V_COMPONENT;
VNode.ROOT = V_ROOT;
VNode.SVG = V_SVG;

function text(content) {
  return new VNode(V_TEXT, null, null, content);
}

function $text(key, content) {
  return new VNode(V_TEXT, key, null, content);
}

function element(tag) {
  return new VNode(V_ELEMENT, null, tag, null);
}

function $element(key, tag) {
  return new VNode(V_ELEMENT, key, tag, null);
}

function svg(tag) {
  return new VNode(V_ELEMENT | V_SVG, null, tag, null);
}

function $svg(key, tag) {
  return new VNode(V_ELEMENT | V_SVG, key, tag, null);
}

function component(descriptor, data) {
  if (data === void 0) data = null;
  return new VNode(V_COMPONENT, null, descriptor, data);
}

function $component(key, descriptor, data) {
  if (data === void 0) data = null;
  return new VNode(V_COMPONENT, key, descriptor, data);
}

function root() {
  return new VNode(V_ROOT, null, null, null);
}

/**
 * Checks if two VNodes have the same type and they can be updated.
 *
 * @param {VNode} a
 * @param {VNode} b
 * @return {boolean}
 */
function vNodeSameType(a, b) {
  return (a.flags === b.flags && a.tag === b.tag);
}

/**
 * Create root level element of the [VNode] object, or [Component] for
 * component nodes.
 *
 * @param {VNode} node
 * @param {Component} context
 */
function vNodeCreate(node, context) {
  var flags = node.flags;

  if ((flags & V_TEXT) !== 0) {
    node.ref = document.createTextNode(node.data);
  } else if ((flags & V_ELEMENT) !== 0) {
    if ((flags & V_SVG) === 0) {
      node.ref = document.createElement(node.tag);
    } else {
      node.ref = document.createElementNS('http://www.w3.org/2000/svg', node.tag);
    }
  } else if ((flags & V_COMPONENT) !== 0) {
    var component = new node.tag(context, node.data, node.children);
    component.create();
    component.init();
    node.ref = component.element;
    node.cref = component;
  }
}

/**
 * Render internal representation of the VNode.
 *
 * @param {VNode} node
 * @param {Component} context
 */
function vNodeRender(node, context) {
  var i, il;
  var key;
  var keys;
  var flags = node.flags;
  var ref;
  var style;
  var className;
  var classList;

  if ((flags & (V_ELEMENT | V_COMPONENT | V_ROOT)) !== 0) {
    ref = node.ref;
    if (node.attrs != null) {
      keys = Object.keys(node.attrs);
      for (i = 0, il = keys.length; i < il; i++) {
        key = keys[i];
        ref.setAttribute(key, node.attrs[key]);
      }
    }

    if (node.style != null) {
      style = ref.style;
      keys = Object.keys(node.style);
      for (i = 0, il = keys.length; i < il; i++) {
        key = keys[i];
        style.setProperty(key, node.style[key]);
      }
    }

    if ((flags & (V_ELEMENT | V_COMPONENT)) !== 0) {
      className = null;
      if (node.type != null) {
        className = node.type;
      }
      if (node.classes != null) {
        var classes = node.classes.join(' ');
        className = (className == null) ? classes : className + ' ' + classes;
      }
      if (className != null) {
        node.data = className;
        ref.className = className;
      }
    } else {
      classList = null;
      if (node.type != null) {
        classList = ref.classList;
        classList.add(node.type);
      }

      if (node.classes != null) {
        if (classList == null) {
          classList = ref.classList;
        }

        for (i = 0, il = node.classes.length; i < il; i++) {
          classList.add(node.classes[i]);
        }
      }
    }

    if ((flags & V_COMPONENT) !== 0) {
      node.cref.update();
    } else if (node.children != null) {
      for (i = 0, il = node.children.length; i < il; i++) {
        vNodeInsertChild(node, node.children[i], null, context);
      }
    }
  }
}

/**
 * Update VNode. When VNode a is updated with VNode b, VNode a should
 * be considered as destroyed, and any access to it is an undefined
 * behaviour.
 *
 * @param {!VNode} a Old VNode
 * @param {!VNode} b New VNode
 * @param {Context} context
 */
function vNodeUpdate(a, b, context) {
  var ref = a.ref;
  var flags = a.flags;
  var classes;
  var className;
  var component;

  b.ref = ref;

  if ((flags & V_TEXT) !== 0) {
    if (a.data != b.data) {
      a.ref.nodeValue = b.data;
    }
  } else if ((flags & (V_ELEMENT | V_COMPONENT | V_ROOT)) !== 0) {
    if (a.attrs !== b.attrs) {
      updateAttrs(a.attrs, b.attrs, ref);
    }
    if (a.style !== b.style) {
      updateStyle(a.style, b.style, ref.style);
    }

    if ((flags & V_ELEMENT) !== 0) {
      if (a.classes !== b.classes) {
        if (b.data == null) {
          className = b.type;
          if (b.classes != null) {
            classes = b.classes.join(' ');
            className = (className == null) ? classes : className + ' ' + classes;
          }
          b.data = className;
        }
        if (a.data !== b.data) {
          if (b.data == null) {
            ref.className = '';
          } else {
            ref.className = className;
          }
        }
      } else {
        b.data = a.data;
      }
    } else if (a.classes !== b.classes) {
      updateClasses(a.classes, b.classes, ref.classList);
    }

    if ((flags & V_COMPONENT) !== 0) {
      component = b.cref = a.cref;
      component.updateData(b.data);
      component.updateChildren(b.children);
      component.update();
    } else {
      updateChildren(a, a.children, b.children, context);
    }
  }
}

/**
 * Update HTMLElement attributes.
 *
 * @param a Old attributes.
 * @param b New attributes.
 * @param node
 */
function updateAttrs(a, b, node) {
  var i, il;
  var key;
  var keys;
  var aValue;
  var bValue;

  if (a != null) {
    if (b == null) {
      // b is empty, remove all attributes from a.
      keys = Object.keys(a);
      for (i = 0, il = keys.length; i < il; i++) {
        node.removeAttribute(keys[i]);
      }
    } else {
      // Remove and vNodeUpdate attributes.
      keys = Object.keys(a);
      for (i = 0, il = keys.length; i < il; i++) {
        key = keys[i];
        if (b.hasOwnProperty(key)) {
          aValue = a[key];
          bValue = b[key];
          if (aValue !== bValue) {
            node.setAttribute(key, bValue);
          }
        } else {
          node.removeAttribute(key);
        }
      }

      // Insert new attributes.
      keys = Object.keys(b);
      for (i = 0, il = keys.length; i < il; i++) {
        key = keys[i];
        if (!a.hasOwnProperty(key)) {
          node.setAttribute(key, b[key]);
        }
      }
    }
  } else if (b != null) {
    // a is empty, insert all attributes from b.
    keys = Object.keys(b);
    for (i = 0, il = keys.length; i < il; i++) {
      key = keys[i];
      node.setAttribute(key, b[key]);
    }
  }
}

/**
 * Update HTMLElement styles.
 *
 * @param {Object.<string,string>} a Old style.
 * @param {Object.<string,string>} b New style.
 * @param {CSSStyleDeclaration} style
 */
function updateStyle(a, b, style) {
  var i, il;
  var key;
  var keys;

  if (a != null) {
    if (b == null) {
      // b is empty, remove all styles from a.
      keys = Object.keys(a);
      for (i = 0, il = keys.length; i < il; i++) {
        style.removeProperty(keys[i]);
      }
    } else {
      // Remove and vNodeUpdate styles.
      keys = Object.keys(a);
      for (i = 0, il = keys.length; i < il; i++) {
        key = keys[i];
        if (b.hasOwnProperty(key)) {
          style.setProperty(key, b[key], '');
        } else {
          style.removeProperty(key);
        }
      }

      // Insert new styles.
      keys = Object.keys(b);
      for (i = 0, il = keys.length; i < il; i++) {
        key = keys[i];
        if (!a.hasOwnProperty(key)) {
          style.setProperty(key, b[key], '');
        }
      }
    }
  } else if (b != null) {
    // a is empty, insert all styles from b.
    keys = Object.keys(b);
    for (i = 0, il = keys.length; i < il; i++) {
      key = keys[i];
      style.setProperty(key, b[key], '');
    }
  }
}

/**
 * Update HTMLElement classes.
 *
 * @param {Array.<string>} a Old classes.
 * @param {Array.<string>} b New classes.
 * @param {DOMTokenList} classList
 */
function updateClasses(a, b, classList) {
  var i;
  var aCls, bCls;
  var unchangedPosition;

  if (a != null && a.length !== 0) {
    if (b == null || b.length === 0) {
      // b is empty, remove all classes from a.
      for (i = 0; i < a.length; i++) {
        classList.remove(a[i]);
      }
    } else {
      if (a.length === 1 && b.length === 1) {
        // Fast path when a and b have only one class.
        aCls = a[0];
        bCls = b[0];

        if (aCls !== bCls) {
          classList.remove(aCls);
          classList.add(bCls);
        }
      } else if (a.length === 1) {
        // Fast path when a have 1 class.
        aCls = a[0];
        unchangedPosition = -1;
        for (i = 0; i < b.length; i++) {
          bCls = b[i];
          if (aCls === bCls) {
            unchangedPosition = i;
            break;
          } else {
            classList.add(bCls);
          }
        }
        if (unchangedPosition !== -1) {
          for (i = unchangedPosition + 1; i < b.length; i++) {
            classList.add(b[i]);
          }
        } else {
          classList.remove(aCls);
        }
      } else if (b.length === 1) {
        // Fast path when b have 1 class.
        bCls = b[0];
        unchangedPosition = -1;
        for (i = 0; i < a.length; i++) {
          aCls = a[i];
          if (aCls === bCls) {
            unchangedPosition = i;
            break;
          } else {
            classList.remove(aCls);
          }
        }
        if (unchangedPosition !== -1) {
          for (i = unchangedPosition + 1; i < a.length; i++) {
            classList.remove(a[i]);
          }
        } else {
          classList.add(bCls);
        }
      } else {
        // a and b have more than 1 class.
        var aStart = 0;
        var bStart = 0;
        var aEnd = a.length - 1;
        var bEnd = b.length - 1;
        var removed = false;
        var j;

        while (aStart <= aEnd && bStart <= bEnd) {
          if (a[aStart] !== b[bStart]) {
            break;
          }

          aStart++;
          bStart++;
        }

        while (aStart <= aEnd && bStart <= bEnd) {
          if (a[aEnd] !== b[bEnd]) {
            break;
          }

          aEnd--;
          bEnd--;
        }

        var visited = new Array(bEnd - bStart + 1);

        for (i = aStart; i <= aEnd; i++) {
          aCls = a[i];
          removed = true;

          for (j = bStart; j <= bEnd; j++) {
            bCls = b[j];

            if (aCls == bCls) {
              removed = false;
              visited[j - bStart] = true;
              break;
            }
          }

          if (removed) {
            classList.remove(aCls);
          }
        }

        for (i = bStart; i <= bEnd; i++) {
          if (!visited[i - bStart]) {
            classList.add(b[i]);
          }
        }
      }
    }
  } else if (b != null && b.length > 0) {
    // a is empty, insert all classes from b.
    for (i = 0; i < b.length; i++) {
      classList.add(b[i]);
    }
  }
}

/**
 * Insert VNode.
 *
 * @param {VNode} parent Parent node.
 * @param {VNode} node Node to insert.
 * @param {Node} nextRef Reference to the next html element.
 * @param {Component} context Current context.
 */
function vNodeInsertChild(parent, node, nextRef, context) {
  vNodeCreate(node, context);
  parent.ref.insertBefore(node.ref, nextRef);
  if ((context.flags & C_ATTACHED) !== 0) {
    vNodeAttached(node);
  }
  vNodeRender(node, context);
}

/**
 * Move VNode.
 *
 * @param {VNode} parent Parent node.
 * @param {VNode} node Node to move.
 * @param {Node} nextRef Reference to the next html element.
 */
function vNodeMoveChild(parent, node, nextRef) {
  parent.ref.insertBefore(node.ref, nextRef);
}

/**
 * Remove VNode.
 *
 * @param {VNode} parent Parent node.
 * @param {VNode} node Node to remove.
 */
function vNodeRemoveChild(parent, node) {
  parent.ref.removeChild(node.ref);
  vNodeDispose(node);
}

function vNodeDispose(node) {
  if ((node.flags & V_COMPONENT) !== 0) {
    node.cref.dispose();
  } else if (node.children != null) {
    for (var i = 0; i < node.children.length; i++) {
      vNodeDispose(node.children[i]);
    }
  }
}

function vNodeAttach(node) {
  vNodeAttached(node);
  if (((node.flags & V_COMPONENT) === 0) && (node.children != null)) {
    for (var i = 0; i < node.children.length; i++) {
      vNodeAttach(node.children[i]);
    }
  }
}

function vNodeDetach(node) {
  if (((node.flags & V_COMPONENT) === 0) && (node.children != null)) {
    for (var i = 0; i < node.children.length; i++) {
      vNodeAttach(node.children[i]);
    }
  }
  vNodeDetached(node);
}

function vNodeAttached(node) {
  if ((node.flags & V_COMPONENT) !== 0) {
    node.cref.attach();
  }
}

function vNodeDetached(node) {
  if ((node.flags & V_COMPONENT) !== 0) {
    node.cref.detach();
  }
}

/**
 * Update children [a] and [b] in the [parent].
 *
 * If one of the children has [:null:] key, it will run vNodeUpdate
 * algorithm for children with implicit keys, otherwise it will run
 * vNodeUpdate algorithm for children with explicit keys.
 *
 * Mixing children with explicit and implicit keys in one children
 * list will result in undefined behaviour. In development mode it
 * will be checked for this conditions and if it is detected that
 * there are children with implicit and explicit keys, it will result
 * in runtime error.
 *
 * @param {VNode} parent Parent.
 * @param {Array.<VNode>} a Old children list.
 * @param {Array.<VNode>} b New children list.
 * @param {Context} context Current context.
 */
function updateChildren(parent, a, b, context) {
  var aNode;
  var bNode;
  var i = 0;
  var updated = false;

  if (a != null && a.length !== 0) {
    if (b == null || b.length === 0) {
      // b is empty, remove all children from a.
      while(i < a.length) {
        vNodeRemoveChild(parent, a[i++]);
      }
    } else {
      if (a.length === 1 && b.length === 1) {
        // Fast path when a and b have only one child.
        aNode = a[0];
        bNode = b[0];

        // Implicit key with same type or explicit key with same key.
        if ((aNode.key == null && vNodeSameType(aNode, bNode)) ||
            (aNode.key != null && aNode.key === bNode.key)) {
          vNodeUpdate(aNode, bNode, context);
        } else {
          vNodeRemoveChild(parent, aNode);
          vNodeInsertChild(parent, bNode, null, context);
        }
      } else if (a.length === 1) {
        // Fast path when a have 1 child.
        aNode = a[0];
        if (aNode.key == null) {
          while (i < b.length) {
            bNode = b[i++];
            if (vNodeSameType(aNode, bNode)) {
              vNodeUpdate(aNode, bNode, context);
              updated = true;
              break;
            }
            vNodeInsertChild(parent, bNode, aNode.ref, context);
          }
        } else {
          while (i < b.length) {
            bNode = b[i++];
            if (aNode.key === bNode.key) {
              vNodeUpdate(aNode, bNode, context);
              updated = true;
              break;
            }
            vNodeInsertChild(parent, bNode, aNode.ref, context);
          }
        }
        if (updated) {
          while (i < b.length) {
            vNodeInsertChild(parent, b[i++], null, context);
          }
        } else {
          vNodeRemoveChild(parent, aNode);
        }
      } else if (b.length === 1) {
        // Fast path when b have 1 child.
        bNode = b[0];
        if (bNode.key == null) {
          while (i < a.length) {
            aNode = a[i++];
            if (vNodeSameType(aNode, bNode)) {
              vNodeUpdate(aNode, bNode, context);
              updated = true;
              break;
            }
            vNodeRemoveChild(parent, aNode);
          }
        } else {
          while (i < a.length) {
            aNode = a[i++];
            if (aNode.key === bNode.key) {
              vNodeUpdate(aNode, bNode, context);
              updated = true;
              break;
            }
            vNodeRemoveChild(parent, aNode);
          }
        }

        if (updated) {
          while (i < a.length) {
            vNodeRemoveChild(parent, a[i++]);
          }
        } else {
          vNodeInsertChild(parent, bNode, null, context);
        }
      } else {
        // a and b have more than 1 child.
        if (a[0].key == null) {
          updateImplicitChildren(parent, a, b, context);
        } else {
          updateExplicitChildren(parent, a, b, context);
        }
      }
    }
  } else if (b != null && b.length > 0) {
    // a is empty, insert all children from b
    for (i = 0; i < b.length; i++) {
      vNodeInsertChild(parent, b[i], null, context);
    }
  }
}

/**
 * Update children with implicit keys [a] and [b] in the [parent].
 *
 * Any heuristics that is used in this algorithm is an undefined
 * behaviour, and external dependencies should not relay on the
 * knowledge about this algorithm, because it can be changed in any
 * time.
 *
 * @param {VNode} parent Parent.
 * @param {Array.<VNode>} a Old children list.
 * @param {Array.<VNode>} b New children list.
 * @param {Context} context Current context.
 */
function updateImplicitChildren(parent, a, b, context) {
  var aStart = 0;
  var bStart = 0;
  var aEnd = a.length - 1;
  var bEnd = b.length - 1;
  var aNode;
  var bNode;
  var nextPos;
  var next;

  // Update nodes with the same type at the beginning.
  while (aStart <= aEnd && bStart <= bEnd) {
    aNode = a[aStart];
    bNode = b[bStart];

    if (!vNodeSameType(aNode, bNode)) {
      break;
    }

    aStart++;
    bStart++;

    vNodeUpdate(aNode, bNode, context);
  }

  // Update nodes with the same type at the end.
  while (aStart <= aEnd && bStart <= bEnd) {
    aNode = a[aEnd];
    bNode = b[bEnd];

    if (!vNodeSameType(aNode, bNode)) {
      break;
    }

    aEnd--;
    bEnd--;

    vNodeUpdate(aNode, bNode, context);
  }

  // Iterate through the remaining nodes and if they have the same
  // type, then vNodeUpdate, otherwise just remove the old node and insert
  // the new one.
  while (aStart <= aEnd && bStart <= bEnd) {
    aNode = a[aStart++];
    bNode = b[bStart++];
    if (vNodeSameType(aNode, bNode)) {
      vNodeUpdate(aNode, bNode, context);
    } else {
      vNodeInsertChild(parent, bNode, aNode.ref, context);
      vNodeRemoveChild(parent, aNode);
    }
  }

  // All nodes from a are updated, insert the rest from b.
  while (aStart <= aEnd) {
    vNodeRemoveChild(parent, a[aStart++]);
  }

  nextPos = bEnd + 1;
  next = nextPos < b.length ? b[nextPos].ref : null;

  // All nodes from b are updated, remove the rest from a.
  while (bStart <= bEnd) {
    vNodeInsertChild(parent, b[bStart++], next, context);
  }
}

/**
 * Update children with explicit keys [a] and [b] in the [parent].
 *
 * @param {VNode} parent Parent.
 * @param {Array.<VNode>} a Old children list.
 * @param {Array.<VNode>} b New children list.
 * @param {Context} context Current context.
 */
function updateExplicitChildren(parent, a, b, context) {
  var aStart = 0;
  var bStart = 0;
  var aEnd = a.length - 1;
  var bEnd = b.length - 1;
  var aStartNode = a[aStart];
  var bStartNode = b[bStart];
  var aEndNode = a[aEnd];
  var bEndNode = b[bEnd];
  var i;
  var j;
  var stop = false;
  var nextPos;
  var next;
  var aNode;
  var bNode;
  var lastTarget = 0;
  var pos;
  var node;

  // Algorithm that works on simple cases with basic list
  // transformations.
  //
  // It tries to reduce the diff problem by simultaneously iterating
  // from the beginning and the end of both lists, if keys are the
  // same, they're updated, if node is moved from the beginning to the
  // end of the current cursor positions or vice versa it just
  // performs move operation and continues to reduce the diff problem.
  outer: do {
    stop = true;

    // Update nodes with the same key at the beginning.
    while (aStartNode.key === bStartNode.key) {
      vNodeUpdate(aStartNode, bStartNode, context);
      aStart++;
      bStart++;
      if (aStart > aEnd || bStart > bEnd) {
        break outer;
      }
      aStartNode = a[aStart];
      bStartNode = b[bStart];
      stop = false;
    }

    // Update nodes with the same key at the end.
    while (aEndNode.key === bEndNode.key) {
      vNodeUpdate(aEndNode, bEndNode, context);
      aEnd--;
      bEnd--;
      if (aStart > aEnd || bStart > bEnd) {
        break outer;
      }
      aEndNode = a[aEnd];
      bEndNode = b[bEnd];
      stop = false;
    }

    // Move nodes from left to right.
    while (aStartNode.key === bEndNode.key) {
      vNodeUpdate(aStartNode, bEndNode, context);
      nextPos = bEnd + 1;
      next = nextPos < b.length ? b[nextPos].ref : null;
      vNodeMoveChild(parent, bEndNode, next);
      aStart++;
      bEnd--;
      if (aStart > aEnd || bStart > bEnd) {
        break outer;
      }
      aStartNode = a[aStart];
      bEndNode = b[bEnd];
      stop = false;
      continue outer;
    }

    // Move nodes from right to left.
    while (aEndNode.key === bStartNode.key) {
      vNodeUpdate(aEndNode, bStartNode, context);
      vNodeMoveChild(parent, bStartNode, aStartNode.ref);
      aEnd--;
      bStart++;
      if (aStart > aEnd || bStart > bEnd) {
        break outer;
      }
      aEndNode = a[aEnd];
      bStartNode = b[bStart];
      stop = false;
    }
  } while (!stop && aStart <= aEnd && bStart <= bEnd);

  if (aStart > aEnd) {
    // All nodes from a are updated, insert the rest from b.
    nextPos = bEnd + 1;
    next = nextPos < b.length ? b[nextPos].ref : null;
    while (bStart <= bEnd) {
      vNodeInsertChild(parent, b[bStart++], next, context);
    }
  } else if (bStart > bEnd) {
    // All nodes from b are updated, remove the rest from a.
    while (aStart <= aEnd) {
      vNodeRemoveChild(parent, a[aStart++]);
    }
  } else {
    // Perform more complex vNodeUpdate algorithm on the remaining nodes.
    //
    // We start by marking all nodes from b as inserted, then we try
    // to find all removed nodes and simultaneously perform updates on
    // the nodes that exists in both lists and replacing "inserted"
    // marks with the position of the node from the list b in list a.
    // Then we just need to perform slightly modified LIS algorithm,
    // that ignores "inserted" marks and find common subsequence and
    // move all nodes that doesn't belong to this subsequence, or
    // insert if they have "inserted" mark.
    var aLength = aEnd - aStart + 1;
    var bLength = bEnd - bStart + 1;
    var sources = new Array(bLength);

    // Mark all nodes as inserted.
    for (i = 0; i < bLength; i++) {
      sources[i] = -1;
    }

    var moved = false;
    var removeOffset = 0;

    // When lists a and b are small, we are using naive O(M*N) algorithm
    // to find removed children.
    if (aLength * bLength <= 16) {
      for (i = aStart; i <= aEnd; i++) {
        var removed = true;
        aNode = a[i];
        for (j = bStart; j <= bEnd; j++) {
          bNode = b[j];
          if (aNode.key === bNode.key) {
            sources[j - bStart] = i;

            if (lastTarget > j) {
              moved = true;
            } else {
              lastTarget = j;
            }
            vNodeUpdate(aNode, bNode, context);
            removed = false;
            break;
          }
        }
        if (removed) {
          vNodeRemoveChild(parent, aNode);
          removeOffset++;
        }
      }
    } else {
      var keyIndex = {};

      for (i = bStart; i <= bEnd; i++) {
        node = b[i];
        keyIndex[node.key] = i;
      }

      for (i = aStart; i <= aEnd; i++) {
        aNode = a[i];
        j = keyIndex[aNode.key];

        if (j !== void 0) {
          bNode = b[j];
          sources[j - bStart] = i;
          if (lastTarget > j) {
            moved = true;
          } else {
            lastTarget = j;
          }
          vNodeUpdate(aNode, bNode, context);
        } else {
          vNodeRemoveChild(parent, aNode);
          removeOffset++;
        }
      }
    }

    if (moved) {
      var seq = _lis(sources);
      // All modifications are performed from the right to left, so we
      // can use insertBefore method and use reference to the html
      // element from the next VNode. All Nodes from the right side
      // should always be in the correct state.
      j = seq.length - 1;
      for (i = bLength - 1; i >= 0; i--) {
        if (sources[i] === -1) {
          pos = i + bStart;
          node = b[pos];
          nextPos = pos + 1;
          next = nextPos < b.length ? b[nextPos].ref : null;
          vNodeInsertChild(parent, node, next, context);
        } else {
          if (j < 0 || i != seq[j]) {
            pos = i + bStart;
            node = b[pos];
            nextPos = pos + 1;
            next = nextPos < b.length ? b[nextPos].ref : null;
            vNodeMoveChild(parent, node, next);
          } else {
            j--;
          }
        }
      }
    } else if (aLength - removeOffset != bLength) {
      for (i = bLength - 1; i >= 0; i--) {
        if (sources[i] === -1) {
          pos = i + bStart;
          node = b[pos];
          nextPos = pos + 1;
          next = nextPos < b.length ? b[nextPos].ref : null;
          vNodeInsertChild(parent, node, next, context);
        }
      }
    }
  }
}

/**
 * Slightly modified Longest Increased Subsequence algorithm, it
 * ignores items that have -1 value. They're representing new items.
 *
 * This algorithm is used to find minimum number of move operations
 * when updating children with explicit keys.
 *
 * http://en.wikipedia.org/wiki/Longest_increasing_subsequence
 *
 * @param {Array.<number>} a
 * @return {Array.<number>}
 */
function _lis(a) {
  var p = a.slice(0);
  var result = [0];
  var i, il;
  var j;
  var u;
  var v;
  var c;

  for (i = 0, il = a.length; i < il; i++) {
    if (a[i] === -1) {
      continue;
    }

    j = result[result.length - 1];
    if (a[j] < a[i]) {
      p[i] = j;
      result.push(i);
      continue;
    }

    u = 0;
    v = result.length - 1;

    while (u < v) {
      c = ((u + v) / 2) | 0;
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
 * Components
 */
var C_DIRTY = 1;
var C_ATTACHED = 2;
var C_SVG = 3;
var C_MOUNTING = 4;
var C_SHOULD_UPDATE_VIEW_FLAGS = C_DIRTY | C_ATTACHED;

/**
 * Component is a basic block to build user interfaces.
 *
 * @param {!Component} parent Parent component.
 * @param {Object} data Component data.
 * @param {Array<VNode>} children
 * @constructor
 */
function Component(parent, data, children) {
  /**
   * Flags.
   * @type {number}
   */
  this.flags = C_DIRTY;

  /**
   * Revision.
   * @type {number}
   */
  this.rev = -1;

  /**
   * Depth relative to other Components.
   * @type {number}
   */
  this.depth = parent == null ? 0 : parent.depth + 1;

  /**
   * Parent Component.
   * @type {Component}
   */
  this.parent = parent;

  this.data = data;
  this.children = children;

  /**
   * Root node in the Components virtual tree.
   * @type {VNode}
   */
  this.root = null;

  /**
   * Reference to the Html Element.
   * @type {HTMLElement}
   */
  this.element = null;

  /**
   * vNodeUpdate bound method.
   * @type {function(this:!Component)}
   */
  this._update = null;

  /**
   * invalidate bound method.
   * @type {function(this:!Component)}
   */
  this._invalidate = null;
}

Component.DIRTY = C_DIRTY;
Component.ATTACHED = C_ATTACHED;
Component.SVG = C_SVG;
Component.MOUNTING = C_MOUNTING;
Component.SHOULD_UPDATE_VIEW_FLAGS = C_SHOULD_UPDATE_VIEW_FLAGS;

/**
 * Tag name of the root [element].
 */
Component.prototype.tag = 'div';

/**
 * Lifecycle method [create].
 *
 * [create] method should create root [element] of the [Component].
 *
 * Invoked during the [Scheduler] writeDom phase.
 */
Component.prototype.create = function() {
  this.element = document.createElement(this.tag);
};

/**
 * Lifecycle method [mount].
 *
 * [mount] method should mount [Component] on top of [e] element.
 *
 * Invoked during the [Scheduler] writeDom phase.
 */
Component.prototype.mount = function(element) {
  this.flags |= C_MOUNTING;
  this.element = element;
};

/**
 * Lifecycle method [init].
 *
 * Initialize component. This method is called after [create],
 * or [mount] methods.
 *
 * Invoked during the [Scheduler] writeDom phase.
 */
Component.prototype.init = function() {};

Component.prototype.updateData = function(data) {
  if (this.data !== data) {
    this.data = data;
    this.invalidate();
  }
};

Component.prototype.updateChildren = function(children) {
  if (this.children !== children) {
    this.children = children;
    this.invalidate();
  }
};

/**
 * Lifecycle method [vNodeUpdate].
 *
 * This method updates [Component] state, and if state is changed,
 * it will vNodeUpdate view.
 *
 * Invoked during the [Scheduler] writeDom phase.
 */
Component.prototype.update = function() {
  if ((this.flags & C_SHOULD_UPDATE_VIEW_FLAGS) == C_SHOULD_UPDATE_VIEW_FLAGS) {
    if (this.updateState()) {
      this.updateView();
    }
    this.rev = ENV.scheduler.clock;
    this.flags &= ~C_DIRTY;
    this.updated();
  }
};

/**
 * Lifecycle method [updateState].
 *
 * vNodeUpdate internal state, it should return [:bool:] value that indicates
 * that the internal state changes will result in modified view
 * representation of the component.
 *
 * Invoked during the [Scheduler] writeDom phase.
 */
Component.prototype.updateState = function() { return true; };

/**
 * Lifecycle method [updateView].
 *
 * vNodeUpdate view.
 *
 * Invoked during the [Scheduler] writeDom phase.
 */
Component.prototype.updateView = function() {};

/**
 * Update internal tree using virtual dom representation.
 *
 * If this method is called during [isMounting] phase, then virtual dom
 * will be mounted on top of existing html tree.
 */
Component.prototype.updateRoot = function(newRoot) {
  if (this.root == null) {
    newRoot.cref = this;
    if ((this.flags & C_MOUNTING) !== 0) {
      vNodeMount(this.element, this);
      this.flags &= ~C_MOUNTING;
    } else {
      newRoot.ref = this.element;
      vNodeRender(newRoot, this);
    }
  } else {
    vNodeUpdate(this.root, newRoot, this);
  }
  this.root = newRoot;
};

/**
 * Invalidate [Component].
 *
 * Component will be marked as dirty and added to the vNodeUpdate queue. All
 * transient subscriptions will be canceled immediately.
 */
Component.prototype.invalidate = function() {
  if ((this.flags & C_DIRTY) === 0) {
    var scheduler = ENV.scheduler;

    this.flags |= C_DIRTY;
    if (this._update == null) {
      this._update = this.update.bind(this);
    }

    //if ((scheduler.flags & S_FRAME_RUNNING) === 0) {
      scheduler.nextFrame().write(this._update, this.depth);
    //}

    this.cancelTransientSubs();
    this.invalidated();
  }
};

/**
 * Dispose [Component]
 *
 * This method should be called when [Component] is no longer in use.
 *
 * NOTE: Use it only when you want to manually control the lifecycle of the
 * [Component], otherwise just use helper methods like [injectComponent]
 * that will call lifecycle methods in the right order.
 */
Component.prototype.dispose = function() {
  if (this.root != null) {
    this.root.dispose();
  }
  if ((this.flags & C_ATTACHED) !== 0) {
    this.flags |= C_ATTACHED;
    this.detached();
  }
  this.cancelTransientSubs();
  this.cancelSubs();
  this.disposed();
};

/**
 * Attach [Component]
 *
 * This method should be called when [Component] is attached to the
 * html document.
 *
 * NOTE: Use it only when you want to manually control the lifecycle of the
 * [Component], otherwise just use helper methods like [injectComponent]
 * that will call lifecycle methods in the right order.
 */
Component.prototype.attach = function() {
  this.flags |= C_ATTACHED;
  this.attached();
  if (this.root != null) {
    vNodeAttach(this.root);
  }
};

/**
 * Detach [Component]
 *
 * This method should be called when [Component] is detached to the
 * html document.
 *
 * NOTE: Use it only when you want to manually control the lifecycle of the
 * [Component], otherwise just use helper methods like [injectComponent]
 * that will call lifecycle methods in the right order.
 */
Component.prototype.detach = function() {
  if (this.root != null) {
    vNodeDetach(this.root);
  }
  this.flags &= ~C_ATTACHED;
  this.detached();
};

/**
 * Lifecycle method [invalidated].
 *
 * Invoked after [invalidate] method is called.
 */
Component.prototype.invalidated = function() {};

/**
 * Lifecycle method [updated].
 *
 * Invoked during the [Scheduler] writeDom phase after [vNodeUpdate] method is
 * finished.
 */
Component.prototype.updated = function() {};

/**
 * Lifecycle method [attached].
 *
 * Invoked during the [Scheduler] writeDom phase when [Component] is
 * attached to the html document.
 */
Component.prototype.attached = function() {};

/**
 * Lifecycle method [detached].
 *
 * Invoked during the [Scheduler] writeDom phase when [Component] is
 * detached from the html document.
 */
Component.prototype.detached = function() {};

/**
 * Lifecycle method [disposed].
 *
 * Invoked during the [Scheduler] writeDom phase when [Component] is
 * disposed.
 */
Component.prototype.disposed = function() {};

Component.prototype.cancelSubs = function() {};
Component.prototype.cancelTransientSubs = function() {};

function injectComponent(component, parent) {
  component.create();
  component.init();
  parent.appendChild(component.element);
  component.attach();
  component.update();
}

module.exports = {
  VNode: VNode,
  Component: Component,
  create: vNodeCreate,
  render: vNodeRender,
  update: vNodeUpdate,
  attach: vNodeAttach,
  detach: vNodeDetach,
  attached: vNodeAttached,
  detached: vNodeDetached,
  t: text,
  $t: $text,
  e: element,
  $e: $element,
  s: svg,
  $s: $svg,
  c: component,
  $c: $component,
  r: root,
  injectComponent: injectComponent
};
