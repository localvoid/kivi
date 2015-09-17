goog.provide('kivi.scheduler.Scheduler');
goog.provide('kivi.scheduler.SchedulerFlags');
goog.require('kivi.ComponentFlags');
goog.require('kivi.scheduler.Frame');
goog.require('kivi.scheduler.FrameFlags');
goog.require('kivi.scheduler.MutationObserver');
goog.require('kivi.scheduler.PostMessage');

/**
 * Scheduler Flags.
 *
 * @enum {number}
 */
kivi.scheduler.SchedulerFlags = {
  RUNNING:           0x0100,
  MICROTASK_PENDING: 0x0001,
  MACROTASK_PENDING: 0x0002,
  FRAMETASK_PENDING: 0x0008,
  MICROTASK_RUNNING: 0x0010,
  MACROTASK_RUNNING: 0x0020,
  FRAMETASK_RUNNING: 0x0080
};

/**
 * Scheduler Task List.
 *
 * @private
 * @constructor
 * @struct
 * @final
 */
kivi.scheduler._SchedulerTaskList = function() {
  /** @private {!Array<!Function>} */
  this._tasks = [];
  /** @private {!Array<!Function|*>} */
  this._tasksWithContext = [];
};

/**
 * Returns true if SchedulerTaskList is emtpy.
 *
 * @returns {boolean}
 */
kivi.scheduler._SchedulerTaskList.prototype.isEmpty = function() {
  return (this._tasks.length === 0 && this._tasksWithContext.length === 0);
};

/**
 * Add simple task.
 *
 * @param {!Function} task
 */
kivi.scheduler._SchedulerTaskList.prototype.addTask = function(task) {
  this._tasks.push(task);
};

/**
 * Add task with context.
 *
 * @param {!Function} task
 * @param {*} context
 */
kivi.scheduler._SchedulerTaskList.prototype.addTaskWithContext = function(task, context) {
  this._tasksWithContext.push(task, context);
};

/**
 * Run tasks.
 */
kivi.scheduler._SchedulerTaskList.prototype.run = function() {
  var i = 0;
  var tasks = this._tasks;

  while (i < tasks.length) {
    tasks[i++]();
  }

  i = 0;
  tasks = this._tasksWithContext;
  while (i < tasks.length) {
    tasks[i].call(tasks[i+1]);
    i += 2;
  }
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
 * @struct
 * @final
 */
kivi.scheduler.Scheduler = function() {
  /** @type {number} */
  this.flags = 0;

  /**
   * Monotonically increasing internal clock.
   *
   * @type {number}
   */
  this.clock = 1;

  /** @private {!kivi.scheduler._SchedulerTaskList} */
  this._microtasks = new kivi.scheduler._SchedulerTaskList();

  /** @private {!kivi.scheduler._SchedulerTaskList} */
  this._macrotasks = new kivi.scheduler._SchedulerTaskList();

  /** @private {!kivi.scheduler.Frame} */
  this._currentFrame = new kivi.scheduler.Frame();

  /** @private {!kivi.scheduler.Frame} */
  this._nextFrame = new kivi.scheduler.Frame();

  /**
   * Array of Components that should be updated on each frame.
   *
   * @private {!Array<!kivi.Component>}
   */
  this._updateComponents = [];

  var self = this;

  /** @private {!kivi.scheduler.MutationObserver} */
  this._microtaskScheduler = new kivi.scheduler.MutationObserver(function() {
    self.flags |= kivi.scheduler.SchedulerFlags.RUNNING;

    var tasks = self._microtasks;
    while (!tasks.isEmpty()) {
      self._microtasks = new kivi.scheduler._SchedulerTaskList();
      tasks.run();
      tasks = self._microtasks;
    }

    self.clock++;
    self.flags &= ~(kivi.scheduler.SchedulerFlags.MICROTASK_PENDING | kivi.scheduler.SchedulerFlags.RUNNING);
  });

  /** @private {!kivi.scheduler.PostMessage} */
  this._macrotaskScheduler = new kivi.scheduler.PostMessage(function() {
    self.flags &= ~kivi.scheduler.SchedulerFlags.MACROTASK_PENDING;
    self.flags |= kivi.scheduler.SchedulerFlags.RUNNING;

    var tasks = self._macrotasks;
    if (!tasks.isEmpty()) {
      self._macrotasks = new kivi.scheduler._SchedulerTaskList();
      tasks.run();
    }

    self.clock++;
    self.flags &= ~kivi.scheduler.SchedulerFlags.RUNNING;
  });

  /** @private {function(number)} */
  this._handleAnimationFrame = function() {
    var updateComponents = self._updateComponents;
    var frame;
    var groups;
    var group;
    var task;
    var i, j;

    self.flags &= ~kivi.scheduler.SchedulerFlags.FRAMETASK_PENDING;
    self.flags |= kivi.scheduler.SchedulerFlags.RUNNING;

    frame = self._nextFrame;
    self._nextFrame = self._currentFrame;
    self._currentFrame = frame;

    // Mark all update components as dirty. But don't update until all write tasks
    // are finished. It is possible that we won't need to update Component if it
    // is removed.
    for (i = 0; i < updateComponents.length; i++) {
      updateComponents[i].flags |= kivi.ComponentFlags.DIRTY;
    }

    do {
      while ((frame.flags & kivi.scheduler.FrameFlags.WRITE_ANY) !== 0) {
        if ((frame.flags & kivi.scheduler.FrameFlags.WRITE_PRIO) !== 0) {
          frame.flags &= ~kivi.scheduler.FrameFlags.WRITE_PRIO;
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

        if ((frame.flags & kivi.scheduler.FrameFlags.WRITE) !== 0) {
          frame.flags &= ~kivi.scheduler.FrameFlags.WRITE;
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

      // Update components registered for updating on each frame.
      // Remove components that doesn't have UPDATE_EACH_FRAME flag.
      i = 0;
      j = updateComponents.length;
      while (i < j) {
        task = updateComponents[i++];
        if ((task.flags & kivi.ComponentFlags.UPDATE_EACH_FRAME) === 0) {
          task.flags &= ~kivi.ComponentFlags.IN_UPDATE_QUEUE;
          if (i === j) {
            updateComponents.pop();
          } else {
            updateComponents[--i] = updateComponents.pop();
          }
        } else {
          task.update();
        }
      }

      while ((frame.flags & kivi.scheduler.FrameFlags.READ) !== 0) {
        frame.flags &= ~kivi.scheduler.FrameFlags.READ;
        group = frame.readTasks;
        frame.readTasks = null;

        for (i = 0; i < group.length; i++) {
          task = group[i];
          task();
        }
      }
    } while ((frame.flags & kivi.scheduler.FrameFlags.WRITE_ANY) !== 0);

    while ((frame.flags & kivi.scheduler.FrameFlags.AFTER) !== 0) {
      frame.flags &= ~kivi.scheduler.FrameFlags.AFTER;

      group = frame.afterTasks;
      for (i = 0; i < group.length; i++) {
        task = group[i];
        task();
      }
    }

    if (frame.focus !== null) {
      if (frame.focus.constructor === kivi.VNode) {
        /** @type {!Element} */(frame.focus.ref).focus();
      } else {
        frame.focus.focus();
      }
      frame.focus = null;
    }

    if (updateComponents.length > 0) {
      self.requestAnimationFrame();
    }

    self.clock++;
    self.flags &= ~kivi.scheduler.SchedulerFlags.RUNNING;
  };
};

/**
 * Request animation frame.
 */
kivi.scheduler.Scheduler.prototype.requestAnimationFrame = function() {
  if ((this.flags & kivi.scheduler.SchedulerFlags.FRAMETASK_PENDING) === 0) {
    this.flags |= kivi.scheduler.SchedulerFlags.FRAMETASK_PENDING;
    window.requestAnimationFrame(this._handleAnimationFrame);
  }
};

/**
 * Get current frame.
 *
 * @returns {!kivi.scheduler.Frame}
 */
kivi.scheduler.Scheduler.prototype.currentFrame = function() {
  return this._currentFrame;
};

/**
 * Get next frame.
 *
 * @returns {!kivi.scheduler.Frame}
 */
kivi.scheduler.Scheduler.prototype.nextFrame = function() {
  this.requestAnimationFrame();
  return this._nextFrame;
};

/**
 * Start invalidating Component on each frame.
 *
 * @param {!kivi.Component} c
 */
kivi.scheduler.Scheduler.prototype.startUpdateComponentEachFrame = function(c) {
  this.requestAnimationFrame();
  this._updateComponents.push(c);
};

/**
 * Schedule microtask.
 *
 * @param {!function()} cb
 * @param {*=} opt_context
 */
kivi.scheduler.Scheduler.prototype.scheduleMicrotask = function(cb, opt_context) {
  if ((this.flags & kivi.scheduler.SchedulerFlags.MICROTASK_PENDING) === 0) {
    this.flags |= kivi.scheduler.SchedulerFlags.MICROTASK_PENDING;
    this._microtaskScheduler.requestNextTick();
  }

  if (opt_context === void 0) {
    this._microtasks.addTask(cb);
  } else {
    this._microtasks.addTaskWithContext(cb, opt_context);
  }
};

/**
 * Schedule macrotask.
 *
 * @param {!function()} cb
 * @param {*=} opt_context
 */
kivi.scheduler.Scheduler.prototype.scheduleMacrotask = function(cb, opt_context) {
  if ((this.flags & kivi.scheduler.SchedulerFlags.MACROTASK_PENDING) === 0) {
    this.flags |= kivi.scheduler.SchedulerFlags.MACROTASK_PENDING;
    this._macrotaskScheduler.requestNextTick();
  }

  if (opt_context === void 0) {
    this._macrotasks.addTask(cb);
  } else {
    this._macrotasks.addTaskWithContext(cb, opt_context);
  }
};
