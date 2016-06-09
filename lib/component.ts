import {printError} from "./debug";
import {SvgNamespace, ComponentDescriptorFlags, ComponentFlags, VNodeFlags, SchedulerFlags, RenderFlags,
  matchesWithAncestors, SelectorFn} from "./misc";
import {VModel} from "./vmodel";
import {VNode, vNodeAttach, vNodeDetach, vNodeDispose, createVRoot} from "./vnode";
import {InvalidatorSubscription, Invalidator} from "./invalidator";
import {scheduler, schedulerUpdateComponent, schedulerComponentVSync} from "./scheduler";

/**
 * Component Descriptor registry used in DEBUG mode.
 */
export const ComponentDescriptorRegistry = ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") ?
  new Map<string, ComponentDescriptor<any, any>>() :
  undefined;

/**
 * Back reference to Component.
 */
export interface XTagElement<P, S> extends Element {
  /**
   * Back reference from Element to Component that is always present in DEBUG mode.
   */
  dxtag?: Component<P, S>;
  /**
   * Back reference from Element to Component. There are two references so we can check in DEBUG mode if we are missing
   * this backref in delegated event handlers.
   */
  xtag?: Component<P, S>;
}

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
 *       .createState((c, props) => new State(props))
 *       .update((c, props, state) => {
 *         const ctx = c.get2DContext();
 *         ctx.fillStyle = 'rgba(0, 0, 0, 1)';
 *         ctx.fillRect(props, props, state.xy, state.xy);
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
  _tag: string | VModel<any>;
  /**
   * New props received handler overrides default props received behavior and it should mark component as dirty if new
   * received props will cause change in component's representation.
   */
  _newPropsReceived: ((component: Component<P, S>, oldProps: P, newProps: P) => void) | null;
  /**
   * Lifecycle handler update.
   */
  _update: ((component: Component<P, S>, props: P, state: S) => void) | null;
  /**
   * Lifecycle handler createState should create a new state.
   */
  _createState: ((component: Component<P, S>, props: P) => S) | null;
  /**
   * Lifecycle handler init.
   */
  _init: ((component: Component<P, S>, props: P, state: S) => void) | null;
  /**
   * Lifecycle handler attached.
   */
  _attached: ((component: Component<P, S>, props: P, state: S) => void) | null;
  /**
   * Lifecycle handler detached.
   */
  _detached: ((component: Component<P, S>, props: P, state: S) => void) | null;
  /**
   * Lifecycle hdnaler disposed.
   */
  _disposed: ((component: Component<P, S>, props: P, state: S) => void) | null;

  /**
   * Pool of recycled components.
   */
  _recycledPool: Component<P, S>[] | null;
  /**
   * Maximum number of recycled components (recycled pool size).
   */
  _maxRecycled: number;
  /**
   * Name that is used in DEBUG mode.
   */
  name: string;

  constructor(name?: string) {
    this._markFlags = ComponentFlags.Dirty;
    this._flags = 0;
    this._tag = "div";
    this._newPropsReceived = null;
    this._update = null;
    this._createState = null;
    this._init = null;
    this._attached = null;
    this._detached = null;
    this._disposed = null;
    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      if (name === undefined) {
        this.name = "unnamed";
      } else {
        this.name = name;
        if (ComponentDescriptorRegistry!.has(name)) {
          printError(`Component with name ${name} is already registered in ComponentDescriptorRegistry.`);
        } else {
          ComponentDescriptorRegistry!.set(name, this);
        }
      }
    }
    if ("<@KIVI_COMPONENT_RECYCLING@>" === "COMPONENT_RECYCLING_ENABLED") {
      this._recycledPool = null;
      this._maxRecycled = 0;
    }
  }

  /**
   * Set tag name for the root element.
   *
   *     const MyComponent = new ComponentDescriptor()
   *       .tagName("table");
   */
  tagName(tagName: string): ComponentDescriptor<P, S> {
    this._tag = tagName;
    return this;
  }

  /**
   * Use SVG Namespace to create a root element.
   *
   *     const MySvgComponent = new ComponentDescriptor()
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
   *     const MyComponent = new ComponentDescriptor()
   *       .vModel(new VModel("div").attrs({"id": "model"}))
   *       .update((c) => { c.vSync(c.createVRoot().children("content")); });
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
   *     const MyCanvasComponent = new ComponentDescriptor()
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
   * Set lifecycle handler createState.
   *
   * Create state handler should return a new state. It is invoked immediately after component instantiation.
   *
   *     const MyComponent = new ComponentDescriptor<number, number>()
   *       .createState((c, props) => props * props)
   *       .update((c, props, state) => {
   *         c.vSync(c.createVRoot().children(state.toString()));
   *       });
   */
  createState(createState: (component: Component<P, S>, props: P) => S): ComponentDescriptor<P, S> {
    this._createState = createState;
    return this;
  }

  /**
   * Set lifecycle handler init.
   *
   * `element` and `props` properties will be initialized before init handler is invoked.
   *
   *     const MyComponent = new ComponentDescriptor()
   *       .tagName("button")
   *       .init((c) => {
   *         c.element.addEventListener("click", (e) => {
   *           e.preventDefault();
   *           e.stopPropagation();
   *           console.log("clicked");
   *         });
   *       })
   *       .update((c) => {
   *         c.vSync(c.createVRoot().children("click me"));
   *       });
   */
  init(init: (component: Component<P, S>, props: P, state: S) => void): ComponentDescriptor<P, S> {
    this._init = init;
    return this;
  }

  /**
   * Set newPropsReceived handler.
   *
   * New props received handler overrides default props received behavior and it should mark component as dirty if new
   * received props will cause change in component's representation.
   *
   *     const MyComponent = new ComponentDescriptor<{a: number}, void>()
   *       .newPropsReceived((c, oldProps, newProps) => {
   *         if (oldProps.a !== newProps.a) {
   *           c.markDirty();
   *         }
   *       })
   *       .update((c, props) => {
   *         c.vSync(c.createVRoot().children(c.props.toString()));
   *       });
   */
  newPropsReceived(newPropsReceived: (component: Component<P, S>, oldProps: P, newProps: P) => void):
      ComponentDescriptor<P, S> {
    this._newPropsReceived = newPropsReceived;
    return this;
  }

  /**
   * Set lifecycle handler update.
   *
   * Update handler overrides default update behavior.
   *
   *     const MyComponent = new ComponentDescriptor<{a: number}, void>()
   *       .update((c) => {
   *         c.vSync(c.createVRoot().children("content"));
   *       });
   */
  update(update: (component: Component<P, S>, props: P, state: S) => void): ComponentDescriptor<P, S> {
    this._update = update;
    return this;
  }

  /**
   * Set lifecycle handler attached.
   *
   * Attached handler will be invoked when component is attached to the document.
   *
   *     const onChange = new Invalidator();
   *
   *     const MyComponent = new ComponentDescriptor()
   *       .attached((c) => {
   *         c.subscribe(onChange);
   *       })
   *       .update((c) => {
   *         c.vSync(c.createVRoot().children("content"));
   *       });
   */
  attached(attached: (component: Component<P, S>, props: P, state: S) => void):
      ComponentDescriptor<P, S> {
    this._attached = attached;
    return this;
  }

  /**
   * Set lifecycle handler detached.
   *
   * Detached handler will be invoked when component is detached from the document.
   *
   *     const MyComponent = new ComponentDescriptor<any, {onResize: (e: Event) => void}>()
   *       .createState((c) => ({onResize: (e) => { console.log("window resized"); }})
   *       .attached((c, props, state) => {
   *         window.addEventListener("resize", state.onResize);
   *       })
   *       .detached((c, props, state) => {
   *         window.removeEventListener(state.onResize);
   *       })
   *       .update((c) => {
   *         c.vSync(c.createVRoot().children("content"));
   *       });
   */
  detached(detached: (component: Component<P, S>, props: P, state: S) => void):
      ComponentDescriptor<P, S> {
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
   *     const MyComponent = new ComponentDescriptor()
   *       .init((c) => {
   *         allocatedComponents++;
   *       })
   *       .disposed((c) => {
   *         allocatedComponents--;
   *       })
   *       .update((c) => {
   *         c.vSync(c.createVRoot().children("content"));
   *       });
   */
  disposed(disposed: (component: Component<P, S>, props: P, state: S) => void):
      ComponentDescriptor<P, S> {
    this._disposed = disposed;
    return this;
  }

  /**
   * Enable back reference from DOM element to component instance.
   *
   * Back reference will be assigned to `xtag` property.
   *
   *     const MyComponent = new ComponentDescriptor()
   *       .enableBackRef()
   *       .init((c) => {
   *         c.element.addEventListener("click", (e) => {
   *           console.log(getBackRef<Component>(e.target) === c);
   *         });
   *       })
   *       .update((c) => {
   *         c.vSync(c.createVRoot().children("content"));
   *       });
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
   *     const MyComponent = new ComponentDescriptor()
   *       .enableRecycling(100)
   *       .update((c) => {
   *         c.vSync(c.createVRoot().children("content"));
   *       });
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
   * Component has immutable props.
   */
  immutableProps(): ComponentDescriptor<P, S> {
    this._markFlags |= ComponentFlags.ImmutableProps;
    return this;
  }

  /**
   * Create a Virtual DOM node.
   *
   *     const MyComponent = new ComponentDescriptor<number, void>()
   *       .update((c, props) => {
   *         c.vSync(c.createVRoot().children(props.toString()));
   *       });
   *
   *     const vnode = MyComponent.createVNode(10);
   */
  createVNode(props?: P): VNode {
    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      if ((this._markFlags & ComponentFlags.ImmutableProps) !== 0) {
        throw new Error("Failed to create VNode: VNodes for components with immutable props should be created with " +
                        "createImmutableVNode method.");
      }
    }
    return new VNode(VNodeFlags.Component, this, props === undefined ? null : props);
  }

  /**
   * Create a Virtual DOM node with immutable props.
   *
   *     const MyComponent = new ComponentDescriptor<number, void>()
   *       .update((c, props) => {
   *         c.vSync(c.createVRoot().children(props.toString()));
   *       });
   *
   *     const vnode = MyComponent.createImmutableVNode(10);
   */
  createImmutableVNode(props?: P): VNode {
    return new VNode(VNodeFlags.Component | VNodeFlags.ImmutableProps, this, props === undefined ? null : props);
  }

  /**
   * Creates a component instance without parent.
   *
   *     const MyComponent = new ComponentDescriptor<number, void>()
   *       .update((c, props) => {
   *         c.vSync(c.createVRoot().children(props.toString()));
   *       });
   *
   *     const component = MyComponent.createRootComponent(10);
   */
  createRootComponent(props?: P): Component<P, S> {
    return this.createComponent(undefined, props);
  }

  /**
   * Create a Component.
   *
   *     const ChildComponent = new ComponentDescriptor()
   *       .update((c) => {
   *         c.vSync(c.createVRoot().children("child"));
   *       });
   *
   *     const ParentComponent = new ComponentDescriptor()
   *       .init((c) => {
   *         const child = ChildComponent.createComponent(c);
   *         c.element.appendChild(child.element);
   *         child.attached();
   *         child.update();
   *       });
   *
   *     const rootComponent = MyComponent.createRootComponent();
   */
  createComponent(parent: Component<any, any> | undefined, props?: P): Component<P, S> {
    let element: Element;
    let component: Component<P, S>;

    if ("<@KIVI_COMPONENT_RECYCLING@>" !== "COMPONENT_RECYCLING_ENABLED" ||
        ((this._flags & ComponentDescriptorFlags.EnabledRecycling) === 0) ||
        (this._recycledPool!.length === 0)) {

      if ((this._flags & ComponentDescriptorFlags.VModel) === 0) {
        element = ((this._flags & ComponentDescriptorFlags.Svg) === 0) ?
            document.createElement(this._tag as string) :
            document.createElementNS(SvgNamespace, this._tag as string);
      } else {
        element = (this._tag as VModel<any>).createElement();
      }

      component = new Component<P, S>(this._markFlags, this, element, parent, props);
      if ((this._flags & ComponentDescriptorFlags.EnabledBackRef) !== 0) {
        (element as XTagElement<P, S>).xtag = component;
      }
      if (this._createState !== null) {
        component.state = this._createState(component, component.props!);
      }
      if (this._init !== null) {
        this._init(component, component.props!, component.state!);
      }
    } else {
      component = this._recycledPool!.pop()!;
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
   *       .update((c) => {
   *         c.vSync(c.createVRoot.children([createVElement("span").children("content")]));
   *       });
   *
   *     const component = MyComponent.mountComponent(element);
   *     component.update();
   */
  mountComponent(element: Element, parent?: Component<any, any>, props?: P): Component<P, S> {
    const component = new Component<P, S>(this._markFlags , this, element, parent, props);
    if (this._createState !== null) {
      component.state = this._createState(component, component.props!);
    }
    if (this._init !== null) {
      this._init(component, component.props!, component.state!);
    }
    componentAttached(component);
    return component;
  }

  /**
   * Create event handler.
   */
  createEventHandler(handler: (event: Event, component: Component<P, S>, props: P, state: S) => void):
      (event: Event) => void {
    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      if ((this._flags & ComponentDescriptorFlags.EnabledBackRef) === 0) {
        throw new Error("Failed to create an event handler: component descriptor should have enabled back reference.");
      }
    }
    return function(event) {
      const component = (event.currentTarget as XTagElement<P, S>).xtag;
      if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
        if (component === undefined) {
          throw new Error(`Failed to dispatch event to event handler: event currentTarget doesn't have back ` +
                          `reference to component.`);
        }
      }
      handler(event, component!, component!.props!, component!.state!);
    };
  }

  /**
   * Create delegated event handler.
   */
  createDelegatedEventHandler(selector: string | SelectorFn, componentSelector: string | SelectorFn | boolean,
      handler: (event: Event, component: Component<P, S>, props: P, state: S, matchingTarget: Element) => void):
      (event: Event) => void {
    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      if ((this._flags & ComponentDescriptorFlags.EnabledBackRef) === 0) {
        throw new Error("Failed to create an event handler: component descriptor should have enabled back reference.");
      }
    }
    return function(event) {
      let matchingTarget = matchesWithAncestors(event.target as Element, selector, event.currentTarget as Element);
      if (matchingTarget !== null) {
        let target: Element | null = matchingTarget;
        if (typeof componentSelector === "boolean") {
          if (!componentSelector) {
            target = event.currentTarget as Element;
          }
        } else {
          target = matchesWithAncestors(matchingTarget, componentSelector, event.currentTarget as Element);
          if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
            if ((this._flags & ComponentDescriptorFlags.EnabledBackRef) === 0) {
              throw new Error(`Failed to dispatch event to event handler: cannot find closest component with ` +
                              `selector "${componentSelector}".`);
            }
          }
        }
        const component = (target as XTagElement<P, S>).xtag;
        if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
          if (component === undefined) {
            throw new Error(`Failed to dispatch event to event handler: event component target doesn't have back ` +
                            `reference to component.`);
          }
        }
        handler(event, component!, component!.props!, component!.state!, matchingTarget);
      }
    };
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
   * Lowest 24 bits are reserved for kivi flags, other bits can be used for user flags.
   */
  flags: number;
  /**
   * Timestamp when component were updated last time, using scheduler monotonically increasing clock.
   */
  mtime: number;
  /**
   * Component descriptor.
   */
  readonly descriptor: ComponentDescriptor<P, S>;
  /**
   * Reference to the root element.
   */
  element: XTagElement<P, S>;
  /**
   * Depth in the components tree.
   *
   * Depth property is used by scheduler to determine its priority when updating components.
   */
  depth: number;
  /**
   * Component's props.
   */
  props: P | null;
  /**
   * Component's state.
   */
  state: S | null;
  /**
   * Root node can contain a virtual dom root if Component represents a DOM subtree, or Canvas context if Component is
   * a Canvas object.
   */
  _root: VNode | CanvasRenderingContext2D | null;

  _subscriptions: InvalidatorSubscription | null;
  _transientSubscriptions: InvalidatorSubscription | null;

  constructor(flags: number, descriptor: ComponentDescriptor<P, S>, element: Element, parent?: Component<any, any>,
      props?: P) {
    this.flags = flags;
    this.mtime = 0;
    this.descriptor = descriptor;
    this.element = element as XTagElement<P, S>;
    this.depth = parent === undefined ? 0 : parent.depth + 1;
    this.props = props === undefined ? null : props;
    this.state = null;
    this._root = ((flags & ComponentFlags.Canvas2D) === 0) ? null : (element as HTMLCanvasElement).getContext("2d");
    this._subscriptions = null;
    this._transientSubscriptions = null;

    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      this.element.dxtag = this;
    }
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
    return this._root as CanvasRenderingContext2D;
  }

  /**
   * Mark component as dirty and cancel all transient subscriptions.
   */
  markDirty(): void {
    if ((this.flags & ComponentFlags.Dirty) === 0) {
      this.flags |= ComponentFlags.Dirty;
      componentCancelTransientSubscriptions(this);
    }
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
   * If this method is called during mounting phase, then Virtual DOM will be mounted on top of the existing document
   * tree.
   */
  vSync(newRoot: VNode): void {
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

    schedulerComponentVSync(scheduler, this, this._root as VNode, newRoot, 0);
  }

  /**
   * Sync internal representation using Virtual DOM API with custom render options.
   *
   * If this method is called during mounting phase, then Virtual DOM will be mounted on top of the existing document
   * tree.
   */
  vSyncAdvanced(renderFlags: RenderFlags, newRoot: VNode): void {
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

    schedulerComponentVSync(scheduler, this, this._root as VNode, newRoot, renderFlags);
  }

  /**
   * Invalidate component and schedule component to update on the next frame.
   *
   * Dirty flags parameter can be used to add hints that describe what has been changed.
   * This metho will automatically cancel all transient subscriptions if preserve transient subscriptions is false.
   */
  invalidate(dirtyFlags: number = ComponentFlags.DirtyView, preserveTransientSubscriptions = false): void {
    this.flags |= dirtyFlags;
    if ((this.flags & (ComponentFlags.Dirty | ComponentFlags.Disposed)) === 0) {
      this.flags |= ComponentFlags.Dirty;
      if (!preserveTransientSubscriptions) {
        componentCancelTransientSubscriptions(this);
      }
      scheduler.nextFrame().updateComponent(this);
    }
  }

  /**
   * Attach method should be invoked when component is attached to the document.
   */
  attach(): void {
    componentAttached(this);
    if (this._root !== null && ((this.flags & ComponentFlags.Canvas2D) === 0)) {
      vNodeAttach(this._root as VNode);
    }
  }

  /**
   * Detach method should be invoked when component is detached from the document.
   */
  detach(): void {
    if (this._root !== null && ((this.flags & ComponentFlags.Canvas2D) === 0)) {
      vNodeDetach(this._root as VNode);
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
        (this.descriptor._recycledPool!.length >= this.descriptor._maxRecycled)) {
      this.flags |= ComponentFlags.Disposed;

      if (this._root !== null && ((this.flags & ComponentFlags.Canvas2D) === 0)) {
        vNodeDispose(this._root as VNode);
      }

      if ((this.flags & ComponentFlags.Attached) !== 0) {
        componentDetached(this);
      }
      const disposed = this.descriptor._disposed;
      if (disposed !== null) {
        disposed(this, this.props!, this.state!);
      }
    } else {
      this.detach();
      this.descriptor._recycledPool!.push(this);
    }
  }

  /**
   * Subscribe to invalidator object.
   */
  subscribe(invalidator: Invalidator): InvalidatorSubscription {
    return invalidator.subscribeComponent(this);
  }

  /**
   * Transiently subscribe to invalidator object.
   *
   * Each time component is invalidated, all transient subscriptions will be canceled.
   */
  transientSubscribe(invalidator: Invalidator): InvalidatorSubscription {
    return invalidator.transientSubscribeComponent(this);
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
    attached(component, component.props, component.state);
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
    detached(component, component.props, component.state);
  }
}

/**
 * Cancel subscriptions.
 */
export function componentCancelSubscriptions(component: Component<any, any>): void {
  let subscription = component._subscriptions;
  while (subscription !== null) {
    subscription._cancel();
    subscription = subscription._componentNext;
  }
  component._subscriptions = null;
}

/**
 * Cancel transient subscriptions.
 */
export function componentCancelTransientSubscriptions(component: Component<any, any>): void {
  let subscription = component._transientSubscriptions;
  while (subscription !== null) {
    subscription._cancel();
    subscription = subscription._componentNext;
  }
  component._transientSubscriptions = null;
}

/**
 * Inject component into DOM.
 */
export function injectComponent<P, S>(descriptor: ComponentDescriptor<P, S>, container: Element, props?: P,
    sync?: boolean): Component<P, S> {
  const c = descriptor.createComponent(undefined, props);
  if (sync) {
    container.appendChild(c.element as Node);
    componentAttached(c);
    schedulerUpdateComponent(scheduler, c);
  } else {
    scheduler.nextFrame().write(function() {
      container.appendChild(c.element as Node);
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
