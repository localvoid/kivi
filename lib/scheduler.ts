import {Component, ComponentFlags} from './component';
import {VNode} from './vnode';

export type SchedulerCallback = () => void;

const enum FrameTaskFlags {
  Component = 1,
  Write     = 1 << 1,
  Read      = 1 << 2,
  After     = 1 << 3,
  RWLock    = 1 << 4,
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
class MicrotaskScheduler {
  _observer: MutationObserver;
  _node: Text;
  _toggle: number;

  constructor(callback: ()=>void) {
    this._observer = new MutationObserver(callback);
    this._node = document.createTextNode('');
    this._toggle = 48; // charCode(48) === '0'
    this._observer.observe(this._node, {characterData: true});
  }

  requestNextTick() : void {
    this._toggle ^= 1;
    this._node.data = String.fromCharCode(this._toggle);
  }
}

/**
 * Macrotask Scheduler based on postMessage
 */
class MacrotaskScheduler {
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

  requestNextTick() : void {
    window.postMessage(this._message, '*');
  }
}

export class Frame {
  flags: number;
  componentTasks: Component<any, any>[][];
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
  updateComponent(component: Component<any, any>) : void {
    if ('<@KIVI_DEBUG@>' !== 'DEBUG_DISABLED') {
      if ((this.flags & FrameTaskFlags.RWLock) !== 0) {
        throw new Error('Failed to add update component task to the current frame, current frame is locked for read' +
                        ' and write tasks');
      }
    }

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
  write(callback: SchedulerCallback) : void {
    if ('<@KIVI_DEBUG@>' !== 'DEBUG_DISABLED') {
      if ((this.flags & FrameTaskFlags.RWLock) !== 0) {
        throw new Error('Failed to add update component task to the current frame, current frame is locked for read' +
                        ' and write tasks');
      }
    }

    this.flags |= FrameTaskFlags.Write;
    if (this.writeTasks === null) {
      this.writeTasks = [];
    }
    this.writeTasks.push(callback);
  }

  read(callback: SchedulerCallback) : void {
    if ('<@KIVI_DEBUG@>' !== 'DEBUG_DISABLED') {
      if ((this.flags & FrameTaskFlags.RWLock) !== 0) {
        throw new Error('Failed to add update component task to the current frame, current frame is locked for read' +
                        ' and write tasks');
      }
    }

    this.flags |= FrameTaskFlags.Read;
    if (this.readTasks === null) {
      this.readTasks = [];
    }
    this.readTasks.push(callback);
  }

  after(callback: SchedulerCallback) : void {
    this.flags |= FrameTaskFlags.After;
    if (this.afterTasks === null) {
      this.afterTasks = [];
    }
    this.afterTasks.push(callback);
  }

  setFocus(node: Element|VNode) : void {
    this.focus = node;
  }

  rwLock() : void {
    if ('<@KIVI_DEBUG@>' !== 'DEBUG_DISABLED') {
      this.flags |= FrameTaskFlags.RWLock;
    }
  }

  rwUnlock() : void {
    if ('<@KIVI_DEBUG@>' !== 'DEBUG_DISABLED') {
      this.flags &= ~FrameTaskFlags.RWLock;
    }
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
  private _microtasks: SchedulerCallback[];
  private _macrotasks: SchedulerCallback[];
  private _currentFrame: Frame;
  private _nextFrame: Frame;
  /**
   * Components array that should be updated on each frame.
   */
  private _updateComponents: Component<any, any>[];

  private _microtaskScheduler: MicrotaskScheduler;
  private _macrotaskScheduler: MacrotaskScheduler;

  constructor() {
    this.flags = 0;
    this.clock = 1;
    this.time = 0;
    this._microtasks = [];
    this._macrotasks = [];
    this._currentFrame = new Frame();
    this._nextFrame = new Frame();
    this._updateComponents = [];
    this._microtaskScheduler = new MicrotaskScheduler(this._handleMicrotaskScheduler);
    this._macrotaskScheduler = new MacrotaskScheduler(this._handleMacrotaskScheduler);

    this._currentFrame.rwLock();
  }

  requestAnimationFrame() : void {
    if ((this.flags & SchedulerFlags.FrametaskPending) === 0) {
      this.flags |= SchedulerFlags.FrametaskPending;
      requestAnimationFrame(this._handleAnimationFrame);
    }
  }

  currentFrame() : Frame {
    return this._currentFrame;
  }

  nextFrame() : Frame {
    this.requestAnimationFrame();
    return this._nextFrame;
  }

  startUpdateComponentEachFrame(component: Component<any, any>) : void {
    this.requestAnimationFrame();
    this._updateComponents.push(component);
  }

  scheduleMicrotask(callback: SchedulerCallback) : void {
    if ((this.flags & SchedulerFlags.MicrotaskPending) === 0) {
      this.flags |= SchedulerFlags.MicrotaskPending;
      this._microtaskScheduler.requestNextTick();
    }
    this._microtasks.push(callback);
  }

  scheduleMacrotask(callback: SchedulerCallback) : void {
    if ((this.flags & SchedulerFlags.MacrotaskPending) === 0) {
      this.flags |= SchedulerFlags.MacrotaskPending;
      this._macrotaskScheduler.requestNextTick();
    }
    this._macrotasks.push(callback);
  }

  start(callback: SchedulerCallback) : void {
    this.flags |= SchedulerFlags.Running;
    this.time = Date.now();
    callback();
    this.clock++;
    this.flags &= ~SchedulerFlags.Running;
  }

  private _handleMicrotaskScheduler = () => {
    this.flags |= SchedulerFlags.Running;
    this.time = Date.now();

    while (this._microtasks.length > 0) {
      let tasks = this._microtasks;
      this._microtasks = [];
      for (let i = 0; i < tasks.length; i++) {
        tasks[i]();
      }
    }

    this.clock++;
    this.flags &= ~(SchedulerFlags.MicrotaskPending | SchedulerFlags.Running);
  };

  private _handleMacrotaskScheduler = () => {
    this.flags &= ~SchedulerFlags.MacrotaskPending;
    this.flags |= SchedulerFlags.Running;
    this.time = Date.now();

    let tasks = this._macrotasks;
    this._macrotasks = [];
    for (let i = 0; i < tasks.length; i++) {
      tasks[i]();
    }

    this.clock++;
    this.flags &= ~SchedulerFlags.Running;
  };

  private _handleAnimationFrame = (t: number) => {
    let updateComponents = this._updateComponents;
    let tasks: SchedulerCallback[];
    let i: number;
    let j: number;

    this.flags &= ~SchedulerFlags.FrametaskPending;
    this.flags |= SchedulerFlags.Running;
    this.time = Date.now();

    let frame = this._nextFrame;
    this._nextFrame = this._currentFrame;
    this._currentFrame = frame;

    this._currentFrame.rwUnlock();
    this._nextFrame.rwUnlock();

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
          frame.writeTasks = null;
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

    this._currentFrame.rwLock();
    while ((frame.flags & FrameTaskFlags.After) !== 0) {
      frame.flags &= ~FrameTaskFlags.After;

      tasks = frame.afterTasks;
      for (i = 0; i < tasks.length; i++) {
        tasks[i]();
      }
    }

    if (frame.focus !== null) {
      if (frame.focus.constructor === VNode) {
        ((frame.focus as VNode).ref as HTMLElement).focus();
      } else {
        (frame.focus as HTMLElement).focus();
      }
      frame.focus = null;
    }

    if (updateComponents.length > 0) {
      this.requestAnimationFrame();
    }

    this.clock++;
    this.flags &= ~SchedulerFlags.Running;
  }
}

export const scheduler = new Scheduler();
