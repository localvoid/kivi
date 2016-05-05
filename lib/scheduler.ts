import {Component} from "./component";
import {SchedulerFlags, ComponentFlags} from "./misc";
import {VNode} from "./vnode";

export type SchedulerCallback = () => void;

const enum FrameTaskFlags {
  Component = 1,
  Write     = 1 << 1,
  Read      = 1 << 2,
  After     = 1 << 3,
  RWLock    = 1 << 4,
}

/**
 * Microtask Scheduler based on MutationObserver.
 */
class MicrotaskScheduler {
  _observer: MutationObserver;
  _node: Text;
  _toggle: number;

  constructor(callback: () => void) {
    this._observer = new MutationObserver(callback);
    this._node = document.createTextNode("");
    this._toggle = 48; // charCode(48) === '0'
    this._observer.observe(this._node, {characterData: true});
  }

  requestNextTick(): void {
    this._toggle ^= 1;
    this._node.data = String.fromCharCode(this._toggle);
  }
}

/**
 * Macrotask Scheduler based on postMessage.
 */
class MacrotaskScheduler {
  _message: string;

  constructor(callback: () => void) {
    this._message = "__kivi" + Math.random();

    const message = this._message;
    window.addEventListener("message", function(e) {
      if (e.source === window && e.data === message) {
        callback();
      }
    });
  }

  requestNextTick(): void {
    window.postMessage(this._message, "*");
  }
}

export class Frame {
  _flags: number;
  _componentTasks: Component<any, any>[][];
  _writeTasks: SchedulerCallback[];
  _readTasks: SchedulerCallback[];
  _afterTasks: SchedulerCallback[];
  _focus: Element|VNode;

  constructor() {
    this._flags = 0;
    this._componentTasks = [];
    this._writeTasks = undefined;
    this._readTasks = undefined;
    this._afterTasks = undefined;
    this._focus = undefined;
  }

  /**
   * Add Component to the components queue.
   */
  updateComponent(component: Component<any, any>): void {
    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      if ((this._flags & FrameTaskFlags.RWLock) !== 0) {
        throw new Error("Failed to add update component task to the current frame, current frame is locked for read" +
                        " and write tasks.");
      }
    }

    const priority = component.depth;

    this._flags |= FrameTaskFlags.Component;
    while (priority >= this._componentTasks.length) {
      this._componentTasks.push(undefined);
    }

    const group = this._componentTasks[priority];
    if (group === undefined) {
      this._componentTasks[priority] = [component];
    } else {
      group.push(component);
    }
  }

  /**
   * Add new task to the write task queue.
   */
  write(callback: SchedulerCallback): void {
    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      if ((this._flags & FrameTaskFlags.RWLock) !== 0) {
        throw new Error("Failed to add update component task to the current frame, current frame is locked for read" +
                        " and write tasks.");
      }
    }

    this._flags |= FrameTaskFlags.Write;
    if (this._writeTasks === undefined) {
      this._writeTasks = [];
    }
    this._writeTasks.push(callback);
  }

  read(callback: SchedulerCallback): void {
    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      if ((this._flags & FrameTaskFlags.RWLock) !== 0) {
        throw new Error("Failed to add update component task to the current frame, current frame is locked for read" +
                        " and write tasks.");
      }
    }

    this._flags |= FrameTaskFlags.Read;
    if (this._readTasks === undefined) {
      this._readTasks = [];
    }
    this._readTasks.push(callback);
  }

  after(callback: SchedulerCallback): void {
    this._flags |= FrameTaskFlags.After;
    if (this._afterTasks === undefined) {
      this._afterTasks = [];
    }
    this._afterTasks.push(callback);
  }

  focus(node: Element|VNode): void {
    this._focus = node;
  }

  _rwLock(): void {
    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      this._flags |= FrameTaskFlags.RWLock;
    }
  }

  _rwUnlock(): void {
    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      this._flags &= ~FrameTaskFlags.RWLock;
    }
  }
}

/**
 * Scheduler supports animation frame tasks, macrotasks and microtasks.
 *
 * Animation frame tasks will be executed in batches, switching between write and read tasks until there
 * are no tasks left. Write tasks are sorted by their priority, tasks with the lowest priority value are
 * executed first, so the lowest depth of the Component in the components tree has highest priority.
 *
 * Scheduler also have monotonically increasing internal clock, it increments each time scheduler goes
 * from one animation frame to another, or starts executing macrotasks or microtasks.
 */
export class Scheduler {
  _flags: number;
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

  defaultThrottleTime: number;
  private _throttleEnabledCounter: number;
  /**
   * Maximum amount of processing time in ms available for tasks in each frame.
   */
  private _throttledTimePerFrame: number;
  private _throttledFrameDeadline: number;

  constructor() {
    this._flags = 0;
    this.clock = 1;
    this.time = 0;
    this._microtasks = [];
    this._macrotasks = [];
    this._currentFrame = new Frame();
    this._nextFrame = new Frame();
    this._updateComponents = [];
    this._microtaskScheduler = new MicrotaskScheduler(this._handleMicrotaskScheduler);
    this._macrotaskScheduler = new MacrotaskScheduler(this._handleMacrotaskScheduler);
    this.defaultThrottleTime = 5;
    this._throttleEnabledCounter = 0;
    this._throttledTimePerFrame = 0;
    this._throttledFrameDeadline = 0;

    this._currentFrame._rwLock();
  }

  requestAnimationFrame(): void {
    if ((this._flags & SchedulerFlags.FrametaskPending) === 0) {
      this._flags |= SchedulerFlags.FrametaskPending;
      requestAnimationFrame(this._handleAnimationFrame);
    }
  }

  currentFrame(): Frame {
    return this._currentFrame;
  }

  nextFrame(): Frame {
    this.requestAnimationFrame();
    return this._nextFrame;
  }

  enableThrottling(msPerFrame?: number): void {
    if (msPerFrame === undefined) {
      msPerFrame = this.defaultThrottleTime;
    }
    this._throttleEnabledCounter++;
    if ((this._flags & SchedulerFlags.EnabledThrottling) === 0) {
      this._flags |= SchedulerFlags.EnabledThrottling;
      this._throttledTimePerFrame = msPerFrame;
    } else if (this._throttledTimePerFrame > msPerFrame) {
      this._throttledTimePerFrame = msPerFrame;
    }
  }

  disableThrottling(): void {
    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      if (this._throttleEnabledCounter < 0) {
        throw new Error("Failed to disable scheduler throttling, it is already disabled.");
      }
    }

    this._throttleEnabledCounter--;
    if (this._throttleEnabledCounter === 0) {
      this._flags &= SchedulerFlags.EnabledThrottling;
    }
  }

  frameTimeRemaining(): number {
    return this._throttledFrameDeadline - performance.now();
  }

  startUpdateComponentEachFrame(component: Component<any, any>): void {
    this.requestAnimationFrame();
    this._updateComponents.push(component);
  }

  scheduleMicrotask(callback: SchedulerCallback): void {
    if ((this._flags & SchedulerFlags.MicrotaskPending) === 0) {
      this._flags |= SchedulerFlags.MicrotaskPending;
      this._microtaskScheduler.requestNextTick();
    }
    this._microtasks.push(callback);
  }

  scheduleMacrotask(callback: SchedulerCallback): void {
    if ((this._flags & SchedulerFlags.MacrotaskPending) === 0) {
      this._flags |= SchedulerFlags.MacrotaskPending;
      this._macrotaskScheduler.requestNextTick();
    }
    this._macrotasks.push(callback);
  }

  start(callback: SchedulerCallback): void {
    this._flags |= SchedulerFlags.Running;
    this.time = Date.now();
    callback();
    this.clock++;
    this._flags &= ~SchedulerFlags.Running;
  }

  private _handleMicrotaskScheduler = () => {
    this._flags |= SchedulerFlags.Running;
    this.time = Date.now();

    while (this._microtasks.length > 0) {
      let tasks = this._microtasks;
      this._microtasks = [];
      for (let i = 0; i < tasks.length; i++) {
        tasks[i]();
      }
    }

    this.clock++;
    this._flags &= ~(SchedulerFlags.MicrotaskPending | SchedulerFlags.Running);
  };

  private _handleMacrotaskScheduler = () => {
    this._flags &= ~SchedulerFlags.MacrotaskPending;
    this._flags |= SchedulerFlags.Running;
    this.time = Date.now();

    let tasks = this._macrotasks;
    this._macrotasks = [];
    for (let i = 0; i < tasks.length; i++) {
      tasks[i]();
    }

    this.clock++;
    this._flags &= ~SchedulerFlags.Running;
  };

  private _handleAnimationFrame = (t: number) => {
    let updateComponents = this._updateComponents;
    let tasks: SchedulerCallback[];
    let i: number;
    let j: number;

    this._flags &= ~SchedulerFlags.FrametaskPending;
    this._flags |= SchedulerFlags.Running;
    this.time = Date.now();
    if ((this._flags & SchedulerFlags.EnabledThrottling) !== 0) {
      this._throttledFrameDeadline = t + this._throttledTimePerFrame;
    }

    const frame = this._nextFrame;
    this._nextFrame = this._currentFrame;
    this._currentFrame = frame;

    this._currentFrame._rwUnlock();
    this._nextFrame._rwUnlock();

    // Mark all update components as dirty. But don't update until all write tasks
    // are finished. It is possible that we won't need to update Component if it
    // is removed.
    for (i = 0; i < updateComponents.length; i++) {
      updateComponents[i].markDirty();
    }

    do {
      while ((frame._flags & (FrameTaskFlags.Component | FrameTaskFlags.Write)) !== 0) {
        if ((frame._flags & FrameTaskFlags.Component) !== 0) {
          frame._flags &= ~FrameTaskFlags.Component;
          const componentGroups = frame._componentTasks;

          for (i = 0; i < componentGroups.length; i++) {
            const componentGroup = componentGroups[i];
            if (componentGroup !== undefined) {
              componentGroups[i] = undefined;
              for (j = 0; j < componentGroup.length; j++) {

                componentGroup[j].update();
              }
            }
          }
        }

        if ((frame._flags & FrameTaskFlags.Write) !== 0) {
          frame._flags &= ~FrameTaskFlags.Write;
          tasks = frame._writeTasks;
          frame._writeTasks = undefined;
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
        const component = updateComponents[i++];
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

      while ((frame._flags & FrameTaskFlags.Read) !== 0) {
        frame._flags &= ~FrameTaskFlags.Read;
        tasks = frame._readTasks;
        frame._readTasks = undefined;

        for (i = 0; i < tasks.length; i++) {
          tasks[i]();
        }
      }
    } while ((frame._flags & (FrameTaskFlags.Component | FrameTaskFlags.Write)) !== 0);

    this._currentFrame._rwLock();
    while ((frame._flags & FrameTaskFlags.After) !== 0) {
      frame._flags &= ~FrameTaskFlags.After;

      tasks = frame._afterTasks;
      frame._afterTasks = undefined;
      for (i = 0; i < tasks.length; i++) {
        tasks[i]();
      }
    }

    if (frame._focus !== undefined) {
      if (frame._focus.constructor === VNode) {
        ((frame._focus as VNode).ref as HTMLElement).focus();
      } else {
        (frame._focus as HTMLElement).focus();
      }
      frame._focus = undefined;
    }

    if (updateComponents.length > 0) {
      this.requestAnimationFrame();
    }

    this.clock++;
    this._flags &= ~SchedulerFlags.Running;
  }
}

export const scheduler = new Scheduler();
