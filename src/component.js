goog.provide('kivi.CDescriptor');
goog.provide('kivi.CDescriptorFlags');
goog.provide('kivi.Component');
goog.require('kivi.ComponentFlags');
goog.require('kivi.Invalidator');
goog.require('kivi.InvalidatorSubscription');
goog.require('kivi.InvalidatorSubscriptionFlags');
goog.require('kivi.scheduler.instance');

/**
 * CDescriptor Flags.
 *
 * @enum {number}
 */
kivi.CDescriptorFlags = {
  SVG:     0x0001,
  WRAPPER: 0x0002
};

/**
 * Component Descriptor.
 *
 * @template D, S
 * @param {string} name
 * @param {number=} opt_flags
 * @constructor
 * @struct
 * @final
 */
kivi.CDescriptor = function(name, opt_flags) {
  this.flags = opt_flags === void 0 ? 0 : opt_flags;
  this.tag = 'div';

  /**
   * Data setter.
   *
   * @type {?function (!kivi.Component<D, S>, D)}
   */
  this.setData = null;

  /**
   * Children setter.
   *
   * @type {?function (!kivi.Component<D, S>, (?Array<!kivi.VNode>|string))}
   */
  this.setChildren = null;

  /**
   * Lifecycle method: init.
   *
   * @type {?function (!kivi.Component<D, S>)}
   */
  this.init = null;

  /**
   * Lifecycle method: update.
   *
   * @type {?function (!kivi.Component<D, S>)}
   */
  this.update = null;

  /**
   * Lifecycle method: invalidated.
   *
   * @type {?function (!kivi.Component<D, S>)}
   */
  this.invalidated = null;

  /**
   * Lifecycle method: disposed.
   *
   * @type {?function (!kivi.Component<D, S>)}
   */
  this.disposed = null;

  /**
   * Insert child hook for Managed Containers.
   *
   * @type {?function (!kivi.Component<D, S>, !kivi.VNode, !kivi.VNode, ?Node)}
   */
  this.insertChild = null;

  /**
   * Replace child hook for Managed Containers.
   *
   * @type {?function (!kivi.Component<D, S>, !kivi.VNode, !kivi.VNode, !kivi.VNode)}
   */
  this.replaceChild = null;

  /**
   * Move child hook for Managed Containers.
   *
   * @type {?function (!kivi.Component<D, S>, !kivi.VNode, !kivi.VNode, ?Node)}
   */
  this.moveChild = null;

  /**
   * Remove child hook for Managed Containers.
   *
   * @type {?function (!kivi.Component<D, S>, !kivi.VNode, !kivi.VNode)}
   */
  this.removeChild = null;

  /**
   *
   * @type {?kivi.CDescriptor}
   */
  this.data = null;

  if (kivi.DEBUG) {
    this.name = name;
  }
};

/**
 * Creates a Component descriptor with HTMLElement node.
 *
 * @param {string} name
 * @returns {!kivi.CDescriptor}
 */
kivi.CDescriptor.element = function(name) {
  return new kivi.CDescriptor(name, 0);
};

/**
 * Creates a Component descriptor with SVGElement node.
 *
 * @param {string} name
 * @returns {!kivi.CDescriptor}
 */
kivi.CDescriptor.svgElement = function(name) {
  return new kivi.CDescriptor(name, kivi.CDescriptorFlags.SVG);
};

/**
 * Creates a Component Descriptor Wrapper.
 *
 * @param {!kivi.CDescriptor} d
 * @returns {!kivi.CDescriptor}
 */
kivi.CDescriptor.wrap = function(d) {
  var r = new kivi.CDescriptor(d.name, kivi.CDescriptorFlags.WRAPPER);
  r.flags |= d.flags & kivi.CDescriptorFlags.SVG;
  r.tag = d.tag;
  return d;
};

/**
 * Component.
 *
 * @template D, S
 * @param {number} flags
 * @param {!kivi.CDescriptor<D, S>} descriptor
 * @param {?kivi.Component} parent
 * @param {*} data
 * @param {?Array<!kivi.VNode>|string} children
 * @param {!Element} element
 * @constructor
 * @struct
 * @final
 */
kivi.Component = function(flags, descriptor, parent, data, children, element) {
  /** @type {number} */
  this.flags = flags;

  /** @type {number} */
  this.mtime = 0;

  /** @type {!kivi.CDescriptor<D, S>} */
  this.descriptor = descriptor;

  /** @type {?kivi.Component} */
  this.parent = parent;

  /** @type {number} */
  this.depth = parent === null ? 0 : parent.depth + 1;

  /** @type {D} */
  this.data = data;

  /** @type {S} */
  this.state = null;

  this.children = children;

  /** @type {!Element} */
  this.element = element;

  /**
   * Root node in the Components virtual tree.
   * @type {?kivi.Component|?kivi.VNode|?CanvasRenderingContext2D}
   */
  this.root = null;

  /** @type {?Array<!kivi.InvalidatorSubscription>|?kivi.InvalidatorSubscription} */
  this._subscriptions = null;

  /** @type {?Array<!kivi.InvalidatorSubscription>|?kivi.InvalidatorSubscription} */
  this._transientSubscriptions = null;

  if (kivi.DEBUG) {
    if (!element.getAttribute('data-kivi-component')) {
      element.setAttribute('data-kivi-component', descriptor.name);
      element._kiviComponent = this;
    }
  }
};

/**
 * Create a [kivi.Component].
 *
 * @param {!kivi.CDescriptor} descriptor
 * @param {*} data
 * @param {?Array<!kivi.VNode>|string} children
 * @param {?kivi.Component} context
 * @param {!Element=} opt_element
 * @returns {!kivi.Component}
 */
kivi.Component.create = function(descriptor, data, children, context, opt_element) {
  if (opt_element === void 0) {
    if ((descriptor.flags & kivi.CDescriptorFlags.SVG) === 0) {
      opt_element = document.createElement(descriptor.tag);
    } else {
      opt_element = document.createElementNS(kivi.HtmlNamespace.SVG, descriptor.tag);
    }
  }
  var c = new kivi.Component(kivi.ComponentFlags.SHOULD_UPDATE_FLAGS, descriptor, context, data, children, opt_element);
  if (descriptor.init !== null) {
    descriptor.init(c);
  }
  return c;
};

/**
 * Mount a [kivi.Component] on top of existing html.
 *
 * @param {!kivi.CDescriptor} descriptor
 * @param {*} data
 * @param {?Array<!kivi.VNode>|string} children
 * @param {?kivi.Component} context
 * @param {!Element} element
 * @returns {!kivi.Component}
 */
kivi.Component.mount = function(descriptor, data, children, context, element) {
  var c = new kivi.Component(kivi.ComponentFlags.SHOULD_UPDATE_FLAGS | kivi.ComponentFlags.MOUNTING, descriptor, context, data, children, element);
  if (descriptor.init !== null) {
    descriptor.init(c);
  }
  return c;
};

/**
 * Update component.
 */
kivi.Component.prototype.update = function() {
  if ((this.flags & kivi.ComponentFlags.SHOULD_UPDATE_FLAGS) === kivi.ComponentFlags.SHOULD_UPDATE_FLAGS) {
    this.descriptor.update(this);
    this.mtime = kivi.scheduler.instance.clock;
    this.flags &= ~kivi.ComponentFlags.DIRTY;
  }
};

/**
 * Synchronize internal tree using virtual dom representation.
 *
 * If this method is called during mounting phase, then virtual dom will be mounted on top of the existing
 * html tree.
 *
 * @param {!kivi.VNode} newRoot
 */
kivi.Component.prototype.syncVRoot = function(newRoot) {
  if (this.root === null) {
    newRoot.cref = this;
    if ((this.flags & kivi.ComponentFlags.MOUNTING) !== 0) {
      newRoot.mount(this.element, this);
      this.flags &= ~kivi.ComponentFlags.MOUNTING;
    } else {
      newRoot.ref = this.element;
      newRoot.render(this);
    }
  } else {
    this.root.sync(newRoot, this);
  }
  this.root = newRoot;
};

/**
 * Synchronize internal component.
 *
 * @param {*} newData
 * @param {?Array<!kivi.VNode>|string=} opt_newChildren
 */
kivi.Component.prototype.syncComponent = function(newData, opt_newChildren) {
  if (opt_newChildren === void 0) opt_newChildren = null;

  if (this.root === null) {
    var descriptor = /** @type {!kivi.CDescriptor} */(this.descriptor.data);
    if ((this.flags & kivi.ComponentFlags.MOUNTING) === 0) {
      this.root = kivi.Component.create(descriptor, newData, opt_newChildren, this, this.element);
    } else {
      this.root = kivi.Component.mount(descriptor, newData, opt_newChildren, this, this.element);
    }
  }
  var component = /** @type {!kivi.Component<*,*>} */(this.root);
  component.setInputData(newData, opt_newChildren);
  component.update();
};

/**
 * Set new input data.
 *
 * @param {*} newData
 * @param {?Array<!kivi.VNode>|string} newChildren
 */
kivi.Component.prototype.setInputData = function(newData, newChildren) {
  var descriptor = this.descriptor;
  var component = /** @type {!kivi.Component<*,*>} */(this);
  if (descriptor.setData === null) {
    if (component.data !== newData) {
      component.data = newData;
      component.flags |= kivi.ComponentFlags.DIRTY;
    }
  } else {
    descriptor.setData(this, newData);
  }
  if (descriptor.setChildren !== null) {
    descriptor.setChildren(this, newChildren);
  }
};

/**
 * Invalidate Component.
 */
kivi.Component.prototype.invalidate = function() {
  if ((this.flags & (kivi.ComponentFlags.DIRTY | kivi.ComponentFlags.DISPOSED)) === 0) {
    this.flags |= kivi.ComponentFlags.DIRTY;
    this.cancelTransientSubscriptions();
    kivi.scheduler.instance.nextFrame().updateComponent(this);
  }
};

/**
 * Start updating Component on each frame.
 */
kivi.Component.prototype.startUpdateEachFrame = function() {
  this.flags |= kivi.ComponentFlags.UPDATE_EACH_FRAME;
  if ((this.flags & kivi.ComponentFlags.IN_UPDATE_QUEUE) === 0) {
    this.flags |= kivi.ComponentFlags.IN_UPDATE_QUEUE;
    kivi.scheduler.instance.startUpdateComponentEachFrame(this);
  }
};

/**
 * Stop updating Component on each frame.
 */
kivi.Component.prototype.stopUpdateEachFrame = function() {
  this.flags &= ~kivi.ComponentFlags.UPDATE_EACH_FRAME;
};

/**
 * Dispose Component.
 */
kivi.Component.prototype.dispose = function() {
  if (kivi.DEBUG) {
    if ((this.flags & kivi.ComponentFlags.DISPOSED) !== 0) {
      throw new Error('Failed to dispose Component: component is already disposed');
    }
  }

  this.flags |= kivi.ComponentFlags.DISPOSED;
  this.flags &= ~(kivi.ComponentFlags.ATTACHED | kivi.ComponentFlags.UPDATE_EACH_FRAME);
  this.cancelSubscriptions();
  this.cancelTransientSubscriptions();

  var root = this.root;
  if (root !== null) {
    // monomorphic code
    if (root.constructor === kivi.VNode) {
      root.dispose();
    } else if (root.constructor === kivi.Component) {
      root.dispose();
    }
  }
  var descriptor = this.descriptor;
  if (descriptor.disposed !== null) {
    descriptor.disposed(this);
  }
};

/**
 * Subscribe to Invalidator object.
 *
 * @param {!kivi.Invalidator} invalidator
 */
kivi.Component.prototype.subscribe = function(invalidator) {
  var s = new kivi.InvalidatorSubscription(kivi.InvalidatorSubscriptionFlags.COMPONENT, invalidator, this);
  invalidator.addSubscription(s);
  var subscriptions = this._subscriptions;
  if (subscriptions === null) {
    this._subscriptions = s;
  } else if (subscriptions.constructor === kivi.InvalidatorSubscription) {
    this._subscriptions = [this._subscriptions, s];
  } else {
    subscriptions.push(s);
  }
};

/**
 * Transient subscribe to Invalidator object.
 *
 * @param {!kivi.Invalidator} invalidator
 */
kivi.Component.prototype.transientSubscribe = function(invalidator) {
  var s = new kivi.InvalidatorSubscription(
      kivi.InvalidatorSubscriptionFlags.COMPONENT | kivi.InvalidatorSubscriptionFlags.TRANSIENT,
      invalidator, this);
  invalidator.addSubscription(s);
  var subscriptions = this._transientSubscriptions;
  if (subscriptions === null) {
    this._transientSubscriptions = s;
  } else if (subscriptions.constructor === kivi.InvalidatorSubscription) {
    this._transientSubscriptions = [this._transientSubscriptions, s];
  } else {
    subscriptions.push(s);
  }
};

/**
 * Remove Subscription.
 *
 * @param {!kivi.InvalidatorSubscription} subscription
 */
kivi.Component.prototype.removeSubscription = function(subscription) {
  var subscriptions;
  var i;
  if ((subscription.flags & kivi.InvalidatorSubscriptionFlags.TRANSIENT) === 0) {
    subscriptions = this._subscriptions;
    if (subscriptions.constructor === kivi.InvalidatorSubscription ||
        subscriptions.length === 1) {
      if (kivi.DEBUG) {
        if (subscriptions.constructor === kivi.InvalidatorSubscription) {
          if (subscriptions !== subscription) {
            throw new Error('Failed to remove subscription from Component: cannot find appropriate subscription');
          }
        } else {
          subscriptions = /** @type {!Array<!kivi.InvalidatorSubscription>} */(subscriptions);
          if (subscriptions[0] !== subscription) {
            throw new Error('Failed to remove subscription from Component: cannot find appropriate subscription');
          }
        }
      }
      this._subscriptions = null;
    } else {
      subscriptions = /** @type {!Array<!kivi.InvalidatorSubscription>} */(subscriptions);
      i = subscriptions.indexOf(subscription);
      if (kivi.DEBUG) {
        if (i === -1) {
          throw new Error('Failed to remove subscription from Component: cannot find appropriate subscription');
        }
      }
      subscriptions[i] = subscriptions.pop();
    }
  } else {
    subscriptions = this._transientSubscriptions;
    if (subscriptions.constructor === kivi.InvalidatorSubscription ||
        subscriptions.length === 1) {
      if (kivi.DEBUG) {
        if (subscriptions.constructor === kivi.InvalidatorSubscription) {
          if (subscriptions !== subscription) {
            throw new Error('Failed to remove subscription from Component: cannot find appropriate subscription');
          }
        } else {
          subscriptions = /** @type {!Array<!kivi.InvalidatorSubscription>} */(subscriptions);
          if (subscriptions[0] !== subscription) {
            throw new Error('Failed to remove subscription from Component: cannot find appropriate subscription');
          }
        }
      }
      this._transientSubscriptions = null;
    } else {
      subscriptions = /** @type {!Array<!kivi.InvalidatorSubscription>} */(subscriptions);
      i = subscriptions.indexOf(subscription);
      if (kivi.DEBUG) {
        if (i === -1) {
          throw new Error('Failed to remove subscription from Component: cannot find appropriate subscription');
        }
      }
      subscriptions[i] = subscriptions.pop();
    }
  }

};

/**
 * Cancels all subscriptions.
 */
kivi.Component.prototype.cancelSubscriptions = function() {
  var subscriptions = this._subscriptions;
  if (subscriptions !== null) {
    if (subscriptions.constructor === kivi.InvalidatorSubscription) {
      subscriptions.invalidator.removeSubscription(/** @type {!kivi.InvalidatorSubscription} */(subscriptions));
    } else {
      subscriptions = /** @type {!Array<!kivi.InvalidatorSubscription>} */(subscriptions);
      for (var i = 0; i < subscriptions.length; i++) {
        var s = subscriptions[i];
        s.invalidator.removeSubscription(s);
      }
    }
  }
  this._subscriptions = null;
};

/**
 * Cancels all transient subscriptions.
 */
kivi.Component.prototype.cancelTransientSubscriptions = function() {
  var subscriptions = this._transientSubscriptions;
  if (subscriptions !== null) {
    if (subscriptions.constructor === kivi.InvalidatorSubscription) {
      subscriptions.invalidator.removeSubscription(/** @type {!kivi.InvalidatorSubscription} */(subscriptions));
    } else {
      for (var i = 0; i < subscriptions.length; i++) {
        subscriptions = /** @type {!Array<!kivi.InvalidatorSubscription>} */(subscriptions);
        var s = subscriptions[i];
        s.invalidator.removeSubscription(s);
      }
    }
  }
  this._transientSubscriptions = null;
};
