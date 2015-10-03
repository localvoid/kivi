goog.provide('kivi.CDescriptor');
goog.provide('kivi.CDescriptorFlags');
goog.provide('kivi.Component');
goog.require('kivi');
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
  SVG:             0x0001,
  WRAPPER:         0x0002,
  RECYCLE_ENABLED: 0x0004
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
  /**
   * Component Descriptor flags.
   *
   * @type {number}
   */
  this.flags = opt_flags === void 0 ? 0 : opt_flags;

  /**
   * Tag name of the root element.
   *
   * @type {string}
   */
  this.tag = 'div';

  /**
   * Data setter.
   * If new data changes the representation of the Component, data setter should
   * set dirty flag for the Component.
   *
   * @type {?function (!kivi.Component<D, S>, D)}
   */
  this.setData = null;

  /**
   * Children setter.
   * If new children list changes the representation of the Component, children
   * setter should set dirty flag for the Component.
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
   * Lifecycle method: attached.
   *
   * @type {?function (!kivi.Component<D, S>)}
   */
  this.attached = null;

  /**
   * Lifecycle method: detached.
   *
   * @type {?function (!kivi.Component<D, S>)}
   */
  this.detached = null;

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

  if (!kivi.DISABLE_COMPONENT_RECYCLING) {
    /** @type {?Array<!kivi.Component<D, S>>} */
    this.recycled = null;
    this.maxRecycled = 0;
  }

  if (kivi.DEBUG) {
    this.name = name;
  }
};

/**
 * Creates a Stateful Component descriptor with HTMLElement node.
 *
 * @param {string} name
 * @returns {!kivi.CDescriptor}
 */
kivi.CDescriptor.create = function(name) {
  return new kivi.CDescriptor(name, 0);
};

/**
 * Creates a Stateful Component descriptor with SVGElement node.
 *
 * @param {string} name
 * @returns {!kivi.CDescriptor}
 */
kivi.CDescriptor.createSvg = function(name) {
  return new kivi.CDescriptor(name, kivi.CDescriptorFlags.SVG);
};

/**
 * Creates a Component Descriptor Wrapper.
 *
 * @param {!kivi.CDescriptor} d
 * @returns {!kivi.CDescriptor}
 */
kivi.CDescriptor.createWrapper = function(d) {
  var r = new kivi.CDescriptor(d.name, kivi.CDescriptorFlags.WRAPPER);
  r.flags |= d.flags & kivi.CDescriptorFlags.SVG;
  r.tag = d.tag;
  return d;
};

/**
 * Enable recycling.
 *
 * @param {number} maxRecycled
 */
kivi.CDescriptor.prototype.enableRecycling = function(maxRecycled) {
  if (!kivi.DISABLE_COMPONENT_RECYCLING) {
    this.flags |= kivi.CDescriptorFlags.RECYCLE_ENABLED;
    this.recycled = [];
    this.maxRecycled = maxRecycled;
  }
};

/**
 * Component.
 *
 * @template D, S
 * @param {number} flags Lowest 24 bits reserved for kivi flags, other bits can
 *     be used for custom flags.
 * @param {!kivi.CDescriptor<D, S>} descriptor
 * @param {?kivi.Component} parent
 * @param {!Element} element
 * @constructor
 * @struct
 * @final
 */
kivi.Component = function(flags, descriptor, parent, element) {
  /** @type {number} */
  this.flags = flags;

  /**
   * Last time component were updated, see `kivi.Scheduler.clock` for details.
   *
   * @type {number}
   */
  this.mtime = 0;

  this.descriptor = descriptor;
  this.parent = parent;

  /** @type {number} */
  this.depth = parent === null ? 0 : parent.depth + 1;

  /** @type {S} */
  this.state = null;

  /** @type {D} */
  this.data = null;

  /** @type {?Array<!kivi.VNode>|string} */
  this.children = null;

  /** @type {!Element} */
  this.element = element;

  /**
   * Root node in the Components virtual tree.
   *
   * @type {?kivi.Component|?kivi.VNode|?CanvasRenderingContext2D}
   */
  this.root = null;

  /** @private {?Array<!kivi.InvalidatorSubscription>|?kivi.InvalidatorSubscription} */
  this._subscriptions = null;

  /** @private {?Array<!kivi.InvalidatorSubscription>|?kivi.InvalidatorSubscription} */
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
 * @param {?kivi.Component} context
 * @returns {!kivi.Component}
 */
kivi.Component.create = function(descriptor, context) {
  var c;

  if (kivi.DISABLE_COMPONENT_RECYCLING ||
      ((descriptor.flags & kivi.CDescriptorFlags.RECYCLE_ENABLED) === 0) ||
      descriptor.recycled.length === 0) {

    var element = ((descriptor.flags & kivi.CDescriptorFlags.SVG) === 0) ?
        document.createElement(descriptor.tag) :
        document.createElementNS(kivi.HtmlNamespace.SVG, descriptor.tag);
    c = new kivi.Component(kivi.ComponentFlags.DIRTY, descriptor, context, element);
    if (descriptor.init !== null) {
      descriptor.init(c);
    }
  } else {
    c = descriptor.recycled.pop();
  }

  return c;
};

/**
 * Mount Component on top of existing html element.
 *
 * @param {!kivi.CDescriptor} descriptor
 * @param {?kivi.Component} context
 * @param {!Element} element
 * @returns {!kivi.Component}
 */
kivi.Component.mount = function(descriptor, context, element) {
  var c = new kivi.Component(kivi.ComponentFlags.DIRTY | kivi.ComponentFlags.MOUNTING, descriptor, context, element);
  if (descriptor.init !== null) {
    descriptor.init(c);
  }
  return c;
};

/**
 * Wrap Component.
 *
 * @param {!kivi.CDescriptor} descriptor
 * @param {?kivi.Component} context
 * @param {!Element} element
 * @returns {!kivi.Component}
 */
kivi.Component.wrap = function(descriptor, context, element) {
  var c = new kivi.Component(kivi.ComponentFlags.DIRTY, descriptor, context, element);
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

  var c = this.root;
  if (c === null) {
    var descriptor = /** @type {!kivi.CDescriptor} */(this.descriptor.data);
    if ((this.flags & kivi.ComponentFlags.MOUNTING) === 0) {
      c = kivi.Component.wrap(descriptor, this, this.element);
    } else {
      c = kivi.Component.mount(descriptor, this, this.element);
    }
  }
  c.setInputData(newData, opt_newChildren);
  c.update();
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
 * Attach method should be invoked when Component is attached to the document.
 */
kivi.Component.prototype.attach = function() {
  this.attached();
  var root = this.root;
  if (root !== null) {
    if (root.constructor === kivi.VNode) {
      /** @type {!kivi.VNode} */(root).attach();
    } else if (root.constructor === kivi.Component) {
      /** @type {!kivi.Component} */(root).attach();
    }
  }
};

kivi.Component.prototype.attached = function() {
  this.flags |= kivi.ComponentFlags.ATTACHED;
  this.flags &= ~kivi.ComponentFlags.RECYCLED;

  var attached = this.descriptor.attached;
  if (attached !== null) {
    attached(this);
  }
};

/**
 * Detach method should be invoked when Component is detached from the document.
 */
kivi.Component.prototype.detach = function() {
  var root = this.root;
  if (root !== null) {
    if (root.constructor === kivi.VNode) {
      /** @type {!kivi.VNode} */(root).detach();
    } else if (root.constructor === kivi.Component) {
      /** @type {!kivi.Component} */(root).detach();
    }
  }
  this.detached();
};

kivi.Component.prototype.detached = function() {
  this.flags &= ~(kivi.ComponentFlags.ATTACHED | kivi.ComponentFlags.UPDATE_EACH_FRAME);
  this.cancelSubscriptions();
  this.cancelTransientSubscriptions();

  var detached = this.descriptor.detached;
  if (detached !== null) {
    detached(this);
  }
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
  var descriptor = this.descriptor;

  if (kivi.DISABLE_COMPONENT_RECYCLING ||
      ((descriptor.flags & kivi.CDescriptorFlags.RECYCLE_ENABLED) === 0) ||
      (descriptor.recycled.length >= descriptor.maxRecycled)) {
    this.flags |= kivi.ComponentFlags.DISPOSED;

    var root = this.root;
    if (root !== null) {
      // monomorphic code
      if (root.constructor === kivi.VNode) {
        /** @type {!kivi.VNode} */(root).dispose();
      } else if (root.constructor === kivi.Component) {
        /** @type {!kivi.Component} */(root).dispose();
      }
    }

    this.detached();
    if (descriptor.disposed !== null) {
      descriptor.disposed(this);
    }
  } else {
    this.detach();
    descriptor.recycled.push(this);
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
