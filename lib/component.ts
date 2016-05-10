import {SvgNamespace, ComponentDescriptorFlags, ComponentFlags, SchedulerFlags, VNodeFlags, RenderFlags} from "./misc";
import {VModel} from "./vmodel";
import {VNode, createVRoot} from "./vnode";
import {InvalidatorSubscription, Invalidator} from "./invalidator";
import {scheduler} from "./scheduler";

/**
 * Component Descriptor.
 *
 * Each component should declare its properties and behavior in `ComponentDescriptor` object.
 *
 * Component descriptor has three parametric types: first parametric type `P` is a props type, second type `S` is a
 * state type, and third `D` is auxiliary data type.
 *
 * Component descriptor provides a `createComponent` and `createRootComponent` methods to create component instances.
 *
 * Example:
 *
 *     class State {
 *       xy: number;
 *
 *       constructor(props: number) {
 *         this.xy = props * props;
 *       }
 *     }
 *
 *     const MyComponent = new ComponentDescriptor<number, State, any>()
 *       .canvas()
 *       .init((c) => {
 *         c.state = new State(c.props);
 *       })
 *       .update((c) => {
 *         const ctx = c.get2DContext();
 *         ctx.fillStyle = 'rgba(0, 0, 0, 1)';
 *         ctx.fillRect(c.props, c.props, c.state.xy, c.state.xy);
 *       });
 *
 *       const componentInstance = MyComponent.createRootComponent(10);
 *
 * @final
 */
export class ComponentDescriptor<P, S, D> {
  /**
   * Flags marked on Component when it is created.
   */
  _markFlags: number;
  /**
   * Flags, see `ComponentDescriptorFlags` for details.
   */
  _flags: number;
  /**
   * Tag name of the root element or reference to a model.
   */
  _tag: string|VModel<any>;
  /**
   * Lifecycle method init.
   */
  _init: (component: Component<P, S, D>) => void;
  /**
   * Checks if props is changed.
   */
  _isPropsChanged: (prevProps: P, nextProps: P) => boolean;
  /**
   * Checks if state is changed.
   */
  _isStateChanged: (prevState: S, nextState: S) => boolean;
  /**
   * Lifecycle method update.
   */
  _update: (component: Component<P, S, D>) => void;
  /**
   * Default Virtual DOM render function.
   */
  _vRender: (component: Component<P, S, D>, root: VNode) => void;
  /**
   * Lifecycle method attached.
   */
  _attached: (component: Component<P, S, D>) => void;
  /**
   * Lifecycle method detached.
   */
  _detached: (component: Component<P, S, D>) => void;
  /**
   * Lifecycle method disposed.
   */
  _disposed: (component: Component<P, S, D>) => void;

  /**
   * Pool of recycled components.
   */
  _recycledPool: Component<P, S, D>[];
  /**
   * Maximum number of recycled components (recycled pool size).
   */
  _maxRecycled: number;

  constructor() {
    this._markFlags = ComponentFlags.Dirty;
    this._flags = 0;
    this._tag = "div";
    this._init = null;
    this._isPropsChanged = null;
    this._isStateChanged = null;
    this._update = null;
    this._vRender = null;
    this._attached = null;
    this._detached = null;
    this._disposed = null;
    if ("<@KIVI_COMPONENT_RECYCLING@>" === "COMPONENT_RECYCLING_ENABLED") {
      this._recycledPool = null;
      this._maxRecycled = 0;
    }
    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      this._update = _debugUpdateHandler;
    }
  }

  /**
   * Set tag name for the root element.
   */
  tagName(tagName: string): ComponentDescriptor<P, S, D> {
    this._tag = tagName;
    return this;
  }

  /**
   * Use SVG Namespace to create root element.
   */
  svg(): ComponentDescriptor<P, S, D> {
    this._markFlags |= ComponentFlags.Svg;
    this._flags |= ComponentDescriptorFlags.Svg;
    return this;
  }

  /**
   * Set VModel for the root element.
   */
  vModel(model: VModel<any>): ComponentDescriptor<P, S, D> {
    this._markFlags |= model._markFlags;
    this._flags |= model._markFlags;
    this._tag = model;
    return this;
  }

  /**
   * Component is a Canvas object.
   */
  canvas(): ComponentDescriptor<P, S, D> {
    this._markFlags |= ComponentFlags.Canvas2D;
    this._flags |= ComponentDescriptorFlags.Canvas2D;
    this._tag = "canvas";
    return this;
  }

  /**
   * Disable data identity checking in default data setter.
   */
  disableCheckDataIdentity(): ComponentDescriptor<P, S, D> {
    this._markFlags |= ComponentFlags.DisabledCheckPropsIdentity;
    return this;
  }

  /**
   * Set lifecycle method init.
   */
  init(init: (component: Component<P, S, D>) => void): ComponentDescriptor<P, S, D> {
    this._init = init;
    return this;
  }

  /**
   * Set lifecycle method update.
   */
  update(update: (component: Component<P, S, D>) => void): ComponentDescriptor<P, S, D> {
    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      this._update = _debugUpdateHandlerWrapper(update);
      return this;
    }
    this._update = update;
    return this;
  }

  /**
   * Set default Virtual DOM render function.
   */
  vRender(vRender: (component: Component<P, S, D>, root: VNode) => void): ComponentDescriptor<P, S, D> {
    this._vRender = vRender;
    return this;
  }

  /**
   * Set lifecycle method attached.
   */
  attached(attached: (component: Component<P, S, D>) => void): ComponentDescriptor<P, S, D> {
    this._attached = attached;
    return this;
  }

  /**
   * Set lifecycle method detached.
   */
  detached(detached: (component: Component<P, S, D>) => void): ComponentDescriptor<P, S, D> {
    this._detached = detached;
    return this;
  }

  /**
   * Set lifecycle method disposed.
   */
  disposed(disposed: (component: Component<P, S, D>) => void): ComponentDescriptor<P, S, D> {
    this._disposed = disposed;
    return this;
  }

  /**
   * Enable back reference from DOM element to component.
   */
  enableBackRef(): ComponentDescriptor<P, S, D> {
    this._flags |= ComponentDescriptorFlags.EnabledBackRef;
    return this;
  }

  /**
   * Enable Component recycling.
   */
  enableRecycling(maxRecycled: number): ComponentDescriptor<P, S, D> {
    if ("<@KIVI_COMPONENT_RECYCLING@>" === "COMPONENT_RECYCLING_ENABLED") {
      this._markFlags |= ComponentFlags.EnabledRecycling;
      this._flags |= ComponentDescriptorFlags.EnabledRecycling;
      this._recycledPool = [];
      this._maxRecycled = maxRecycled;
    }
    return this;
  }

  /**
   * Create a Virtual DOM Node.
   */
  createVNode(data?: P): VNode {
    return new VNode(VNodeFlags.Component, this, data === undefined ? null : data);
  }

  /**
   * Creates a component without parent.
   */
  createRootComponent(props?: P): Component<P, S, D> {
    return this.createComponent(null, props);
  }

  /**
   * Create a Component.
   */
  createComponent(parent: Component<any, any, any> = null, props?: P): Component<P, S, D> {
    let element: Element;
    let component: Component<P, S, D>;

    if ("<@KIVI_COMPONENT_RECYCLING@>" !== "COMPONENT_RECYCLING_ENABLED" ||
        ((this._flags & ComponentDescriptorFlags.EnabledRecycling) === 0) ||
        (this._recycledPool.length === 0)) {

      if ((this._flags & ComponentDescriptorFlags.VModel) === 0) {
        element = ((this._flags & ComponentDescriptorFlags.Svg) === 0) ?
            document.createElement(this._tag as string) :
            document.createElementNS(SvgNamespace, this._tag as string);
      } else {
        element = (this._tag as VModel<any>).createElement();
      }
      component = new Component<P, S, D>(this._markFlags, this, element, parent, props);

      if ((this._flags & ComponentDescriptorFlags.EnabledBackRef) !== 0) {
        (element as any as {xtag: Component<P, S, D>}).xtag = component;
      }
      if (this._init !== null) {
        this._init(component);
      }
    } else {
      component = this._recycledPool.pop();
      component.setParent(parent);
    }

    return component;
  }

  /**
   * Mount Component on top of existing html element.
   */
  mountComponent(element: Element, parent?: Component<any, any, any>, data?: P): Component<P, S, D> {
    const component = new Component<P, S, D>(this._markFlags | ComponentFlags.Mounting, this, element,
      parent === undefined ? null : parent, data);
    if (this._init !== null) {
      this._init(component);
    }
    component.attached();
    return component;
  }
}

/**
 * Component.
 *
 * @final
 */
export class Component<P, S, D> {
  /**
   * Flags, see `ComponentFlags` for details.
   *
   * Lowest 24 bits are reserved for kivi flags, other bits can be used for
   * user flags.
   */
  flags: number;
  /**
   * Timestamp when component were updated last time, using scheduler
   * monotonically increasing clock.
   */
  mtime: number;
  /**
   * Component descriptor.
   */
  descriptor: ComponentDescriptor<P, S, D>;
  /**
   * Reference to the root element.
   */
  element: Element;
  /**
   * Parent component.
   */
  parent: Component<any, any, any>;
  /**
   * Depth in the components tree.
   *
   * Depth property is used by scheduler to determine its priority when updating components.
   */
  depth: number;
  /**
   * Auxiliary data.
   */
  data: D;
  /**
   * Component's data from previous update.
   */
  prevProps: P;
  /**
   * Component's data.
   */
  props: P;
  /**
   * Component's state from previous update.
   */
  prevState: S;
  /**
   * Component's state.
   */
  state: S;
  /**
   * Component's parameter children.
   */
  children: VNode[]|string;
  /**
   * Root node can contain a virtual dom root if Component represents a DOM subtree, or Canvas context if Component is
   * a Canvas object.
   */
  root: VNode|CanvasRenderingContext2D;

  _subscriptions: InvalidatorSubscription[]|InvalidatorSubscription;
  _transientSubscriptions: InvalidatorSubscription[]|InvalidatorSubscription;

  constructor(flags: number, descriptor: ComponentDescriptor<P, S, D>, element: Element,
      parent: Component<any, any, any>, props?: P) {
    this.flags = flags;
    this.mtime = 0;
    this.descriptor = descriptor;
    this.element = element;
    this.parent = parent;
    this.depth = parent === null ? 0 : parent.depth + 1;
    this.data = null;
    this.prevProps = null;
    this.props = props === undefined ? null : props;
    this.prevState = null;
    this.state = null;
    this.root = ((flags & ComponentFlags.Canvas2D) === 0) ? null : (element as HTMLCanvasElement).getContext("2d");
    this._subscriptions = null;
    this._transientSubscriptions = null;
  }

  /**
   * Get canvas 2d rendering context.
   */
  get2DContext(): CanvasRenderingContext2D {
    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      if ((this.flags & ComponentFlags.Canvas2D) === 0) {
        throw new Error("Failed to get 2d context: component isn't a canvas.");
      }
    }
    return this.root as CanvasRenderingContext2D;
  }

  /**
   * Set parent component.
   *
   * When parent is changed component's depth will be reevaluated.
   */
  setParent(parent: Component<P, S, D>): void {
    this.parent = parent;
    this.depth = parent === null ? 0 : parent.depth + 1;
  }

  /**
   * Set new props. Returns true if props are changed.
   *
   * If `isPropsChanged` function exists in component descriptor, this function will check if props are changed,
   * otherwise props are checked by their identity, unless it is disabled by `disableCheckDataIdentity()` component
   * descriptor method.
   */
  setProps(newProps: P = null): boolean {
    this.props = newProps;

    const isPropsChanged = this.descriptor._isPropsChanged;
    if ((isPropsChanged !== null && isPropsChanged(this.prevProps, newProps)) ||
        (this.flags & ComponentFlags.DisabledCheckPropsIdentity) !== 0 ||
        (this.prevProps !== newProps)) {
      this.flags |= ComponentFlags.DirtyProps;
      return true;
    } else {
      this.flags &= ~ComponentFlags.DirtyProps;
      return false;
    }
  }

  /**
   * Set new state. Returns true if state is changed.
   *
   * If `isStateChanged` function exists in component descriptor, this function will check if state is changed.
  */
  setState(newState: S = null): boolean {
    this.state = newState;
    const isStateChanged = this.descriptor._isStateChanged;
    if (isStateChanged === null || isStateChanged(this.prevState, newState)) {
      this.flags |= ComponentFlags.DirtyState;
      scheduler.nextFrame().updateComponent(this);
      return true;
    } else {
      this.flags &= ~ComponentFlags.DirtyState;
      return false;
    }
  }

  /**
   * **EXPERIMENTAL** Start interaction.
   *
   * When interaction is started, component becomes a high priority target for a scheduler, and scheduler goes into
   * throttled mode.
   */
  startInteraction(): void {
    this.flags |= ComponentFlags.HighPriorityUpdate;
    scheduler.enableThrottling();
  }

  /**
   * **EXPERIMENTAL** Finish interaction.
   *
   * Removes high priority flag from component and disables scheduler throttling.
   */
  finishInteraction(): void {
    this.flags &= ~ComponentFlags.HighPriorityUpdate;
    scheduler.disableThrottling();
  }

  /**
   * Adds component to a scheduler queue that will update component each animation frame.
   *
   * Component will be updated always, even when scheduler is in throttled mode.
   */
  startUpdateEachFrame(): void {
    this.flags |= ComponentFlags.UpdateEachFrame;
    if ((this.flags & ComponentFlags.InUpdateEachFrameQueue) === 0) {
      this.flags |= ComponentFlags.InUpdateEachFrameQueue;
      scheduler.startUpdateComponentEachFrame(this);
    }
  }

  /**
   * Remove component from a scheduler queue that updates component each animation frame.
   */
  stopUpdateEachFrame(): void {
    this.flags &= ~ComponentFlags.UpdateEachFrame;
  }

  /**
   * Update component.
   */
  update(): void {
    const flags = this.flags;
    if ((flags & ComponentFlags.Dirty) !== 0 && (flags & ComponentFlags.Attached) !== 0) {
      if (((scheduler._flags & SchedulerFlags.EnabledThrottling) === 0) ||
          ((flags & ComponentFlags.HighPriorityUpdate) !== 0) ||
          (scheduler.frameTimeRemaining() > 0)) {
        this._cancelTransientSubscriptions();
        const update = this.descriptor._update;
        if (update === null) {
          const newRoot = ((flags & ComponentFlags.VModel) === 0) ?
            createVRoot() :
            (this.descriptor._tag as VModel<any>).createVRoot();
          this.descriptor._vRender(this, newRoot);
          this._vSync(newRoot, 0);
        } else {
          this.descriptor._update(this);
        }
        this.mtime = scheduler.clock;
        this.prevProps = this.props;
        this.prevState = this.state;
        this.flags &= ~(ComponentFlags.Dirty | ComponentFlags.Mounting | ComponentFlags.InUpdateQueue);
      } else {
        scheduler.nextFrame().updateComponent(this);
      }
    }
  }

  /**
   * Sync internal representation using Virtual DOM API.
   *
   * If this method is called during mounting phase, then Virtual DOM will be
   * mounted on top of the existing document tree.
   */
  vSync(newRoot?: VNode): void {
    if (newRoot === undefined) {
      newRoot = ((this.flags & ComponentFlags.VModel) === 0) ?
        createVRoot() :
        (this.descriptor._tag as VModel<any>).createVRoot();
      this.descriptor._vRender(this, newRoot);
    }

    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      if ((newRoot._flags & VNodeFlags.Root) === 0) {
        throw new Error("Failed to sync: sync methods accepts only VNodes representing root node.");
      }
      if ((this.flags & ComponentFlags.VModel) !== (newRoot._flags & VNodeFlags.VModel)) {
        if ((this.flags & ComponentFlags.VModel) === 0) {
          throw new Error("Failed to sync: vdom root should have the same type as root registered in component " +
                          "descriptor, component descriptor is using vmodel root.");
        } else {
          throw new Error("Failed to sync: vdom root should have the same type as root registered in component " +
                          "descriptor, component descriptor is using simple tag.");
        }
      }
    }

    this._vSync(newRoot, 0);
  }

  /**
   * Sync internal representation using Virtual DOM API with custom render options.
   *
   * If this method is called during mounting phase, then Virtual DOM will be
   * mounted on top of the existing document tree.
   */
  advancedVSync(renderFlags: RenderFlags, newRoot?: VNode): void {
    if (newRoot === undefined) {
      newRoot = ((this.flags & ComponentFlags.VModel) === 0) ?
        createVRoot() :
        (this.descriptor._tag as VModel<any>).createVRoot();
      this.descriptor._vRender(this, newRoot);
    }

    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      if ((newRoot._flags & VNodeFlags.Root) === 0) {
        throw new Error("Failed to sync: sync methods accepts only VNodes representing root node.");
      }
      if ((this.flags & ComponentFlags.VModel) !== (newRoot._flags & VNodeFlags.VModel)) {
        if ((this.flags & ComponentFlags.VModel) === 0) {
          throw new Error("Failed to sync: vdom root should have the same type as root registered in component " +
                          "descriptor, component descriptor is using vmodel root.");
        } else {
          throw new Error("Failed to sync: vdom root should have the same type as root registered in component " +
                          "descriptor, component descriptor is using simple tag.");
        }
      }
    }

    this._vSync(newRoot, renderFlags);
  }

  _vSync(newRoot: VNode, renderFlags: RenderFlags = 0): void {
    if (this.root === null) {
      newRoot.cref = this;
      if ((this.flags & ComponentFlags.Mounting) !== 0) {
        newRoot.mount(this.element, this);
        this.flags &= ~ComponentFlags.Mounting;
      } else {
        newRoot.ref = this.element;
        newRoot.render(this, renderFlags);
      }
    } else {
      (this.root as VNode).sync(newRoot, this, renderFlags);
    }
    this.root = newRoot;
  }

  /**
   * Invalidate component.
   *
   * It automatically cancels all transient subscriptions and schedules a component update on the next frame.
   */
  invalidate(): void {
    if ((this.flags & (ComponentFlags.DirtyEnvironment | ComponentFlags.Disposed)) === 0) {
      this.flags |= ComponentFlags.DirtyEnvironment;
      this._cancelTransientSubscriptions();
      scheduler.nextFrame().updateComponent(this);
    }
  }

  /**
   * Attach method should be invoked when component is attached to the document.
   */
  attach(): void {
    this.attached();
    if (this.root !== null && ((this.flags & ComponentFlags.Canvas2D) === 0)) {
      (this.root as VNode).attach();
    }
  }

  attached(): void {
    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      if ((this.flags & ComponentFlags.Attached) !== 0) {
        throw new Error("Failed to attach Component: component is already attached.");
      }
    }
    this.flags |= ComponentFlags.Attached;
    if ("<@KIVI_COMPONENT_RECYCLING@>" === "COMPONENT_RECYCLING_ENABLED") {
      this.flags &= ~ComponentFlags.Recycled;
    }

    const attached = this.descriptor._attached;
    if (attached !== null) {
      attached(this);
    }
  }

  /**
   * Detach method should be invoked when component is detached from the document.
   */
  detach(): void {
    if (this.root !== null && ((this.flags & ComponentFlags.Canvas2D) === 0)) {
      (this.root as VNode).detach();
    }
    this.detached();
  }

  detached(): void {
    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      if ((this.flags & ComponentFlags.Attached) === 0) {
        throw new Error("Failed to detach Component: component is already detached.");
      }
    }
    this.flags &= ~(ComponentFlags.Attached | ComponentFlags.UpdateEachFrame);
    this._cancelSubscriptions();
    this._cancelTransientSubscriptions();

    const detached = this.descriptor._detached;
    if (detached !== null) {
      detached(this);
    }
  }

  /**
   * Dispose method should be invoked when component is destroyed.
   */
  dispose(): void {
    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      if ((this.flags & ComponentFlags.Disposed) !== 0) {
        throw new Error("Failed to dispose Component: component is already disposed.");
      }
    }

    if ("<@KIVI_COMPONENT_RECYCLING@>" !== "COMPONENT_RECYCLING_ENABLED" ||
        ((this.flags & ComponentFlags.EnabledRecycling) === 0) ||
        (this.descriptor._recycledPool.length >= this.descriptor._maxRecycled)) {
      this.flags |= ComponentFlags.Disposed;

      if (this.root !== null && ((this.flags & ComponentFlags.Canvas2D) === 0)) {
        (this.root as VNode).dispose();
      }

      if ((this.flags & ComponentFlags.Attached) !== 0) {
        this.detached();
      }
      const disposed = this.descriptor._disposed;
      if (disposed !== null) {
        disposed(this);
      }
    } else {
      this.detach();
      this.descriptor._recycledPool.push(this);
    }
  }

  /**
   * Subscribe to invalidator object.
   */
  subscribe(invalidator: Invalidator): void {
    const s = invalidator.subscribeComponent(this);
    const subscriptions = this._subscriptions;
    if (subscriptions === null) {
      this._subscriptions = s;
    } else if (subscriptions.constructor === InvalidatorSubscription) {
      this._subscriptions = [this._subscriptions as InvalidatorSubscription, s];
    } else {
      (subscriptions as InvalidatorSubscription[]).push(s);
    }
  }

  /**
   * Transiently subscribe to invalidator object.
   *
   * Each time component is invalidated, all transient subscriptions will be canceled.
   */
  transientSubscribe(invalidator: Invalidator): void {
    const s = invalidator.transientSubscribeComponent(this);
    const subscriptions = this._transientSubscriptions;
    if (subscriptions === null) {
      this._transientSubscriptions = s;
    } else if (subscriptions.constructor === InvalidatorSubscription) {
      this._transientSubscriptions = [this._transientSubscriptions as InvalidatorSubscription, s];
    } else {
      (subscriptions as InvalidatorSubscription[]).push(s);
    }
  }

  /**
   * Cancel all subscriptions.
   */
  private _cancelSubscriptions(): void {
    const subscriptions = this._subscriptions;
    if (subscriptions !== null) {
      if (subscriptions.constructor === InvalidatorSubscription) {
        (subscriptions as InvalidatorSubscription).invalidator
          ._removeSubscription(subscriptions as InvalidatorSubscription);
      } else {
        for (let i = 0; i < (subscriptions as InvalidatorSubscription[]).length; i++) {
          const s = (subscriptions as InvalidatorSubscription[])[i];
          s.invalidator._removeSubscription(s);
        }
      }
      this._subscriptions = null;
    }
  }

  /**
   * Cancel all transient subscriptions.
   */
  private _cancelTransientSubscriptions(): void {
    const subscriptions = this._transientSubscriptions;
    if (subscriptions !== null) {
      if (subscriptions.constructor === InvalidatorSubscription) {
        (subscriptions as InvalidatorSubscription).invalidator
          ._removeTransientSubscription(subscriptions as InvalidatorSubscription);
      } else {
        for (let i = 0; i < (subscriptions as InvalidatorSubscription[]).length; i++) {
          const s = (subscriptions as InvalidatorSubscription[])[i];
          s.invalidator._removeTransientSubscription(s);
        }
      }
      this._transientSubscriptions = null;
    }
  }
}

/**
 * Inject component into DOM.
 */
export function injectComponent<P, S, D>(descriptor: ComponentDescriptor<P, S, D>, container: Element, props?: P,
    sync?: boolean): Component<P, S, D> {
  const c = descriptor.createComponent(null, props);
  if (sync) {
    container.appendChild(c.element);
    c.attached();
    c.update();
  } else {
    scheduler.nextFrame().write(function() {
      container.appendChild(c.element);
      c.attached();
      c.update();
    });
  }
  return c;
}

/**
 * Mount component on top of existing DOM.
 */
export function mountComponent<P, S, D>(descriptor: ComponentDescriptor<P, S, D>, element: Element, props?: P,
    sync?: boolean): Component<P, S, D> {
  const c = descriptor.mountComponent(element, null, props);
  if (sync) {
    c.attached();
    c.update();
  } else {
    scheduler.nextFrame().write(function() {
      c.attached();
      c.update();
    });
  }
  return c;
}

/**
 * Function that is used as default component descriptor update handler in DEBUG mode.
 */
function _debugUpdateHandler(c: Component<any, any, any>): void {
  try {
    c.vSync();
  } catch (e) {
    console.error(`Failed to vSync component: ${e.toString()}. Component:`, c);
  }
}

/**
 * Function that wraps component descriptor update handler in DEBUG mode.
 */
function _debugUpdateHandlerWrapper(fn: (c: Component<any, any, any>) => void): (c: Component<any, any, any>) => void {
  return function _debugUpdateHandlerWrapper(c) {
    try {
      fn(c);
    } catch (e) {
      console.error(`Failed to update component: ${e.toString()}. Component:`, c);
    }
  };
}
