import {Component} from "./component";
import {SchedulerFlags, ComponentFlags} from "./misc";
import {VNode, vNodeMount, vNodeRender} from "./vnode";
import {Actor, ActorFlags, Message, actorAddMessage, actorRun} from "./actor";
import {reconciler} from "./reconciler";

export type SchedulerCallback = () => void;

/**
 * Minimum time frame duration for throttled tasks.
 */
const MinThrottleDuration = 2;
/**
 * Maximum time frame duration for throttled tasks.
 */
const MaxThrottleDuration = 12;
/**
 * Default time frame duration for throttled tasks.
 */
const DefaultThrottleDuration = 10;

const enum FrameTasksGroupFlags {
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
    this._toggle = 0;
    this._observer.observe(this._node, {characterData: true});
  }

  requestNextTick(): void {
    this._toggle ^= 1;
    this._node.data = this._toggle === 1 ? "1" : "0";
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

/**
 * Frame tasks group contains tasks for updating components, read dom and write dom tasks, and tasks that should be
 * executed after all other tasks are finished.
 *
 * To get access to the frame tasks group, use: `currentFrame()` and `nextFrame()` scheduler methods.
 *
 *     scheduler.currentFrame().read(() => {
 *       console.log(element.clientWidth);
 *     });
 */
export class FrameTasksGroup {
  /**
   * See `FrameTasksGroupFlags` for details.
   */
  _flags: number;
  /**
   * Array of component arrays indexed by their depth.
   */
  _componentTasks: Array<Component<any, any>[] | null>;
  /**
   * Write DOM task queue.
   */
  _writeTasks: SchedulerCallback[] | null;
  /**
   * Read DOM task queue.
   */
  _readTasks: SchedulerCallback[] | null;
  /**
   * Tasks that should be executed when all other tasks are finished.
   */
  _afterTasks: SchedulerCallback[] | null;
  /**
   * Element that should be focused.
   */
  _focus: Element | VNode | null;

  constructor() {
    this._flags = 0;
    this._componentTasks = [];
    this._writeTasks = null;
    this._readTasks = null;
    this._afterTasks = null;
    this._focus = null;
  }

  /**
   * Add Component to the components queue.
   */
  updateComponent(component: Component<any, any>): void {
    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      if ((this._flags & FrameTasksGroupFlags.RWLock) !== 0) {
        throw new Error("Failed to add update component task to the current frame, current frame is locked for read" +
                        " and write tasks.");
      }
    }

    if ((component.flags & ComponentFlags.InUpdateQueue) === 0) {
      component.flags |= ComponentFlags.InUpdateQueue;
      const priority = component.depth;

      this._flags |= FrameTasksGroupFlags.Component;
      while (priority >= this._componentTasks.length) {
        this._componentTasks.push(null);
      }

      const group = this._componentTasks[priority];
      if (group === null) {
        this._componentTasks[priority] = [component];
      } else {
        group.push(component);
      }
    }
  }

  /**
   * Add new task to the write DOM task queue.
   */
  write(callback: SchedulerCallback): void {
    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      if ((this._flags & FrameTasksGroupFlags.RWLock) !== 0) {
        throw new Error("Failed to add update component task to the current frame, current frame is locked for read" +
                        " and write tasks.");
      }
    }

    this._flags |= FrameTasksGroupFlags.Write;
    if (this._writeTasks === null) {
      this._writeTasks = [];
    }
    this._writeTasks.push(callback);
  }

  /**
   * Add new task to the read DOM task queue.
   */
  read(callback: SchedulerCallback): void {
    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      if ((this._flags & FrameTasksGroupFlags.RWLock) !== 0) {
        throw new Error("Failed to add update component task to the current frame, current frame is locked for read" +
                        " and write tasks.");
      }
    }

    this._flags |= FrameTasksGroupFlags.Read;
    if (this._readTasks === null) {
      this._readTasks = [];
    }
    this._readTasks.push(callback);
  }

  /**
   * Add new task to the task queue that will execute tasks when all DOM tasks are finished.
   */
  after(callback: SchedulerCallback): void {
    this._flags |= FrameTasksGroupFlags.After;
    if (this._afterTasks === null) {
      this._afterTasks = [];
    }
    this._afterTasks.push(callback);
  }

  /**
   * Set a focus on an element when all DOM tasks are finished.
   */
  focus(node: Element|VNode): void {
    this._focus = node;
  }

  /**
   * Place a lock on adding new read and write task.
   *
   * Works in DEBUG mode only.
   */
  _rwLock(): void {
    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      this._flags |= FrameTasksGroupFlags.RWLock;
    }
  }

  /**
   * Remove a lock from adding new read and write tasks.
   *
   * Works in DEBUG mode only.
   */
  _rwUnlock(): void {
    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      this._flags &= ~FrameTasksGroupFlags.RWLock;
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
  private _currentFrame: FrameTasksGroup;
  private _nextFrame: FrameTasksGroup;
  /**
   * Components array that should be updated on each frame.
   */
  private _updateComponents: Component<any, any>[];

  private _activeActors: Actor<any>[];

  private _microtaskScheduler: MicrotaskScheduler;
  private _macrotaskScheduler: MacrotaskScheduler;

  /**
   * Usage counter of dependencies that enabled throttling, when it goes to zero, throttling mode is disabled.
   */
  private _throttleEnabledCounter: number;
  private _throttledFrameDuration: number;
  private _throttledFps: number;
  private _throttledDiffWindow: number;
  /**
   * High Res timestamp of a point in time when low priority components should stop updating in a throttled mode.
   */
  private _throttledFrameDeadline: number;

  constructor() {
    this._flags = 0;
    this.clock = 1;
    this.time = 0;
    this._microtasks = [];
    this._macrotasks = [];
    this._currentFrame = new FrameTasksGroup();
    this._nextFrame = new FrameTasksGroup();
    this._updateComponents = [];
    this._activeActors = [];
    this._microtaskScheduler = new MicrotaskScheduler(this._handleMicrotaskScheduler);
    this._macrotaskScheduler = new MacrotaskScheduler(this._handleMacrotaskScheduler);

    this._throttleEnabledCounter = 0;
    this._throttledFrameDuration = DefaultThrottleDuration;
    this._throttledFps = 60;
    this._throttledDiffWindow = 0;
    this._throttledFrameDeadline = 0;

    this._currentFrame._rwLock();
  }

  _requestAnimationFrame(): void {
    if ((this._flags & SchedulerFlags.FrametaskPending) === 0) {
      this._flags |= SchedulerFlags.FrametaskPending;
      requestAnimationFrame(this._handleAnimationFrame);
    }
  }

  /**
   * Get task list for the current frame.
   */
  currentFrame(): FrameTasksGroup {
    return this._currentFrame;
  }

  /**
   * Get task list for the next frame.
   */
  nextFrame(): FrameTasksGroup {
    this._requestAnimationFrame();
    return this._nextFrame;
  }

  /**
   * **EXPERIMENTAL** Enable throttling mode.
   *
   * In throttling mode, all updates for low priority components will be throttled, all updates will be performed
   * incrementally each frame.
   *
   * Each time throttling is enabled, it increases internal counter that tracks how many times it is enabled, and when
   * counters goes to zero, throttling mode will be disabled.
   */
  enableThrottling(): void {
    this._throttleEnabledCounter++;
    this._flags |= SchedulerFlags.EnabledThrottling;
  }

  /**
   * **EXPERIMENTAL** Disable throttling mode.
   *
   * Throttling mode will be disabled when number of dependencies that enabled throttling mode goes to zero.
   */
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

  /**
   * Get remaining time available for tasks in the current frame.
   */
  frameTimeRemaining(): number {
    if ((this._flags & SchedulerFlags.ThrottledFrameExhausted) !== 0) {
      return 0;
    } else {
      const remaining = this._throttledFrameDeadline - performance.now();
      if (remaining <= 0) {
        this._flags |= SchedulerFlags.ThrottledFrameExhausted;
        return 0;
      } else {
        return remaining;
      }
    }
  }

  /**
   * Add component to the list of components that should be updated each frame.
   */
  startUpdateComponentEachFrame(component: Component<any, any>): void {
    this._requestAnimationFrame();
    this._updateComponents.push(component);
  }

  /**
   * Add task to the microtask queue.
   */
  scheduleMicrotask(callback: SchedulerCallback): void {
    if ((this._flags & SchedulerFlags.MicrotaskPending) === 0) {
      this._flags |= SchedulerFlags.MicrotaskPending;
      if ((this._flags & SchedulerFlags.ActorPending) === 0) {
        this._microtaskScheduler.requestNextTick();
      }
    }
    this._microtasks.push(callback);
  }

  /**
   * Add task to the macrotask queue.
   */
  scheduleMacrotask(callback: SchedulerCallback): void {
    if ((this._flags & SchedulerFlags.MacrotaskPending) === 0) {
      this._flags |= SchedulerFlags.MacrotaskPending;
      this._macrotaskScheduler.requestNextTick();
    }
    this._macrotasks.push(callback);
  }

  /**
   * Send message to an actor.
   */
  sendMessage(actor: Actor<any>, message: Message<any>): void {
    if ((actor._flags & ActorFlags.Active) === 0) {
      if ((this._flags & SchedulerFlags.ActorPending) === 0) {
        this._flags |= SchedulerFlags.ActorPending;
        if ((this._flags & SchedulerFlags.MicrotaskPending) === 0) {
          this._microtaskScheduler.requestNextTick();
        }
      }
      this._activeActors.push(actor);
      actor._flags |= ActorFlags.Active;
    }
    actorAddMessage(actor, message);
  }

  /**
   * Perform an operation in scheduler context.
   *
   * Processing operations inside scheduler context will guarantee that internal monotonically increasing clock is
   * increased after operation.
   */
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

    do {
      while (this._microtasks.length > 0) {
        let tasks = this._microtasks;
        this._microtasks = [];
        for (let i = 0; i < tasks.length; i++) {
          tasks[i]();
        }
        this.clock++;
      }

      if (this._activeActors.length > 0) {
        const activeActors = this._activeActors;
        this._activeActors = [];
        for (let i = 0; i < activeActors.length; i++) {
          actorRun(activeActors[i]);
          this.clock++;
        }
      }
    } while (this._microtasks.length > 0 && this._activeActors.length > 0);

    this._flags &= ~(SchedulerFlags.MicrotaskPending | SchedulerFlags.ActorPending | SchedulerFlags.Running);
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
    const updateComponents = this._updateComponents;
    let tasks: SchedulerCallback[];
    let i: number;
    let j: number;

    this._flags &= ~(SchedulerFlags.FrametaskPending | SchedulerFlags.ThrottledFrameExhausted);
    this._flags |= SchedulerFlags.Running;
    this.time = Date.now();
    if ((this._flags & SchedulerFlags.EnabledThrottling) !== 0) {
      this.scheduleMacrotask(() => {
        const elapsed = (window.performance.now() - t) / 1000;
        this._throttledFps = Math.round((this._throttledFps + (1 / elapsed)) / 2);
        this._throttledDiffWindow += (this._throttledFps < 45) ? -1 : 1;
        if (this._throttledDiffWindow > 5) {
          this._throttledDiffWindow = 0;
          this._throttledFrameDuration += 0.1;
        } else if (this._throttledDiffWindow < -5) {
          this._throttledDiffWindow = 0;
          this._throttledFrameDuration *= 0.66;
        }
        if (this._throttledFrameDuration > MaxThrottleDuration) {
          this._throttledFrameDuration = MaxThrottleDuration;
        } else if (this._throttledFrameDuration < MinThrottleDuration) {
          this._throttledFrameDuration = MinThrottleDuration;
        }
      });
      this._throttledFrameDeadline = t + this._throttledFrameDuration;
    }

    const frame = this._nextFrame;
    this._nextFrame = this._currentFrame;
    this._currentFrame = frame;

    this._currentFrame._rwUnlock();
    this._nextFrame._rwUnlock();

    // Mark all update components as dirty. But don't update until all write tasks are finished. It is possible that we
    // won't need to update component if it is removed.
    for (i = 0; i < updateComponents.length; i++) {
      updateComponents[i].flags |= ComponentFlags.Dirty;
    }

    // Perform read/write batching. Start with executing read DOM tasks, then update components, execute write DOM tasks
    // and repeat until all read and write tasks are executed.
    do {
      while ((frame._flags & FrameTasksGroupFlags.Read) !== 0) {
        frame._flags &= ~FrameTasksGroupFlags.Read;
        tasks = frame._readTasks!;
        frame._readTasks = null;

        for (i = 0; i < tasks.length; i++) {
          tasks[i]();
        }
      }

      while ((frame._flags & (FrameTasksGroupFlags.Component | FrameTasksGroupFlags.Write)) !== 0) {
        if ((frame._flags & FrameTasksGroupFlags.Component) !== 0) {
          frame._flags &= ~FrameTasksGroupFlags.Component;
          const componentGroups = frame._componentTasks;

          for (i = 0; i < componentGroups.length; i++) {
            const componentGroup = componentGroups[i];
            if (componentGroup !== null) {
              componentGroups[i] = null;
              for (j = 0; j < componentGroup.length; j++) {
                schedulerUpdateComponent(this, componentGroup[j]);
              }
            }
          }
        }

        if ((frame._flags & FrameTasksGroupFlags.Write) !== 0) {
          frame._flags &= ~FrameTasksGroupFlags.Write;
          tasks = frame._writeTasks!;
          frame._writeTasks = null;
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
          component.flags &= ~ComponentFlags.InUpdateEachFrameQueue;
          if (i === j) {
            updateComponents.pop();
          } else {
            updateComponents[--i] = updateComponents.pop()!;
          }
        } else {
          schedulerUpdateComponent(this, component);
        }
      }
    } while ((frame._flags & (FrameTasksGroupFlags.Component |
                              FrameTasksGroupFlags.Write |
                              FrameTasksGroupFlags.Read)) !== 0);

    // Lock current from adding read and write tasks in debug mode.
    this._currentFrame._rwLock();

    // Perform tasks that should be executed when all DOM ops are finished.
    while ((frame._flags & FrameTasksGroupFlags.After) !== 0) {
      frame._flags &= ~FrameTasksGroupFlags.After;

      tasks = frame._afterTasks!;
      frame._afterTasks = null;
      for (i = 0; i < tasks.length; i++) {
        tasks[i]();
      }
    }

    // Set focus on an element.
    if (frame._focus !== null) {
      if (frame._focus.constructor === VNode) {
        ((frame._focus as VNode).ref as HTMLElement).focus();
      } else {
        (frame._focus as HTMLElement).focus();
      }
      frame._focus = null;
    }

    if (updateComponents.length > 0) {
      this._requestAnimationFrame();
    }

    this.clock++;
    this._flags &= ~SchedulerFlags.Running;
  }
}

/**
 * Note: Tried to separate passing new props and move it to component's api, it is worse :)
 */
export function schedulerUpdateComponent(scheduler: Scheduler, component: Component<any, any>, newProps?: any): void {
  const flags = component.flags;

  if (newProps !== undefined) {
    if ((flags & ComponentFlags.Dirty) === 0) {
      const oldProps = component._props;
      const newPropsReceived = component.descriptor._newPropsReceived;
      if (newPropsReceived !== null) {
        newPropsReceived(component, oldProps, newProps);
      } else if ((flags & ComponentFlags.DisabledCheckPropsIdentity) !== 0 || (oldProps !== newProps)) {
        component.markDirty();
      }
    }
    component._props = newProps;
  }

  if ((component.flags & (ComponentFlags.Dirty | ComponentFlags.Attached)) ===
      (ComponentFlags.Dirty | ComponentFlags.Attached)) {
    if (((scheduler._flags & SchedulerFlags.EnabledThrottling) === 0) ||
        ((scheduler._flags & SchedulerFlags.EnabledMounting) !== 0) ||
        ((flags & ComponentFlags.HighPriorityUpdate) !== 0) ||
        (scheduler.frameTimeRemaining() > 0)) {
      component.descriptor._update!(component, component._props, component._state);
      component.mtime = scheduler.clock;
      component.flags &= ~(ComponentFlags.Dirty | ComponentFlags.InUpdateQueue);
    } else {
      scheduler.nextFrame().updateComponent(component);
    }
  }
}

/**
 * Note: I am aware that it is ugly, and it may seems that it should be a part of component's api, maybe later I'll
 * revisit this part. My thought was that reconciliation algorithm should be a part of the scheduler.
 */
export function schedulerComponentVSync(scheduler: Scheduler, component: Component<any, any>, oldRoot: VNode,
    newRoot: VNode, renderFlags: number): void {
  if (oldRoot === null) {
    newRoot.cref = component;
    if ((scheduler._flags & SchedulerFlags.EnabledMounting) !== 0) {
      vNodeMount(newRoot, component.element, component);
    } else {
      newRoot.ref = component.element;
      vNodeRender(newRoot, renderFlags, component);
    }
  } else {
    reconciler.sync(oldRoot, newRoot, renderFlags, component);
  }
  component._root = newRoot;
}

/**
 * Global scheduler instance.
 *
 * Note: Just move on, don't want to hear how it will break your nice unit tests :)
 */
export const scheduler = new Scheduler();
