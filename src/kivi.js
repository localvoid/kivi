/**
 * kivi - library for building web UIs.
 *
 * Most of the code is merged into one file because of circular dependencies, it is quite easy to break
 * this dependencies, but it is implemented this way to help google-closure-compiler to minify code better.
 * It is also easier to write monomorphic code this way.
 */

goog.provide('kivi');
goog.provide('kivi.env');
goog.provide('kivi.init');
goog.provide('kivi.Scheduler');
goog.provide('kivi.SchedulerFlags');
goog.provide('kivi.SchedulerFrame');
goog.provide('kivi.SchedulerFrameFlags');
goog.provide('kivi.Invalidator');
goog.provide('kivi.InvalidatorSubscription');
goog.provide('kivi.InvalidatorSubscriptionFlags');
goog.provide('kivi.HtmlNamespace');
goog.provide('kivi.VNode');
goog.provide('kivi.VNodeFlags');
goog.provide('kivi.createText');
goog.provide('kivi.createElement');
goog.provide('kivi.createComponent');
goog.provide('kivi.createRoot');
goog.provide('kivi.CDescriptor');
goog.provide('kivi.Component');
goog.provide('kivi.ComponentFlags');
goog.provide('kivi.injectComponent');
goog.provide('kivi.mountComponent');

/**
 * @define {boolean} DEBUG is provided as a convenience so that debugging code
 * that should not be included in a production js_binary can be easily stripped
 * by specifying --define kivi.DEBUG=false to the JSCompiler.
 */
goog.define('kivi.DEBUG', true);

/**
 * Scheduler.
 *
 * Scheduler supports animation frame tasks, and simple microtasks.
 *
 * Animation frame tasks will be executed in batches, switching between write and read tasks until there
 * are no tasks left. Write tasks are sorted by their priority, tasks with the lowest priority value are
 * executed first, so the lowest depth of the Component in the components tree has highest priority.
 *
 * Scheduler also have monotonically increasing internal clock, it increments each time scheduler goes
 * from one animation frame to another, or starts executing microtasks.
 *
 * @constructor
 * @struct
 * @final
 */
kivi.Scheduler = function() {
  /** @type {number} */
  this.flags = 0;

  /**
   * Monotonically increasing internal clock.
   *
   * @type {number}
   */
  this.clock = 1;

  /** @private {!Array<function()>} */
  this._microtasks = [];

  /** @private {!Array<function()>} */
  this._macrotasks = [];

  /** @private {!kivi.SchedulerFrame} */
  this._currentFrame = new kivi.SchedulerFrame();

  /** @private {!kivi.SchedulerFrame} */
  this._nextFrame = new kivi.SchedulerFrame();

  var self = this;

  /** @private {!kivi._MutationObserverScheduler} */
  this._microtaskScheduler = new kivi._MutationObserverScheduler(function() {
    self.flags |= kivi.SchedulerFlags.running;

    var tasks = self._microtasks;
    while (tasks.length > 0) {
      self._microtasks = [];

      for (var i = 0; i < tasks.length; i++) {
        tasks[i]();
      }

      tasks = self._microtasks;
    }

    self.clock++;
    self.flags &= ~(kivi.SchedulerFlags.microtaskPending | kivi.SchedulerFlags.running);
  });

  /** @private {!kivi._PostMessageScheduler} */
  this._macrotaskScheduler = new kivi._PostMessageScheduler(function() {
    self.flags &= ~kivi.SchedulerFlags.macrotaskPending;
    self.flags |= kivi.SchedulerFlags.running;

    var tasks = self._macrotasks;
    if (tasks.length > 0) {
      self._macrotasks = [];

      for (var i = 0; i < tasks.length; i++) {
        tasks[i]();
      }
    }

    self.clock++;
    self.flags &= ~kivi.SchedulerFlags.running;
  });

  /** @private {function(number)} */
  this._handleAnimationFrame = function() {
    var frame;
    var groups;
    var group;
    var task;
    var i, j;

    self.flags &= ~kivi.SchedulerFlags.frametaskPending;
    self.flags |= kivi.SchedulerFlags.running;

    frame = self._nextFrame;
    self._nextFrame = self._currentFrame;
    self._currentFrame = frame;

    do {
      while ((frame.flags & kivi.SchedulerFrameFlags.writeAny) !== 0) {
        if ((frame.flags & kivi.SchedulerFrameFlags.writePrio) !== 0) {
          frame.flags &= ~kivi.SchedulerFrameFlags.writePrio;
          groups = frame.writeTaskGroups;

          for (i = 0; i < groups.length; i++) {
            group = groups[i];
            if (group !== null) {
              groups[i] = null;
              for (j = 0; j < group.length; j++) {
                task = group[j];
                if (task.constructor === kivi.Component) {
                  /** {!kivi.Component} */(task).update();
                } else {
                  /** {!function()} */(task).call();
                }
              }
            }
          }
        }

        if ((frame.flags & kivi.SchedulerFrameFlags.write) !== 0) {
          frame.flags &= ~kivi.SchedulerFrameFlags.write;
          group = frame.writeTasks;
          for (i = 0; i < group.length; i++) {
            task = group[i];
            if (task.constructor === kivi.Component) {
              /** {!kivi.Component} */(task).update();
            } else {
              /** {!function()} */(task).call();
            }
          }
        }
      }

      while ((frame.flags & kivi.SchedulerFrameFlags.read) !== 0) {
        frame.flags &= ~kivi.SchedulerFrameFlags.read;
        group = frame.readTasks;
        frame.readTasks = null;

        for (i = 0; i < group.length; i++) {
          task = group[i];
          task();
        }
      }
    } while ((frame.flags & kivi.SchedulerFrameFlags.writeAny) !== 0);

    while ((frame.flags & kivi.SchedulerFrameFlags.after) !== 0) {
      frame.flags &= ~kivi.SchedulerFrameFlags.after;

      group = frame.afterTasks;
      for (i = 0; i < group.length; i++) {
        task = group[i];
        task();
      }
    }

    self.clock++;
    self.flags &= ~kivi.SchedulerFlags.running;
  };
};

/**
 * Scheduler Flags.
 *
 * @enum {number}
 */
kivi.SchedulerFlags = {
  running:          0x0100,
  microtaskPending: 0x0001,
  macrotaskPending: 0x0002,
  frametaskPending: 0x0008,
  microtaskRunning: 0x0010,
  macrotaskRunning: 0x0020,
  frametaskRunning: 0x0080
};

/**
 * Get current frame.
 *
 * @returns {!kivi.SchedulerFrame}
 */
kivi.Scheduler.prototype.currentFrame = function() {
  return this._currentFrame;
};

/**
 * Get next frame.
 *
 * @returns {!kivi.SchedulerFrame}
 */
kivi.Scheduler.prototype.nextFrame = function() {
  if ((this.flags & kivi.SchedulerFlags.frametaskPending) === 0) {
    this.flags |= kivi.SchedulerFlags.frametaskPending;
    window.requestAnimationFrame(this._handleAnimationFrame);
  }
  return this._nextFrame;
};

/**
 * Schedule microtask.
 *
 * @param {!function()} cb
 */
kivi.Scheduler.prototype.scheduleMicrotask = function(cb) {
  if ((this.flags & kivi.SchedulerFlags.microtaskPending) === 0) {
    this.flags |= kivi.SchedulerFlags.microtaskPending;
    this._microtaskScheduler.requestNextTick();
  }

  this._microtasks.push(cb);
};

/**
 * Schedule macrotask.
 *
 * @param {!function()} cb
 */
kivi.Scheduler.prototype.scheduleMacrotask = function(cb) {
  if ((this.flags & kivi.SchedulerFlags.macrotaskPending) === 0) {
    this.flags |= kivi.SchedulerFlags.macrotaskPending;
    this._macrotaskScheduler.requestNextTick();
  }

  this._macrotasks.push(cb);
};

/**
 * MutationObserver helper for microtasks.
 *
 * @param {!Function} cb
 * @constructor
 * @struct
 * @final
 * @package
 */
kivi._MutationObserverScheduler = function(cb) {
  this._observer = new window.MutationObserver(cb);
  this._node = document.createTextNode('');
  this._observer.observe(this._node, {characterData: true});
  this._toggle = 0;
};

/**
 * Request a next tick.
 */
kivi._MutationObserverScheduler.prototype.requestNextTick = function() {
  this._toggle ^= 1;
  this._node.data = this._toggle.toString();
};

/**
 * PostMessage helper for macrotasks.
 *
 * @param {!Function} cb
 * @constructor
 * @struct
 * @final
 * @package
 */
kivi._PostMessageScheduler = function(cb) {
  var message = this._message = '__pms' + Math.random().toString();

  /** @param {Event} e */
  var handler = function(e) {
    e = /** @type {MessageEvent<string>} */(e);
    if (e.source === window && e.data === message) {
      cb();
    }
  };
  window.addEventListener('message', handler);
};

/**
 * Request a next tick.
 */
kivi._PostMessageScheduler.prototype.requestNextTick = function() {
  window.postMessage(this._message, '*');
};

/**
 * Scheduler Frame.
 *
 * @constructor
 * @struct
 * @final
 */
kivi.SchedulerFrame = function() {
  /** @type {number} */
  this.flags = 0;

  /** @type {!Array<Array<function()|kivi.Component>>} */
  this.writeTaskGroups = [];

  /** @type {Array<function()|kivi.Component>} */
  this.writeTasks = null;

  /** @type {Array<function()>} */
  this.readTasks = null;

  /** @type {Array<function()>} */
  this.afterTasks = null;
};

/**
 * Scheduler Frame Flags.
 *
 * @enum {number}
 */
kivi.SchedulerFrameFlags = {
  writePrio: 0x0001,
  write:     0x0002,
  read:      0x0004,
  after:     0x0008,
  writeAny:  0x0003
};

/**
 * Add Component to the write task queue.
 *
 * @param {!kivi.Component} component
 */
kivi.SchedulerFrame.prototype.updateComponent = function(component) {
  this.write(component, component.depth);
};

/**
 * Add callback to the write task queue.
 *
 * @param {!function()|kivi.Component} cb
 * @param {number=} priority
 */
kivi.SchedulerFrame.prototype.write = function(cb, priority) {
  var group;

  if (priority === void 0) priority = -1;

  if (priority === -1) {
    this.flags |= kivi.SchedulerFrameFlags.write;
    if (this.writeTasks === null) {
      this.writeTasks = [];
    }
    this.writeTasks.push(cb);
  } else {
    this.flags |= kivi.SchedulerFrameFlags.writePrio;
    while (priority >= this.writeTaskGroups.length) {
      this.writeTaskGroups.push(null);
    }

    group = this.writeTaskGroups[priority];
    if (group === null) {
      group = this.writeTaskGroups[priority] = [];
    }

    group.push(cb);
  }
};

/**
 * Add callback to the read task queue.
 *
 * @param {!function()} cb
 */
kivi.SchedulerFrame.prototype.read = function(cb) {
  this.flags |= kivi.SchedulerFrameFlags.read;
  if (this.readTasks === null) {
    this.readTasks = [];
  }
  this.readTasks.push(cb);
};

/**
 * Add callback to the after task queue.
 *
 * @param {!function()} cb
 */
kivi.SchedulerFrame.prototype.after = function(cb) {
  this.flags |= kivi.SchedulerFrameFlags.after;
  if (this.afterTasks === null) {
    this.afterTasks = [];
  }
  this.afterTasks.push(cb);
};

/**
 * Global Environment.
 *
 * @type {{scheduler: kivi.Scheduler}}
 */
kivi.env = {
  scheduler: null
};

/**
 * Initialize kivi library.
 *
 * @param {!kivi.Scheduler} scheduler
 */
kivi.init = function(scheduler) {
  kivi.env.scheduler = scheduler;
};

/**
 * Invalidator object is used to trigger invalidation for subscribers.
 *
 * @constructor
 * @struct
 * @final
 */
kivi.Invalidator = function() {
  /**
   * Last modification time.
   *
   * @type {number}
   */
  this.mtime = kivi.env.scheduler.clock;

  /** @type {Array<!kivi.InvalidatorSubscription>} */
  this._subscriptions = null;
  /** @type {Array<!kivi.InvalidatorSubscription>} */
  this._transientSubscriptions = null;
};

/**
 * Invalidator Subscription.
 *
 * @param {number} flags
 * @param {!kivi.Invalidator} invalidator
 * @param {function()|kivi.Component} subscriber
 * @constructor
 * @struct
 * @final
 */
kivi.InvalidatorSubscription = function(flags, invalidator, subscriber) {
  this.flags = flags;
  this.invalidator = invalidator;
  this.subscriber = subscriber;

  if (kivi.DEBUG) {
    this._isCanceled = false;
  }
};

/**
 * Invalidator Subscription Flags.
 *
 * @enum {number}
 */
kivi.InvalidatorSubscriptionFlags = {
  component: 0x0001,
  transient: 0x0002
};

/**
 * Add Subscription.
 *
 * @param {!kivi.InvalidatorSubscription} subscription
 */
kivi.Invalidator.prototype.addSubscription = function(subscription) {
  var subscriptions;
  if ((subscription.flags & kivi.InvalidatorSubscriptionFlags.transient) === 0) {
    subscriptions = this._subscriptions;
    if (subscriptions === null) {
      this._subscriptions = subscriptions = [];
    }
  } else {
    subscriptions = this._transientSubscriptions;
    if (subscriptions === null) {
      this._transientSubscriptions = subscriptions = [];
    }
  }
  subscriptions.push(subscription);
};

/**
 * Remove Subscription.
 *
 * @param {!kivi.InvalidatorSubscription} subscription
 */
kivi.Invalidator.prototype.removeSubscription = function(subscription) {
  var subscriptions = ((subscription.flags & kivi.InvalidatorSubscriptionFlags.transient) === 0) ?
      this._subscriptions : this._transientSubscriptions;

  if (subscriptions.length === 1) {
    subscriptions.pop();
  } else {
    var i = subscriptions.indexOf(subscription);
    if (i !== -1) {
      subscriptions[i] = subscriptions.pop();
    }
  }
};

/**
 * Trigger invalidation.
 */
kivi.Invalidator.prototype.invalidate = function() {
  var now = kivi.env.scheduler.clock;
  if (this.mtime < now) {
    this.mtime = now;

    var subscriptions = this._subscriptions;
    var i;

    if (subscriptions !== null) {
      for (i = 0; i < subscriptions.length; i++) {
        subscriptions[i].invalidate();
      }
    }

    subscriptions = this._transientSubscriptions;
    if (subscriptions !== null) {
      this._transientSubscriptions = null;

      for (i = 0; i < subscriptions.length; i++) {
        subscriptions[i].invalidate();
      }
    }
  }
};

/**
 * Cancel subscription.
 */
kivi.InvalidatorSubscription.prototype.cancel = function() {
  if (kivi.DEBUG) {
    if (this._isCanceled) {
      throw 'InvalidatorSubscription is canceled more than one time.';
    }
    this._isCanceled = true;
  }
  this.invalidator.removeSubscription(this);
  if ((this.flags & kivi.InvalidatorSubscriptionFlags.component) !== 0) {
    /** @type {!kivi.Component} */(this.subscriber).removeSubscription(this);
  }
};

/**
 * Trigger invalidation.
 */
kivi.InvalidatorSubscription.prototype.invalidate = function() {
  if ((this.flags & kivi.InvalidatorSubscriptionFlags.component) !== 0) {
    /** {!kivi.Component} */(this.subscriber).invalidate();
  } else {
    /** {!function()} */(this.subscriber).call();
  }
};

/**
 * Virtual DOM Node.
 *
 * @param {number} flags Flags.
 * @param {string|kivi.CDescriptor|null} tag Tag should contain html tag name if VNode represents an element,
 *   or reference to the [vdom.CDescriptor] if it represents a Component.
 * @param {*} data Data that will be transffered to Components. If VNode represents an element, [data] is
 *   used as a cache for className string that was built from [type] and [classes] properties.
 * @constructor
 * @struct
 * @final
 */
kivi.VNode = function(flags, tag, data) {
  this.flags = flags;
  this.tag = tag;
  this.data_ = data;
  /**
   * Key that should be unique among its siblings.
   *
   * @type {number|string|null}
   */
  this.key_ = null;

  /**
   * Immutable class name.
   *
   * @type {?string}
   */
  this.type_ = null;

  /**
   * Element attributes.
   *
   * @type {Object<string,string>}
   */
  this.attrs_ = null;

  /**
   * Element properties.
   *
   * @type {Object<string,*>}
   */
  this.props_ = null;

  /**
   * Element styles.
   *
   * @type {Object<string,string>}
   */
  this.style_ = null;

  /**
   * Element classes.
   *
   * @type {Array<string>}
   */
  this.classes_ = null;

  /**
   * List of children nodes. If VNode is a Component, children nodes will be transferred to the Component.
   *
   * @type {Array<!kivi.VNode>|string}
   */
  this.children_ = null;

  /**
   * Reference to the [Node]. It will be available after [vdom.VNode] is created or synced. Each time
   * [vdom.VNode] is synced, reference to the [Node] is transferred from the previous node to the new one.
   *
   * @type {Node}
   */
  this.ref = null;

  /**
   * Reference to the [vdom.Component]. It will be available after [vdom.VNode] is created or synced. Each
   * time [vdom.VNode] is synced, reference to the [vdom.Component] is transferred from the previous node to
   * the new one.
   *
   * @type {kivi.Component}
   */
  this.cref = null;

  if (kivi.DEBUG) {
    this._isRendered = false;
    this._isMounted = false;
    this._isDisposed = false;
  }
};

/**
 * VNode Flags
 *
 * @enum {number}
 */
kivi.VNodeFlags = {
  /** Flag indicating that [kivi.VNode] is a [Text] node. */
  text:       0x0001,
  /** Flag indicating that [kivi.VNode] is an [Element] node. */
  element:    0x0002,
  /** Flag indicating that [kivi.VNode] is a [kivi.Component] node. */
  component:  0x0004,
  /** Flag indicating that [kivi.VNode] is a root element of the [kivi.Component]. */
  root:       0x0008,
  /** Flag indicating that [kivi.VNode] represents node in svg namespace. */
  svg:        0x0010,
  /** Flag indicating that [kivi.VNode] should track similar children by keys. */
  trackByKey: 0x0020
};

/**
 * Html Namespaces
 *
 * @enum {string}
 */
kivi.HtmlNamespace = {
  svg: 'http://www.w3.org/2000/svg',
  xlink: 'http://www.w3.org/1999/xlink',
  xml: 'http://www.w3.org/XML/1998/namespace'
};

/**
 * Namespaced Attribute should be set with setAttributeNS call.
 *
 * @typedef {{name: string, namespace: kivi.HtmlNamespace}}
 * @protected
 */
kivi._NamespacedAttr;

/**
 * Namespaced Attributes.
 *
 * Namespaced attribute names should start with '$' symbol, so we can easily recognize them from simple
 * attributes.
 *
 * @const {Object<string, !kivi._NamespacedAttr>}
 * @protected
 */
kivi._namespacedAttrs = {
  '$xlink:actuate': {
    name: 'xlink:actuate',
    namespace: kivi.HtmlNamespace.xlink
  },
  '$xlink:arcrole': {
    name: 'xlink:arcrole',
    namespace: kivi.HtmlNamespace.xlink
  },
  '$xlink:href': {
    name: 'xlink:href',
    namespace: kivi.HtmlNamespace.xlink
  },
  '$xlink:role': {
    name: 'xlink:role',
    namespace: kivi.HtmlNamespace.xlink
  },
  '$xlink:show': {
    name: 'xlink:show',
    namespace: kivi.HtmlNamespace.xlink
  },
  '$xlink:title': {
    name: 'xlink:title',
    namespace: kivi.HtmlNamespace.xlink
  },
  '$xlink:type': {
    name: 'xlink:type',
    namespace: kivi.HtmlNamespace.xlink
  },
  '$xml:base': {
    name: 'xml:base',
    namespace: kivi.HtmlNamespace.xml
  },
  '$xml:lang': {
    name: 'xml:lang',
    namespace: kivi.HtmlNamespace.xml
  },
  '$xml:space': {
    name: 'xml:space',
    namespace: kivi.HtmlNamespace.xml
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
kivi._setAttr = function(node, key, value) {
  if (key[0] !== '$') {
    node.setAttribute(key, value);
  } else {
    var details = kivi._namespacedAttrs[key];
    if (kivi.DEBUG) {
      if (details === void 0) {
        throw `Invalid namespaced attribute $${key}}`;
      }
    }
    node.setAttributeNS(details.namespace, details.name, value);
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
kivi._removeAttr = function(node, key) {
  if (key[0] !== '$') {
    node.removeAttribute(key);
  } else {
    var details = kivi._namespacedAttrs[key];
    if (kivi.DEBUG) {
      if (details === void 0) {
        throw `Invalid namespaced attribute $${key}}`;
      }
    }
    node.removeAttributeNS(details.namespace, details.name);
  }
};

/**
 * Create a [vdom.VNode] representing a [Text] node.
 *
 * @param {string} content
 * @return {!kivi.VNode}
 */
kivi.createText = function(content) {
  return new kivi.VNode(kivi.VNodeFlags.text, null, content);
};

/**
 * Create a [vdom.VNode] representing a [Element] node.
 *
 * @param {string} tag
 * @return {!kivi.VNode}
 */
kivi.createElement = function(tag) {
  return new kivi.VNode(kivi.VNodeFlags.element, tag, null);
};

/**
 * Create a [vdom.VNode] representing a [SVGElement] node.
 *
 * @param {string} tag
 * @return {!kivi.VNode}
 */
kivi.createSvgElement = function(tag) {
  return new kivi.VNode(kivi.VNodeFlags.element | kivi.VNodeFlags.svg, tag, null);
};

/**
 * Create a [vdom.VNode] representing a [vdom.Component] node.
 *
 * @param {!kivi.CDescriptor} descriptor
 * @param {*=} data
 * @return {!kivi.VNode}
 */
kivi.createComponent = function(descriptor, data) {
  if (data === void 0) data = null;
  return new kivi.VNode(kivi.VNodeFlags.component, descriptor, data);
};

/**
 * Create a [vdom.VNode] representing a root node.
 *
 * @return {!kivi.VNode}
 */
kivi.createRoot = function() {
  return new kivi.VNode(kivi.VNodeFlags.root, null, null);
};

/**
 * Set key.
 *
 * @param {null|number|string} key
 * @returns {!kivi.VNode}
 */
kivi.VNode.prototype.key = function(key) {
  this.key_ = key;
  return this;
};

/**
 * Set data.
 *
 * @param {*} data
 * @returns {!kivi.VNode}
 */
kivi.VNode.prototype.data = function(data) {
  this.data_ = data;
  return this;
};

/**
 * Set type.
 *
 * @param {string} type
 * @returns {!kivi.VNode}
 */
kivi.VNode.prototype.type = function(type) {
  this.type_ = type;
  return this;
};

/**
 * Set attrs.
 *
 * @param {Object<string,string>} attrs
 * @returns {!kivi.VNode}
 */
kivi.VNode.prototype.attrs = function(attrs) {
  this.attrs_ = attrs;
  return this;
};

/**
 * Set props.
 *
 * @param {Object<string,*>} props
 * @returns {!kivi.VNode}
 */
kivi.VNode.prototype.props = function(props) {
  this.props_ = props;
  return this;
};

/**
 * Set style.
 *
 * @param {Object<string,string>} style
 * @returns {!kivi.VNode}
 */
kivi.VNode.prototype.style = function(style) {
  this.style_ = style;
  return this;
};

/**
 * Set classes.
 *
 * @param {Array<string>} classes
 * @returns {!kivi.VNode}
 */
kivi.VNode.prototype.classes = function(classes) {
  this.classes_ = classes;
  return this;
};

/**
 * Set children.
 *
 * @param {Array<!kivi.VNode>|string} children
 * @returns {!kivi.VNode}
 */
kivi.VNode.prototype.children = function(children) {
  this.children_ = children;
  return this;
};

/**
 * Enable Track By Key mode for children reconciliation.
 *
 * @returns {!kivi.VNode}
 */
kivi.VNode.prototype.trackByKey = function() {
  this.flags |= kivi.VNodeFlags.trackByKey;
  return this;
};

/**
 * Checks if two nodes can be synced.
 *
 * @param {!kivi.VNode} b
 * @return {boolean}
 * @private
 */
kivi.VNode.prototype._canSync = function(b) {
  return (this.flags === b.flags &&
          this.tag === b.tag &&
          this.type_ === b.type_ &&
          this.key_ === b.key_);
};

/**
 * Create root element of the object, or [vdom.Component] for component nodes.
 *
 * @param {!kivi.Component} context
 */
kivi.VNode.prototype.create = function(context) {
  if (kivi.DEBUG) {
    if (this.ref !== null) {
      throw 'VNode cannot be created if it already has a reference to the DOM Node.';
    }
  }

  var flags = this.flags;

  if ((flags & kivi.VNodeFlags.text) !== 0) {
    this.ref = document.createTextNode(/** @type {string} */(this.data_));
  } else if ((flags & kivi.VNodeFlags.element) !== 0) {
    if ((flags & kivi.VNodeFlags.svg) === 0) {
      this.ref = document.createElement(/** @type {string} */(this.tag));
    } else {
      this.ref = document.createElementNS(kivi.HtmlNamespace.svg, /** @type {string} */(this.tag));
    }
  } else if ((flags & kivi.VNodeFlags.component) !== 0) {
    var component = kivi.Component.create(
        /** @type {!kivi.CDescriptor} */(this.tag),
        this.data_,
        this.children_,
        context);
    this.ref = component.element;
    this.cref = component;
  }
};

/**
 * Render internal representation of the Virtual Node.
 *
 * @param {!kivi.Component} context
 */
kivi.VNode.prototype.render = function(context) {
  if (kivi.DEBUG) {
    if (this.ref === null) {
      throw 'VNode should be created before render.';
    }
    if (this._isRendered) {
      throw 'VNode cannot be rendered twice.';
    }
    if (this._isMounted) {
      throw 'VNode cannot be rendered after mount.';
    }
    this._isRendered = true;
  }

  /** @type {number} */
  var i;
  /** @type {number} */
  var il;
  /** @type {string|number} */
  var key;
  var keys;
  var flags = this.flags;

  /** @type {Element} */
  var ref;
  /** @type {!CSSStyleDeclaration} */
  var style;
  /** @type {?string} */
  var className;
  /** @type {?string} */
  var classes;

  if (kivi.DEBUG) {
    if (this.children_ !== null && typeof this.children_ !== 'string') {
      if ((flags & kivi.VNodeFlags.trackByKey) !== 0) {
        for (i = 0; i < this.children_.length; i++) {
          if (this.children_[i].key_ === null) {
            throw 'Failed to render VNode. Invalid VNode: rendering children with trackByKey requires that all' +
                  ' children have keys.';
          }
        }
      }
    }
  }

  if ((flags & (kivi.VNodeFlags.element | kivi.VNodeFlags.component | kivi.VNodeFlags.root)) !== 0) {
    ref = /** @type {!Element} */(this.ref);

    if (this.attrs_ !== null) {
      keys = Object.keys(this.attrs_);
      for (i = 0, il = keys.length; i < il; i++) {
        key = keys[i];
        kivi._setAttr(ref, key, this.attrs_[key]);
      }
    }

    if (this.props_ !== null) {
      keys = Object.keys(this.props_);
      for (i = 0, il = keys.length; i < il; i++) {
        key = keys[i];
        ref[key] = this.props_[key];
      }
    }

    if (this.style_ !== null) {
      style = ref.style;
      keys = Object.keys(this.style_);
      for (i = 0, il = keys.length; i < il; i++) {
        key = keys[i];
        style.setProperty(key, this.style_[key], '');
      }
    }

    className = null;
    if (this.type_ !== null) {
      className = this.type_;
    }
    if (this.classes_ !== null) {
      classes = this.classes_.join(' ');
      className = (className === null) ? classes : className + ' ' + classes;
    }
    if (className !== null) {
      if ((flags & kivi.VNodeFlags.element) !== 0) {
        this.data_ = className;
        ref.className = className;
      } else if ((flags & kivi.VNodeFlags.component) !== 0) {
        ref.className = className;
      } else {
        var oldClassName = ref.className;
        if (oldClassName === '') {
          ref.className = className;
        } else {
          ref.className = oldClassName + ' ' + className;
        }
      }
    }

    if ((flags & kivi.VNodeFlags.component) !== 0) {
      /** @type {!kivi.Component} */(this.cref).update();
    } else if (this.children_ !== null) {
      var children = this.children_;
      if (typeof children === 'string') {
        ref.textContent = children;
      } else {
        for (i = 0, il = this.children_.length; i < il; i++) {
          this._insertChild(this.children_[i], null, context);
        }
      }
    }
  }
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
      throw 'VNode cannot be mounted if it already has a reference to DOM Node.';
    }
    if (this._isRendered) {
      throw 'VNode cannot be mounted after render.';
    }
    if (this._isMounted) {
      throw 'VNode cannot be mounted twice.';
    }
    this._isMounted = true;
  }

  var flags = this.flags;
  var children = this.children_;
  var i;

  if (kivi.DEBUG) {
    if (children !== null && typeof children !== 'string') {
      if ((flags & kivi.VNodeFlags.trackByKey) !== 0) {
        for (i = 0; i < children.length; i++) {
          if (children[i].key_ === null) {
            throw 'Failed to mount VNode. Invalid VNode: mounting children with trackByKey requires that all' +
                  ' children have keys.';
          }
        }
      }
    }
  }
  this.ref = node;

  if ((flags & kivi.VNodeFlags.component) !== 0) {
    var cref = this.cref = kivi.Component.mount(/** @type {!kivi.CDescriptor} */(this.tag), this.data_, children, context, /** @type {!Element} */(node));
    cref.update();
  } else {
    if (children !== null && typeof children !== 'string' && children.length > 0) {
      children = /** @type {!Array<!kivi.VNode>} */(children);
      /** @type {Node} */
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
            throw 'Failed to mount VNode. Cannot find matching node.';
          }
        }
        children[i].mount(/** @type {!Node} */(child), context);
        child = child.nextSibling;
        while (child.nodeType === 8) {
          commentNode = child;
          child = child.nextSibling;
          node.removeChild(commentNode);
        }
      }
    }
  }
};

/**
 * Synchronize Virtual Node.
 *
 * When `this` node is synced with node `b`, `this` node should be considered as destroyed, and any access
 * to it after synced is an undefined behaviour.
 *
 * @param {!kivi.VNode} b New node
 * @param {!kivi.Component} context
 */
kivi.VNode.prototype.sync = function(b, context) {
  if (kivi.DEBUG) {
    if (!(this._isRendered || this._isMounted)) {
      throw 'VNode should be rendered or mounted before sync.';
    }
    b._isRendered = this._isRendered;
    b._isMounted = this._isMounted;
  }

  /** @type {Element} */
  var ref = /** @type {Element} */ (this.ref);
  var flags = this.flags;
  /** @type {string} */
  var classes;
  /** @type {?string} */
  var className;
  /** @type {!kivi.Component} */
  var component;

  if (kivi.DEBUG) {
    if (this.flags !== b.flags) {
      throw `Failed to sync VNode. Invalid VNode: flags does not match (old: ${this.flags}, new: ${b.flags})`;
    }
    if (this.tag !== b.tag) {
      throw `Failed to sync VNode. Invalid VNode: tags does not match (old: ${this.tag}, new: ${b.tag})`;
    }
    if (this.key_ !== b.key_) {
      throw `Failed to sync VNode. Invalid VNode: keys does not match (old: ${this.key_}, new: ${b.key_})`;
    }
    if (this.type_ !== b.type_) {
      throw `Failed to sync VNode. Invalid VNode: types does not match (old: ${this.type_}, new: ${b.type_})`;
    }
    if (b.ref !== null && this.ref !== b.ref) {
      throw 'Failed to sync VNode. Invalid VNode: reusing VNodes isn\'t allowed unless it has the same ref';
    }
    if (b.children_ !== null && typeof b.children_ !== 'string') {
      if ((b.flags & kivi.VNodeFlags.trackByKey) !== 0) {
        for (var i = 0; i < b.children_.length; i++) {
          if (b.children_[i].key_ === null) {
            throw 'Failed to sync VNode. Invalid VNode: updating children with trackByKey requires that all' +
                  ' children have keys.';
          }
        }
      }
    }
  }

  b.ref = ref;

  if ((flags & kivi.VNodeFlags.text) !== 0) {
    if (this.data_ !== b.data_) {
      this.ref.nodeValue = /** @type {string} */ (b.data_);
    }
  } else if ((flags & (kivi.VNodeFlags.element | kivi.VNodeFlags.component | kivi.VNodeFlags.root)) !== 0) {
    if (this.attrs_ !== b.attrs_) {
      kivi.syncAttrs(this.attrs_, b.attrs_, /** @type {!Element} */ (ref));
    }
    if (this.props_ !== b.props_) {
      kivi.syncProps(this.props_, b.props_, /** @type {!Element} */ (ref));
    }
    if (this.style_ !== b.style_) {
      kivi.syncStyle(this.style_, b.style_, ref.style);
    }

    if ((flags & kivi.VNodeFlags.element) !== 0) {
      if (this.classes_ !== b.classes_) {
        if (b.data_ === null) {
          className = b.type_;
          if (b.classes_ !== null) {
            classes = b.classes_.join(' ');
            className = (className === null) ? classes : className + ' ' + classes;
          }
          b.data_ = className;
        }
        if (this.data_ !== b.data_) {
          ref.className = (b.data_ === null) ? '' : className;
        }
      } else {
        b.data_ = this.data_;
      }
    } else if (this.classes_ !== b.classes_) {
      kivi.syncClasses(this.classes_, b.classes_, /** @type {HTMLElement} */(ref).classList);
    }

    if ((flags & kivi.VNodeFlags.component) !== 0) {
      component = b.cref = /** @type {!kivi.Component} */(this.cref);
      if (component.descriptor.setData === null) {
        if (this.data_ !== b.data_) {
          component.data = b.data_;
          component.flags |= kivi.ComponentFlags.dirty;
        }
      } else {
        component.descriptor.setData(component, b.data_);
      }
      if (component.descriptor.setChildren !== null) {
        component.descriptor.setChildren(component, b.children_);
      }
      /** @type {!kivi.Component} */(component).update();
    } else {
      this.syncChildren(this.children_, b.children_, context);
    }
  }
};

/**
 * Dispose Virtual Node.
 */
kivi.VNode.prototype.dispose = function() {
  if ((this.flags & kivi.VNodeFlags.component) !== 0) {
    /** @type {!kivi.Component} */ (this.cref).dispose();
  } else if (this.children_ !== null) {
    var children = this.children_;
    if (typeof children !== 'string') {
      children = /** @type {!Array<!kivi.VNode>} */(children);
      for (var i = 0; i < children.length; i++) {
        children[i].dispose();
      }
    }
  }
};

/**
 * Synchronize attributes.
 *
 * @param {Object<string, string>} a Old attributes.
 * @param {Object<string, string>} b New attributes.
 * @param {!Element} node
 */
kivi.syncAttrs = function(a, b, node) {
  var i, il;
  var key;
  var keys;
  var aValue;
  var bValue;

  if (a !== null) {
    if (b === null) {
      // b is empty, remove all attributes from a.
      keys = Object.keys(a);
      for (i = 0, il = keys.length; i < il; i++) {
        kivi._removeAttr(node, keys[i]);
      }
    } else {
      // Remove and update attributes.
      keys = Object.keys(a);
      for (i = 0, il = keys.length; i < il; i++) {
        key = keys[i];
        if (b.hasOwnProperty(key)) {
          aValue = a[key];
          bValue = b[key];
          if (aValue !== bValue) {
            kivi._setAttr(node, key, bValue);
          }
        } else {
          kivi._removeAttr(node, key);
        }
      }

      // Insert new attributes.
      keys = Object.keys(b);
      for (i = 0, il = keys.length; i < il; i++) {
        key = keys[i];
        if (!a.hasOwnProperty(key)) {
          kivi._setAttr(node, key, b[key]);
        }
      }
    }
  } else if (b !== null) {
    // a is empty, insert all attributes from b.
    keys = Object.keys(b);
    for (i = 0, il = keys.length; i < il; i++) {
      key = keys[i];
      kivi._setAttr(node, key, b[key]);
    }
  }
};

/**
 * Synchronize properties.
 *
 * @param {Object<string, *>} a Old properties.
 * @param {Object<string, *>} b New properties.
 * @param {!Element} node
 */
kivi.syncProps = function(a, b, node) {
  var i, il;
  var key;
  var keys;
  var aValue;
  var bValue;

  if (a !== null) {
    if (b === null) {
      // b is empty, remove all attributes from a.
      keys = Object.keys(a);
      for (i = 0, il = keys.length; i < il; i++) {
        node[keys[i]] = undefined;
      }
    } else {
      // Remove and update attributes.
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
  } else if (b !== null) {
    // a is empty, insert all attributes from b.
    keys = Object.keys(b);
    for (i = 0, il = keys.length; i < il; i++) {
      key = keys[i];
      node[key] = b[key];
    }
  }
};

/**
 * Synchronize styles.
 *
 * @param {Object<string, string>} a Old style.
 * @param {Object<string, string>} b New style.
 * @param {!CSSStyleDeclaration} style
 */
kivi.syncStyle = function(a, b, style) {
  var i, il;

  /**
   * @type {string}
   */
  var key;

  /**
   * @type {!Array<string>}
   */
  var keys;

  if (a !== null) {
    if (b === null) {
      // b is empty, remove all styles from a.
      keys = Object.keys(a);
      for (i = 0, il = keys.length; i < il; i++) {
        style.removeProperty(keys[i]);
      }
    } else {
      // Remove and update styles.
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
  } else if (b !== null) {
    // a is empty, insert all styles from b.
    keys = Object.keys(b);
    for (i = 0, il = keys.length; i < il; i++) {
      key = keys[i];
      style.setProperty(key, b[key], '');
    }
  }
};

/**
 * Synchronize classes in the classList.
 *
 * @param {Array<string>} a Old classes.
 * @param {Array<string>} b New classes.
 * @param {DOMTokenList} classList
 */
kivi.syncClasses = function(a, b, classList) {
  var i;
  var aCls, bCls;
  var unchangedPosition;

  if (a !== null && a.length !== 0) {
    if (b === null || b.length === 0) {
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

            if (aCls === bCls) {
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
  } else if (b !== null && b.length > 0) {
    // a is empty, insert all classes from b.
    for (i = 0; i < b.length; i++) {
      classList.add(b[i]);
    }
  }
};

/**
 * Insert VNode
 *
 * @param {!kivi.VNode} node Node to insert.
 * @param {Node} nextRef Reference to the next html element.
 * @param {!kivi.Component} context Current context.
 * @private
 */
kivi.VNode.prototype._insertChild = function(node, nextRef, context) {
  node.create(context);
  this.ref.insertBefore(node.ref, nextRef);
  node.render(context);
};

/**
 * Replace VNode.
 *
 * @param {!kivi.VNode} newNode New Node.
 * @param {!kivi.VNode} refNode Old node.
 * @param {!kivi.Component} context Current context.
 * @private
 */
kivi.VNode.prototype._replaceChild = function(newNode, refNode, context) {
  newNode.create(context);
  this.ref.replaceChild(newNode.ref, refNode.ref);
  newNode.render(context);
};

/**
 * Move VNode
 *
 * @param {!kivi.VNode} node Node to move.
 * @param {Node} nextRef Reference to the next html element.
 * @private
 */
kivi.VNode.prototype._moveChild = function(node, nextRef) {
  this.ref.insertBefore(node.ref, nextRef);
};

/**
 * Remove VNode.
 *
 * @param {!kivi.VNode} node Node to remove.
 * @private
 */
kivi.VNode.prototype._removeChild = function(node) {
  this.ref.removeChild(node.ref);
  node.dispose();
};

/**
 * Synchronize old children list [a] with the new one [b].
 *
 * @param {Array<!kivi.VNode>|string} a Old children list.
 * @param {Array<!kivi.VNode>|string} b New children list.
 * @param {!kivi.Component} context Current context.
 */
kivi.VNode.prototype.syncChildren = function(a, b, context) {
  var aNode;
  var bNode;
  var i = 0;
  var synced = false;

  if (typeof a === 'string') {
    if (typeof b === 'string') {
      if (a !== b) {
        var c = this.ref.firstChild;
        if (c) {
          c.nodeValue = /** @type {string} */(b);
        } else {
          this.ref.textContent = b;
        }
      }
    } else if (b !== null) {
      while (i < b.length) {
        this._insertChild(b[i++], null, context);
      }
    }
  } else if (typeof b === 'string') {
    if (a !== null) {
      while(i < a.length) {
        this._removeChild(a[i++]);
      }
    }
    this.ref.textContent = b;
  } else {
    a = /** @type {Array<!kivi.VNode>} */(a);
    b = /** @type {Array<!kivi.VNode>} */(b);

    if (a !== null && a.length !== 0) {
      if (b === null || b.length === 0) {
        // b is empty, remove all children from a.
        while(i < a.length) {
          this._removeChild(a[i++]);
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
          if ((this.flags & kivi.VNodeFlags.trackByKey) === 0) {
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
            this._removeChild(aNode);
          }
        } else if (b.length === 1) {
          // Fast path when b have 1 child.
          bNode = b[0];
          if ((this.flags & kivi.VNodeFlags.trackByKey) === 0) {
            while (i < a.length) {
              aNode = a[i++];
              if (aNode._canSync(bNode)) {
                aNode.sync(bNode, context);
                synced = true;
                break;
              }
              this._removeChild(aNode);
            }
          } else {
            while (i < a.length) {
              aNode = a[i++];
              if (aNode.key_ === bNode.key_) {
                aNode.sync(bNode, context);
                synced = true;
                break;
              }
              this._removeChild(aNode);
            }
          }

          if (synced) {
            while (i < a.length) {
              this._removeChild(a[i++]);
            }
          } else {
            this._insertChild(bNode, null, context);
          }
        } else {
          // a and b have more than 1 child.
          if ((this.flags & kivi.VNodeFlags.trackByKey) === 0) {
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
 * @param {!Array<!kivi.VNode>} a Old children list.
 * @param {!Array<!kivi.VNode>} b New children list.
 * @param {!kivi.Component} context Current context.
 * @private
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
      this._removeChild(a[aStart++]);
    } while (aStart < aEnd);
  } else if (bStart <= bEnd) {
    // All nodes from b are synced, insert the rest.
    nextPos = bEnd + 1;
    next = nextPos < b.length ? b[nextPos].ref : null;
    do {
      this._insertChild(b[bStart++], next, context);
    } while (bStart < bEnd);
  }
};

/**
 * Synchronize children tracking by keys.
 *
 * @param {!Array<!kivi.VNode>} a Old children list.
 * @param {!Array<!kivi.VNode>} b New children list.
 * @param {!kivi.Component} context Current context.
 * @private
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
  /** @type {number} */
  var j;
  var stop = false;
  var nextPos;
  var next;
  /** @type {kivi.VNode} */
  var aNode;
  /** @type {kivi.VNode} */
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
      aStartNode.sync(bEndNode, context);
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

    // Move and sync nodes from right to left.
    while (aEndNode.key_ === bStartNode.key_) {
      aEndNode.sync(bStartNode, context);
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
    // All nodes from a are synced, insert the rest from b.
    nextPos = bEnd + 1;
    next = nextPos < b.length ? b[nextPos].ref : null;
    while (bStart <= bEnd) {
      this._insertChild(b[bStart++], next, context);
    }
  } else if (bStart > bEnd) {
    // All nodes from b are synced, remove the rest from a.
    while (aStart <= aEnd) {
      this._removeChild(a[aStart++]);
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
            aNode.sync(bNode, context);
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
        keyIndex[node.key_] = i;
      }

      for (i = aStart; i <= aEnd; i++) {
        aNode = a[i];
        j = keyIndex[aNode.key_];

        if (j !== void 0) {
          bNode = b[j];
          sources[j - bStart] = i;
          if (lastTarget > j) {
            moved = true;
          } else {
            lastTarget = j;
          }
          aNode.sync(bNode, context);
        } else {
          this._removeChild(aNode);
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
            this._moveChild(node, next);
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
 * @param {!Array<number>} a
 * @returns {!Array<number>}
 * @package
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

/**
 * Component Descriptor.
 *
 * @template D, S
 * @param {string} name
 * @constructor
 * @struct
 * @final
 */
kivi.CDescriptor = function(name) {
  this.flags = 0;
  this.tag = 'div';

  /** @type {?function (!kivi.Component<D, S>)} */
  this.init = null;

  /** @type {?function (!kivi.Component<D, S>, D)} */
  this.setData = null;

  /** @type {?function (!kivi.Component<D, S>, (Array<!kivi.VNode>|string))} */
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
};

/**
 * Component Flags.
 *
 * @enum {number}
 */
kivi.ComponentFlags = {
  dirty:             0x0001,
  attached:          0x0002,
  svg:               0x0004,
  mounting:          0x0008,
  shouldUpdateFlags: 0x0003
};

/**
 * Component.
 *
 * @template D, S
 * @param {number} flags
 * @param {!kivi.CDescriptor<D, S>} descriptor
 * @param {kivi.Component} parent
 * @param {*} data
 * @param {Array<!kivi.VNode>|string} children
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

  /** @type {kivi.Component} */
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
   * @type {kivi.VNode|CanvasRenderingContext2D}
   */
  this.root = null;

  /** @type {Array<!kivi.InvalidatorSubscription>} */
  this._subscriptions = null;

  /** @type {Array<!kivi.InvalidatorSubscription>} */
  this._transientSubscriptions = null;

  if (kivi.DEBUG) {
    this._isDisposed = false;
    element.setAttribute('data-kivi-component', descriptor.name);
    element._kiviComponent = c;
  }
};

/**
 * Update component.
 */
kivi.Component.prototype.update = function() {
  if ((this.flags & kivi.ComponentFlags.shouldUpdateFlags) === kivi.ComponentFlags.shouldUpdateFlags) {
    this.descriptor.update(this);
    this.mtime = kivi.env.scheduler.clock;
    this.flags &= ~kivi.ComponentFlags.dirty;
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
    if ((this.flags & kivi.ComponentFlags.mounting) !== 0) {
      newRoot.mount(this.element, this);
      this.flags &= ~kivi.ComponentFlags.mounting;
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
kivi.Component.prototype.invalidate = function() {
  if ((this.flags & kivi.ComponentFlags.dirty) === 0) {
    this.flags |= kivi.ComponentFlags.dirty;
    this.cancelTransientSubscriptions();
    kivi.env.scheduler.nextFrame().updateComponent(this);
  }
};

/**
 * Dispose Component.
 */
kivi.Component.prototype.dispose = function() {
  if (kivi.DEBUG) {
    if (this._isDisposed) {
      throw 'Component cannot be disposed twice.'
    }
    this._isDisposed = true;
  }

  this.flags &= ~kivi.ComponentFlags.attached;
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
kivi.Component.prototype.subscribe = function(invalidator) {
  var s = new kivi.InvalidatorSubscription(kivi.InvalidatorSubscriptionFlags.component, invalidator, this);
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
kivi.Component.prototype.transientSubscribe = function(invalidator) {
  var s = new kivi.InvalidatorSubscription(
      kivi.InvalidatorSubscriptionFlags.component | kivi.InvalidatorSubscriptionFlags.transient,
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
kivi.Component.prototype.removeSubscription = function(subscription) {
  var subscriptions = ((subscription.flags & kivi.InvalidatorSubscriptionFlags.transient) === 0) ?
      this._subscriptions: this._transientSubscriptions;

  if (subscriptions.length === 1) {
    subscriptions.pop();
  } else {
    subscriptions[subscriptions.indexOf(subscription)] = subscriptions.pop();
  }
};

/**
 * Cancels all subscriptions.
 */
kivi.Component.prototype.cancelSubscriptions = function() {
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
kivi.Component.prototype.cancelTransientSubscriptions = function() {
  var subscriptions = this._transientSubscriptions;
  if (subscriptions !== null) {
    for (var i = 0; i < subscriptions.length; i++) {
      var s = subscriptions[i];
      s.invalidator.removeSubscription(s);
    }
  }
  this._transientSubscriptions = null;
};

/**
 * Create a [vdom.Component].
 *
 * @param {!kivi.CDescriptor} descriptor
 * @param {*} data
 * @param {Array<!kivi.VNode>|string} children
 * @param {kivi.Component} context
 * @returns {!kivi.Component}
 */
kivi.Component.create = function(descriptor, data, children, context) {
  var element = document.createElement(descriptor.tag);
  var c = new kivi.Component(kivi.ComponentFlags.shouldUpdateFlags, descriptor, context, data, children, element);
  if (descriptor.init !== null) {
    descriptor.init(c);
  }
  return c;
};

/**
 * Mount a [vdom.Component] on top of existing html.
 *
 * @param {!kivi.CDescriptor} descriptor
 * @param {*} data
 * @param {Array<!kivi.VNode>|string} children
 * @param {kivi.Component} context
 * @param {!Element} element
 * @return {!kivi.Component}
 */
kivi.Component.mount = function(descriptor, data, children, context, element) {
  var c = new kivi.Component(kivi.ComponentFlags.shouldUpdateFlags | kivi.ComponentFlags.mounting, descriptor, context, data, children, element);
  if (descriptor.init !== null) {
    descriptor.init(c);
  }
  return c;
};

/**
 * Instantiate and inject component into container.
 *
 * @param {!kivi.CDescriptor} descriptor
 * @param {*} data
 * @param {Element} container
 * @return {!kivi.Component}
 */
kivi.injectComponent = function(descriptor, data, container) {
  var c = kivi.Component.create(descriptor, data, null, null);
  container.appendChild(c.element);
  c.update();
  return c;
};

/**
 * Instantiate and mount component on top of existing html.
 *
 * @param {!kivi.CDescriptor} descriptor
 * @param {*} data
 * @param {Element} element
 * @return {!kivi.Component}
 */
kivi.mountComponent = function(descriptor, data, element) {
  var c = kivi.Component.mount(descriptor, data, null, null, /** @type {!Element} */(element));
  c.update();
  return c;
};

/**
 * Shortcut for `kivi.env.scheduler.nextFrame()`
 *
 * @returns {!kivi.SchedulerFrame}
 */
kivi.nextFrame = function() {
  return kivi.env.scheduler.nextFrame();
};

/**
 * Shortcut for `kivi.env.scheduler.currentFrame()`
 *
 * @returns {!kivi.SchedulerFrame}
 */
kivi.currentFrame = function() {
  return kivi.env.scheduler.currentFrame();
};

/**
 * Shortcut for `kivi.env.scheduler.scheduleMicrotask`
 *
 * @param {!function()} cb
 */
kivi.scheduleMicrotask = function(cb) {
  kivi.env.scheduler.scheduleMicrotask(cb);
};

/**
 * Shortcut for `kivi.env.scheduler.scheduleMacrotask`
 *
 * @param {!function()} cb
 */
kivi.scheduleMacrotask = function(cb) {
  kivi.env.scheduler.scheduleMacrotask(cb);
};
