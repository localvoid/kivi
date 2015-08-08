goog.provide('vdom');

goog.require('kivi.Scheduler');
goog.require('kivi.env');

/**
 * Virtual DOM Node.
 *
 * @param {number} flags Flags.
 * @param {number|string|null} key Key that should be unique among its siblings. If the key is `null`, it
 *   means that the key is implicit. When [key] is implicit, all siblings should also have implicit keys,
 *   otherwise it will result in undefined behaviour in "production" mode, or runtime error in
 *   "development" mode.
 * @param {string|vdom.CDescriptor|null} tag Tag should contain html tag name if VNode represents an element,
 *   or reference to the [vdom.CDescriptor] if it represents a Component.
 * @param {*} data Data that will be transffered to Components. If VNode represents an element, [data] is
 *   used as a cache for className string that was built from [type] and [classes] properties.
 * @param {?string} type Immutable class name
 * @param {Object<string,string>} attrs HTMLElement attributes
 * @param {Object<string,*>} props HTMLElement properties
 * @param {Object<string,string>} style HTMLElement styles
 * @param {Array<string>} classes HTMLElement classes
 * @param {Array<!vdom.VNode>} children List of children nodes. If VNode is a Component, children nodes will be
 *   transferred to the Component.
 * @constructor
 * @struct
 * @final
 */
vdom.VNode = function(flags, key, tag, data, type, attrs, props, style, classes, children) {
  this.flags = flags;
  this.key = key;
  this.tag = tag;
  this.data = data;
  this.type = type;
  this.attrs = attrs;
  this.props = props;
  this.style = style;
  this.classes = classes;
  this.children = children;

  /**
   * Reference to the [Node]. It will be available after [vdom.VNode] is created or updated. Each time
   * [vdom.VNode] is updated, reference to the [Node] is transferred from the previous node to the new one.
   *
   * @type {Node}
   */
  this.ref = null;

  /**
   * Reference to the [vdom.Component]. It will be available after [vdom.VNode] is created or updated. Each
   * time [vdom.VNode] is updated, reference to the [vdom.Component] is transferred from the previous node to
   * the new one.
   *
   * @type {vdom.Component}
   */
  this.cref = null;
};

/**
 * VNode Flags
 *
 * @enum {number}
 */
vdom.VNodeFlags = {
  /** Flag indicating that [vdom.VNode] is a [Text] node. */
  text:      0x0001,
  /** Flag indicating that [vdom.VNode] is an [Element] node. */
  element:   0x0002,
  /** Flag indicating that [vdom.VNode] is a [vdom.Component] node. */
  component: 0x0004,
  /** Flag indicating that [vdom.VNode] is a root element of the [vdom.Component]. */
  root:      0x0008,
  /** Flag indicating that [vdom.VNode] represents node in svg namespace. */
  svg:       0x0010
};

/**
 * Html Namespaces
 *
 * @enum {string}
 */
vdom.Namespace = {
  svg: 'http://www.w3.org/2000/svg',
  xlink: 'http://www.w3.org/1999/xlink'
};

/**
 * Special Attribute is used to set and remove attributes that isn't possible with simple setAttribute and
 * removeAttribute calls, for example setting attributes in svg namespace.
 *
 * @typedef {{set: function(!Element, string), remove: function(!Element)}}
 * @protected
 */
vdom._SpecialAttr;

/**
 * Special Attributes.
 *
 * Special attribute names should start with '$' symbol, so we can easily recognize them from simple
 * attributes.
 *
 * @const {Object<string, !vdom._SpecialAttr>}
 * @protected
 */
vdom._specialAttrs = {
  '$xlink:href': {
    /**
     * @param {!Element} node
     * @param {string} value
     */
    set: function(node, value) {
      node.setAttributeNS(vdom.Namespace.xlink, 'xlink:href', value);
    },
    /**
     * @param {!Element} node
     */
    remove: function(node) {
      node.removeAttributeNS(vdom.Namespace.xlink, 'xlink:href');
    }
  }
};

/**
 * Set Attribute.
 *
 * If attribute name starts with '$', treat it as a special attribute.
 *
 * @param {!Element} node
 * @param {string} key
 * @param {string} value
 * @protected
 */
vdom._setAttr = function(node, key, value) {
  if (key[0] !== '$') {
    node.setAttribute(key, value);
  } else {
    vdom._specialAttrs[key].set(node, value);
  }
};

/**
 * Remove Attribute.
 *
 * If attribute name starts with '$', treat it as a special attribute.
 *
 * @param {!Element} node
 * @param {string} key
 * @protected
 */
vdom._removeAttr = function(node, key) {
  if (key[0] !== '$') {
    node.removeAttribute(key);
  } else {
    vdom._specialAttrs[key].remove(node);
  }
};

/**
 * Create a [vdom.VNode] representing a [Text] node.
 *
 * @param {string} content
 * @return {!vdom.VNode}
 */
vdom.createText = function(content) {
  return new vdom.VNode(vdom.VNodeFlags.text, null, null, content, null, null, null, null, null, null);
};

/**
 * Create a [vdom.VNode] representing a [Text] node.
 *
 * @param {string|number} key
 * @param {string} content
 * @return {!vdom.VNode}
 */
vdom.createIText = function(key, content) {
  return new vdom.VNode(vdom.VNodeFlags.text, key, null, content, null, null, null, null, null, null);
};

/**
 * Create a [vdom.VNode] representing a [HTMLElement] node.
 *
 * @param {string} tag
 * @return {!vdom.VNode}
 */
vdom.createElement = function(tag) {
  return new vdom.VNode(vdom.VNodeFlags.element, null, tag, null, null, null, null, null, null, null);
};

/**
 * Create a [vdom.VNode] representing a [HTMLElement] node.
 *
 * @param {string|number} key
 * @param {string} tag
 * @return {!vdom.VNode}
 */
vdom.createIElement = function(key, tag) {
  return new vdom.VNode(vdom.VNodeFlags.element, key, tag, null, null, null, null, null, null, null);
};

/**
 * Create a [vdom.VNode] representing a [SVGElement] node.
 *
 * @param {string} tag
 * @return {!vdom.VNode}
 */
vdom.createSvgElement = function(tag) {
  return new vdom.VNode(vdom.VNodeFlags.element | vdom.VNodeFlags.svg, null, tag, null, null, null, null, null, null, null);
};

/**
 * Create a [vdom.VNode] representing a [SVGElement] node.
 *
 * @param {string|number} key
 * @param {string} tag
 * @return {!vdom.VNode}
 */
vdom.createISvgElement = function(key, tag) {
  return new vdom.VNode(vdom.VNodeFlags.element | vdom.VNodeFlags.svg, key, tag, null, null, null, null, null, null, null);
};

/**
 * Create a [vdom.VNode] representing a [vdom.Component] node.
 *
 * @param {!vdom.CDescriptor} descriptor
 * @param {*} data
 * @return {!vdom.VNode}
 */
vdom.createComponent = function(descriptor, data) {
  if (data === void 0) data = null;
  return new vdom.VNode(vdom.VNodeFlags.component, null, descriptor, data, null, null, null, null, null, null);
};

/**
 * Create a [vdom.VNode] representing a [vdom.Component] node.
 *
 * @param {string|number} key
 * @param {!vdom.CDescriptor} descriptor
 * @param {*} data
 * @return {!vdom.VNode}
 */
vdom.createIComponent = function(key, descriptor, data) {
  if (data === void 0) data = null;
  return new vdom.VNode(vdom.VNodeFlags.component, key, descriptor, data, null, null, null, null, null, null);
};

/**
 * Create a [vdom.VNode] representing a root node.
 *
 * @return {!vdom.VNode}
 */
vdom.createRoot = function() {
  return new vdom.VNode(vdom.VNodeFlags.root, null, null, null, null, null, null, null, null, null);
};

/**
 * Checks if two nodes have the same type and they can be updated.
 *
 * @param {!vdom.VNode} b
 * @return {boolean}
 * @private
 */
vdom.VNode.prototype._sameType = function(b) {
  return (this.flags === b.flags && this.tag === b.tag && this.type === b.type);
};

/**
 * Create root element of the object, or [vdom.Component] for component nodes.
 *
 * @param {!vdom.Component} context
 */
vdom.VNode.prototype.create = function(context) {
  var flags = this.flags;

  if ((flags & vdom.VNodeFlags.text) !== 0) {
    this.ref = document.createTextNode(/** @type {string} */(this.data));
  } else if ((flags & vdom.VNodeFlags.element) !== 0) {
    if ((flags & vdom.VNodeFlags.svg) === 0) {
      this.ref = document.createElement(/** @type {string} */(this.tag));
    } else {
      this.ref = document.createElementNS(vdom.Namespace.svg, /** @type {string} */(this.tag));
    }
  } else if ((flags & vdom.VNodeFlags.component) !== 0) {
    var component = vdom.Component.create(
        /** @type {!vdom.CDescriptor} */(this.tag),
        this.data,
        this.children,
        context);
    this.ref = component.element;
    this.cref = component;
  }
};

/**
 * Render internal representation of the Virtual Node.
 *
 * @param {!vdom.Component} context
 */
vdom.VNode.prototype.render = function(context) {
  /** @type {number} */
  var i;
  /** @type {number} */
  var il;
  /** @type {string|number} */
  var key;
  var keys;
  var flags = this.flags;

  /** @type {HTMLElement} */
  var ref;
  /** @type {!CSSStyleDeclaration} */
  var style;
  /** @type {?string} */
  var className;
  /** @type {DOMTokenList} */
  var classList;

  if ((flags & (vdom.VNodeFlags.element | vdom.VNodeFlags.component | vdom.VNodeFlags.root)) !== 0) {
    ref = /** @type {!HTMLElement} */(this.ref);
    if (this.attrs != null) {
      keys = Object.keys(this.attrs);
      for (i = 0, il = keys.length; i < il; i++) {
        key = keys[i];
        vdom._setAttr(ref, key, this.attrs[key]);
      }
    }

    if (this.props != null) {
      keys = Object.keys(this.props);
      for (i = 0, il = keys.length; i < il; i++) {
        key = keys[i];
        ref[key] = this.props[key];
      }
    }

    if (this.style != null) {
      style = ref.style;
      keys = Object.keys(this.style);
      for (i = 0, il = keys.length; i < il; i++) {
        key = keys[i];
        style.setProperty(key, this.style[key], '');
      }
    }

    if ((flags & (vdom.VNodeFlags.element | vdom.VNodeFlags.component)) !== 0) {
      className = null;
      if (this.type != null) {
        className = this.type;
      }
      if (this.classes != null) {
        var classes = this.classes.join(' ');
        className = (className == null) ? classes : className + ' ' + classes;
      }
      if (className != null) {
        this.data = className;
        ref.className = className;
      }
    } else {
      if (this.type != null) {
        classList = (ref.classList);
        classList.add(this.type);
      }

      if (this.classes != null) {
        if (classList === void 0) {
          classList = ref.classList;
        }

        for (i = 0, il = this.classes.length; i < il; i++) {
          classList.add(this.classes[i]);
        }
      }
    }

    if ((flags & vdom.VNodeFlags.component) !== 0) {
      vdom.Component._update(/** @type {!vdom.Component} */(this.cref));
    } else if (this.children != null) {
      for (i = 0, il = this.children.length; i < il; i++) {
        this._insertChild(this.children[i], null, context);
      }
    }
  }
};

/**
 * Update Virtual Node.
 *
 * When `this` node is updated with node `b`, `this` node should be considered as destroyed, and any access
 * to it after update is an undefined behaviour.
 *
 * @param {!vdom.VNode} b New node
 * @param {!vdom.Component} context
 */
vdom.VNode.prototype.update = function(b, context) {
  /** @type {HTMLElement} */
  var ref = /** @type {HTMLElement} */ (this.ref);
  var flags = this.flags;
  /** @type {string} */
  var classes;
  /** @type {?string} */
  var className;
  /** @type {!vdom.Component} */
  var component;

  b.ref = ref;

  if ((flags & vdom.VNodeFlags.text) !== 0) {
    if (this.data != b.data) {
      this.ref.nodeValue = /** @type {string} */ (b.data);
    }
  } else if ((flags & (vdom.VNodeFlags.element | vdom.VNodeFlags.component | vdom.VNodeFlags.root)) !== 0) {
    if (this.attrs !== b.attrs) {
      vdom._updateAttrs(this.attrs, b.attrs, /** @type {!Element} */ (ref));
    }
    if (this.props !== b.props) {
      vdom._updateProps(this.props, b.props, /** @type {!Element} */ (ref));
    }
    if (this.style !== b.style) {
      vdom._updateStyle(this.style, b.style, ref.style);
    }

    if ((flags & vdom.VNodeFlags.element) !== 0) {
      if (this.classes !== b.classes) {
        if (b.data == null) {
          className = b.type;
          if (b.classes != null) {
            classes = b.classes.join(' ');
            className = (className == null) ? classes : className + ' ' + classes;
          }
          b.data = className;
        }
        if (this.data !== b.data) {
          if (b.data == null) {
            ref.className = '';
          } else {
            ref.className = className;
          }
        }
      } else {
        b.data = this.data;
      }
    } else if (this.classes !== b.classes) {
      vdom._updateClasses(this.classes, b.classes, ref.classList);
    }

    if ((flags & vdom.VNodeFlags.component) !== 0) {
      component = b.cref = /** @type {!vdom.Component} */ (this.cref);
      if (this.data !== b.data) {
        component.descriptor.setData(component, b.data);
      }
      if (component.descriptor.setChildren != null) {
        component.descriptor.setChildren(component, b.children);
      }
      vdom.Component._update(/** @type {!vdom.Component} */ (component));
    } else {
      this._updateChildren(this.children, b.children, context);
    }
  }
};

/**
 * Dispose Virtual Node.
 */
vdom.VNode.prototype.dispose = function() {
  if ((this.flags & vdom.VNodeFlags.component) !== 0) {
    /** @type {!vdom.Component} */ (this.cref).dispose();
  } else if (this.children != null) {
    for (var i = 0; i < this.children.length; i++) {
      this.children[i].dispose();
    }
  }
};

/**
 * Update attributes.
 *
 * @param {Object<string, string>} a Old attributes.
 * @param {Object<string, string>} b New attributes.
 * @param {!Element} node
 * @protected
 */
vdom._updateAttrs = function(a, b, node) {
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
        vdom._removeAttr(node, keys[i]);
      }
    } else {
      // Remove and updateVNode attributes.
      keys = Object.keys(a);
      for (i = 0, il = keys.length; i < il; i++) {
        key = keys[i];
        if (b.hasOwnProperty(key)) {
          aValue = a[key];
          bValue = b[key];
          if (aValue !== bValue) {
            vdom._setAttr(node, key, bValue);
          }
        } else {
          vdom._removeAttr(node, key);
        }
      }

      // Insert new attributes.
      keys = Object.keys(b);
      for (i = 0, il = keys.length; i < il; i++) {
        key = keys[i];
        if (!a.hasOwnProperty(key)) {
          vdom._setAttr(node, key, b[key]);
        }
      }
    }
  } else if (b != null) {
    // a is empty, insert all attributes from b.
    keys = Object.keys(b);
    for (i = 0, il = keys.length; i < il; i++) {
      key = keys[i];
      vdom._setAttr(node, key, b[key]);
    }
  }
};

/**
 * Update properties.
 *
 * @param {Object<string, *>} a Old properties.
 * @param {Object<string, *>} b New properties.
 * @param {!Element} node
 * @protected
 */
vdom._updateProps = function(a, b, node) {
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
        node[keys[i]] = undefined;
      }
    } else {
      // Remove and updateVNode attributes.
      keys = Object.keys(a);
      for (i = 0, il = keys.length; i < il; i++) {
        key = keys[i];
        if (b.hasOwnProperty(key)) {
          aValue = a[key];
          bValue = b[key];
          if (aValue !== bValue) {
            node[key] = bValue;
          }
        } else {
          node[key] = undefined;
        }
      }

      // Insert new attributes.
      keys = Object.keys(b);
      for (i = 0, il = keys.length; i < il; i++) {
        key = keys[i];
        if (!a.hasOwnProperty(key)) {
          node[key] = b[key];
        }
      }
    }
  } else if (b != null) {
    // a is empty, insert all attributes from b.
    keys = Object.keys(b);
    for (i = 0, il = keys.length; i < il; i++) {
      key = keys[i];
      node[key] = b[key];
    }
  }
};

/**
 * Update styles.
 *
 * @param {Object<string, string>} a Old style.
 * @param {Object<string, string>} b New style.
 * @param {!CSSStyleDeclaration} style
 * @protected
 */
vdom._updateStyle = function(a, b, style) {
  var i, il;

  /**
   * @type {string}
   */
  var key;

  /**
   * @type {!Array<string>}
   */
  var keys;

  if (a != null) {
    if (b == null) {
      // b is empty, remove all styles from a.
      keys = Object.keys(a);
      for (i = 0, il = keys.length; i < il; i++) {
        style.removeProperty(keys[i]);
      }
    } else {
      // Remove and updateVNode styles.
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
};

/**
 * Update classes in the classList.
 *
 * @param {Array<string>} a Old classes.
 * @param {Array<string>} b New classes.
 * @param {DOMTokenList} classList
 * @protected
 */
vdom._updateClasses = function(a, b, classList) {
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
};

/**
 * Insert VNode
 *
 * @param {!vdom.VNode} node Node to insert.
 * @param {Node} nextRef Reference to the next html element.
 * @param {!vdom.Component} context Current context.
 * @private
 */
vdom.VNode.prototype._insertChild = function(node, nextRef, context) {
  node.create(context);
  this.ref.insertBefore(node.ref, nextRef);
  node.render(context);
};

/**
 * Move VNode
 *
 * @param {!vdom.VNode} node Node to move.
 * @param {Node} nextRef Reference to the next html element.
 * @private
 */
vdom.VNode.prototype._moveChild = function(node, nextRef) {
  this.ref.insertBefore(node.ref, nextRef);
};

/**
 * Remove VNode.
 *
 * @param {!vdom.VNode} node Node to remove.
 * @private
 */
vdom.VNode.prototype._removeChild = function(node) {
  this.ref.removeChild(node.ref);
  node.dispose();
};

/**
 * Update old children list [a] with the new one [b].
 *
 * Mixing children with explicit and implicit keys in one children list will result in undefined behaviour
 * in production mode. In development mode it will be checked for this conditions and if it is detected
 * that there are children with implicit and explicit keys, it will result in runtime error.
 *
 * @param {Array<!vdom.VNode>} a Old children list.
 * @param {Array<!vdom.VNode>} b New children list.
 * @param {!vdom.Component} context Current context.
 * @private
 */
vdom.VNode.prototype._updateChildren = function(a, b, context) {
  var aNode;
  var bNode;
  var i = 0;
  var updated = false;

  if (a != null && a.length !== 0) {
    if (b == null || b.length === 0) {
      // b is empty, remove all children from a.
      while(i < a.length) {
        this._removeChild(a[i++]);
      }
    } else {
      if (a.length === 1 && b.length === 1) {
        // Fast path when a and b have only one child.
        aNode = a[0];
        bNode = b[0];

        // Implicit key with same type or explicit key with same key.
        if ((aNode.key == null && aNode._sameType(bNode)) ||
            (aNode.key != null && aNode.key === bNode.key)) {
          aNode.update(bNode, context);
        } else {
          this._removeChild(aNode);
          this._insertChild(bNode, null, context);
        }
      } else if (a.length === 1) {
        // Fast path when a have 1 child.
        aNode = a[0];
        if (aNode.key == null) {
          while (i < b.length) {
            bNode = b[i++];
            if (aNode._sameType(bNode)) {
              aNode.update(bNode, context);
              updated = true;
              break;
            }
            this._insertChild(bNode, aNode.ref, context);
          }
        } else {
          while (i < b.length) {
            bNode = b[i++];
            if (aNode.key === bNode.key) {
              aNode.update(bNode, context);
              updated = true;
              break;
            }
            this._insertChild(bNode, aNode.ref, context);
          }
        }
        if (updated) {
          while (i < b.length) {
            this._insertChild(b[i++], null, context);
          }
        } else {
          this._removeChild(aNode);
        }
      } else if (b.length === 1) {
        // Fast path when b have 1 child.
        bNode = b[0];
        if (bNode.key == null) {
          while (i < a.length) {
            aNode = a[i++];
            if (aNode._sameType(bNode)) {
              aNode.update(bNode, context);
              updated = true;
              break;
            }
            this._removeChild(aNode);
          }
        } else {
          while (i < a.length) {
            aNode = a[i++];
            if (aNode.key === bNode.key) {
              aNode.update(bNode, context);
              updated = true;
              break;
            }
            this._removeChild(aNode);
          }
        }

        if (updated) {
          while (i < a.length) {
            this._removeChild(a[i++]);
          }
        } else {
          this._insertChild(bNode, null, context);
        }
      } else {
        // a and b have more than 1 child.
        if (a[0].key == null) {
          this._updateImplicitChildren(a, b, context);
        } else {
          this._updateExplicitChildren(a, b, context);
        }
      }
    }
  } else if (b != null && b.length > 0) {
    // a is empty, insert all children from b
    for (i = 0; i < b.length; i++) {
      this._insertChild(b[i], null, context);
    }
  }
};

/**
 * Update children with implicit keys.
 *
 * Any heuristics that is used in this algorithm is an undefined behaviour, and external dependencies should
 * not rely on the knowledge about this algorithm, because it can be changed in any time.
 *
 * @param {!Array<!vdom.VNode>} a Old children list.
 * @param {!Array<!vdom.VNode>} b New children list.
 * @param {!vdom.Component} context Current context.
 * @private
 */
vdom.VNode.prototype._updateImplicitChildren = function(a, b, context) {
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

    if (!aNode._sameType(bNode)) {
      break;
    }

    aStart++;
    bStart++;

    aNode.update(bNode, context);
  }

  // Update nodes with the same type at the end.
  while (aStart <= aEnd && bStart <= bEnd) {
    aNode = a[aEnd];
    bNode = b[bEnd];

    if (!aNode._sameType(bNode)) {
      break;
    }

    aEnd--;
    bEnd--;

    aNode.update(bNode, context);
  }

  // Iterate through the remaining nodes and if they have the same type, then updateVNode, otherwise just
  // remove the old node and insert the new one.
  while (aStart <= aEnd && bStart <= bEnd) {
    aNode = a[aStart++];
    bNode = b[bStart++];
    if (aNode._sameType(bNode)) {
      aNode.update(bNode, context);
    } else {
      this._insertChild(bNode, aNode.ref, context);
      this._removeChild(aNode);
    }
  }

  // All nodes from a are updated, insert the rest from b.
  while (aStart <= aEnd) {
    this._removeChild(a[aStart++]);
  }

  nextPos = bEnd + 1;
  next = nextPos < b.length ? b[nextPos].ref : null;

  // All nodes from b are updated, remove the rest from a.
  while (bStart <= bEnd) {
    this._insertChild(b[bStart++], next, context);
  }
};

/**
 * Update children with explicit keys.
 *
 * @param {!Array<!vdom.VNode>} a Old children list.
 * @param {!Array<!vdom.VNode>} b New children list.
 * @param {!vdom.Component} context Current context.
 * @private
 */
vdom.VNode.prototype._updateExplicitChildren = function(a, b, context) {
  var aStart = 0;
  var bStart = 0;
  var aEnd = a.length - 1;
  var bEnd = b.length - 1;
  var aStartNode = a[aStart];
  var bStartNode = b[bStart];
  var aEndNode = a[aEnd];
  var bEndNode = b[bEnd];
  /** @type {number} */
  var i;
  /** @type {number} */
  var j;
  var stop = false;
  var nextPos;
  var next;
  /** @type {vdom.VNode} */
  var aNode;
  /** @type {vdom.VNode} */
  var bNode;
  var lastTarget = 0;
  /** @type {number} */
  var pos;
  var node;

  // Algorithm that works on simple cases with basic list transformations.
  //
  // It tries to reduce the diff problem by simultaneously iterating from the beginning and the end of both
  // lists, if keys are the same, they're updated, if node is moved from the beginning to the end of the
  // current cursor positions or vice versa it just performs move operation and continues to reduce the diff
  // problem.
  outer: do {
    stop = true;

    // Update nodes with the same key at the beginning.
    while (aStartNode.key === bStartNode.key) {
      aStartNode.update(bStartNode, context);
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
      aEndNode.update(bEndNode, context);
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
      aStartNode.update(bEndNode, context);
      nextPos = bEnd + 1;
      next = nextPos < b.length ? b[nextPos].ref : null;
      this._moveChild(bEndNode, next);
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
      aEndNode.update(bStartNode, context);
      this._moveChild(bStartNode, aStartNode.ref);
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
      this._insertChild(b[bStart++], next, context);
    }
  } else if (bStart > bEnd) {
    // All nodes from b are updated, remove the rest from a.
    while (aStart <= aEnd) {
      this._removeChild(a[aStart++]);
    }
  } else {
    // Perform more complex updateVNode algorithm on the remaining nodes.
    //
    // We start by marking all nodes from b as inserted, then we try to find all removed nodes and
    // simultaneously perform updates on the nodes that exists in both lists and replacing "inserted"
    // marks with the position of the node from the list b in list a. Then we just need to perform
    // slightly modified LIS algorithm, that ignores "inserted" marks and find common subsequence and
    // move all nodes that doesn't belong to this subsequence, or insert if they have "inserted" mark.
    var aLength = aEnd - aStart + 1;
    var bLength = bEnd - bStart + 1;
    var sources = new Array(bLength);

    // Mark all nodes as inserted.
    for (i = 0; i < bLength; i++) {
      sources[i] = -1;
    }

    var moved = false;
    var removeOffset = 0;

    // When lists a and b are small, we are using naive O(M*N) algorithm to find removed children.
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
            aNode.update(bNode, context);
            removed = false;
            break;
          }
        }
        if (removed) {
          this._removeChild(aNode);
          removeOffset++;
        }
      }
    } else {
      /** @type {Object<(string|number|null), number>} */
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
          aNode.update(bNode, context);
        } else {
          this._removeChild(aNode);
          removeOffset++;
        }
      }
    }

    if (moved) {
      var seq = vdom._lis(sources);
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
          this._insertChild(node, next, context);
        } else {
          if (j < 0 || i != seq[j]) {
            pos = i + bStart;
            node = b[pos];
            nextPos = pos + 1;
            next = nextPos < b.length ? b[nextPos].ref : null;
            this._moveChild(node, next);
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
          this._insertChild(node, next, context);
        }
      }
    }
  }
};

/**
 * Slightly modified Longest Increased Subsequence algorithm, it ignores items that have -1 value.
 * They're representing new items.
 *
 * This algorithm is used to find minimum number of move operations when updating children with explicit
 * keys.
 *
 * http://en.wikipedia.org/wiki/Longest_increasing_subsequence
 *
 * @param {!Array<number>} a
 * @returns {!Array<number>}
 * @protected
 */
vdom._lis = function(a) {
  var p = a.slice(0);
  /** @type {!Array<number>} */
  var result = [0];
  var i;
  var il;
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
};

/**
 * Component Descriptor.
 *
 * @constructor
 * @template D, S
 * @struct
 * @final
 */
vdom.CDescriptor = function() {
  this.flags = 0;
  this.tag = 'div';

  /** @type {?function (!vdom.Component<D, S>)} */
  this.init = null;

  /** @type {?function (!vdom.Component<D, S>, D)} */
  this.setData = vdom.CDescriptor._defaultSetData;

  /** @type {?function (!vdom.Component<D, S>, Array<!vdom.VNode>)} */
  this.setChildren = null;

  /** @type {?function (!vdom.Component<D, S>)} */
  this.update = null;

  /** @type {?function (!vdom.Component<D, S>)} */
  this.invalidated = null;

  /** @type {?function (!vdom.Component<D, S>)} */
  this.disposed = null;
};

/**
 * Component Flags.
 *
 * @enum {number}
 */
vdom.ComponentFlags = {
  dirty:             0x0001,
  attached:          0x0002,
  svg:               0x0004,
  mounting:          0x0008,
  shouldUpdateFlags: 0x0003
};

/**
 * Component.
 *
 * @constructor
 * @template D, S
 * @param {!vdom.CDescriptor<D, S>} descriptor
 * @param {vdom.Component} parent
 * @param {*} data
 * @param {Array<!vdom.VNode>} children
 * @struct
 * @final
 */
vdom.Component = function(descriptor, parent, data, children) {
  /** @type {vdom.ComponentFlags|number} */
  this.flags = vdom.ComponentFlags.shouldUpdateFlags;

  /** @type {!vdom.CDescriptor<D, S>} */
  this.descriptor = descriptor;

  /** @type {vdom.Component} */
  this.parent = parent;

  /** @type {number} */
  this.depth = parent == null ? 0 : parent.depth + 1;

  /** @type {D} */
  this.data = data;

  /** @type {S} */
  this.state = null;

  this.children = children;

  /**
   * Root node in the Components virtual tree.
   * @type {vdom.VNode}
   */
  this.root = null;

  /**
   * Reference to the Html Element.
   * @type {Element}
   */
  this.element = document.createElement(descriptor.tag);

  /**
   * @type {?function (vdom.Component<D, S>)}
   * @private
   */
  this._update = null;
};

/**
 * Update internal tree using virtual dom representation.
 *
 * If this method is called during mounting phase, then virtual dom will be mounted on top of the existing
 * html tree.
 *
 * @param {!vdom.VNode} newRoot
 */
vdom.Component.prototype.updateRoot = function(newRoot) {
  if (this.root == null) {
    newRoot.cref = this;
    if ((this.flags & vdom.ComponentFlags.mounting) !== 0) {
      //vNodeMount(this.element, this);
      this.flags &= ~vdom.ComponentFlags.mounting;
    } else {
      newRoot.ref = this.element;
      newRoot.render(this);
    }
  } else {
    this.root.update(newRoot, this);
  }
  this.root = newRoot;
};

/**
 * Invalidate Component.
 */
vdom.Component.prototype.invalidate = function() {
  if ((this.flags & vdom.ComponentFlags.dirty) === 0) {
    this.flags |= vdom.ComponentFlags.dirty;

    if (this._update == null) {
      var self = this;
      this._update = function() { vdom.Component._update(self); };
    }

    kivi.env.scheduler.nextFrame().write(this._update, this.depth);
  }
};

/**
 * Dispose Component.
 */
vdom.Component.prototype.dispose = function() {
  this.flags &= ~vdom.ComponentFlags.attached;
  if (this.root != null) {
    this.root.dispose();
  }
  var descriptor = this.descriptor;
  if (descriptor.disposed != null) {
    descriptor.disposed(this);
  }
};

/**
 * Default setData method.
 *
 * @param {!vdom.Component<*, *>} component
 * @param {*} data
 * @protected
 */
vdom.CDescriptor._defaultSetData = function(component, data) {
  if (component.data !== data) {
    component.data = data;
    component.flags |= vdom.ComponentFlags.dirty;
  }
};

/**
 * Create a [vdom.Component].
 *
 * @param {!vdom.CDescriptor} descriptor
 * @param {*} data
 * @param {Array<!vdom.VNode>} children
 * @param {vdom.Component} context
 * @returns {!vdom.Component}
 */
vdom.Component.create = function(descriptor, data, children, context) {
  var c = new vdom.Component(descriptor, context, data, children);
  if (descriptor.init != null) {
    descriptor.init(c);
  }
  return c;
};

/**
 * @param {!vdom.Component} component
 * @protected
 */
vdom.Component._update = function(component) {
  if ((component.flags & vdom.ComponentFlags.shouldUpdateFlags) == vdom.ComponentFlags.shouldUpdateFlags) {
    component.descriptor.update(component);
    component.flags &= ~vdom.ComponentFlags.dirty;
  }
};

/**
 * Instantiate and inject component into container.
 *
 * @param {!vdom.CDescriptor} descriptor
 * @param {Object} data
 * @param {Element} container
 * @returns {!vdom.Component}
 */
vdom.injectComponent = function(descriptor, data, container) {
  var c = vdom.Component.create(descriptor, data, null, null);
  container.appendChild(c.element);
  vdom.Component._update(c);
  return c;
};
