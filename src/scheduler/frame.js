goog.provide('kivi.scheduler.Frame');
goog.provide('kivi.scheduler.FrameFlags');

/**
 * Scheduler Frame Flags.
 *
 * @enum {number}
 */
kivi.scheduler.FrameFlags = {
  WRITE_PRIO: 0x0001,
  WRITE:      0x0002,
  READ:       0x0004,
  AFTER:      0x0008,
  WRITE_ANY:  0x0003
};

/**
 * Scheduler Frame.
 *
 * @constructor
 * @struct
 * @final
 */
kivi.scheduler.Frame = function() {
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

  /** @type {!kivi.VNode|!Element|null} */
  this.focus = null;
};

/**
 * Add Component to the write task queue.
 *
 * @param {!kivi.Component} component
 */
kivi.scheduler.Frame.prototype.updateComponent = function(component) {
  this.write(component, component.depth);
};

/**
 * Add callback to the write task queue.
 *
 * @param {!function()|!kivi.Component} cb
 * @param {number=} opt_priority
 */
kivi.scheduler.Frame.prototype.write = function(cb, opt_priority) {
  var group;

  if (opt_priority === void 0) opt_priority = -1;

  if (opt_priority === -1) {
    this.flags |= kivi.scheduler.FrameFlags.WRITE;
    if (this.writeTasks === null) {
      this.writeTasks = [];
    }
    this.writeTasks.push(cb);
  } else {
    this.flags |= kivi.scheduler.FrameFlags.WRITE_PRIO;
    while (opt_priority >= this.writeTaskGroups.length) {
      this.writeTaskGroups.push(null);
    }

    group = this.writeTaskGroups[opt_priority];
    if (group === null) {
      group = this.writeTaskGroups[opt_priority] = [];
    }

    group.push(cb);
  }
};

/**
 * Add callback to the read task queue.
 *
 * @param {!function()} cb
 */
kivi.scheduler.Frame.prototype.read = function(cb) {
  this.flags |= kivi.scheduler.FrameFlags.READ;
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
kivi.scheduler.Frame.prototype.after = function(cb) {
  this.flags |= kivi.scheduler.FrameFlags.AFTER;
  if (this.afterTasks === null) {
    this.afterTasks = [];
  }
  this.afterTasks.push(cb);
};

/**
 * Set focus on the element when all tasks are finished.
 *
 * @param {!kivi.VNode|!Element} n
 */
kivi.scheduler.Frame.prototype.setFocus = function(n) {
  this.focus = n;
};
