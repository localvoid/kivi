'use strict';

var WRITE_TASK_FLAG = 1;
var LOW_WRITE_TASK_FLAG = 2;
var READ_TASK_FLAG = 4;
var AFTER_TASK_FLAG = 8;
var ANY_WRITE_TASK_FLAG = WRITE_TASK_FLAG | LOW_WRITE_TASK_FLAG;

function Frame() {
  this.flags = 0|0;
  this.writeTaskGroups = [];
  this.lowPriorityWriteTasks = null;
  this.readTasks = null;
  this.afterTasks = null;
}

Frame.prototype.write = function(cb, priority) {
  var group;

  if (priority === void 0) priority = -1;

  if (priority === -1) {
    this.flags |= LOW_WRITE_TASK_FLAG;
    this.lowPriorityWriteTasks.push(cb);
  } else {
    this.flags |= WRITE_TASK_FLAG;
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

Frame.prototype.read = function(cb) {
  this.flags |= READ_TASK_FLAG;
  if (this.readTasks == null) {
    this.readTasks = [];
  }
  this.readTasks.push(cb);
};

Frame.prototype.after = function(cb) {
  this.flags |= AFTER_TASK_FLAG;
  if (this.afterTasks == null) {
    this.afterTasks = [];
  }
  this.afterTasks.push(cb);
};

function Scheduler() {
  this.running = false;
  this._currentFrame = new Frame();
  this._nextFrame = new Frame();
  this._rafId = 0;
  this._handleAnimationFrame = this._handleAnimationFrame.bind(this);
};

Scheduler.prototype._handleAnimationFrame = function(t) {
  var frame;
  var groups;
  var group;
  var task;
  var i, j;

  this.running = true;
  frame = this._nextFrame;
  this._nextFrame = this._currentFrame;
  this._currentFrame = frame;

  do {
    while ((frame.flags & ANY_WRITE_TASK_FLAG) !== 0) {
      if ((frame.flags & WRITE_TASK_FLAG) !== 0) {
        frame.flags &= ~WRITE_TASK_FLAG;
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

      if ((frame.flags & LOW_WRITE_TASK_FLAG) !== 0) {
        frame.flags &= ~LOW_WRITE_TASK_FLAG;
        group = frame.lowWriteTasks;
        for (i = 0; i < group.length; i++) {
          task = group[i];
          task();
        }
      }
    }


    while ((frame.flags & READ_TASK_FLAG) !== 0) {
      frame.flags &= ~READ_TASK_FLAG;
      group = frame.readTasks;
      frame.readTasks = null;

      for (i = 0; i < group.length; i++) {
        task = group[i];
        task();
      }
    }
  } while ((frame.flags & ANY_WRITE_TASK_FLAG) !== 0);

  while ((frame.flags & AFTER_TASK_FLAG) !== 0) {
    frame.flags &= ~AFTER_TASK_FLAG;

    group = frame.afterTasks;
    for (i = 0; i < group.length; i++) {
      task = group[i];
      task();
    }
  }

  this.running = false;
  this._rafId = 0;
};

Scheduler.prototype._requestAnimationFrame = function() {
  if (this._rafId === 0) {
    this._rafId = window.requestAnimationFrame(this._handleAnimationFrame);
  }
};

Scheduler.prototype.currentFrame = function() {
  return this._currentFrame;
};

Scheduler.prototype.nextFrame = function() {
  this._requestAnimationFrame();
  return this._nextFrame;
};

module.exports = Scheduler;
