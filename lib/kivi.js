'use strict';

/**
 * Scheduler instance.
 * @type {Scheduler}
 */
var scheduler;

/** @typedef {(string|number|null)} */
var Key;

/**
 * VNode flag: Text node.
 * @const
 * @type {number}
 */
var VNODE_TEXT = 1;

/**
 * VNode flag: Element node.
 * @const
 * @type {number}
 */
var VNODE_ELEMENT = 2;

/**
 * VNode flag: Component node.
 * @const
 * @type {number}
 */
var VNODE_COMPONENT = 4;

/**
 * VNode flag: Root node.
 * @const
 * @type {number}
 */
var VNODE_ROOT = 8;

/**
 * Component Descriptor flag: Component has `createState` function.
 * @const
 * @type {number}
 */
var DESCR_CREATE_STATE_FN = 1;

/**
 * Component Descriptor flag: Component has `updateState` function.
 * @const
 * @type {number}
 */
var DESCR_UPDATE_STATE_FN = 2;

/**
 * Component Descriptor flag: Component has `init` function.
 * @const
 * @type {number}
 */
var DESCR_INIT_FN = 4;

/**
 * Component Descriptor flag: Component has `build` function.
 * @const
 * @type {number}
 */
var DESCR_BUILD_FN = 8;

/**
 * Component Descriptor flag: Component has `attached` function.
 * @const
 * @type {number}
 */
var DESCR_ATTACHED_FN = 16;

/**
 * Component Descriptor flag: Component has `detached` function.
 * @const
 * @type {number}
 */
var DESCR_DETACHED_FN = 32;

/**
 * Component Descriptor flag: Component has `domAttached` function.
 * @const
 * @type {number}
 */
var DESCR_DOM_ATTACHED_FN = 64;

/**
 * Component Descriptor flag: Component has `domDetached` function.
 * @const
 * @type {number}
 */
var DESCR_DOM_DETACHED_FN = 128;

/**
 * Component Descriptor flag: Component has `rendered` function.
 * @const
 * @type {number}
 */
var DESCR_RENDERED_FN = 256;

/**
 * Component Descriptor flag: Component has `updated` function.
 * @const
 * @type {number}
 */
var DESCR_UPDATED_FN = 512;

/**
 * Component Descriptor flag: Component has `mounted` function.
 * @const
 * @type {number}
 */
var DESCR_MOUNTED_FN = 1024;

/**
 * Component Descriptor flag: Component has `insert` function.
 * @const
 * @type {number}
 */
var DESCR_INSERT_FN = 2048;

/**
 * Component Descriptor flag: Component has `move` function.
 * @const
 * @type {number}
 */
var DESCR_MOVE_FN = 4096;

/**
 * Component Descriptor flag: Component has `remove` function.
 * @const
 * @type {number}
 */
var DESCR_REMOVE_FN = 8192;

/**
 * Component State flag: Component is attached to the Document.
 * @const
 * @type {number}
 */
var COMPONENT_DOM_ATTACHED = 1;

/**
 * Component State flag: Component is dirty and should be updated.
 * @const
 * @type {number}
 */
var COMPONENT_DIRTY = 2;

/**
 * Component State flag: Component is rendered.
 * @const
 * @type {number}
 */
var COMPONENT_RENDERED = 4;

/**
 * Component State flag: Component is mounted.
 * @const
 * @type {number}
 */
var COMPONENT_MOUNTED = 8;

/**
 * Virtual Node.
 *
 * @param {number} flags Flags.
 * @param {Key} key Key that should be unique among its siblings. If
 *   the key is null, it means that the key is implicit.
 * @param {(ComponentFactory|string|null)} tag When the VNode is
 *   Element tag represents its tagName, and when VNode is a Component
 *   it is a ComponentFactory.
 * @param {(Object|string|null)} data
 * @param {?string} type Immutable className.
 * @param {Object.<string,string>} attributes Generic element attributes.
 * @param {Object.<string,string>} style Styles.
 * @param {Array.<string>} classes Classes.
 * @param {Array.<VNode>} children Children.
 * @final
 * @constructor
 * @struct
 */
function VNode(flags, key, tag, data, type, attributes, style, classes, children) {
  this.flags = flags;
  this.key = key;
  this.tag = tag;
  this.data = data;
  this.type = type;
  this.attributes = attributes;
  this.style = style;
  this.classes = classes;
  this.children = children;

  /**
   * Reference to the Html Element.
   * @type {HTMLElement}
   */
  this.ref = null;

  /**
   * Reference to the Component.
   * @type {Component}
   */
  this.cref = null;
}

/**
 * Create Component Descriptor Object
 * @nosideeffects
 * @param {!Object} decl Component declaration
 * @return {!Object}
 */
function declareComponent(decl) {
  var flags = 0|0;
  var name = decl.name;
  var tag = decl.tag;
  var createState = decl.createState;
  var updateState = decl.updateState;
  var init = decl.init;
  var build = decl.build;
  var attached = decl.attached;
  var detached = decl.detached;
  var domAttached = decl.domAttached;
  var domDetached = decl.domDetached;
  var updated = decl.updated;
  var mounted = decl.mounted;
  var insert = decl.insert;
  var move = decl.move;
  var remove = decl.remove;

  if (name === void 0) name = 'Unnamed Component';
  if (tag === void 0) tag = 'div';

  if (createState === void 0) createState = null;
  else flags |= DESCR_CREATE_STATE_FN;

  if (updateState === void 0) updateState = null;
  else flags |= DESCR_UPDATE_STATE_FN;

  if (init === void 0) init = null;
  else flags |= DESCR_INIT_FN;

  if (build === void 0) build = null;
  else flags |= DESCR_BUILD_FN;

  if (attached === void 0) attached = null;
  else flags |= DESCR_ATTACHED_FN;

  if (detached === void 0) detached = null;
  else flags |= DESCR_DETACHED_FN;

  if (domAttached === void 0) domAttached = null;
  else flags |= DESCR_DOM_ATTACHED_FN;

  if (domDetached === void 0) domDetached = null;
  else flags |= DESCR_DOM_DETACHED_FN;

  if (updated === void 0) updated = null;
  else flags |= DESCR_UPDATED_FN;

  if (mounted === void 0) mounted = null;
  else flags |= DESCR_MOUNTED_FN;

  if (insert === void 0) insert = null;
  else flags |= DESCR_INSERT_FN;

  if (move === void 0) move = null;
  else flags |= DESCR_MOVE_FN;

  if (remove === void 0) remove = null;
  else flags |= DESCR_REMOVE_FN;

  return {
    flags: flags,
    createState: createState,
    updateState: updateState,
    init: init,
    build: build,
    attached: attached,
    detached: detached,
    domAttached: domAttached,
    domDetached: domDetached,
    updated: updated,
    mounted: mounted,
    insert: insert,
    move: move,
    remove: remove,
    name: name,
    tag: tag
  };
}

/**
 * Component.
 *
 * @param {!Object} descriptor Component descriptor object.
 * @param {!Component} parent Parent component.
 * @param {Object} data Component data.
 * @final
 * @constructor
 * @struct
 */
function Component(descriptor, parent, data) {
  /**
   * ComponentDescriptor.
   * @type {!Object}
   */
  this.descriptor = descriptor;

  /**
   * Component flags.
   * @type {number}
   */
  this.flags = 0|0;

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

  /**
   * Data.
   * @type {*}
   */
  this.data = data;

  /**
   * Component State.
   * @type {Object}
   */
  this.state = (descriptor.flags & DESCR_CREATE_STATE_FN !== 0) ?
    descriptor.createState(data) :
    null;

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
   * updateLater bound method.
   * @type {function(this:!Component)}
   */
  this._update = null;
}

/**
 * Checks if two VNodes have the same type and they can be updated.
 *
 * @nosideeffects
 * @param {!VNode} a
 * @param {!VNode} b
 * @return {boolean}
 */
function sameType(a, b) {
  return (a.flags === b.flags && a.tag === b.tag);
}

/**
 * Factory function to create Text VNodes.
 *
 * @param {string} content Text content.
 * @param {Key} key Key.
 * @return {VNode} Text VNode.
 */
function text(content, key) {
  if (key === void 0) key = null;
  return new VNode(VNODE_TEXT, key, null, content, null, null, null, null, null);
}

/**
 * Factory function to create Element VNodes.
 *
 * @param {string} tag Tag name.
 * @param {Key} key Key.
 * @return {VNode} Element VNode.
 */
function element(tag, key) {
  if (key === void 0) key = null;
  return new VNode(VNODE_ELEMENT, key, tag, null, null, null, null, null, null);
}

/**
 * Factory function to create Component VNodes.
 *
 * @param {string} descriptor Component descriptor.
 * @param {Key} key Key.
 * @param {*} data Data.
 * @return {VNode} Element VNode.
 */
function component(descriptor, data, key) {
  if (key === void 0) key = null;
  return new VNode(VNODE_COMPONENT, key, descriptor, data, null, null, null, null, null);
}

/**
 * Factory function to create Root VNodes.
 *
 * @return {VNode} Element VNode.
 */
function root() {
  return new VNode(VNODE_ROOT, null, null, null, null, null, null, null, null);
}

/**
 * Create internal state of the VNode.
 *
 * @param {!VNode} node
 * @param {Context} context
 */
function create(node, context) {
  var flags = node.flags;
  if ((flags & VNODE_TEXT) !== 0) {
    node.ref = document.createTextNode(node.data);

  } else if ((flags & VNODE_ELEMENT) !== 0) {
    node.ref = document.createElement(node.tag);

  } else if ((flags & VNODE_COMPONENT) !== 0) {
    var descriptor = node.tag;
    var data = node.data;
    var component = new Component(descriptor, context, data);
    var element = document.createElement(descriptor.tag);
    node.ref = component.element = element;
    node.cref = component;
  }
}

/**
 * Render internal representation of the VNode.
 *
 * @param {!VNode} node
 * @param {Context} context
 */
function render(node, context) {
  var i, il;
  var key;
  var flags = node.flags;

  if ((flags & (VNODE_ELEMENT | VNODE_COMPONENT | VNODE_ROOT)) !== 0) {
    var ref = node.ref;
    var nodeType = node.type;
    var nodeAttributes = node.attributes;
    var nodeStyle = node.style;
    var nodeClasses = node.classes;
    var nodeChildren = node.children;

    if (nodeType != null) {
      ref.classList.add(nodeType);
    }

    if (nodeAttributes != null) {
      for (key in nodeAttributes) {
        ref.setAttribute(key, nodeAttributes[key]);
      }
    }

    if (nodeStyle != null) {
      var style = ref.style;

      for (key in nodeStyle) {
        style.setProperty(key, nodeStyle[key]);
      }
    }

    if (nodeClasses != null) {
      var classList = ref.classList;

      for (i = 0, il = nodeClasses.length; i < il; i++) {
        classList.add(nodeClasses[i]);
      }
    }

    if (nodeChildren != null) {
      for (i = 0, il = nodeChildren.length; i < il; i++) {
        insertChild(node, nodeChildren[i], null, context);
      }
    }

    if ((flags & VNODE_COMPONENT) !== 0) {
      var component = node.cref;
      var descriptor = node.tag;
      var dflags = descriptor.flags;
      if ((dflags & DESCR_INIT_FN) !== 0) {
        descriptor.init.call(component);
      }
      if ((dflags & DESCR_BUILD_FN) !== 0) {
        updateRoot(component, descriptor.build.call(component));
      }
      if ((dflags & DESCR_RENDERED_FN) !== 0) {
        descriptor.rendered.call(component);
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
function update(a, b, context) {
  var ref = a.ref;
  var flags = a.flags;
  b.ref = ref;

  if ((flags & VNODE_TEXT) !== 0) {
    if (a.data != b.data) {
      a.ref.data = b.data;
    }

  } else if ((flags & (VNODE_ELEMENT | VNODE_COMPONENT | VNODE_ROOT)) !== 0) {
    // No need to update type class, because it should be immutable.

    if (a.attributes != null || b.attributes != null) {
      updateAttributes(a.attributes, b.attributes, ref.attributes);
    }
    if (a.style != null || b.style != null) {
      updateStyle(a.style, b.style, ref.style);
    }
    if (a.classes != null || b.classes != null) {
      updateClasses(a.classes, b.classes, ref.classList);
    }
    if (a.children != null || b.children != null) {
      updateChildren(a, a.children, b.children, context);
    }

    if ((flags & VNODE_COMPONENT) !== 0) {
      var component = b.cref = a.cref;
      var descriptor = a.tag;
      var dflags = descriptor.flags;
      var dirty = true;
      if ((dflags & DESCR_UPDATE_STATE_FN) !== 0) {
        dirty = descriptor.updateState.call(component, a.data, b.data);
      }
      component.data = b.data;
      if (dirty) {
        updateComponent(component);
      }
      if ((dflags & DESCR_UPDATED_FN) !== 0) {
        descriptor.updated.call(component);
      }
    }
  }
}

/**
 * Update HTMLElement attributes.
 *
 * @param {Object.<string,string>} a Old attributes.
 * @param {Object.<string,string>} b New attributes.
 * @param {NamedNodeMap} attributes
 */
function updateAttributes(a, b, attributes) {
  var key;
  var aValue;
  var bValue;

  if (a === b) {
    return;
  }

  if (a != null) {
    if (b == null) {
      // b is empty, remove all attributes from a.
      for (key in a) {
        attributes.removeNamedItem(key);
      }
    } else {
      // Remove and update attributes.
      for (key in a) {
        bValue = b[key];
        if (bValue === void 0) {
          attributes.removeNamedItem(key);
        } else {
          aValue = a[key];
          if (aValue !== bValue) {
            attributes.setNamedItem(key, bValue);
          }
        }
      }

      // Insert new attributes.
      for (key in b) {
        aValue = a[key];
        if (aValue !== void 0) {
          attributes.setNamedItem(key, aValue);
        }
      }
    }
  } else if (b != null) {
    // a is empty, insert all attributes from b.
    for (key in b) {
      attributes.setNamedItem(key, b[key]);
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
  var key;
  var value;

  if (a === b) {
    return;
  }

  if (a != null) {
    if (b == null) {
      // b is empty, remove all styles from a.
      for (key in a) {
        style.removeProperty(key);
      }
    } else {
      // Remove and update styles.
      for (key in a) {
        value = b[key];
        if (value === void 0) {
          style.removeProperty(key);
        } else {
          style.setProperty(key, value);
        }
      }

      // Insert new styles.
      for (key in b) {
        value = a[key];
        if (value !== void 0) {
          style.setProperty(key, b[key]);
        }
      }
    }
  } else if (b != null) {
    // a is empty, insert all styles from b.
    for (key in b) {
      style.setProperty(key, b[key]);
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
  var key;
  var aItem;
  var bItem;
  var aLength = a.length;
  var bLength = b.length;
  var visited;
  var removed;
  var bIndex;

  if (a === b) {
    return;
  }

  if (a != null && aLength > 0) {
    if (b == null || bLength === 0) {
      // b is empty, remove all classes from a.
      for (i = 0; i < aLength; i++) {
        classList.remove(a[i]);
      }
    } else {
      // When lists a and b are small, we are using naive O(M*N) algorithm
      // to find differences.
      if (aLength * bLength <= 16) {
        visited = new Array(bLength);

        for (i = 0; i < aLength; i++) {
          aItem = a[i];
          removed = true;

          for (i = 0; i < bLength; i++) {
            bItem = b[i];

            if (aItem === bItem) {
              removed = false;
              visited[i] = true;
              break;
            }
          }

          if (removed) {
            classList.remove(aItem);
          }
        }

        for (i = 0; i < bLength; i++) {
          if (visited[i] != true) {
            classList.add(b[i]);
          }
        }
      } else {
        bIndex = {};

        for (i = 0; i < bLength; i++) {
          bItem = b[i];
          bIndex[bItem] = false;
        }

        for (i = 0; i < aLength; i++) {
          aItem = a[i];
          if (aItem === void 0) {
            classList.remove(aItem);
          } else {
            bIndex[aItem] = true;
          }
        }

        for (i = 0; i < bLength; i++) {
          bItem = b[i];
          if (bIndex[bItem] === false) {
            classList.add(key);
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
 * @param {HTMLElement} b Reference to the next html element.
 * @param {Context} context Current context.
 */
function insertChild(parent, node, nextRef, context) {
  create(node, context);
  parent.ref.insertBefore(node.ref, nextRef);
  render(node, context);
}

/**
 * Move VNode.
 *
 * @param {VNode} parent Parent node.
 * @param {VNode} node Node to move.
 * @param {HTMLElement} b Reference to the next html element.
 * @param {Context} context Current context.
 */
function moveChild(parent, node, nextRef, context) {
  parent.ref.insertBefore(node.ref, nextRef);
}

/**
 * Remove VNode.
 *
 * @param {VNode} parent Parent node.
 * @param {VNode} node Node to remove.
 * @param {Context} context Current context.
 */
function removeChild(parent, node, context) {
  parent.ref.removeChild(node.ref);
}

/**
 * Update childrens [a] and [b] in the [parent].
 *
 * If one of the childrens has `null` `key`, it will run update
 * algorithm for childrens with implicit keys, otherwise it will run
 * update algorithm for childrens with explicit keys.
 *
 * Mixing childrens with explicit and implicit keys in one children
 * list will result in undefined behaviour. In development mode it
 * will be checked for this conditions and if it is detected that
 * there are childrens with implicit and explicit keys, it will result
 * in runtime error.
 *
 * @param {VNode} parent Childrens parent.
 * @param {Array.<VNode>} a Old children list.
 * @param {Array.<VNode>} b New children list.
 * @param {Context} context Current context.
 */
function updateChildren(parent, a, b, context) {
  var aNode;
  var bNode;
  var i;
  var unchangedPosition;

  if (a != null && a.length !== 0) {
    if (b == null || b.length === 0) {
      // b is empty, remove all children from a.
      for (i = 0; i < a.length; i++) {
        removeChild(parent, a[i], context);
      }
    } else {
      if (a.length === 1 && b.length === 1) {
        // Fast path when a and b have only one child.
        aNode = a[0];
        bNode = b[0];

        // Implicit key with same type or explicit key with same key.
        if ((aNode.key == null && sameType(aNode, bNode)) ||
            (aNode.key != null && aNode.key === bNode.key)) {
          update(aNode, bNode, context);
        } else {
          removeChild(parent, aNode, context);
          insertChild(parent, bNode, null, context);
        }
      } else if (a.length === 1) {
        // Fast path when a have 1 child.
        aNode = a[0];
        if (aNode.key == null) {
          updateImplicitChildren(parent, a, b, context);
        } else {
          unchangedPosition = -1;
          for (i = 0; i < b.length; i++) {
            bNode = b[i];
            if (aNode.key === bNode.key) {
              unchangedPosition = i;
              break;
            } else {
              insertChild(parent, bNode, aNode.ref, context);
            }
          }
          if (unchangedPosition !== -1) {
            for (i = unchangedPosition + 1; i < b.length; i++) {
              insertChild(parent, b[i], null, context);
            }
            update(aNode, b[unchangedPosition], context);
          } else {
            removeChild(parent, aNode, context);
          }
        }
      } else if (b.length === 1) {
        // Fast path when b have 1 child.
        bNode = b[0];
        if (bNode.key == null) {
          updateImplicitChildren(parent, a, b, context);
        } else {
          unchangedPosition = -1;
          for (i = 0; i < a.length; i++) {
            aNode = a[i];
            if (aNode.key === bNode.key) {
              unchangedPosition = i;
              break;
            } else {
              removeChild(parent, aNode, context);
            }
          }
          if (unchangedPosition !== -1) {
            for (i = unchangedPosition + 1; i < a.length; i++) {
              removeChild(parent, a[i], context);
            }
            update(a[unchangedPosition], bNode, context);
          } else {
            insertChild(parent, bNode, null, context);
          }
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
      insertChild(parent, b[i], null, context);
    }
  }
}

/**
 * Update childrens with implicit keys `a` and `b` in the `parent`.
 *
 * Any heuristics that is used in this algorithm is an undefined
 * behaviour, and external dependencies should not relay on the
 * knowledge about this algorithm, because it can be changed in any
 * time.
 *
 * @param {VNode} parent Childrens parent.
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

    if (!sameType(aNode, bNode)) {
      break;
    }

    aStart++;
    bStart++;

    update(aNode, bNode, context);
  }

  // Update nodes with the same type at the end.
  while (aStart <= aEnd && bStart <= bEnd) {
    aNode = a[aEnd];
    bNode = b[bEnd];

    if (!sameType(aNode, bNode)) {
      break;
    }

    aEnd--;
    bEnd--;

    update(aNode, bNode, context);
  }

  // Iterate through the remaining nodes and if they have the same
  // type, then update, otherwise just remove the old node and insert
  // the new one.
  while (aStart <= aEnd && bStart <= bEnd) {
    aNode = a[aStart++];
    bNode = b[bStart++];
    if (sameType(aNode, bNode)) {
      update(aNode, bNode, context);
    } else {
      insertChild(parent, bNode, aNode.ref, context);
      removeChild(parent, aNode, context);
    }
  }

  // All nodes from a are updated, insert the rest from b.
  while (aStart <= aEnd) {
    removeChild(parent, a[aStart++], context);
  }

  nextPos = bEnd + 1;
  next = nextPos < b.length ? b[nextPos].ref : null;

  // All nodes from b are updated, remove the rest from a.
  while (bStart <= bEnd) {
    insertChild(parent, b[bStart++], next, context);
  }
}

/**
 * Update childrens with explicit keys [a] and [b] in the [parent].
 *
 * @param {VNode} parent Childrens parent.
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
  var lastTarget;
  var pos;
  var node;

  // Algorithm that works on simple cases with basic list
  // transformations.
  //
  // It tries to reduce the diff problem by simultaneously iterating
  // from the beginning and the end of both lists, if keys are the
  // same, they're updated, if node is moved from the beginnin to the
  // end of the current cursor positions or vice versa it just
  // performs move operation and continues to reduce the diff problem.
  outer: do {
    stop = true;

    // Update nodes with the same key at the beginning.
    while (aStartNode.key === bStartNode.key) {
      update(aStartNode, bStartNode, context);
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
      update(aEndNode, bEndNode, context);
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
      update(aStartNode, bEndNode, context);
      nextPos = bEnd + 1;
      next = nextPos < b.length ? b[nextPos].ref : null;
      moveChild(parent, bEndNode, next, context);
      aStart++;
      bEnd--;
      if (aStart > aEnd || bStart > bEnd) {
        break outer;
      }
      aStartNode = a[aStart];
      bEndNode = b[bEnd];
      stop = false;
    }

    // Move nodes from right to end.
    while (aEndNode.key === bStartNode.key) {
      update(aEndNode, bStartNode, context);
      moveChild(parent, aEndNode, a[aStart].ref, context);
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
      insertChild(parent, b[bStart++], next, context);
    }
  } else if (bStart > bEnd) {
    // All nodes from b are updated, remove the rest from a.
    while (aStart <= aEnd) {
      removeChild(parent, a[aStart++], context);
    }
  } else {
    // Perform more complex update algorithm on the remaining nodes.
    //
    // We start by marking all nodes from b as inserted, then we try
    // to find all removed nodes and simultaneously perform updates on
    // the nodes that exists in both lists and replacing "inserted"
    // marks with the position of the node from the list b in list a.
    // Then we just need to perform slightly modified LIS algorith,
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
            update(aNode, bNode, context);
            removed = false;
            break;
          }
        }
        if (removed) {
          removeChild(parent, aNode, context);
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

        if (j != null) {
          bNode = b[j];
          sources[j - bStart] = i;
          if (lastTarget > j) {
            moved = true;
          } else {
            lastTarget = j;
          }
          update(aNode, bNode, context);
        } else {
          removeChild(parent, aNode, context);
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
          insertChild(parent, node, next, context);
        } else {
          if (j < 0 || i != seq[j]) {
            pos = i + bStart;
            node = a[sources[i]];
            nextPos = pos + 1;
            next = nextPos < b.length ? b[nextPos].ref : null;
            moveChild(parent, node, next, context);
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
          insertChild(parent, node, next, context);
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
 * when updating childrens with explicit keys.
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
 * Invalidate Component
 * @param {!Component} component
 */
function invalidate(component) {
  if ((component.flags & COMPONENT_DIRTY) === 0) {
    component.flags |= COMPONENT_DIRTY;
    if (component._update == null) {
      component._update = function() { updateComponentLater(component); };
    }
    scheduler.nextFrame().write(component._update, component.depth);
  }
}

function updateComponentLater(component) {
  if ((component.flags & COMPONENT_DIRTY) !== 0) {
    updateComponent(component);
  }
}

function updateComponent(component) {
  var descriptor = component.descriptor;
  component.flags &= ~COMPONENT_DIRTY;
  updateRoot(component, descriptor.build.call(component));
  if ((descriptor.flags & DESCR_UPDATED_FN) !== 0) {
    descriptor.updated.call(component);
  }
}

function updateRoot(component, newRoot) {
  var root = component.root;

  if (root == null) {
    newRoot.ref = component.element;
    newRoot.cref = component;
    render(newRoot, component);
  } else {
    update(root, newRoot, component);
  }
  component.root = newRoot;
}

function initScheduler(s) {
  scheduler = s;
}

module.exports = {
  initScheduler: initScheduler,
  declareComponent: declareComponent,
  text: text,
  element: element,
  component: component,
  root: root,
  create: create,
  render: render,
  update: update,
  invalidate: invalidate
};
