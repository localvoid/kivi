goog.provide('kivi.CDescriptor');
goog.provide('kivi.Component');
goog.provide('kivi.ComponentFlags');
goog.require('kivi.Invalidator');
goog.require('kivi.InvalidatorSubscription');
goog.require('kivi.scheduler');

/**
 * Component Descriptor.
 *
 * @template D, S
 * @param {string} name
 * @final
 */
kivi.CDescriptor = class {
  constructor(name) {
    this.flags = 0;
    this.tag = 'div';

    /** @type {?function (!kivi.Component<D, S>)} */
    this.init = null;

    /** @type {?function (!kivi.Component<D, S>, D)} */
    this.setData = null;

    /** @type {?function (!kivi.Component<D, S>, (?Array<!kivi.VNode>|string))} */
    this.setChildren = null;

    /** @type {?function (!kivi.Component<D, S>)} */
    this.update = null;

    /** @type {?function (!kivi.Component<D, S>)} */
    this.invalidated = null;

    /** @type {?function (!kivi.Component<D, S>)} */
    this.disposed = null;

    if (kivi.DEBUG) {
      this.name = name;
    }
  }
};

/**
 * Component Flags.
 *
 * @enum {number}
 */
kivi.ComponentFlags = {
  DIRTY:               0x0001,
  ATTACHED:            0x0002,
  SVG:                 0x0004,
  MOUNTING:            0x0008,
  SHOULD_UPDATE_FLAGS: 0x0003
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
 * @final
 */
kivi.Component = class {
  constructor(flags, descriptor, parent, data, children, element) {
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
     * @type {?kivi.VNode|?CanvasRenderingContext2D}
     */
    this.root = null;

    /** @type {?Array<!kivi.InvalidatorSubscription>} */
    this._subscriptions = null;

    /** @type {?Array<!kivi.InvalidatorSubscription>} */
    this._transientSubscriptions = null;

    if (kivi.DEBUG) {
      this._isDisposed = false;
      element.setAttribute('data-kivi-component', descriptor.name);
      element._kiviComponent = this;
    }
  }

  /**
   * Update component.
   */
  update() {
    if ((this.flags & kivi.ComponentFlags.SHOULD_UPDATE_FLAGS) === kivi.ComponentFlags.SHOULD_UPDATE_FLAGS) {
      this.descriptor.update(this);
      this.mtime = kivi.scheduler.clock;
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
  syncVRoot(newRoot) {
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
   * Invalidate Component.
   */
  invalidate() {
    if ((this.flags & kivi.ComponentFlags.DIRTY) === 0) {
      this.flags |= kivi.ComponentFlags.DIRTY;
      this.cancelTransientSubscriptions();
      kivi.scheduler.nextFrame().updateComponent(this);
    }
  };

  /**
   * Dispose Component.
   */
  dispose() {
    if (kivi.DEBUG) {
      if (this._isDisposed) {
        throw 'Component cannot be disposed twice.'
      }
      this._isDisposed = true;
    }

    this.flags &= ~kivi.ComponentFlags.ATTACHED;
    this.cancelSubscriptions();
    this.cancelTransientSubscriptions();
    if (this.root !== null) {
      this.root.dispose();
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
  subscribe(invalidator) {
    var s = new kivi.InvalidatorSubscription(kivi.InvalidatorSubscription.Flags.component, invalidator, this);
    invalidator.addSubscription(s);
    var subscriptions = this._subscriptions;
    if (subscriptions === null) {
      this._subscriptions = subscriptions = [];
    }
    subscriptions.push(s);
  };

  /**
   * Transient subscribe to Invalidator object.
   *
   * @param {!kivi.Invalidator} invalidator
   */
  transientSubscribe(invalidator) {
    var s = new kivi.InvalidatorSubscription(
        kivi.InvalidatorSubscription.Flags.component | kivi.InvalidatorSubscription.Flags.transient,
        invalidator, this);
    invalidator.addSubscription(s);
    var subscriptions = this._transientSubscriptions;
    if (subscriptions === null) {
      this._transientSubscriptions = subscriptions = [];
    }
    subscriptions.push(s);
  };

  /**
   * Remove Subscription.
   *
   * @param {!kivi.InvalidatorSubscription} subscription
   */
  removeSubscription(subscription) {
    var subscriptions = /** @type {!Array<!kivi.InvalidatorSubscription>} */(
        ((subscription.flags & kivi.InvalidatorSubscription.Flags.transient) === 0) ?
            this._subscriptions: this._transientSubscriptions);

    if (subscriptions.length === 1) {
      subscriptions.pop();
    } else {
      subscriptions[subscriptions.indexOf(subscription)] = subscriptions.pop();
    }
  };

  /**
   * Cancels all subscriptions.
   */
  cancelSubscriptions() {
    var subscriptions = this._subscriptions;
    if (subscriptions !== null) {
      for (var i = 0; i < subscriptions.length; i++) {
        var s = subscriptions[i];
        s.invalidator.removeSubscription(s);
      }
    }
    this._subscriptions = null;
  };

  /**
   * Cancels all transient subscriptions.
   */
  cancelTransientSubscriptions() {
    var subscriptions = this._transientSubscriptions;
    if (subscriptions !== null) {
      for (var i = 0; i < subscriptions.length; i++) {
        var s = subscriptions[i];
        s.invalidator.removeSubscription(s);
      }
    }
    this._transientSubscriptions = null;
  };
};

/**
 * Create a [kivi.Component].
 *
 * @param {!kivi.CDescriptor} descriptor
 * @param {*} data
 * @param {?Array<!kivi.VNode>|string} children
 * @param {?kivi.Component} context
 * @returns {!kivi.Component}
 */
kivi.Component.create = function(descriptor, data, children, context) {
  var element = document.createElement(descriptor.tag);
  var c = new kivi.Component(kivi.ComponentFlags.SHOULD_UPDATE_FLAGS, descriptor, context, data, children, element);
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
