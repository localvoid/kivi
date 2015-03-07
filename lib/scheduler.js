'use strict';

function _MutationObserverScheduler(cb) {
  this._observer = new window.MutationObserver(cb);
  this._node = document.createTextNode('');
  this._observer.observe(this._node, {characterData: true});
}

_MutationObserverScheduler.prototype.requestNextTick = function() {
  this._toggle ^= 1;
  this._node.data = this._toggle;
};

var F_WRITE_PRIO = 4;
var F_WRITE = 8;
var F_READ = 16;
var F_AFTER = 32;
var F_WRITE_ANY = F_WRITE | F_WRITE_PRIO;

function Frame() {
  this.flags = 0|0;
  this.writeTaskGroups = [];
  this.writeTasks = null;
  this.readTasks = null;
  this.afterTasks = null;
}

Frame.prototype.write = function(cb, priority) {
  var group;

  if (priority === void 0) priority = -1;

  if (priority === -1) {
    this.flags |= F_WRITE;
    if (this.writeTasks == null) {
      this.writeTasks = [];
    }
    this.writeTasks.push(cb);
  } else {
    this.flags |= F_WRITE_PRIO;
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
  this.flags |= F_READ;
  if (this.readTasks == null) {
    this.readTasks = [];
  }
  this.readTasks.push(cb);
};

Frame.prototype.after = function(cb) {
  this.flags |= F_AFTER;
  if (this.afterTasks == null) {
    this.afterTasks = [];
  }
  this.afterTasks.push(cb);
};

var S_RUNNING = 1;
var S_MICROTASK_PENDING = 2;
var S_FRAMETASK_PENDING = 4;

function Scheduler() {
  this.flags = 0|0;
  this.clock = 0;

  this._microtasks = null;
  this._currentFrame = new Frame();
  this._nextFrame = new Frame();

  var self = this;

  this._microtaskScheduler = new _MutationObserverScheduler(function() {
    self.flags &= ~S_MICROTASK_PENDING;
    self.flags |= S_RUNNING;

    var tasks = self._microtasks;
    self._microtasks = null;

    for (var i = 0; i < tasks.length; i++) {
      tasks[i]();
    }

    self.clock++;
    self.flags &= ~S_RUNNING;
  });

  this._handleAnimationFrame = function() {
    var frame;
    var groups;
    var group;
    var task;
    var i, j;

    self.flags &= ~S_FRAMETASK_PENDING;
    self.flags |= S_RUNNING;
    frame = self._nextFrame;
    self._nextFrame = self._currentFrame;
    self._currentFrame = frame;

    do {
      while ((frame.flags & F_WRITE_ANY) !== 0) {
        if ((frame.flags & F_WRITE_PRIO) !== 0) {
          frame.flags &= ~F_WRITE_PRIO;
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

        if ((frame.flags & F_WRITE) !== 0) {
          frame.flags &= ~F_WRITE;
          group = frame.writeTasks;
          for (i = 0; i < group.length; i++) {
            task = group[i];
            task();
          }
        }
      }

      while ((frame.flags & F_READ) !== 0) {
        frame.flags &= ~F_READ;
        group = frame.readTasks;
        frame.readTasks = null;

        for (i = 0; i < group.length; i++) {
          task = group[i];
          task();
        }
      }
    } while ((frame.flags & F_WRITE_ANY) !== 0);

    while ((frame.flags & F_AFTER) !== 0) {
      frame.flags &= ~F_AFTER;

      group = frame.afterTasks;
      for (i = 0; i < group.length; i++) {
        task = group[i];
        task();
      }
    }

    self.clock++;
    self.flags &= ~S_RUNNING;
  };
};

Scheduler.prototype.currentFrame = function() {
  return this._currentFrame;
};

Scheduler.prototype.nextFrame = function() {
  if ((this.flags & S_FRAMETASK_PENDING) === 0) {
    this.flags |= S_FRAMETASK_PENDING;
    window.requestAnimationFrame(this._handleAnimationFrame);
  }
  return this._nextFrame;
};

Scheduler.prototype.scheduleMicrotask = function(cb) {
  if ((this.flags & S_MICROTASK_PENDING) === 0) {
    this.flags |= S_MICROTASK_PENDING;
    this._microtaskScheduler.requestNextTick();
  }

  if (this._microtasks == null) {
    this._microtasks = [];
  }

  this._microtasks.push(cb);
};

module.exports = Scheduler;
