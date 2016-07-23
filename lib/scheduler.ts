import {Component, updateComponent} from "./component";
import {ComponentFlags} from "./misc";
import {VNode} from "./vnode";
import {Actor, execActor} from "./actor";

export type SchedulerTask = () => void;

/**
 * Scheduler flags.
 */
const enum SchedulerFlags {
  /// Microtasks are pending for execution in microtasks queue.
  MicrotaskPending         = 1,
  /// Macrotasks are pending for execution in macrotasks queue.
  MacrotaskPending         = 1 << 1,
  /// Frametasks are pending for execution in frametasks queue.
  FrametaskPending         = 1 << 2,
  /// When throttling is enabled, component updates are switched to incremental mode.
  EnabledThrottling        = 1 << 3,
  /// Time frame for executing frame tasks in the current frame is ended.
  ThrottledFrameExhausted  = 1 << 4,
  /// Mounting is enabled.
  EnabledMounting          = 1 << 5,
}

/**
 * Minimum time frame duration for throttled tasks.
 */
const MinThrottleDuration = 2;
/**
 * Maximum time frame duration for throttled tasks.
 */
const MaxThrottleDuration = 6;
/**
 * Default time frame duration for throttled tasks.
 */
const DefaultThrottleDuration = 6;

const enum FrameTasksGroupFlags {
  Component = 1,
  Write     = 1 << 1,
  Read      = 1 << 2,
  After     = 1 << 3,
  RWLock    = 1 << 4,
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
 *
 * @final
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
  _writeTasks: SchedulerTask[] | null;
  /**
   * Read DOM task queue.
   */
  _readTasks: SchedulerTask[] | null;
  /**
   * Tasks that should be executed when all other tasks are finished.
   */
  _afterTasks: SchedulerTask[] | null;
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
  write(callback: SchedulerTask): void {
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
  read(callback: SchedulerTask): void {
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
  after(callback: SchedulerTask): void {
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
 * Global scheduler variables.
 *
 * Scheduler supports animation frame tasks, macrotasks and microtasks.
 *
 * Animation frame tasks will be executed in batches, switching between write and read tasks until there
 * are no tasks left. Write tasks are sorted by their priority, tasks with the lowest priority value are
 * executed first, so the lowest depth of the Component in the components tree has highest priority.
 *
 * Scheduler also have monotonically increasing internal clock, it increments each time scheduler goes
 * from one animation frame to another, or starts executing macrotasks or microtasks.
 */
const scheduler = {
  /**
   * See `SchedulerFlags` for details.
   */
  flags: 0,
  clock: 0,
  time: 0,
  microtasks: [] as SchedulerTask[],
  macrotasks: [] as SchedulerTask[],
  currentFrame: new FrameTasksGroup(),
  nextFrame: new FrameTasksGroup(),
  updateComponents: [] as Component<any, any>[],
  activeActors: [] as Actor<any, any>[],
  microtaskNode: document.createTextNode(""),
  microtaskToggle: 0,
  macrotaskMessage: "__kivi" + Math.random(),
  throttleEnabledCounter: 0,
  throttledFrameDuration: DefaultThrottleDuration,
  throttledFps: 60,
  throttledDiffWindow: 0,
  throttledFrameDeadline: 0,
};

// Microtask scheduler based on mutation observer
const microtaskObserver = new MutationObserver(runMicrotasks);
microtaskObserver.observe(scheduler.microtaskNode, {characterData: true});

// Macrotask scheduler based on postMessage
window.addEventListener("message", handleWindowMessage);

scheduler.currentFrame._rwLock();

/**
 * Returns current monotonically increasing clock.
 */
export function clock(): number {
  return scheduler.clock;
}

function requestMicrotaskExecution(): void {
  if ((scheduler.flags & SchedulerFlags.MicrotaskPending) === 0) {
    scheduler.flags |= SchedulerFlags.MicrotaskPending;
    scheduler.microtaskToggle ^= 1;
    scheduler.microtaskNode.nodeValue = scheduler.microtaskToggle ? "1" : "0";
  }
}

function requestMacrotaskExecution(): void {
  if ((scheduler.flags & SchedulerFlags.MacrotaskPending) === 0) {
    scheduler.flags |= SchedulerFlags.MacrotaskPending;
    window.postMessage(scheduler.macrotaskMessage, "*");
  }
}

function requestNextFrame(): void {
  if ((scheduler.flags & SchedulerFlags.FrametaskPending) === 0) {
    scheduler.flags |= SchedulerFlags.FrametaskPending;
    requestAnimationFrame(handleNextFrame);
  }
}

function handleWindowMessage(e: MessageEvent): void {
  if (e.source === window && e.data === scheduler.macrotaskMessage) {
    runMacrotasks();
  }
}

function handleNextFrame(t: number): void {
  const updateComponents = scheduler.updateComponents;
  let tasks: SchedulerTask[];
  let i: number;
  let j: number;

  scheduler.flags &= ~(SchedulerFlags.FrametaskPending | SchedulerFlags.ThrottledFrameExhausted);
  scheduler.time = Date.now();
  if ((scheduler.flags & SchedulerFlags.EnabledThrottling) !== 0) {
    scheduleMacrotask(() => {
      const elapsed = (window.performance.now() - t) / 1000;
      scheduler.throttledFps = Math.round((scheduler.throttledFps + (1 / elapsed)) / 2);
      scheduler.throttledDiffWindow += (scheduler.throttledFps < 45) ? -1 : 1;
      if (scheduler.throttledDiffWindow > 5) {
        scheduler.throttledDiffWindow = 0;
        scheduler.throttledFrameDuration += 0.1;
      } else if (scheduler.throttledDiffWindow < -5) {
        scheduler.throttledDiffWindow = 0;
        scheduler.throttledFrameDuration *= 0.66;
      }
      if (scheduler.throttledFrameDuration > MaxThrottleDuration) {
        scheduler.throttledFrameDuration = MaxThrottleDuration;
      } else if (scheduler.throttledFrameDuration < MinThrottleDuration) {
        scheduler.throttledFrameDuration = MinThrottleDuration;
      }
    });
    scheduler.throttledFrameDeadline = t + scheduler.throttledFrameDuration;
  }

  const frame = scheduler.nextFrame;
  scheduler.nextFrame = scheduler.currentFrame;
  scheduler.currentFrame = frame;

  scheduler.currentFrame._rwUnlock();
  scheduler.nextFrame._rwUnlock();

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
              updateComponent(componentGroup[j]);
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
          updateComponents[--i] = updateComponents.pop() !;
        }
      } else {
        updateComponent(component);
      }
    }
  } while ((frame._flags & (FrameTasksGroupFlags.Component |
    FrameTasksGroupFlags.Write |
    FrameTasksGroupFlags.Read)) !== 0);

  // Lock current from adding read and write tasks in debug mode.
  scheduler.currentFrame._rwLock();

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
    requestNextFrame();
  }

  scheduler.clock++;
}

function runMicrotasks(): void {
  scheduler.time = Date.now();

  do {
    while (scheduler.microtasks.length > 0) {
      let tasks = scheduler.microtasks;
      scheduler.microtasks = [];
      for (let i = 0; i < tasks.length; i++) {
        tasks[i]();
      }
      scheduler.clock++;
    }

    if (scheduler.activeActors.length > 0) {
      const activeActors = scheduler.activeActors;
      scheduler.activeActors = [];
      for (let i = 0; i < activeActors.length; i++) {
        execActor(activeActors[i]);
        scheduler.clock++;
      }
    }
  } while (scheduler.microtasks.length > 0 && scheduler.activeActors.length > 0);

  scheduler.flags &= ~SchedulerFlags.MicrotaskPending;
}

function runMacrotasks(): void {
  scheduler.flags &= ~SchedulerFlags.MacrotaskPending;
  scheduler.time = Date.now();

  let tasks = scheduler.macrotasks;
  scheduler.macrotasks = [];
  for (let i = 0; i < tasks.length; i++) {
    tasks[i]();
  }

  scheduler.clock++;
}

/**
 * Add task to the microtask queue.
 */
export function scheduleMicrotask(task: () => void): void {
  requestMicrotaskExecution();
  scheduler.microtasks.push(task);
}

/**
 * Add task to the macrotask queue.
 */
export function scheduleMacrotask(task: () => void): void {
  requestMacrotaskExecution();
  scheduler.macrotasks.push(task);
}

/**
 * Get task list for the current frame.
 */
export function currentFrame(): FrameTasksGroup {
  return scheduler.currentFrame;
}

/**
 * Get task list for the next frame.
 */
export function nextFrame(): FrameTasksGroup {
  requestNextFrame();
  return scheduler.nextFrame;
}

/**
 * Add actor for an execution.
 */
export function scheduleActorExecution(actor: Actor<any, any>): void {
  requestMicrotaskExecution();
  scheduler.activeActors.push(actor);
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
export function enableThrottling(): void {
  scheduler.throttleEnabledCounter++;
  scheduler.flags |= SchedulerFlags.EnabledThrottling;
}

/**
 * **EXPERIMENTAL** Disable throttling mode.
 *
 * Throttling mode will be disabled when number of dependencies that enabled throttling mode goes to zero.
 */
export function disableThrottling(): void {
  if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
    if (scheduler.throttleEnabledCounter < 0) {
      throw new Error("Failed to disable scheduler throttling, it is already disabled.");
    }
  }

  scheduler.throttleEnabledCounter--;
  if (scheduler.throttleEnabledCounter === 0) {
    scheduler.flags &= ~SchedulerFlags.EnabledThrottling;
  }
}

/**
 * Get remaining time available for tasks in the current frame.
 */
export function frameTimeRemaining(): number {
  if ((scheduler.flags & SchedulerFlags.ThrottledFrameExhausted) !== 0) {
    return 0;
  } else {
    const remaining = scheduler.throttledFrameDeadline - performance.now();
    if (remaining <= 0) {
      scheduler.flags |= SchedulerFlags.ThrottledFrameExhausted;
      return 0;
    } else {
      return remaining;
    }
  }
}

/**
 * Add component to the list of components that should be updated each frame.
 */
export function startUpdateComponentEachFrame(component: Component<any, any>): void {
  requestNextFrame();
  scheduler.updateComponents.push(component);
}

/**
 * Returns true if UI state is in mounting phase.
 */
export function isMounting(): boolean {
  return ((scheduler.flags & SchedulerFlags.EnabledMounting) !== 0);
}

/**
 * Returns true if tasks should be throttled.
 */
export function isThrottled(): boolean {
  return ((scheduler.flags & SchedulerFlags.EnabledThrottling) !== 0);
}

/**
 * Start UI mounting phase.
 */
export function startMounting(): void {
  scheduler.flags |= SchedulerFlags.EnabledMounting;
}

/**
 * Finish UI mounting phase.
 */
export function finishMounting(): void {
  scheduler.flags &= ~SchedulerFlags.EnabledMounting;
}
