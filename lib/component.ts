import {SvgNamespace, ComponentDescriptorFlags, ComponentFlags, VNodeFlags, SchedulerFlags, RenderFlags} from "./misc";
import {VModel} from "./vmodel";
import {VNode, vNodeAttach, vNodeDetach, vNodeDispose, createVRoot} from "./vnode";
import {InvalidatorSubscription, Invalidator} from "./invalidator";
import {scheduler, schedulerUpdateComponent, schedulerComponentVSync} from "./scheduler";

/**
 * Component Descriptor.
 *
 * Each component should declare its properties and behavior in `ComponentDescriptor` object.
 *
 * Component descriptor has two parametric types: first parametric type `P` is a props type and second type `S` is a
 * state type.
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
 *     const MyComponent = new ComponentDescriptor<number, State>()
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
export class ComponentDescriptor<P, S> {
  /**
   * Flags marked on component when component is instantiated. See `ComponentFlags` for details.
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
   * Lifecycle handler init.
   */
  _init: (component: Component<P, S>) => void;
  /**
   * New props received handler overrides default props received behavior and it should mark component as dirty if new
   * received props will cause change in component's representation.
   */
  _newPropsReceived: (component: Component<P, S>, newProps: P) => void;
  /**
   * Lifecycle handler update.
   */
  _update: (component: Component<P, S>) => void;
  /**
   * Default virtual dom render function.
   */
  _vRender: (component: Component<P, S>, root: VNode) => void;
  /**
   * Lifecycle handler attached.
   */
  _attached: (component: Component<P, S>) => void;
  /**
   * Lifecycle handler detached.
   */
  _detached: (component: Component<P, S>) => void;
  /**
   * Lifecycle hdnaler disposed.
   */
  _disposed: (component: Component<P, S>) => void;

  /**
   * Pool of recycled components.
   */
  _recycledPool: Component<P, S>[];
  /**
   * Maximum number of recycled components (recycled pool size).
   */
  _maxRecycled: number;

  constructor() {
    this._markFlags = ComponentFlags.Dirty;
    this._flags = 0;
    this._tag = "div";
    this._init = null;
    this._newPropsReceived = null;
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
   *
   *     const MyComponent = new ComponentDescriptor<any, any>()
   *       .tagName("table");
   */
  tagName(tagName: string): ComponentDescriptor<P, S> {
    this._tag = tagName;
    return this;
  }

  /**
   * Use SVG Namespace to create a root element.
   *
   *     const MySvgComponent = new ComponentDescriptor<any, any>()
   *       .svg()
   *       .tagName("circle");
   */
  svg(): ComponentDescriptor<P, S> {
    this._markFlags |= ComponentFlags.Svg;
    this._flags |= ComponentDescriptorFlags.Svg;
    return this;
  }

  /**
   * Set VModel for the root element.
   *
   *     const MyComponent = new ComponentDescriptor<any, any>()
   *       .vModel(new VModel("div").attrs({"id": "model"}))
   *       .vRender((c, root) => { root.children("content"); });
   */
  vModel(model: VModel<any>): ComponentDescriptor<P, S> {
    this._markFlags |= model._markFlags;
    this._flags |= model._markFlags;
    this._tag = model;
    return this;
  }

  /**
   * Turn component into a canvas.
   *
   *     const MyCanvasComponent = new ComponentDescriptor<any, any>()
   *       .canvas()
   *       .update((c) => {
   *         const ctx = c.get2DContext();
   *         ctx.fillStyle = "red";
   *         ctx.fillRect(0, 0, 10, 10);
   *       });
   */
  canvas(): ComponentDescriptor<P, S> {
    this._markFlags |= ComponentFlags.Canvas2D;
    this._flags |= ComponentDescriptorFlags.Canvas2D;
    this._tag = "canvas";
    return this;
  }

  /**
   * Disable data identity checking in default `newPropsReceived` handler.
   *
   *     const MyComponent = new ComponentDescriptor<{a: number}, any>()
   *       .disableCheckDataIdentity()
   *       .vRender((c, root) => { root.children(a.toString()); })
   *
   *     const data = {a: 10};
   *     const component = MyComponent.createRootComponent(data);
   *     data.a = 20;
   *     component.update(data);
   */
  disableCheckDataIdentity(): ComponentDescriptor<P, S> {
    this._markFlags |= ComponentFlags.DisabledCheckPropsIdentity;
    return this;
  }

  /**
   * Set lifecycle handler init.
   *
   * `element` and `props` properties will be initialized before init handler is invoked.
   *
   *     const MyComponent = new ComponentDescriptor<any, any>()
   *       .tagName("button")
   *       .init((c) => {
   *         c.element.addEventListener("click", (e) => {
   *           e.preventDefault();
   *           e.stopPropagation();
   *           console.log("clicked");
   *         });
   *       })
   *       .vRender((c, root) => { root.children("click me"); });
   */
  init(init: (component: Component<P, S>) => void): ComponentDescriptor<P, S> {
    this._init = init;
    return this;
  }

  /**
   * Set newPropsReceived handler.
   *
   * New props received handler overrides default props received behavior and it should mark component as dirty if new
   * received props will cause change in component's representation.
   *
   *     const MyComponent = new ComponentDescriptor<{a: number}, any>()
   *       .newPropsReceived((c, newProps) => {
   *         if (c.props.a !== newProps.a) {
   *           c.markDirty();
   *         }
   *       })
   *       .vRender((c, root) => { root.children(c.props.toString()); });
   */
  newPropsReceived(newPropsReceived: (component: Component<P, S>, newProps: P) => void): ComponentDescriptor<P, S> {
    this._newPropsReceived = newPropsReceived;
    return this;
  }

  /**
   * Set lifecycle handler update.
   *
   * Update handler overrides default update behavior.
   *
   *     const MyComponent = new ComponentDescriptor<{a: number}, any>()
   *       .update((c) => { c.sync(c.createVRoot().children("content")); });
   */
  update(update: (component: Component<P, S>) => void): ComponentDescriptor<P, S> {
    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      this._update = _debugUpdateHandlerWrapper(update);
      return this;
    }
    this._update = update;
    return this;
  }

  /**
   * Set default Virtual DOM render function.
   *
   * Default update handler will use this function to create a new virtual dom tree.
   *
   *     const MyComponent = new ComponentDescriptor<any, any>()
   *       .vRender((c, root) => { root.children("content"); });
   */
  vRender(vRender: (component: Component<P, S>, root: VNode) => void): ComponentDescriptor<P, S> {
    this._vRender = vRender;
    return this;
  }

  /**
   * Set lifecycle handler attached.
   *
   * Attached handler will be invoked when component is attached to the document.
   *
   *     const onChange = new Invalidator();
   *
   *     const MyComponent = new ComponentDescriptor<any, any>()
   *       .attached((c) => {
   *         c.subscribe(onChange);
   *       })
   *       .vRender((c, root) => { root.children("content"); });
   *
   *     onChange.invalidate();
   */
  attached(attached: (component: Component<P, S>) => void): ComponentDescriptor<P, S> {
    this._attached = attached;
    return this;
  }

  /**
   * Set lifecycle handler detached.
   *
   * Detached handler will be invoked when component is detached from the document.
   *
   *     const MyComponent = new ComponentDescriptor<any, {onResize: (e: Event) => void}>()
   *       .init((c) => {
   *         c.state = {
   *           onResize: (e) => { console.log("window resized"); }
   *         };
   *       })
   *       .attached((c) => {
   *         window.addEventListener("resize", c.state.onResize);
   *       })
   *       .detached((c) => {
   *         window.removeEventListener(c.state.onResize);
   *       })
   *       .vRender((c, root) => { root.children("content"); });
   */
  detached(detached: (component: Component<P, S>) => void): ComponentDescriptor<P, S> {
    this._detached = detached;
    return this;
  }

  /**
   * Set lifecycle handler disposed.
   *
   * Disposed handler will be invoked when component is disposed.
   *
   *     let allocatedComponents = 0;
   *
   *     const MyComponent = new ComponentDescriptor<any, {onResize: (e: Event) => void}>()
   *       .init((c) => {
   *         allocatedComponents++;
   *       })
   *       .disposed((c) => {
   *         allocatedComponents--;
   *       })
   *       .vRender((c, root) => { root.children("content"); });
   */
  disposed(disposed: (component: Component<P, S>) => void): ComponentDescriptor<P, S> {
    this._disposed = disposed;
    return this;
  }

  /**
   * Enable back reference from DOM element to component instance.
   *
   * Back reference will be assigned to `xtag` property.
   *
   *     const MyComponent = new ComponentDescriptor<any, any>()
   *       .enableBackRef()
   *       .init((c) => {
   *         c.element.addEventListener("click", (e) => {
   *           console.log(getBackRef<Component<any, any>>(e.target) === c);
   *         });
   *       })
   *       .vRender((c, root) => { root.children("content"); });
   */
  enableBackRef(): ComponentDescriptor<P, S> {
    this._flags |= ComponentDescriptorFlags.EnabledBackRef;
    return this;
  }

  /**
   * Enable component recycling.
   *
   * When component recycling is enabled, components will be instantiated from recycled pool.
   *
   *     const MyComponent = new ComponentDescriptor<any, any>()
   *       .enableRecycling(100)
   *       .vRender((c, root) => { root.children("content"); });
   */
  enableRecycling(maxRecycled: number): ComponentDescriptor<P, S> {
    if ("<@KIVI_COMPONENT_RECYCLING@>" === "COMPONENT_RECYCLING_ENABLED") {
      this._markFlags |= ComponentFlags.EnabledRecycling;
      this._flags |= ComponentDescriptorFlags.EnabledRecycling;
      this._recycledPool = [];
      this._maxRecycled = maxRecycled;
    }
    return this;
  }

  /**
   * Create a Virtual DOM node.
   *
   *     const MyComponent = new ComponentDescriptor<number, any>()
   *       .vRender((c, root) => { root.children(this.props.toString()); });
   *
   *     const vnode = MyComponent.createVNode(10);
   */
  createVNode(data?: P): VNode {
    return new VNode(VNodeFlags.Component, this, data === undefined ? null : data);
  }

  /**
   * Creates a component instance without parent.
   *
   *     const MyComponent = new ComponentDescriptor<number, any>()
   *       .vRender((c, root) => { root.children(this.props.toString()); });
   *
   *     const component = MyComponent.createRootComponent(10);
   */
  createRootComponent(props?: P): Component<P, S> {
    return this.createComponent(undefined, props);
  }

  /**
   * Create a Component.
   *
   *     const ChildComponent = new ComponentDescriptor<any, any>()
   *       .vRender((c, root) => { root.children("child"); });
   *
   *     const ParentComponent = new ComponentDescriptor<any, any>()
   *       .init((c) => {
   *         const child = ChildComponent.createComponent(c);
   *         c.element.appendChild(child.element);
   *         child.attached();
   *         child.update();
   *       });
   *
   *     const rootComponent = MyComponent.createRootComponent();
   */
  createComponent(parent?: Component<any, any>, props?: P): Component<P, S> {
    let element: Element;
    let component: Component<P, S>;

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
      component = new Component<P, S>(this._markFlags, this, element, parent, props);

      if ((this._flags & ComponentDescriptorFlags.EnabledBackRef) !== 0) {
        (element as any as {xtag: Component<P, S>}).xtag = component;
      }
      if (this._init !== null) {
        this._init(component);
      }
    } else {
      component = this._recycledPool.pop();
      component.depth = parent === undefined ? 0 : parent.depth + 1;
    }

    return component;
  }

  /**
   * Mount component on top of existing html element.
   *
   *     const element = document.createElement("div");
   *     document.body.appendChild(element);
   *     element.innerHTML("<span>content</span>");
   *
   *     const MyComponent = new ComponentDescriptor()
   *       .vRender((c, root) => { root.children([createVElement("span").children("content")]); });
   *
   *     const component = MyComponent.mountComponent(element);
   *     component.update();
   */
  mountComponent(element: Element, parent?: Component<any, any>, data?: P): Component<P, S> {
    const component = new Component<P, S>(this._markFlags , this, element, parent, data);
    if (this._init !== null) {
      this._init(component);
    }
    componentAttached(component);
    return component;
  }
}

/**
 * Component.
 *
 * @final
 */
export class Component<P, S> {
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
  descriptor: ComponentDescriptor<P, S>;
  /**
   * Reference to the root element.
   */
  element: Element;
  /**
   * Depth in the components tree.
   *
   * Depth property is used by scheduler to determine its priority when updating components.
   */
  depth: number;
  /**
   * Component's props.
   */
  props: P;
  /**
   * Component's state.
   */
  state: S;
  /**
   * Root node can contain a virtual dom root if Component represents a DOM subtree, or Canvas context if Component is
   * a Canvas object.
   */
  root: VNode|CanvasRenderingContext2D;

  _subscriptions: InvalidatorSubscription[]|InvalidatorSubscription;
  _transientSubscriptions: InvalidatorSubscription[]|InvalidatorSubscription;

  constructor(flags: number, descriptor: ComponentDescriptor<P, S>, element: Element, parent?: Component<any, any>,
      props?: P) {
    this.flags = flags;
    this.mtime = 0;
    this.descriptor = descriptor;
    this.element = element;
    this.depth = parent === undefined ? 0 : parent.depth + 1;
    this.props = props === undefined ? null : props;
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
   * Mark component as dirty and cancel all transient subscriptions.
   */
  markDirty(): void {
    this.flags |= ComponentFlags.Dirty;
    componentCancelTransientSubscriptions(this);
  }

  /**
   * Creates a virtual dom root node.
   */
  createVRoot(): VNode {
    return ((this.flags & ComponentFlags.VModel) === 0) ?
      createVRoot() :
      (this.descriptor._tag as VModel<any>).createVRoot();
  }

  /**
   * **EXPERIMENTAL** Start interaction.
   *
   * When interaction is started, component becomes a high priority target for a scheduler, and scheduler goes into
   * throttled mode.
   */
  startInteraction(): void {
    if ((this.flags & ComponentFlags.EnabledThrottling) === 0) {
      this.flags |= ComponentFlags.HighPriorityUpdate | ComponentFlags.EnabledThrottling;
      scheduler.enableThrottling();
    } else {
      this.flags |= ComponentFlags.HighPriorityUpdate;
    }
  }

  /**
   * **EXPERIMENTAL** Finish interaction.
   *
   * Removes high priority flag from component and disables scheduler throttling.
   */
  finishInteraction(): void {
    if ((this.flags & ComponentFlags.EnabledThrottling) === 0) {
      this.flags &= ~ComponentFlags.HighPriorityUpdate;
    } else {
      this.flags &= ~(ComponentFlags.HighPriorityUpdate | ComponentFlags.EnabledThrottling);
      scheduler.disableThrottling();
    }
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
   * Set new props and update component.
   *
   * Props are checked by their identity, unless it is disabled by component descriptor method
   * `disableCheckDataIdentity()`.
   */
  update(newProps?: P): void {
    schedulerUpdateComponent(scheduler, this, newProps);
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

    schedulerComponentVSync(scheduler, this, this.root as VNode, newRoot, 0);
  }

  /**
   * Sync internal representation using Virtual DOM API with custom render options.
   *
   * If this method is called during mounting phase, then Virtual DOM will be
   * mounted on top of the existing document tree.
   */
  vSyncAdvanced(renderFlags: RenderFlags, newRoot?: VNode): void {
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

    schedulerComponentVSync(scheduler, this, this.root as VNode, newRoot, renderFlags);
  }

  /**
   * Invalidate component.
   *
   * It automatically cancels all transient subscriptions and schedules a component update on the next frame.
   */
  invalidate(): void {
    if ((this.flags & (ComponentFlags.Dirty | ComponentFlags.Disposed)) === 0) {
      this.flags |= ComponentFlags.Dirty;
      componentCancelTransientSubscriptions(this);
      scheduler.nextFrame().updateComponent(this);
    }
  }

  /**
   * Attach method should be invoked when component is attached to the document.
   */
  attach(): void {
    componentAttached(this);
    if (this.root !== null && ((this.flags & ComponentFlags.Canvas2D) === 0)) {
      vNodeAttach(this.root as VNode);
    }
  }

  /**
   * Detach method should be invoked when component is detached from the document.
   */
  detach(): void {
    if (this.root !== null && ((this.flags & ComponentFlags.Canvas2D) === 0)) {
      vNodeDetach(this.root as VNode);
    }
    componentDetached(this);
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
        vNodeDispose(this.root as VNode);
      }

      if ((this.flags & ComponentFlags.Attached) !== 0) {
        componentDetached(this);
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
}

export function componentAttached(component: Component<any, any>): void {
  if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
    if ((component.flags & ComponentFlags.Attached) !== 0) {
      throw new Error("Failed to attach Component: component is already attached.");
    }
  }
  component.flags |= ComponentFlags.Attached;
  if ("<@KIVI_COMPONENT_RECYCLING@>" === "COMPONENT_RECYCLING_ENABLED") {
    component.flags &= ~ComponentFlags.Recycled;
  }

  const attached = component.descriptor._attached;
  if (attached !== null) {
    attached(component);
  }
}

export function componentDetached(component: Component<any, any>): void {
  if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
    if ((component.flags & ComponentFlags.Attached) === 0) {
      throw new Error("Failed to detach Component: component is already detached.");
    }
  }
  if ((component.flags & ComponentFlags.EnabledThrottling) !== 0) {
    scheduler.disableThrottling();
  }
  component.flags &= ~(ComponentFlags.Attached | ComponentFlags.UpdateEachFrame | ComponentFlags.EnabledThrottling);
  componentCancelSubscriptions(component);
  componentCancelTransientSubscriptions(component);
  const detached = component.descriptor._detached;
  if (detached !== null) {
    detached(component);
  }
}

/**
 * Cancel subscriptions.
 */
export function componentCancelSubscriptions(component: Component<any, any>): void {
  const subscriptions = component._subscriptions;
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
    component._subscriptions = null;
  }
}

/**
 * Cancel transient subscriptions.
 */
export function componentCancelTransientSubscriptions(component: Component<any, any>): void {
  const subscriptions = component._transientSubscriptions;
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
    component._transientSubscriptions = null;
  }
}

/**
 * Inject component into DOM.
 */
export function injectComponent<P, S>(descriptor: ComponentDescriptor<P, S>, container: Element, props?: P,
    sync?: boolean): Component<P, S> {
  const c = descriptor.createComponent(undefined, props);
  if (sync) {
    container.appendChild(c.element);
    componentAttached(c);
    schedulerUpdateComponent(scheduler, c);
  } else {
    scheduler.nextFrame().write(function() {
      container.appendChild(c.element);
      componentAttached(c);
      schedulerUpdateComponent(scheduler, c);
    });
  }
  return c;
}

/**
 * Mount component on top of existing DOM.
 */
export function mountComponent<P, S>(descriptor: ComponentDescriptor<P, S>, element: Element, props?: P,
    sync?: boolean): Component<P, S> {
  scheduler._flags |= SchedulerFlags.EnabledMounting;
  const c = descriptor.mountComponent(element, undefined, props);
  if (sync) {
    componentAttached(c);
    schedulerUpdateComponent(scheduler, c);
    scheduler._flags &= ~SchedulerFlags.EnabledMounting;
  } else {
    scheduler.nextFrame().write(function() {
      componentAttached(c);
      schedulerUpdateComponent(scheduler, c);
      scheduler._flags &= ~SchedulerFlags.EnabledMounting;
    });
  }
  return c;
}

/**
 * Function that is used as default component descriptor update handler in DEBUG mode.
 */
function _debugUpdateHandler(c: Component<any, any>): void {
  try {
    c.vSync();
  } catch (e) {
    console.error(`Failed to vSync component: ${e.toString()}. Component:`, c);
  }
}

/**
 * Function that wraps component descriptor update handler in DEBUG mode.
 */
function _debugUpdateHandlerWrapper(fn: (c: Component<any, any>) => void): (c: Component<any, any>) => void {
  return function _debugUpdateHandlerWrapper(c) {
    try {
      fn(c);
    } catch (e) {
      console.error(`Failed to update component: ${e.toString()}. Component:`, c);
    }
  };
}
