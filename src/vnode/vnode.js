goog.provide('kivi.VNode');
goog.require('kivi');
goog.require('kivi.CTag');
goog.require('kivi.Component');
goog.require('kivi.ContainerManager');
goog.require('kivi.HtmlNamespace');
goog.require('kivi.VNodeDebugFlags');
goog.require('kivi.VNodeFlags');
goog.require('kivi.debug.printError');
goog.require('kivi.sync.dynamicShapeAttrs');
goog.require('kivi.sync.dynamicShapeProps');
goog.require('kivi.sync.staticShapeAttrs');
goog.require('kivi.sync.staticShapeProps');
goog.require('kivi.sync.setAttr');

/**
 * Virtual DOM Node.
 *
 * @template P
 * @param {number} flags Flags.
 * @param {string|kivi.CTag|kivi.CDescriptor|null} tag Tag should contain html tag name if VNode represents an element,
 *   or reference to the [kivi.CDescriptor] if it represents a Component.
 * @param {*} props
 * @constructor
 * @struct
 * @final
 */
kivi.VNode = function(flags, tag, props) {
  this.flags = flags;
  this.tag = tag;
  /**
   * Key that should be unique among its siblings.
   *
   * @type {*}
   */
  this.key_ = null;

  /**
   * Properties.
   *
   * @type {*}
   */
  this.props_ = props;

  /**
   * Element attributes.
   *
   * @type {?Object<string,string>}
   */
  this.attrs_ = null;

  /**
   * Element style in css string format.
   *
   * @type {?string}
   */
  this.style_ = null;

  /**
   * Element className.
   *
   * @type {?string}
   */
  this.classes_ = null;

  /**
   * List of children nodes. If VNode is a Component, children nodes will be transferred to the Component.
   *
   * @type {?Array<!kivi.VNode>|string|boolean}
   */
  this.children_ = null;

  /**
   * Reference to the [Node]. It will be available after [kivi.VNode] is created or synced. Each time
   * [kivi.VNode] is synced, reference to the [Node] is transferred from the previous node to the new one.
   *
   * @type {?Node}
   */
  this.ref = null;

  /**
   * Reference to the [kivi.Component]. It will be available after [kivi.VNode] is created or synced. Each
   * time [kivi.VNode] is synced, reference to the [kivi.Component] is transferred from the previous node to
   * the new one.
   *
   * @type {?kivi.Component|?kivi.ContainerManager}
   */
  this.cref = null;

  if (kivi.DEBUG) {
    /**
     * Debug Properties are used because VNode properties are frozen.
     *
     * @private {{flags: number}}
     */
    this._debugProperties = {
      flags: 0
    };
  }
};

/**
 * Create a [kivi.VNode] representing a [Text] node.
 *
 * @param {string} content
 * @returns {!kivi.VNode<string>}
 */
kivi.VNode.createText = function(content) {
  return new kivi.VNode(kivi.VNodeFlags.TEXT, null, content);
};

/**
 * Create a [kivi.VNode] representing a [Element] node.
 *
 * @param {string|!kivi.CTag} tag
 * @returns {!kivi.VNode<?Object<string,*>>}
 */
kivi.VNode.createElement = function(tag) {
  return new kivi.VNode(kivi.VNodeFlags.ELEMENT, tag, null);
};

/**
 * Create a [kivi.VNode] representing a [SVGElement] node.
 *
 * @param {string} tag
 * @returns {!kivi.VNode<?Object<string,*>>}
 */
kivi.VNode.createSvgElement = function(tag) {
  return new kivi.VNode(kivi.VNodeFlags.ELEMENT | kivi.VNodeFlags.SVG, tag, null);
};

/**
 * Create a [kivi.VNode] representing a [HTMLInputElement] node with text value.
 *
 * @param {string|!kivi.CTag=} opt_tag
 * @returns {!kivi.VNode<?Object<string,*>>}
 */
kivi.VNode.createTextInput = function(opt_tag) {
  return new kivi.VNode(
      kivi.VNodeFlags.ELEMENT | kivi.VNodeFlags.TEXT_INPUT_ELEMENT,
      opt_tag === void 0 ? 'input' : opt_tag,
      null);
};

/**
 * Create a [kivi.VNode] representing a [HTMLInputElement] node with boolean value.
 *
 * @param {string|!kivi.CTag=} opt_tag
 * @returns {!kivi.VNode<?Object<string,*>>}
 */
kivi.VNode.createCheckedInput = function(opt_tag) {
  return new kivi.VNode(
      kivi.VNodeFlags.ELEMENT | kivi.VNodeFlags.CHECKED_INPUT_ELEMENT,
      opt_tag === void 0 ? 'input' : opt_tag,
      null);
};

/**
 * Create a [kivi.VNode] representing a [kivi.Component] node.
 *
 * @param {!kivi.CDescriptor} descriptor
 * @param {*=} opt_props
 * @returns {!kivi.VNode<*>}
 */
kivi.VNode.createComponent = function(descriptor, opt_props) {
  if (opt_props === void 0) opt_props = null;
  return new kivi.VNode(kivi.VNodeFlags.COMPONENT, descriptor, opt_props);
};

/**
 * Create a [kivi.VNode] representing a root node.
 *
 * @returns {!kivi.VNode<null>}
 */
kivi.VNode.createRoot = function() {
  return new kivi.VNode(kivi.VNodeFlags.ROOT, null, null);
};

/**
 * Create a [kivi.VNode] representing a [Element] node with [kivi.CTag] tag.
 *
 * @param {!kivi.CTag} ctag
 * @param {*=} opt_props
 * @returns {!kivi.VNode<?Object<string,*>>}
 */
kivi.VNode.createCElement = function(ctag, opt_props) {
  if (opt_props === void 0) {
    return new kivi.VNode(kivi.VNodeFlags.ELEMENT | kivi.VNodeFlags.CTAG, ctag, null);
  }
  return new kivi.VNode(
      kivi.VNodeFlags.ELEMENT | kivi.VNodeFlags.CTAG | kivi.VNodeFlags.CTAG_UPDATE_HANDLER,
      ctag, opt_props);
};

/**
 * Create a [kivi.VNode] representing a [SVGElement] node with [kivi.CTag] tag.
 *
 * @param {!kivi.CTag} ctag
 * @param {*=} opt_props
 * @returns {!kivi.VNode<?Object<string,*>>}
 */
kivi.VNode.createCSvgElement = function(ctag, opt_props) {
  if (opt_props === void 0) {
    return new kivi.VNode(kivi.VNodeFlags.ELEMENT | kivi.VNodeFlags.SVG | kivi.VNodeFlags.CTAG, ctag, null);
  }
  return new kivi.VNode(
      kivi.VNodeFlags.ELEMENT | kivi.VNodeFlags.SVG | kivi.VNodeFlags.CTAG | kivi.VNodeFlags.CTAG_UPDATE_HANDLER,
      ctag, opt_props);
};

/**
 * Create a [kivi.VNode] representing a root node with [kivi.CTag] tag.
 *
 * @param {*=} opt_props
 * @returns {!kivi.VNode<?Object<string,*>>}
 */
kivi.VNode.createCRoot = function(opt_props) {
  if (opt_props === void 0) {
    return new kivi.VNode(kivi.VNodeFlags.ROOT | kivi.VNodeFlags.CTAG, null, null);
  }
  return new kivi.VNode(
      kivi.VNodeFlags.ROOT | kivi.VNodeFlags.CTAG | kivi.VNodeFlags.CTAG_UPDATE_HANDLER,
      null, opt_props);
};

/**
 * Set key.
 *
 * @param {*} key
 * @returns {!kivi.VNode<P>}
 */
kivi.VNode.prototype.key = function(key) {
  this.key_ = key;
  return this;
};

/**
 * Set props.
 *
 * @param {*} props
 * @returns {!kivi.VNode<P>}
 */
kivi.VNode.prototype.props = function(props) {
  if (kivi.DEBUG) {
    if ((this.flags & (kivi.VNodeFlags.ELEMENT | kivi.VNodeFlags.ROOT)) === 0) {
      throw new Error('Failed to set props on VNode: props method should be called on element or component root nodes only.')
    }
  }
  this.props_ = props;
  return this;
};

/**
 * Set props with dynamic shape.
 *
 * @param {*} props
 * @returns {!kivi.VNode<P>}
 */
kivi.VNode.prototype.dynamicShapeProps = function(props) {
  if (kivi.DEBUG) {
    if ((this.flags & (kivi.VNodeFlags.ELEMENT | kivi.VNodeFlags.ROOT)) === 0) {
      throw new Error('Failed to set props on VNode: props method should be called on element or component root nodes only.')
    }
  }
  this.flags |= kivi.VNodeFlags.DYNAMIC_SHAPE_PROPS;
  this.props_ = props;
  return this;
};

/**
 * Set attrs.
 *
 * @param {?Object<string,string>} attrs
 * @returns {!kivi.VNode<P>}
 */
kivi.VNode.prototype.attrs = function(attrs) {
  if (kivi.DEBUG) {
    if ((this.flags & (kivi.VNodeFlags.ELEMENT | kivi.VNodeFlags.ROOT)) === 0) {
      throw new Error('Failed to set attrs on VNode: attrs method should be called on element or component root nodes only.')
    }
  }
  this.attrs_ = attrs;
  return this;
};

/**
 * Set attrs with dynamic shape.
 *
 * @param {?Object<string,string>} attrs
 * @returns {!kivi.VNode<P>}
 */
kivi.VNode.prototype.dynamicShapeAttrs = function(attrs) {
  if (kivi.DEBUG) {
    if ((this.flags & (kivi.VNodeFlags.ELEMENT | kivi.VNodeFlags.ROOT)) === 0) {
      throw new Error('Failed to set attrs on VNode: dynamicAttrs method should be called on element or component root nodes only.')
    }
  }
  this.flags |= kivi.VNodeFlags.DYNAMIC_SHAPE_ATTRS;
  this.attrs_ = attrs;
  return this;
};

/**
 * Set style.
 *
 * @param {?string} style
 * @returns {!kivi.VNode<P>}
 */
kivi.VNode.prototype.style = function(style) {
  if (kivi.DEBUG) {
    if ((this.flags & (kivi.VNodeFlags.ELEMENT | kivi.VNodeFlags.ROOT)) === 0) {
      throw new Error('Failed to set style on VNode: style method should be called on element or component root nodes only.')
    }
  }
  this.style_ = style;
  return this;
};

/**
 * Set className.
 *
 * @param {?string} classes
 * @returns {!kivi.VNode<P>}
 */
kivi.VNode.prototype.classes = function(classes) {
  if (kivi.DEBUG) {
    if ((this.flags & (kivi.VNodeFlags.ELEMENT | kivi.VNodeFlags.ROOT | kivi.VNodeFlags.COMPONENT)) === 0) {
      throw new Error('Failed to set classes on VNode: classes method should be called on element, component or component root nodes only.')
    }
  }
  this.classes_ = classes;
  return this;
};

/**
 * Set children.
 *
 * @param {?Array<!kivi.VNode>|string} children
 * @returns {!kivi.VNode<P>}
 */
kivi.VNode.prototype.children = function(children) {
  if (kivi.DEBUG) {
    if ((this.flags & (kivi.VNodeFlags.ELEMENT | kivi.VNodeFlags.ROOT | kivi.VNodeFlags.COMPONENT)) === 0) {
      throw new Error('Failed to set children on VNode: children method should be called on element, component or component root nodes only.')
    }
  }
  this.children_ = children;
  return this;
};

/**
 * Set text value for Input Elements.
 *
 * @param {string} value
 * @returns {!kivi.VNode<P>}
 */
kivi.VNode.prototype.value = function(value) {
  if (kivi.DEBUG) {
    if ((this.flags & (kivi.VNodeFlags.ELEMENT | kivi.VNodeFlags.TEXT_INPUT_ELEMENT)) === 0) {
      throw new Error('Failed to set value on VNode: value method should be called on input elements.')
    }
  }
  this.children_ = value;
  return this;
};

/**
 * Set checked value for Input Elements.
 *
 * @param {boolean} value
 * @returns {!kivi.VNode<P>}
 */
kivi.VNode.prototype.checked = function(value) {
  if (kivi.DEBUG) {
    if ((this.flags & (kivi.VNodeFlags.ELEMENT | kivi.VNodeFlags.CHECKED_INPUT_ELEMENT)) === 0) {
      throw new Error('Failed to set value on VNode: value method should be called on input elements.')
    }
  }
  this.children_ = value;
  return this;
};

/**
 * Enable Track By Key mode for children reconciliation.
 *
 * @returns {!kivi.VNode<P>}
 */
kivi.VNode.prototype.trackByKey = function() {
  if (kivi.DEBUG) {
    if ((this.flags & (kivi.VNodeFlags.ELEMENT | kivi.VNodeFlags.ROOT)) === 0) {
      throw new Error('Failed to set trackByKey mode on VNode: trackByKey method should be called on element or component root nodes only.')
    }
  }
  this.flags |= kivi.VNodeFlags.TRACK_BY_KEY;
  return this;
};

/**
 * Set container manager for this node, it will be responsible for
 * inserting/removing/moving nodes.
 *
 * @param {!kivi.ContainerManager} manager
 * @returns {!kivi.VNode<P>}
 */
kivi.VNode.prototype.managedContainer = function(manager) {
  if (kivi.DEBUG) {
    if ((this.flags & (kivi.VNodeFlags.ELEMENT | kivi.VNodeFlags.ROOT)) === 0) {
      throw new Error('Failed to set managedContainer mode on VNode: managedContainer method should be called on element or component root nodes only.')
    }
  }
  this.flags |= kivi.VNodeFlags.MANAGED_CONTAINER;
  this.cref = manager;
  return this;
};

/**
 * Disable errors in DEBUG mode when children shape is changing.
 *
 * @returns {!kivi.VNode<P>}
 */
kivi.VNode.prototype.disableChildrenShapeError = function() {
  if (kivi.DEBUG) {
    if ((this.flags & (kivi.VNodeFlags.ELEMENT | kivi.VNodeFlags.ROOT)) === 0) {
      throw new Error('Failed to disable children shape error on VNode: disableChildrenShapeError method should be called on element or component root nodes only.')
    }
    this._debugProperties.flags |= kivi.VNodeDebugFlags.DISABLE_CHILDREN_SHAPE_ERROR;
  }
  return this;
};

/**
 * Disable freezing in DEBUG mode.
 *
 * One use case when it is quite useful, it is for ContentEditable editor.
 * We monitoring changes in DOM, and apply this changes to VNodes, so that
 * when we rerender text block, we don't touch properties that is already
 * up to date (prevents spellchecker flickering).
 *
 * @returns {!kivi.VNode<P>}
 */
kivi.VNode.prototype.disableFreeze = function() {
  if (kivi.DEBUG) {
    this._debugProperties.flags |= kivi.VNodeDebugFlags.DISABLE_FREEZE;
  }
  return this;
};

/**
 * Checks if two nodes can be synced.
 *
 * @private
 * @param {!kivi.VNode} b
 * @returns {boolean}
 */
kivi.VNode.prototype._canSync = function(b) {
  return (this.flags === b.flags &&
          this.tag === b.tag &&
          this.key_ === b.key_);
};

/**
 * Create root element of the object, or [kivi.Component] for component nodes.
 *
 * @param {!kivi.Component} context
 */
kivi.VNode.prototype.create = function(context) {
  var flags = this.flags;

  if (kivi.DEBUG) {
    if (this.ref !== null && ((flags & kivi.VNodeFlags.COMMENT_PLACEHOLDER) === 0)) {
      throw new Error('Failed to create VNode: VNode already has a reference to the DOM node.');
    }
    this.flags &= ~kivi.VNodeFlags.COMMENT_PLACEHOLDER;
  }

  if ((flags & kivi.VNodeFlags.TEXT) !== 0) {
    this.ref = document.createTextNode(/** @type {string} */(this.props_));
  } else if ((flags & kivi.VNodeFlags.ELEMENT) !== 0) {
    if (typeof this.tag === 'string') {
      if ((flags & kivi.VNodeFlags.SVG) === 0) {
        this.ref = document.createElement(this.tag);
      } else {
        this.ref = document.createElementNS(kivi.HtmlNamespace.SVG, this.tag);
      }
    } else {
      this.ref = /** @type {!kivi.CTag} */(this.tag).createElement();
    }
  } else if ((flags & kivi.VNodeFlags.COMPONENT) !== 0) {
    var component = /** @type {!kivi.CDescriptor} */(this.tag).createComponent(context);
    this.ref = component.element;
    this.cref = component;
  }
};

/**
 * Create Comment placeholder.
 *
 * Comment placeholder can be used to delay element appearance in animations.
 */
kivi.VNode.prototype.createCommentPlaceholder = function() {
  if (kivi.DEBUG) {
    if (this.ref !== null) {
      throw new Error('Failed to create VNode Comment Placeholder: VNode already has a reference to the DOM node.');
    }
    this.flags |= kivi.VNodeFlags.COMMENT_PLACEHOLDER;
  }
  this.ref = document.createComment('');
};

/**
 * Render internal representation of the Virtual Node.
 *
 * @param {!kivi.Component} context
 */
kivi.VNode.prototype.render = function(context) {
  /** @type {number} */
  var i;

  if (kivi.DEBUG) {
    if (this.ref === null) {
      throw new Error('Failed to render VNode: VNode should be created before render.');
    }
    if ((this.flags & kivi.VNodeFlags.COMMENT_PLACEHOLDER) !== 0) {
      throw new Error('Failed to render VNode: VNode comment placeholder cannot be rendered.');
    }
    if ((this._debugProperties.flags & kivi.VNodeDebugFlags.RENDERED) !== 0) {
      throw new Error('Failed to render VNode: VNode cannot be rendered twice.');
    }
    if ((this._debugProperties.flags & kivi.VNodeDebugFlags.MOUNTED) !== 0) {
      throw new Error('Failed to render VNode: VNode cannot be rendered after mount.');
    }
    this._debugProperties.flags |= kivi.VNodeDebugFlags.RENDERED;

    if (this.children_ !== null && typeof this.children_ !== 'string') {
      if ((this.flags & kivi.VNodeFlags.TRACK_BY_KEY) !== 0) {
        for (i = 0; i < this.children_.length; i++) {
          if (/** @type {!Array<!kivi.VNode>} */(this.children_)[i].key_ === null) {
            throw new Error('Failed to render VNode: rendering children with trackByKey requires that all' +
                ' children have keys.');
          }
        }
      }
    }
  }

  /** @type {number} */
  var il;
  /** @type {string|number} */
  var key;
  var keys;
  var flags = this.flags;

  /** @type {?Element} */
  var ref;

  if ((flags & (kivi.VNodeFlags.ELEMENT | kivi.VNodeFlags.ROOT)) !== 0) {
    ref = /** @type {!Element} */(this.ref);
    if ((flags & (kivi.VNodeFlags.CTAG_UPDATE_HANDLER)) === 0) {
      var props = /** @type {!Object<string, *>} */(this.props_);
      if (props !== null) {
        keys = Object.keys(props);
        for (i = 0, il = keys.length; i < il; i++) {
          key = keys[i];
          ref[key] = props[key];
        }
      }

      if (this.attrs_ !== null) {
        keys = Object.keys(this.attrs_);
        for (i = 0, il = keys.length; i < il; i++) {
          key = keys[i];
          kivi.sync.setAttr(ref, key, this.attrs_[key]);
        }
      }

      if (this.style_ !== null) {
        // perf optimization for webkit/blink, probably will need to revisit this in the future.
        if ((flags & kivi.VNodeFlags.SVG) === 0) {
          ref.style.cssText = this.style_;
        } else {
          ref.setAttribute('style', this.style_)
        }
      }

      if (this.classes_ !== null) {
        if (kivi.DEBUG) {
          var className = ref.getAttribute('class');
          if ((flags & kivi.VNodeFlags.ROOT) !== 0 && className) {
            kivi.debug.printError(`VNode render: Component root node overwrited className property` +
                ` "${className}" with "${this.classes_}".`)
          }
        }
        // perf optimization for webkit/blink, probably will need to revisit this in the future.
        if ((flags & kivi.VNodeFlags.SVG) === 0) {
          ref.className = this.classes_;
        } else {
          ref.setAttribute('class', this.classes_)
        }
      }
    } else {
      if ((flags & kivi.VNodeFlags.ROOT) === 0) {
        /** @type {!kivi.CTag} */(this.tag).updateHandler_(ref, void 0, this.props_);
      } else {
        /** @type {!kivi.CTag} */(context.descriptor.tag).updateHandler_(ref, void 0, this.props_);
      }
    }

    var children = this.children_;
    if (children !== null) {
      if ((this.flags & kivi.VNodeFlags.INPUT_ELEMENT) === 0) {
        if (typeof children === 'string') {
          ref.textContent = children;
        } else {
          for (i = 0, il = children.length; i < il; i++) {
            this._insertChild(children[i], null, context);
          }
        }
      } else {
        var iref = /** @type {!HTMLInputElement} */(this.ref);
        if ((this.flags & kivi.VNodeFlags.TEXT_INPUT_ELEMENT) !== 0) {
          iref.value = /** @type {string} */(this.children_);
        } else { // ((this.flags & kivi.VNodeFlags.CHECKED_INPUT_ELEMENT) !== 0)
          iref.checked = /** @type {boolean} */(this.children_);
        }
      }
    }
  } else if ((flags & kivi.VNodeFlags.COMPONENT) !== 0) {
    var c = /** @type {!kivi.Component} */(this.cref);
    ref = /** @type {!Element} */(this.ref);

    if (this.classes_ !== null) {
      // perf optimization for webkit/blink, probably will need to revisit this in the future.
      if ((flags & kivi.VNodeFlags.SVG) === 0) {
        ref.className = this.classes_;
      } else {
        ref.setAttribute('class', this.classes_)
      }
    }

    c.setData(this.props_);
    c.setChildren(/** @type {?Array<!kivi.VNode>|string} */(this.children_));
    c.update();
  }

  this._freeze();
};

/**
 * Mount Virtual Node on top of existing html.
 *
 * @param {!Node} node
 * @param {!kivi.Component} context
 */
kivi.VNode.prototype.mount = function(node, context) {
  if (kivi.DEBUG) {
    if (this.ref !== null) {
      throw new Error('Failed to mount VNode: VNode cannot be mounted if it already has a reference to DOM Node.');
    }
    if ((this.flags & kivi.VNodeFlags.COMMENT_PLACEHOLDER) !== 0) {
      throw new Error('Failed to mount VNode: VNode comment placeholder cannot be mounted.');
    }
    if ((this._debugProperties.flags & kivi.VNodeDebugFlags.RENDERED) !== 0) {
      throw new Error('Failed to mount VNode: VNode cannot be mounted after render.');
    }
    if ((this._debugProperties.flags & kivi.VNodeDebugFlags.MOUNTED) !== 0) {
      throw new Error('Failed to mount VNode: VNode cannot be mounted twice.');
    }
    this._debugProperties.flags |= kivi.VNodeDebugFlags.MOUNTED;
  }

  var flags = this.flags;
  var children = this.children_;
  var i;

  if (kivi.DEBUG) {
    if (children !== null && typeof children !== 'string') {
      if ((flags & kivi.VNodeFlags.TRACK_BY_KEY) !== 0) {
        for (i = 0; i < children.length; i++) {
          if (/** @type {!Array<!kivi.VNode>} */(children)[i].key_ === null) {
            throw new Error('Failed to mount VNode: mounting children with trackByKey requires that all' +
                            ' children have keys.');
          }
        }
      }
    }
  }
  this.ref = node;

  if ((flags & kivi.VNodeFlags.COMPONENT) !== 0) {
    var cref = this.cref = /** @type {!kivi.CDescriptor} */(this.tag).mountComponent(context, /** @type {!Element} */(node));
    cref.setData(this.props_);
    cref.setChildren(/** @type {?Array<!kivi.VNode>|string} */(this.children_));
    cref.update();
  } else {
    if (children !== null && typeof children !== 'string' && children.length > 0) {
      /** @type {?Node} */
      var child = node.firstChild;

      // Adjacent text nodes should be separated by Comment node "<!---->", so we can properly mount them.
      var commentNode;
      while (child.nodeType === 8) {
        commentNode = child;
        child = child.nextSibling;
        node.removeChild(commentNode);
      }
      for (i = 0; i < children.length; i++) {
        if (kivi.DEBUG) {
          if (!child) {
            throw new Error('Failed to mount VNode: cannot find matching node.');
          }
        }
        /** @type {!Array<!kivi.VNode>} */(children)[i].mount(child, context);
        child = child.nextSibling;
        while (child.nodeType === 8) {
          commentNode = child;
          child = child.nextSibling;
          node.removeChild(commentNode);
        }
      }
    }
  }

  this._freeze();
};

/**
 * Synchronize Virtual Node.
 *
 * When `this` node is synced with node `b`, `this` node should be considered as destroyed, and any access
 * to it after synced is an undefined behaviour.
 *
 * @param {!kivi.VNode<P>} b New node
 * @param {!kivi.Component} context
 */
kivi.VNode.prototype.sync = function(b, context) {
  if (kivi.DEBUG) {
    if ((this._debugProperties.flags & (kivi.VNodeDebugFlags.RENDERED | kivi.VNodeDebugFlags.MOUNTED)) === 0) {
      throw new Error('Failed to sync VNode: VNode should be rendered or mounted before sync.');
    }
    b._debugProperties.flags |= this._debugProperties.flags &
        (kivi.VNodeDebugFlags.RENDERED |
         kivi.VNodeDebugFlags.MOUNTED |
         kivi.VNodeDebugFlags.ATTACHED |
         kivi.VNodeDebugFlags.DETACHED);
  }

  var ref = /** @type {!Element} */(this.ref);
  var flags = this.flags;
  /** @type {!kivi.Component} */
  var component;
  var className;

  if (kivi.DEBUG) {
    if (this.flags !== b.flags) {
      throw new Error('Failed to sync VNode: flags does not match (old: ' + this.flags + ', new: ' + b.flags + ')');
    }
    if (this.tag !== b.tag) {
      throw new Error('Failed to sync VNode: tags does not match (old: ' + this.tag + ', new: ' + b.tag + ')');
    }
    if (this.key_ !== b.key_) {
      throw new Error('Failed to sync VNode: keys does not match (old: ' + this.key_ + ', new: ' + b.key_ + ')');
    }
    if (b.ref !== null && this.ref !== b.ref) {
      throw new Error('Failed to sync VNode: reusing VNodes isn\'t allowed unless it has the same ref.');
    }
    if (b.children_ !== null && typeof b.children_ !== 'string') {
      if ((b.flags & kivi.VNodeFlags.TRACK_BY_KEY) !== 0) {
        for (var i = 0; i < b.children_.length; i++) {
          if (/** @type {!Array<!kivi.VNode>} */(b.children_)[i].key_ === null) {
            throw new Error('Failed to sync VNode: syncing children with trackByKey requires that all' +
                            ' children have keys.');
          }
        }
      }
    }
  }

  b.ref = ref;

  if ((flags & kivi.VNodeFlags.TEXT) !== 0) {
    if (this.props_ !== b.props_) {
      this.ref.nodeValue = /** @type {string} */(b.props_);
    }
  } else if ((flags & (kivi.VNodeFlags.ELEMENT | kivi.VNodeFlags.ROOT)) !== 0) {
    if ((flags & kivi.VNodeFlags.CTAG_UPDATE_HANDLER) === 0) {
      if (this.props_ !== b.props_) {
        if ((this.flags & kivi.VNodeFlags.DYNAMIC_SHAPE_PROPS) === 0) {
          kivi.sync.staticShapeProps(
              /** @type {!Object<string, *>} */(this.props_),
              /** @type {!Object<string, *>} */(b.props_),
              ref);
        } else {
          kivi.sync.dynamicShapeProps(
              /** @type {!Object<string, *>} */(this.props_),
              /** @type {!Object<string, *>} */(b.props_),
              ref);
        }
      }
      if (this.attrs_ !== b.attrs_) {
        if ((this.flags & kivi.VNodeFlags.DYNAMIC_SHAPE_ATTRS) === 0) {
          kivi.sync.staticShapeAttrs(this.attrs_, b.attrs_, ref);
        } else {
          kivi.sync.dynamicShapeAttrs(this.attrs_, b.attrs_, ref);
        }
      }
      if (this.style_ !== b.style_) {
        var style = b.style_ === null ? '' : b.style_;
        // perf optimization for webkit/blink, probably will need to revisit this in the future.
        if ((flags & kivi.VNodeFlags.SVG) === 0) {
          ref.style.cssText = style;
        } else {
          ref.setAttribute('style', style);
        }
      }

      if (this.classes_ !== b.classes_) {
        className = (b.classes_ === null) ? '' : b.classes_;
        // perf optimization for webkit/blink, probably will need to revisit this in the future.
        if ((flags & kivi.VNodeFlags.SVG) === 0) {
          ref.className = className;
        } else {
          ref.setAttribute('class', className);
        }
      }

    } else if (this.props_ !== b.props_) {
      if ((flags & kivi.VNodeFlags.ROOT) === 0) {
        /** @type {!kivi.CTag} */(this.tag).updateHandler_(ref, this.props_, b.props_);
      } else {
        /** @type {!kivi.CTag} */(context.descriptor.tag).updateHandler_(ref, this.props_, b.props_);
      }
    }

    if ((this.flags & kivi.VNodeFlags.INPUT_ELEMENT) === 0) {
      if (this.children_ !== b.children_) {
        this.syncChildren(/** @type {?Array<!kivi.VNode>|string} */(this.children_), /** @type {?Array<!kivi.VNode>|string} */(b.children_), context);
      }
    } else {
      var iref = /** @type {!HTMLInputElement} */(ref);
      if ((flags & kivi.VNodeFlags.TEXT_INPUT_ELEMENT) !== 0) {
        if (iref.value !== b.children_) {
          iref.value = /** @type {string} */(b.children_);
        }
      } else { // ((flags & kivi.VNodeFlags.CHECKED_INPUT_ELEMENT) !== 0)
        if (iref.checked !== b.children_) {
          iref.checked = /** @type {boolean} */(b.children_);
        }
      }
    }
  } else /* if ((flags & kivi.VNodeFlags.COMPONENT) !== 0) */ {
    if (this.classes_ !== b.classes_) {
      className = (b.classes_ === null) ? '' : b.classes_;
      // perf optimization for webkit/blink, probably will need to revisit this in the future.
      if ((flags & kivi.VNodeFlags.SVG) === 0) {
        ref.className = className;
      } else {
        ref.setAttribute('class', className);
      }
    }

    component = b.cref = /** @type {!kivi.Component<*,*>} */(this.cref);
    component.setData(b.props_);
    component.setChildren(/** @type {?Array<!kivi.VNode>|string} */(b.children_));
    component.update();
  }

  b._freeze();
};

/**
 * Recursively attach all nodes.
 */
kivi.VNode.prototype.attach = function() {
  if (kivi.DEBUG) {
    if ((this._debugProperties.flags & kivi.VNodeDebugFlags.ATTACHED) !== 0) {
      throw new Error('Failed to attach VNode: VNode is already attached.');
    }
    this._debugProperties.flags |= kivi.VNodeDebugFlags.ATTACHED;
    this._debugProperties.flags &= ~kivi.VNodeDebugFlags.DETACHED;
  }
  if ((this.flags & kivi.VNodeFlags.COMPONENT) === 0) {
    var children = this.children_;
    if (children !== null && typeof children !== 'string') {
      for (var i = 0; i < children.length; i++) {
        /** @type {!Array<!kivi.VNode>} */(children)[i].attach();
      }
    }
  } else {
    this.cref.attach();
  }
};

/**
 * Attach node.
 */
kivi.VNode.prototype.attached = function() {
  if (kivi.DEBUG) {
    if ((this._debugProperties.flags & kivi.VNodeDebugFlags.ATTACHED) !== 0) {
      throw new Error('Failed to attach VNode: VNode is already attached.');
    }
    this._debugProperties.flags |= kivi.VNodeDebugFlags.ATTACHED;
    this._debugProperties.flags &= ~kivi.VNodeDebugFlags.DETACHED;
  }
  if ((this.flags & kivi.VNodeFlags.COMPONENT) !== 0) {
    this.cref.attach();
  }
};

/**
 * Recursively detach all nodes.
 */
kivi.VNode.prototype.detach = function() {
  if (kivi.DEBUG) {
    if ((this._debugProperties.flags & kivi.VNodeDebugFlags.DETACHED) !== 0) {
      throw new Error('Failed to detach VNode: VNode is already detached.');
    }
    this._debugProperties.flags |= kivi.VNodeDebugFlags.DETACHED;
    this._debugProperties.flags &= ~kivi.VNodeDebugFlags.ATTACHED;
  }
  if ((this.flags & kivi.VNodeFlags.COMPONENT) === 0) {
    var children = this.children_;
    if (children !== null && typeof children !== 'string') {
      for (var i = 0; i < children.length; i++) {
        /** @type {!Array<!kivi.VNode>} */(children)[i].detach();
      }
    }
  } else {
    if (this.cref === null) {
      console.error(this);
    }
    this.cref.detach();
  }
};

/**
 * Detach node.
 */
kivi.VNode.prototype.detached = function() {
  if (kivi.DEBUG) {
    if ((this._debugProperties.flags & kivi.VNodeDebugFlags.DETACHED) !== 0) {
      throw new Error('Failed to detach VNode: VNode is already detached.');
    }
    this._debugProperties.flags |= kivi.VNodeDebugFlags.DETACHED;
    this._debugProperties.flags &= ~kivi.VNodeDebugFlags.ATTACHED;
  }
  if ((this.flags & kivi.VNodeFlags.COMPONENT) !== 0) {
    this.cref.detach();
  }
};

/**
 * Dispose Virtual Node.
 */
kivi.VNode.prototype.dispose = function() {
  if (kivi.DEBUG) {
    if ((this._debugProperties.flags & kivi.VNodeDebugFlags.DISPOSED) !== 0) {
      throw new Error('Failed to dispose VNode: VNode is already disposed.')
    }
    if ((this._debugProperties.flags & (kivi.VNodeDebugFlags.RENDERED | kivi.VNodeDebugFlags.MOUNTED)) === 0) {
      throw new Error('Failed to dispose VNode: VNode should be rendered or mounted before disposing.');
    }
    this._debugProperties.flags |= kivi.VNodeDebugFlags.DISPOSED;
  }
  if ((this.flags & kivi.VNodeFlags.COMPONENT) !== 0) {
    /** @type {!kivi.Component} */ (this.cref).dispose();
  } else if (this.children_ !== null) {
    var children = this.children_;
    if (typeof children !== 'string') {
      for (var i = 0; i < children.length; i++) {
        /** @type {!Array<!kivi.VNode>} */(children)[i].dispose();
      }
    }
  }
};

/**
 * Freeze VNode.
 *
 * @private
 */
kivi.VNode.prototype._freeze = function() {
  if (kivi.DEBUG) {
    if ((this._debugProperties.flags & kivi.VNodeDebugFlags.DISABLE_FREEZE) === 0) {
      Object.freeze(this);
      if (this.attrs_ !== null && !Object.isFrozen(this.attrs_)) {
        Object.freeze(this.attrs_);
      }
      // Don't freeze props in Components.
      if (((this.flags & kivi.VNodeFlags.COMPONENT) === 0) &&
          this.props_ !== null &&
          !Object.isFrozen(/** @type {!Object} */(this.props_))) {

        Object.freeze(this.props_);
      }
      if (this.children_ !== null &&
          Array.isArray((this.children_)) &&
          !Object.isFrozen(/** @type {!Object} */(this.children_))) {
        Object.freeze(this.children_);
      }
    }
  }
};

/**
 * Insert VNode
 *
 * @private
 * @param {!kivi.VNode} node Node to insert.
 * @param {?Node} nextRef Reference to the next html element.
 * @param {!kivi.Component} context Current context.
 */
kivi.VNode.prototype._insertChild = function(node, nextRef, context) {
  if (((this.flags & kivi.VNodeFlags.MANAGED_CONTAINER) !== 0) && node.cref.descriptor.insertChild !== null) {
    node.cref.descriptor.insertChild(/** @type {!kivi.ContainerManager} */(node.cref), this, node, nextRef, context);
  } else {
    node.create(context);
    this.ref.insertBefore(node.ref, nextRef);
    node.attached();
    node.render(context);
  }
};

/**
 * Replace VNode.
 *
 * @private
 * @param {!kivi.VNode} newNode New Node.
 * @param {!kivi.VNode} refNode Old node.
 * @param {!kivi.Component} context Current context.
 */
kivi.VNode.prototype._replaceChild = function(newNode, refNode, context) {
  if (((this.flags & kivi.VNodeFlags.MANAGED_CONTAINER) !== 0) && newNode.cref.descriptor.replaceChild !== null) {
    newNode.cref.descriptor.replaceChild(/** @type {!kivi.ContainerManager} */(newNode.cref), this, newNode, refNode, context);
  } else {
    newNode.create(context);
    this.ref.replaceChild(newNode.ref, refNode.ref);
    refNode.dispose();
    newNode.attached();
    newNode.render(context);
  }
};

/**
 * Move VNode
 *
 * @private
 * @param {!kivi.VNode} node Node to move.
 * @param {?Node} nextRef Reference to the next html element.
 * @param {!kivi.Component} context Current context.
 */
kivi.VNode.prototype._moveChild = function(node, nextRef, context) {
  if (((this.flags & kivi.VNodeFlags.MANAGED_CONTAINER) !== 0) && node.cref.descriptor.moveChild !== null) {
    node.cref.descriptor.moveChild(/** @type {!kivi.ContainerManager} */(node.cref), this, node, nextRef, context);
  } else {
    this.ref.insertBefore(node.ref, nextRef);
  }
};

/**
 * Remove VNode.
 *
 * @private
 * @param {!kivi.VNode} node Node to remove.
 * @param {!kivi.Component} context Current context.
 */
kivi.VNode.prototype._removeChild = function(node, context) {
  if (((this.flags & kivi.VNodeFlags.MANAGED_CONTAINER) !== 0) && node.cref.descriptor.removeChild !== null) {
    node.cref.descriptor.removeChild(/** @type {!kivi.ContainerManager} */(node.cref), this, node, context);
  } else {
    this.ref.removeChild(node.ref);
    node.dispose();
  }
};

/**
 * Synchronize old children list [a] with the new one [b].
 *
 * @param {?Array<!kivi.VNode>|string} a Old children list.
 * @param {?Array<!kivi.VNode>|string} b New children list.
 * @param {!kivi.Component} context Current context.
 */
kivi.VNode.prototype.syncChildren = function(a, b, context) {
  var aNode;
  var bNode;
  var i = 0;
  var synced = false;

  if (kivi.DEBUG) {
    if (((this.flags & kivi.VNodeFlags.TRACK_BY_KEY) !== 0)) {
      if (typeof a === 'string' || typeof b === 'string') {
        throw new Error('VNode sync children failed: children property cannot have type string when track by' +
                        ' key is enabled.');
      }
    }
  }

  if (typeof a === 'string') {
    if (b === null) {
      this.ref.removeChild(this.ref.firstChild);
    } else if (typeof b === 'string') {
      var c = this.ref.firstChild;
      if (c) {
        c.nodeValue = b;
      } else {
        this.ref.textContent = b;
      }
    } else {
      this.ref.removeChild(this.ref.firstChild);
      while (i < b.length) {
        this._insertChild(b[i++], null, context);
      }
    }
  } else if (typeof b === 'string') {
    if (a !== null) {
      while(i < a.length) {
        this._removeChild(a[i++], context);
      }
    }
    this.ref.textContent = b;
  } else {
    if (a !== null && a.length !== 0) {
      if (b === null || b.length === 0) {
        // b is empty, remove all children from a.
        while(i < a.length) {
          this._removeChild(a[i++], context);
        }
      } else {
        if (a.length === 1 && b.length === 1) {
          // Fast path when a and b have only one child.
          aNode = a[0];
          bNode = b[0];

          if (aNode._canSync(bNode)) {
            aNode.sync(bNode, context);
          } else {
            this._replaceChild(bNode, aNode, context);
          }
        } else if (a.length === 1) {
          // Fast path when a have 1 child.
          aNode = a[0];
          if ((this.flags & kivi.VNodeFlags.TRACK_BY_KEY) === 0) {
            if (kivi.DEBUG) {
              if ((this._debugProperties.flags & kivi.VNodeDebugFlags.DISABLE_CHILDREN_SHAPE_ERROR) === 0) {
                kivi.debug.printError(
                    'VNode sync children: children shape is changing, you should enable tracking by key with ' +
                    'VNode method trackByKey().\n' +
                    'If you certain that children shape changes won\'t cause any problems with losing ' +
                    'state, you can remove this warning with VNode method disableChildrenShapeError().');
              }
            }
            while (i < b.length) {
              bNode = b[i++];
              if (aNode._canSync(bNode)) {
                aNode.sync(bNode, context);
                synced = true;
                break;
              }
              this._insertChild(bNode, aNode.ref, context);
            }
          } else {
            while (i < b.length) {
              bNode = b[i++];
              if (aNode.key_ === bNode.key_) {
                if (kivi.DEBUG) {
                  if (!aNode._canSync(bNode)) {
                    throw new Error('VNode sync children failed: cannot sync two different children with the same key.');
                  }
                }
                aNode.sync(bNode, context);
                synced = true;
                break;
              }
              this._insertChild(bNode, aNode.ref, context);
            }
          }
          if (synced) {
            while (i < b.length) {
              this._insertChild(b[i++], null, context);
            }
          } else {
            this._removeChild(aNode, context);
          }
        } else if (b.length === 1) {
          // Fast path when b have 1 child.
          bNode = b[0];
          if ((this.flags & kivi.VNodeFlags.TRACK_BY_KEY) === 0) {
            if (kivi.DEBUG) {
              if ((this._debugProperties.flags & kivi.VNodeDebugFlags.DISABLE_CHILDREN_SHAPE_ERROR) === 0) {
                kivi.debug.printError(
                    'VNode sync children: children shape is changing, you should enable tracking by key with ' +
                    'VNode method trackByKey().\n' +
                    'If you certain that children shape changes won\'t cause any problems with losing ' +
                    'state, you can remove this warning with VNode method disableChildrenShapeError().');
              }
            }
            while (i < a.length) {
              aNode = a[i++];
              if (aNode._canSync(bNode)) {
                aNode.sync(bNode, context);
                synced = true;
                break;
              }
              this._removeChild(aNode, context);
            }
          } else {
            while (i < a.length) {
              aNode = a[i++];
              if (aNode.key_ === bNode.key_) {
                if (kivi.DEBUG) {
                  if (!aNode._canSync(bNode)) {
                    throw new Error('VNode sync children failed: cannot sync two different children with the same key.');
                  }
                }
                aNode.sync(bNode, context);
                synced = true;
                break;
              }
              this._removeChild(aNode, context);
            }
          }

          if (synced) {
            while (i < a.length) {
              this._removeChild(a[i++], context);
            }
          } else {
            this._insertChild(bNode, null, context);
          }
        } else {
          // a and b have more than 1 child.
          if ((this.flags & kivi.VNodeFlags.TRACK_BY_KEY) === 0) {
            this._syncChildren(a, b, context);
          } else {
            this._syncChildrenTrackingByKeys(a, b, context);
          }
        }
      }
    } else if (b !== null && b.length > 0) {
      // a is empty, insert all children from b
      for (i = 0; i < b.length; i++) {
        this._insertChild(b[i], null, context);
      }
    }
  }
};

/**
 * Synchronize children.
 *
 * Any heuristics that is used in this algorithm is an undefined behaviour, and external dependencies should
 * not rely on the knowledge about this algorithm, because it can be changed in any time.
 *
 * @private
 * @param {!Array<!kivi.VNode>} a Old children list.
 * @param {!Array<!kivi.VNode>} b New children list.
 * @param {!kivi.Component} context Current context.
 */
kivi.VNode.prototype._syncChildren = function(a, b, context) {
  var aStart = 0;
  var bStart = 0;
  var aEnd = a.length - 1;
  var bEnd = b.length - 1;
  var aNode;
  var bNode;
  var nextPos;
  var next;

  // Sync similar nodes at the beginning.
  while (aStart <= aEnd && bStart <= bEnd) {
    aNode = a[aStart];
    bNode = b[bStart];

    if (!aNode._canSync(bNode)) {
      break;
    }

    aStart++;
    bStart++;

    aNode.sync(bNode, context);
  }

  // Sync similar nodes at the end.
  while (aStart <= aEnd && bStart <= bEnd) {
    aNode = a[aEnd];
    bNode = b[bEnd];

    if (!aNode._canSync(bNode)) {
      break;
    }

    aEnd--;
    bEnd--;

    aNode.sync(bNode, context);
  }

  if (kivi.DEBUG) {
    if ((aStart <= aEnd || bStart <= bEnd) &&
        ((this._debugProperties.flags & kivi.VNodeDebugFlags.DISABLE_CHILDREN_SHAPE_ERROR) === 0)) {
      kivi.debug.printError(
          'VNode sync children: children shape is changing, you should enable tracking by key with ' +
          'VNode method trackByKey().\n' +
          'If you certain that children shape changes won\'t cause any problems with losing ' +
          'state, you can remove this warning with VNode method disableChildrenShapeError().');
    }
  }

  // Iterate through the remaining nodes and if they have the same type, then sync, otherwise just
  // remove the old node and insert the new one.
  while (aStart <= aEnd && bStart <= bEnd) {
    aNode = a[aStart++];
    bNode = b[bStart++];
    if (aNode._canSync(bNode)) {
      aNode.sync(bNode, context);
    } else {
      this._replaceChild(bNode, aNode, context);
    }
  }

  if (aStart <= aEnd) {
    // All nodes from a are synced, remove the rest.
    do {
      this._removeChild(a[aStart++], context);
    } while (aStart <= aEnd);
  } else if (bStart <= bEnd) {
    // All nodes from b are synced, insert the rest.
    nextPos = bEnd + 1;
    next = nextPos < b.length ? b[nextPos].ref : null;
    do {
      this._insertChild(b[bStart++], next, context);
    } while (bStart <= bEnd);
  }
};

/**
 * Synchronize children tracking by keys.
 *
 * @private
 * @param {!Array<!kivi.VNode>} a Old children list.
 * @param {!Array<!kivi.VNode>} b New children list.
 * @param {!kivi.Component} context Current context.
 */
kivi.VNode.prototype._syncChildrenTrackingByKeys = function(a, b, context) {
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
  /** @type {number|undefined} */
  var j;
  var stop = false;
  var nextPos;
  var next;
  /** @type {?kivi.VNode} */
  var aNode;
  /** @type {?kivi.VNode} */
  var bNode;
  var lastTarget = 0;
  /** @type {number} */
  var pos;
  var node;

  // Algorithm that works on simple cases with basic list transformations.
  //
  // It tries to reduce the diff problem by simultaneously iterating from the beginning and the end of both
  // lists, if keys are the same, they're synced, if node is moved from the beginning to the end of the
  // current cursor positions or vice versa it just performs move operation and continues to reduce the diff
  // problem.
  outer: do {
    stop = true;

    // Sync nodes with the same key at the beginning.
    while (aStartNode.key_ === bStartNode.key_) {
      if (kivi.DEBUG) {
        if (!aStartNode._canSync(bStartNode)) {
          throw new Error('VNode sync children failed: cannot sync two different children with the same key.');
        }
      }
      aStartNode.sync(bStartNode, context);
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
    while (aEndNode.key_ === bEndNode.key_) {
      if (kivi.DEBUG) {
        if (!aEndNode._canSync(bEndNode)) {
          throw new Error('VNode sync children failed: cannot sync two different children with the same key.');
        }
      }
      aEndNode.sync(bEndNode, context);
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
    while (aStartNode.key_ === bEndNode.key_) {
      if (kivi.DEBUG) {
        if (!aStartNode._canSync(bEndNode)) {
          throw new Error('VNode sync children failed: cannot sync two different children with the same key.');
        }
      }
      aStartNode.sync(bEndNode, context);
      nextPos = bEnd + 1;
      next = nextPos < b.length ? b[nextPos].ref : null;
      this._moveChild(bEndNode, next, context);
      aStart++;
      bEnd--;
      if (aStart > aEnd || bStart > bEnd) {
        break outer;
      }
      aStartNode = a[aStart];
      bEndNode = b[bEnd];
      stop = false;
      // In real-world scenarios there is a higher chance that next node after we move
      // this one will be the same, so we are jumping to the top of this loop immediately.
      continue outer;
    }

    // Move and sync nodes from right to left.
    while (aEndNode.key_ === bStartNode.key_) {
      if (kivi.DEBUG) {
        if (!aEndNode._canSync(bStartNode)) {
          throw new Error('VNode sync children failed: cannot sync two different children with the same key.');
        }
      }
      aEndNode.sync(bStartNode, context);
      this._moveChild(bStartNode, aStartNode.ref, context);
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
      this._insertChild(b[bStart++], next, context);
    }
  } else if (bStart > bEnd) {
    // All nodes from b are synced, remove the rest from a.
    while (aStart <= aEnd) {
      this._removeChild(a[aStart++], context);
    }
  } else {
    // Perform more complex sync algorithm on the remaining nodes.
    //
    // We start by marking all nodes from b as inserted, then we try to find all removed nodes and
    // simultaneously perform syncs on the nodes that exists in both lists and replacing "inserted"
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
          if (aNode.key_ === bNode.key_) {
            sources[j - bStart] = i;

            if (lastTarget > j) {
              moved = true;
            } else {
              lastTarget = j;
            }
            if (kivi.DEBUG) {
              if (!aNode._canSync(bNode)) {
                throw new Error('VNode sync children failed: cannot sync two different children with the same key.');
              }
            }
            aNode.sync(bNode, context);
            removed = false;
            break;
          }
        }
        if (removed) {
          this._removeChild(aNode, context);
          removeOffset++;
        }
      }
    } else {
      /** @type {!Map<*,number>} */
      var keyIndex = new Map();

      for (i = bStart; i <= bEnd; i++) {
        node = b[i];
        keyIndex.set(node.key_, i);
      }

      for (i = aStart; i <= aEnd; i++) {
        aNode = a[i];
        j = keyIndex.get(aNode.key_);

        if (j !== void 0) {
          bNode = b[j];
          sources[j - bStart] = i;
          if (lastTarget > j) {
            moved = true;
          } else {
            lastTarget = j;
          }
          if (kivi.DEBUG) {
            if (!aNode._canSync(bNode)) {
              throw new Error('VNode sync children failed: cannot sync two different children with the same key.');
            }
          }
          aNode.sync(bNode, context);
        } else {
          this._removeChild(aNode, context);
          removeOffset++;
        }
      }
    }

    if (moved) {
      var seq = kivi._lis(sources);
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
          if (j < 0 || i !== seq[j]) {
            pos = i + bStart;
            node = b[pos];
            nextPos = pos + 1;
            next = nextPos < b.length ? b[nextPos].ref : null;
            this._moveChild(node, next, context);
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
 * @package
 * @param {!Array<number>} a
 * @returns {!Array<number>}
 */
kivi._lis = function(a) {
  var p = a.slice(0);
  /** @type {!Array<number>} */
  var result = [];
  result.push(0);
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
