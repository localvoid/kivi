import {Component, ComponentFlags} from './component';
import {VNode} from './vnode';

export type SchedulerCallback = () => void;

const enum FrameTaskFlags {
  Component = 1,
  Write     = 1 << 1,
  Read      = 1 << 2,
  After     = 1 << 3,
}

const enum SchedulerFlags {
  Running          = 1,
  MicrotaskPending = 1 << 1,
  MacrotaskPending = 1 << 2,
  FrametaskPending = 1 << 3,
}

/**
 * Microtask Scheduler based on MutationObserver
 */
class MicroTaskScheduler {
  _observer: MutationObserver;
  _node: Text;
  _toggle: number;

  constructor(callback: ()=>void) {
    this._observer = new MutationObserver(callback);
    this._node = document.createTextNode('');
    this._toggle = 48; // charCode(48) === '0'
    this._observer.observe(this._node, {characterData: true});
  }

  requestNextTick() {
    this._toggle ^= 1;
    this._node.data = String.fromCharCode(this._toggle);
  }
}

/**
 * Macrotask Scheduler based on postMessage
 */
class MacroTaskScheduler {
  _message: string;

  constructor(callback: ()=>void) {
    this._message = '__kivi' + Math.random().toString();

    let message = this._message;
    window.addEventListener('message', function(e) {
      if (e.source === window && e.data === message) {
        callback();
      }
    });
  }

  requestNextTick() {
    window.postMessage(this._message, '*');
  }
}

export class FrameTasks {
  flags: number;
  componentTasks: Array<Array<Component<any, any>>>;
  writeTasks: SchedulerCallback[];
  readTasks: SchedulerCallback[];
  afterTasks: SchedulerCallback[];
  focus: Element|VNode;

  constructor() {
    this.flags = 0;
    this.componentTasks = [];
    this.writeTasks = null;
    this.readTasks = null;
    this.afterTasks = null;
    this.focus = null;
  }

  /**
   * Add Component to the components queue
   */
  updateComponent(component: Component<any, any>) {
    let priority = component.depth;

    this.flags |= FrameTaskFlags.Component;
    while (priority >= this.componentTasks.length) {
      this.componentTasks.push(null);
    }

    let group = this.componentTasks[priority];
    if (group === null) {
      group = this.componentTasks[priority] = [];
    }

    group.push(component);
  }

  /**
   * Add new task to the write task queue
   */
  write(callback: SchedulerCallback) {
    this.flags |= FrameTaskFlags.Write;
    if (this.writeTasks === null) {
      this.writeTasks = [];
    }
    this.writeTasks.push(callback);
  }

  read(callback: SchedulerCallback) {
    this.flags |= FrameTaskFlags.Read;
    if (this.readTasks === null) {
      this.readTasks = [];
    }
    this.readTasks.push(callback);
  }

  after(callback: SchedulerCallback) {
    this.flags |= FrameTaskFlags.After;
    if (this.afterTasks === null) {
      this.afterTasks = [];
    }
    this.afterTasks.push(callback);
  }

  setFocus(node: Element|VNode) {
    this.focus = node;
  }
}

/**
 * Scheduler supports animation frame tasks, macrotasks and microtasks
 *
 * Animation frame tasks will be executed in batches, switching between write and read tasks until there
 * are no tasks left. Write tasks are sorted by their priority, tasks with the lowest priority value are
 * executed first, so the lowest depth of the Component in the components tree has highest priority.
 *
 * Scheduler also have monotonically increasing internal clock, it increments each time scheduler goes
 * from one animation frame to another, or starts executing macrotasks or microtasks.
 */
export class Scheduler {
  private flags: number;
  /**
   * Monotonically increasing internal clock.
   */
  clock: number;
  /**
   * Cached timestamp. Updates every time when scheduler starts executing new batch of tasks.
   */
  time: number;
  private _microTasks: SchedulerCallback[];
  private _macroTasks: SchedulerCallback[];
  private _currentFrameTasks: FrameTasks;
  private _nextFrameTasks: FrameTasks;
  /**
   * Components array that should be updated on each frame.
   */
  private _updateComponents: Component<any, any>[];

  private _microTaskScheduler: MicroTaskScheduler;
  private _macroTaskScheduler: MacroTaskScheduler;
  private _handleAnimationFrame: (t: number) => void;

  constructor() {
    this.flags = 0;
    this.clock = 1;
    this.time = 0;
    this._microTasks = [];
    this._macroTasks = [];
    this._currentFrameTasks = new FrameTasks();
    this._nextFrameTasks = new FrameTasks();
    this._updateComponents = [];

    this._microTaskScheduler = new MicroTaskScheduler(() => {
      this.flags |= SchedulerFlags.Running;
      this.time = Date.now();

      while (this._microTasks.length > 0) {
        let tasks = this._microTasks;
        this._microTasks = [];
        for (let i = 0; i < tasks.length; i++) {
          tasks[i]();
        }
      }

      this.clock++;
      this.flags &= ~(SchedulerFlags.MicrotaskPending | SchedulerFlags.Running);
    });

    this._macroTaskScheduler = new MacroTaskScheduler(() => {
      this.flags &= ~SchedulerFlags.MacrotaskPending;
      this.flags |= SchedulerFlags.Running;
      this.time = Date.now();

      let tasks = this._macroTasks;
      this._macroTasks = [];
      for (let i = 0; i < tasks.length; i++) {
        tasks[i]();
      }

      this.clock++;
      this.flags &= ~SchedulerFlags.Running;
    });

    this._handleAnimationFrame = (t: number) => {
      let updateComponents = this._updateComponents;
      let tasks: SchedulerCallback[];
      let i: number;
      let j: number;

      this.flags &= ~SchedulerFlags.FrametaskPending;
      this.flags |= SchedulerFlags.Running;
      this.time = Date.now();

      let frame = this._nextFrameTasks;
      this._nextFrameTasks = this._currentFrameTasks;
      this._currentFrameTasks = frame;

      // Mark all update components as dirty. But don't update until all write tasks
      // are finished. It is possible that we won't need to update Component if it
      // is removed.
      for (i = 0; i < updateComponents.length; i++) {
        updateComponents[i].markDirty();
      }

      do {
        while ((frame.flags & (FrameTaskFlags.Component | FrameTaskFlags.Write)) !== 0) {
          if ((frame.flags & FrameTaskFlags.Component) !== 0) {
            frame.flags &= ~FrameTaskFlags.Component;
            let groups = frame.componentTasks;

            for (i = 0; i < groups.length; i++) {
              let group = groups[i];
              if (group !== null) {
                groups[i] = null;
                for (j = 0; j < group.length; j++) {
                  group[j].update();
                }
              }
            }
          }

          if ((frame.flags & FrameTaskFlags.Write) !== 0) {
            frame.flags &= ~FrameTaskFlags.Write;
            tasks = frame.writeTasks;
            for (i = 0; i < tasks.length; i++) {
              tasks[i]();
            }
          }
        }

        // Update components registered for updating on each frame.
        // Remove components that doesn't have UPDATE_EACH_FRAME flag.
        i = 0;
        j = updateComponents.length;
        while (i < j) {
          let component = updateComponents[i++];
          if ((component.flags & ComponentFlags.UpdateEachFrame) === 0) {
            component.flags &= ~ComponentFlags.InUpdateQueue;
            if (i === j) {
              updateComponents.pop();
            } else {
              updateComponents[--i] = updateComponents.pop();
            }
          } else {
            component.update();
          }
        }

        while ((frame.flags & FrameTaskFlags.Read) !== 0) {
          frame.flags &= ~FrameTaskFlags.Read;
          tasks = frame.readTasks;
          frame.readTasks = null;

          for (i = 0; i < tasks.length; i++) {
            tasks[i]();
          }
        }
      } while ((frame.flags & (FrameTaskFlags.Component | FrameTaskFlags.Write)) !== 0);

      while ((frame.flags & FrameTaskFlags.After) !== 0) {
        frame.flags &= ~FrameTaskFlags.After;

        tasks = frame.afterTasks;
        for (i = 0; i < tasks.length; i++) {
          tasks[i]();
        }
      }

      if (frame.focus !== null) {
        if (frame.focus.constructor === VNode) {
          (<HTMLElement>(<VNode>frame.focus).ref).focus();
        } else {
          (<HTMLElement>frame.focus).focus();
        }
        frame.focus = null;
      }

      if (updateComponents.length > 0) {
        this.requestAnimationFrame();
      }

      this.clock++;
      this.flags &= ~SchedulerFlags.Running;
    };
  }

  requestAnimationFrame() {
    if ((this.flags & SchedulerFlags.FrametaskPending) === 0) {
      this.flags |= SchedulerFlags.FrametaskPending;
      requestAnimationFrame(this._handleAnimationFrame);
    }
  }

  currentFrame() : FrameTasks {
    return this._currentFrameTasks;
  }

  nextFrame() : FrameTasks {
    this.requestAnimationFrame();
    return this._nextFrameTasks;
  }

  startUpdateComponentEachFrame(component: Component<any, any>) {
    this.requestAnimationFrame();
    this._updateComponents.push(component);
  }

  scheduleMicrotask(callback: SchedulerCallback) {
    if ((this.flags & SchedulerFlags.MicrotaskPending) === 0) {
      this.flags |= SchedulerFlags.MicrotaskPending;
      this._microTaskScheduler.requestNextTick();
    }
    this._microTasks.push(callback);
  }

  scheduleMacrotask(callback: SchedulerCallback) {
    if ((this.flags & SchedulerFlags.MacrotaskPending) === 0) {
      this.flags |= SchedulerFlags.MacrotaskPending;
      this._macroTaskScheduler.requestNextTick();
    }
    this._macroTasks.push(callback);
  }

  start(callback: SchedulerCallback) {
    this.flags |= SchedulerFlags.Running;
    this.time = Date.now();
    callback();
    this.clock++;
    this.flags &= ~SchedulerFlags.Running;
  }
}

export const scheduler = new Scheduler();
