goog.provide('kivi.Scheduler');

/**
 * Scheduler
 *
 * @constructor
 * @struct
 * @final
 */
kivi.Scheduler = function() {
  this.flags = 0;
  this.dataClock = 0;
  this.clock = -1;

  /**
   * @type {Array<Function>}
   * @private
   */
  this._actions = null;

  /**
   * @type {Array<Function>}
   * @private
   */
  this._microtasks = null;

  /**
   * @type {!kivi.Scheduler.Frame}
   * @private
   */
  this._currentFrame = new kivi.Scheduler.Frame();

  /**
   * @type {!kivi.Scheduler.Frame}
   * @private
   */
  this._nextFrame = new kivi.Scheduler.Frame();

  var self = this;

  /**
   *
   * @type {kivi.Scheduler.MutationObserverScheduler}
   * @private
   */
  this._microtaskScheduler = new kivi.Scheduler.MutationObserverScheduler(function() {
    self.flags &= ~kivi.Scheduler.SchedulerFlags.microtaskPending;
    self.flags |= kivi.Scheduler.SchedulerFlags.running;
    self.clock++;

    var tasks = self._microtasks;
    if (tasks != null) {
      self._microtasks = null;

      for (var i = 0; i < tasks.length; i++) {
        tasks[i]();
      }
    }

    self.dataClock++;
    self._performActions();
    self.flags &= ~kivi.Scheduler.SchedulerFlags.running;
  });

  /**
   * @type {function (number)}
   * @private
   */
  this._handleAnimationFrame = function() {
    var frame;
    var groups;
    var group;
    var task;
    var i, j;

    self.flags &= ~kivi.Scheduler.SchedulerFlags.frametaskPending;
    self.flags |= kivi.Scheduler.SchedulerFlags.running;
    self.clock++;

    frame = self._nextFrame;
    self._nextFrame = self._currentFrame;
    self._currentFrame = frame;

    do {
      while ((frame.flags & kivi.Scheduler.FrameFlags.writeAny) !== 0) {
        if ((frame.flags & kivi.Scheduler.FrameFlags.writePrio) !== 0) {
          frame.flags &= ~kivi.Scheduler.FrameFlags.writePrio;
          groups = frame.writeTaskGroups;

          for (i = 0; i < groups.length; i++) {
            group = groups[i];
            if (group != null) {
              groups[i] = null;
              for (j = 0; j < group.length; j++) {
                task = group[j];
                task();
              }
            }
          }
        }

        if ((frame.flags & kivi.Scheduler.FrameFlags.write) !== 0) {
          frame.flags &= ~kivi.Scheduler.FrameFlags.write;
          group = frame.writeTasks;
          for (i = 0; i < group.length; i++) {
            task = group[i];
            task();
          }
        }
      }

      while ((frame.flags & kivi.Scheduler.FrameFlags.read) !== 0) {
        frame.flags &= ~kivi.Scheduler.FrameFlags.read;
        group = frame.readTasks;
        frame.readTasks = null;

        for (i = 0; i < group.length; i++) {
          task = group[i];
          task();
        }
      }
    } while ((frame.flags & kivi.Scheduler.FrameFlags.writeAny) !== 0);

    while ((frame.flags & kivi.Scheduler.FrameFlags.after) !== 0) {
      frame.flags &= ~kivi.Scheduler.FrameFlags.after;

      group = frame.afterTasks;
      for (i = 0; i < group.length; i++) {
        task = group[i];
        task();
      }
    }

    self.dataClock++;
    self._performActions();
    self.flags &= ~kivi.Scheduler.SchedulerFlags.running;
  };
};

/**
 * @enum {number}
 */
kivi.Scheduler.SchedulerFlags = {
  running:          0x0001,
  microtaskPending: 0x0002,
  frametaskPending: 0x0004,
  microtaskRunning: 0x0008,
  frametaskRunning: 0x0010
};

/**
 * Get current frame.
 *
 * @returns {!kivi.Scheduler.Frame}
 */
kivi.Scheduler.prototype.currentFrame = function() {
  return this._currentFrame;
};

/**
 * Get next frame.
 *
 * @returns {!kivi.Scheduler.Frame}
 */
kivi.Scheduler.prototype.nextFrame = function() {
  if ((this.flags & kivi.Scheduler.SchedulerFlags.frametaskPending) === 0) {
    this.flags |= kivi.Scheduler.SchedulerFlags.frametaskPending;
    window.requestAnimationFrame(this._handleAnimationFrame);
  }
  return this._nextFrame;
};

/**
 * Schedule microtask.
 *
 * @param {!Function} cb
 */
kivi.Scheduler.prototype.scheduleMicrotask = function(cb) {
  if ((this.flags & kivi.Scheduler.SchedulerFlags.microtaskPending) === 0) {
    this.flags |= kivi.Scheduler.SchedulerFlags.microtaskPending;
    this._microtaskScheduler.requestNextTick();
  }

  if (this._microtasks == null) {
    this._microtasks = [];
  }

  this._microtasks.push(cb);
};

/**
 * Scheduler action.
 *
 * @param {!Function} cb
 */
kivi.Scheduler.prototype.action = function(cb) {
  if ((this.flags & kivi.Scheduler.SchedulerFlags.frametaskPending) === 0) {
    this.flags |= kivi.Scheduler.SchedulerFlags.frametaskPending;
    this._microtaskScheduler.requestNextTick();
  }

  if (this._actions == null) {
    this._actions = [];
  }

  this._actions.push(cb);
};

/**
 * Run all actions.
 *
 * @private
 */
kivi.Scheduler.prototype._performActions = function() {
  while (this._actions != null) {
    var actions = this._actions;
    this._actions = null;
    for (var i = 0; i < actions.length; i++) {
      actions[i]();
    }
  }
};

/**
 *
 * @param {!Function} cb
 * @constructor
 * @struct
 * @final
 * @private
 */
kivi.Scheduler.MutationObserverScheduler = function(cb) {
  this._observer = new window.MutationObserver(cb);
  this._node = document.createTextNode('');
  this._observer.observe(this._node, {characterData: true});
  this._toggle = 0;
};

/**
 *
 */
kivi.Scheduler.MutationObserverScheduler.prototype.requestNextTick = function() {
  this._toggle ^= 1;
  this._node.data = this._toggle.toString();
};

/**
 * @constructor
 * @struct
 * @final
 */
kivi.Scheduler.Frame = function() {
  /** @type {number} */
  this.flags = 0;

  /** @type {!Array<Array<function ()>>} */
  this.writeTaskGroups = [];

  /** @type {Array<function ()>} */
  this.writeTasks = null;

  /** @type {Array<function ()>} */
  this.readTasks = null;

  /** @type {Array<function ()>} */
  this.afterTasks = null;
};

/**
 * @enum {number}
 */
kivi.Scheduler.FrameFlags = {
  writePrio: 0x0001,
  write:     0x0002,
  read:      0x0004,
  after:     0x0008,
  writeAny:  0x0003
};

/**
 * Add write callback.
 *
 * @param {!Function} cb
 * @param {number=} priority
 */
kivi.Scheduler.Frame.prototype.write = function(cb, priority) {
  var group;

  if (priority === void 0) priority = -1;

  if (priority === -1) {
    this.flags |= kivi.Scheduler.FrameFlags.write;
    if (this.writeTasks == null) {
      this.writeTasks = [];
    }
    this.writeTasks.push(cb);
  } else {
    this.flags |= kivi.Scheduler.FrameFlags.writePrio;
    while (priority >= this.writeTaskGroups.length) {
      this.writeTaskGroups.push(null);
    }

    group = this.writeTaskGroups[priority];
    if (group == null) {
      group = this.writeTaskGroups[priority] = [];
    }

    group.push(cb);
  }
};

/**
 * Add read callback.
 *
 * @param {!Function} cb
 */
kivi.Scheduler.Frame.prototype.read = function(cb) {
  this.flags |= kivi.Scheduler.FrameFlags.read;
  if (this.readTasks == null) {
    this.readTasks = [];
  }
  this.readTasks.push(cb);
};

/**
 * Add after callback.
 *
 * @param {!Function} cb
 */
kivi.Scheduler.Frame.prototype.after = function(cb) {
  this.flags |= kivi.Scheduler.FrameFlags.after;
  if (this.afterTasks == null) {
    this.afterTasks = [];
  }
  this.afterTasks.push(cb);
};
