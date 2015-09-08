goog.provide('kivi.Scheduler');
goog.provide('kivi.SchedulerFrame');
goog.provide('kivi.scheduler');

/**
 * Scheduler Flags.
 *
 * @enum {number}
 */
kivi.SchedulerFlags = {
  RUNNING:           0x0100,
  MICROTASK_PENDING: 0x0001,
  MACROTASK_PENDING: 0x0002,
  FRAMETASK_PENDING: 0x0008,
  MICROTASK_RUNNING: 0x0010,
  MACROTASK_RUNNING: 0x0020,
  FRAMETASK_RUNNING: 0x0080
};

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
 * @final
 */
kivi.Scheduler = class {
  constructor() {
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
      self.flags |= kivi.SchedulerFlags.RUNNING;

      var tasks = self._microtasks;
      while (tasks.length > 0) {
        self._microtasks = [];

        for (var i = 0; i < tasks.length; i++) {
          tasks[i]();
        }

        tasks = self._microtasks;
      }

      self.clock++;
      self.flags &= ~(kivi.SchedulerFlags.MICROTASK_PENDING | kivi.SchedulerFlags.RUNNING);
    });

    /** @private {!kivi._PostMessageScheduler} */
    this._macrotaskScheduler = new kivi._PostMessageScheduler(function() {
      self.flags &= ~kivi.SchedulerFlags.MACROTASK_PENDING;
      self.flags |= kivi.SchedulerFlags.RUNNING;

      var tasks = self._macrotasks;
      if (tasks.length > 0) {
        self._macrotasks = [];

        for (var i = 0; i < tasks.length; i++) {
          tasks[i]();
        }
      }

      self.clock++;
      self.flags &= ~kivi.SchedulerFlags.RUNNING;
    });

    /** @private {function(number)} */
    this._handleAnimationFrame = function() {
      var frame;
      var groups;
      var group;
      var task;
      var i, j;

      self.flags &= ~kivi.SchedulerFlags.FRAMETASK_PENDING;
      self.flags |= kivi.SchedulerFlags.RUNNING;

      frame = self._nextFrame;
      self._nextFrame = self._currentFrame;
      self._currentFrame = frame;

      do {
        while ((frame.flags & kivi.SchedulerFrameFlags.WRITE_ANY) !== 0) {
          if ((frame.flags & kivi.SchedulerFrameFlags.WRITE_PRIO) !== 0) {
            frame.flags &= ~kivi.SchedulerFrameFlags.WRITE_PRIO;
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

          if ((frame.flags & kivi.SchedulerFrameFlags.WRITE) !== 0) {
            frame.flags &= ~kivi.SchedulerFrameFlags.WRITE;
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

        while ((frame.flags & kivi.SchedulerFrameFlags.READ) !== 0) {
          frame.flags &= ~kivi.SchedulerFrameFlags.READ;
          group = frame.readTasks;
          frame.readTasks = null;

          for (i = 0; i < group.length; i++) {
            task = group[i];
            task();
          }
        }
      } while ((frame.flags & kivi.SchedulerFrameFlags.WRITE_ANY) !== 0);

      while ((frame.flags & kivi.SchedulerFrameFlags.AFTER) !== 0) {
        frame.flags &= ~kivi.SchedulerFrameFlags.AFTER;

        group = frame.afterTasks;
        for (i = 0; i < group.length; i++) {
          task = group[i];
          task();
        }
      }

      self.clock++;
      self.flags &= ~kivi.SchedulerFlags.RUNNING;
    };
  }

  /**
   * Get current frame.
   *
   * @returns {!kivi.SchedulerFrame}
   */
  currentFrame() {
    return this._currentFrame;
  };

  /**
   * Get next frame.
   *
   * @returns {!kivi.SchedulerFrame}
   */
  nextFrame() {
    if ((this.flags & kivi.SchedulerFlags.FRAMETASK_PENDING) === 0) {
      this.flags |= kivi.SchedulerFlags.FRAMETASK_PENDING;
      window.requestAnimationFrame(this._handleAnimationFrame);
    }
    return this._nextFrame;
  };

  /**
   * Schedule microtask.
   *
   * @param {!function()} cb
   */
  scheduleMicrotask(cb) {
    if ((this.flags & kivi.SchedulerFlags.MICROTASK_PENDING) === 0) {
      this.flags |= kivi.SchedulerFlags.MICROTASK_PENDING;
      this._microtaskScheduler.requestNextTick();
    }

    this._microtasks.push(cb);
  };

  /**
   * Schedule macrotask.
   *
   * @param {!function()} cb
   */
  scheduleMacrotask(cb) {
    if ((this.flags & kivi.SchedulerFlags.MACROTASK_PENDING) === 0) {
      this.flags |= kivi.SchedulerFlags.MACROTASK_PENDING;
      this._macrotaskScheduler.requestNextTick();
    }

    this._macrotasks.push(cb);
  };
};

/**
 * MutationObserver helper for microtasks.
 *
 * @param {!Function} cb
 * @constructor
 * @struct
 * @final
 * @private
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
 * @private
 */
kivi._PostMessageScheduler = function(cb) {
  this._message = '__pms' + Math.random().toString();
  var message = this._message;

  /** @param {!Event} e */
  var handler = function(e) {
    e = /** @type {!MessageEvent<string>} */(e);
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
 * Scheduler Frame Flags.
 *
 * @enum {number}
 */
kivi.SchedulerFrameFlags = {
  WRITE_PRIO: 0x0001,
  WRITE:      0x0002,
  READ:       0x0004,
  AFTER:      0x0008,
  WRITE_ANY:  0x0003
};

/**
 * Scheduler Frame.
 *
 * @final
 */
kivi.SchedulerFrame = class {
  constructor() {
    /** @type {number} */
    this.flags = 0;

    /** @type {!Array<?Array<!function()|!kivi.Component>>} */
    this.writeTaskGroups = [];

    /** @type {?Array<!function()|!kivi.Component>} */
    this.writeTasks = null;

    /** @type {?Array<!function()>} */
    this.readTasks = null;

    /** @type {?Array<!function()>} */
    this.afterTasks = null;
  }

  /**
   * Add Component to the write task queue.
   *
   * @param {!kivi.Component} component
   */
  updateComponent(component) {
    this.write(component, component.depth);
  }

  /**
   * Add callback to the write task queue.
   *
   * @param {!function()|!kivi.Component} cb
   * @param {number=} opt_priority
   */
  write(cb, opt_priority) {
    var group;

    if (opt_priority === void 0) opt_priority = -1;

    if (opt_priority === -1) {
      this.flags |= kivi.SchedulerFrameFlags.WRITE;
      if (this.writeTasks === null) {
        this.writeTasks = [];
      }
      this.writeTasks.push(cb);
    } else {
      this.flags |= kivi.SchedulerFrameFlags.WRITE_PRIO;
      while (opt_priority >= this.writeTaskGroups.length) {
        this.writeTaskGroups.push(null);
      }

      group = this.writeTaskGroups[opt_priority];
      if (group === null) {
        group = this.writeTaskGroups[opt_priority] = [];
      }

      group.push(cb);
    }
  }

  /**
   * Add callback to the read task queue.
   *
   * @param {!function()} cb
   */
  read(cb) {
    this.flags |= kivi.SchedulerFrameFlags.READ;
    if (this.readTasks === null) {
      this.readTasks = [];
    }
    this.readTasks.push(cb);
  }

  /**
   * Add callback to the after task queue.
   *
   * @param {!function()} cb
   */
  after(cb) {
    this.flags |= kivi.SchedulerFrameFlags.AFTER;
    if (this.afterTasks === null) {
      this.afterTasks = [];
    }
    this.afterTasks.push(cb);
  }
};

/**
 * Global scheduler instance.
 *
 * @const {!kivi.Scheduler}
 */
kivi.scheduler = new kivi.Scheduler();
