import {printError} from "./debug";
import {SvgNamespace, ComponentDescriptorFlags, ComponentFlags, VNodeFlags, matchesWithAncestors} from "./misc";
import {ElementDescriptor} from "./element_descriptor";
import {VNode, vNodeAttach, vNodeDetach, vNodeMount, vNodeRender, vNodeDispose, syncVNodes} from "./vnode";
import {InvalidatorSubscription, Invalidator} from "./invalidator";
import {clock, nextFrame, startUpdateComponentEachFrame, startMounting, finishMounting, isMounting} from "./scheduler";

/**
 * Component Descriptor registry is used in DEBUG mode for developer tools.
 *
 * All ComponentDescriptor instances that have a `name` property will be registered in this registry.
 *
 * NOTE: It will be automatically removed in RELEASE mode, so there is no overhead.
 */
export const ComponentDescriptorRegistry = ("<@KIVI_DEBUG@>" as string !== "DEBUG_DISABLED") ?
  new Map<string, ComponentDescriptor<any, any>>() :
  undefined;

/**
 * Component's root element.
 *
 * When back reference is enabled in Component Descriptor, element will have `kiviComponent` property with a reference
 * to Component instance.
 *
 * In DEBUG mode all elements have `kiviDebugComponent` reference to Component instance.
 */
export interface ComponentRootElement<P, S> extends Element {
  /**
   * Back reference from an Element to Component that is always present in DEBUG mode.
   */
  kiviDebugComponent?: Component<P, S>;
  /**
   * Back reference from an Element to Component. There are two references so we can check in DEBUG mode if we are
   * missing this back reference in delegated event handlers.
   */
  kiviComponent?: Component<P, S>;
}

/**
 * Delegated Event Controller.
 */
export class DelegatedEventController {
  private _stop: boolean;

  constructor() {
    this._stop = false;
  }

  stop(): void {
    this._stop = true;
  }

  isStopped(): boolean {
    return this._stop;
  }
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
 *       .init((c) => {
 *         c.state = new State(props);
 *       })
 *       .update((c, props, state) => {
 *         const ctx = c.get2DContext();
 *         ctx.fillStyle = 'rgba(0, 0, 0, 1)';
 *         ctx.fillRect(props, props, state.xy, state.xy);
 *       });
 *
 *       const componentInstance = MyComponent.createRootComponent(10);
 *
 * NOTE: It may seem unnecessary to pass `props` and `state` to lifecycle methods, but it is implemented this way
 * to slightly improve "cold" rendering. This functions won't be optimized by JIT compiler until they have enough
 * information about types, so instead of performing two generic lookups on component objects, we are taking references
 * in "hot" functions and passing them as parameters.
 *
 * @final
 */
export class ComponentDescriptor<P, S> {
  /**
   * Flags marked on component when component is instantiated. See `ComponentFlags` for details.
   */
  _markFlags: number;
  /**
   * Flags marked on component root vnode when vnode is instantiated. See `VNodeFlags` for details.
   */
  _markRootFlags: number;
  /**
   * Flags, see `ComponentDescriptorFlags` for details.
   */
  _flags: number;
  /**
   * Tag name of the root element or reference to an ElementDescriptor.
   */
  _tag: string | ElementDescriptor<any>;
  /**
   * New props received handler overrides default props received behavior. If new props will cause a change in
   * component's representation, it should mark component as dirty with `markDirty` method.
   */
  _newPropsReceived: ((component: Component<P, S>, oldProps: P, newProps: P) => void) | null;
  /**
   * Lifecycle handler update.
   *
   * Update will be invoked when component is created and when it gets invalidated.
   */
  _update: ((component: Component<P, S>, props: P, state: S) => void) | null;
  /**
   * Lifecycle handler init.
   *
   * Initialize Component, if component has internal state, it should be created in this lifecycle method. Internal
   * event handlers should begistereed in this lifecycle method.
   */
  _init: ((component: Component<P, S>, props: P) => void) | null;
  /**
   * Lifecycle handler attached is invoked when Component is attached to the document.
   *
   * All subscriptions should be created in this lifecycle method.
   */
  _attached: ((component: Component<P, S>, props: P, state: S) => void) | null;
  /**
   * Lifecycle handler detached is invoked when Component is detached from the document.
   *
   * When component is detached, all invalidation subscriptions are automatically canceled.
   */
  _detached: ((component: Component<P, S>, props: P, state: S) => void) | null;
  /**
   * Lifecycle handler disposed.
   *
   * Disposed method is invoked when component is completely destroyed and noone will access it anymore.
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
   *
   * NOTE: It will be automatically removed in RELEASE builds, so there is no overhead.
   */
  name: string;

  constructor(name?: string) {
    this._markFlags = ComponentFlags.Dirty;
    this._markRootFlags = VNodeFlags.Root;
    this._flags = 0;
    this._tag = "div";
    this._newPropsReceived = null;
    this._update = null;
    this._init = null;
    this._attached = null;
    this._detached = null;
    this._disposed = null;
    if ("<@KIVI_DEBUG@>" as string !== "DEBUG_DISABLED") {
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
    if ("<@KIVI_COMPONENT_RECYCLING@>" as string === "COMPONENT_RECYCLING_ENABLED") {
      this._recycledPool = null;
      this._maxRecycled = 0;
    }
  }

  /**
   * Set tag name or an Element Descriptor for a root element.
   *
   *     const MyComponent = new ComponentDescriptor()
   *       .tagName("table");
   */
  tagName(tagName: string | ElementDescriptor<any>): ComponentDescriptor<P, S> {
    this._tag = tagName;
    if (typeof tagName !== "string") {
      this._markFlags |= tagName._markFlags;
      this._markRootFlags |= tagName._markFlags;
      this._flags |= tagName._markFlags;
    }
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
    this._markRootFlags |= VNodeFlags.Svg;
    this._flags |= ComponentDescriptorFlags.Svg;
    return this;
  }

  /**
   * Turn component into a canvas object.
   *
   * Tag name of a root element will be automatically set to `canvas`.
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
   * Set init lifecycle handler.
   *
   * Initialize Component, if component has internal state, it should be created in this lifecycle method. Internal
   * event handlers should begistereed in this lifecycle method.
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
   *         c.sync(c.createVRoot().children("click me"));
   *       });
   */
  init(init: (component: Component<P, S>, props: P) => void): ComponentDescriptor<P, S> {
    this._init = init;
    return this;
  }

  /**
   * Set newPropsReceived handler.
   *
   * New props received handler overrides default props received behavior. If new props will cause a change in
   * component's representation, it should mark component as dirty with `markDirty` method.
   *
   *     const MyComponent = new ComponentDescriptor<{a: number}, void>()
   *       .newPropsReceived((c, oldProps, newProps) => {
   *         if (oldProps.a !== newProps.a) {
   *           c.markDirty();
   *         }
   *       })
   *       .update((c, props) => {
   *         c.sync(c.createVRoot().children(c.props.toString()));
   *       });
   */
  newPropsReceived(newPropsReceived: (component: Component<P, S>, oldProps: P, newProps: P) => void):
      ComponentDescriptor<P, S> {
    this._newPropsReceived = newPropsReceived;
    return this;
  }

  /**
   * Set update lifecycle handler.
   *
   * Update will be invoked when component is created and when it gets invalidated.
   *
   *     const MyComponent = new ComponentDescriptor<{a: number}, void>()
   *       .update((c) => {
   *         c.sync(c.createVRoot().children("content"));
   *       });
   */
  update(update: (component: Component<P, S>, props: P, state: S) => void): ComponentDescriptor<P, S> {
    this._update = update;
    return this;
  }

  /**
   * Set attached lifecycle handler.
   *
   * Attached handler is invoked when Component is attached to the document.
   *
   * All subscriptions should be created in this lifecycle method.
   *
   *     const onChange = new Invalidator();
   *
   *     const MyComponent = new ComponentDescriptor()
   *       .attached((c) => {
   *         c.subscribe(onChange);
   *       })
   *       .update((c) => {
   *         c.sync(c.createVRoot().children("content"));
   *       });
   */
  attached(attached: (component: Component<P, S>, props: P, state: S) => void):
      ComponentDescriptor<P, S> {
    this._attached = attached;
    return this;
  }

  /**
   * Lifecycle detached lifecycle handler.
   *
   * Detached handler is invoked when Component is detached from the document.
   *
   * When component is detached, all invalidation subscriptions are automatically canceled.
   *
   *     const MyComponent = new ComponentDescriptor<any, {onResize: (e: Event) => void}>()
   *       .init((c) => {
   *         c.state = {onResize: (e) => { console.log("window resized"); }};
   *       })
   *       .attached((c, props, state) => {
   *         window.addEventListener("resize", state.onResize);
   *       })
   *       .detached((c, props, state) => {
   *         window.removeEventListener(state.onResize);
   *       })
   *       .update((c) => {
   *         c.sync(c.createVRoot().children("content"));
   *       });
   */
  detached(detached: (component: Component<P, S>, props: P, state: S) => void):
      ComponentDescriptor<P, S> {
    this._detached = detached;
    return this;
  }

  /**
   * Set disposed lifecycle handler.
   *
   * Disposed handler is invoked when component is completely destroyed and noone will access it anymore.
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
   *         c.sync(c.createVRoot().children("content"));
   *       });
   */
  disposed(disposed: (component: Component<P, S>, props: P, state: S) => void):
      ComponentDescriptor<P, S> {
    this._disposed = disposed;
    return this;
  }

  /**
   * Enable back reference from root element to component instance. Back references are used to find component instances
   * in delegated event handlers.
   *
   * Back reference will be assigned to `kiviComponent` property.
   *
   *     const MyComponent = new ComponentDescriptor()
   *       .enableBackRef()
   *       .init((c) => {
   *         c.element.addEventListener("click", (e) => {
   *           console.log(getBackRef<Component>(e.target) === c);
   *         });
   *       })
   *       .update((c) => {
   *         c.sync(c.createVRoot().children("content"));
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
   * Component recycling is disabled by default and should be enabled by replacing all `<@KIVI_COMPONENT_RECYCLING@>`
   * with `COMPONENT_RECYCLING_ENABLED` strings.
   *
   *     const MyComponent = new ComponentDescriptor()
   *       .enableRecycling(100)
   *       .update((c) => {
   *         c.sync(c.createVRoot().children("content"));
   *       });
   */
  enableRecycling(maxRecycled: number): ComponentDescriptor<P, S> {
    if ("<@KIVI_COMPONENT_RECYCLING@>" as string === "COMPONENT_RECYCLING_ENABLED") {
      this._markFlags |= ComponentFlags.EnabledRecycling;
      this._flags |= ComponentDescriptorFlags.EnabledRecycling;
      this._recycledPool = [];
      this._maxRecycled = maxRecycled;
    }
    return this;
  }

  /**
   * Component has immutable props.
   *
   * When Component has accepts only immutable props, it will always check them for identity before marking component
   * as dirty.
   */
  immutableProps(): ComponentDescriptor<P, S> {
    this._markFlags |= ComponentFlags.ImmutableProps;
    return this;
  }

  /**
   * Create a Virtual DOM node representing component.
   *
   *     const MyComponent = new ComponentDescriptor<number, void>()
   *       .update((c, props) => {
   *         c.sync(c.createVRoot().children(props.toString()));
   *       });
   *
   *     const vnode = MyComponent.createVNode(10);
   */
  createVNode(props?: P): VNode {
    if ("<@KIVI_DEBUG@>" as string !== "DEBUG_DISABLED") {
      if ((this._markFlags & ComponentFlags.ImmutableProps) !== 0) {
        throw new Error("Failed to create VNode: VNodes for components with immutable props should be created with " +
                        "createImmutableVNode method.");
      }
    }
    return new VNode(VNodeFlags.Component, this, props === undefined ? null : props);
  }

  /**
   * Create a Virtual DOM node with immutable props representing component.
   *
   * Immutable props will be checked for identity before triggering an update, if props identity is the same, then
   * component won't be marked as dirty.
   *
   *     const MyComponent = new ComponentDescriptor<number, void>()
   *       .update((c, props) => {
   *         c.sync(c.createVRoot().children(props.toString()));
   *       });
   *
   *     const vnode = MyComponent.createImmutableVNode(10);
   */
  createImmutableVNode(props?: P): VNode {
    return new VNode(VNodeFlags.Component | VNodeFlags.ImmutableProps, this, props === undefined ? null : props);
  }

  /**
   * Creates a root component instance that doesn't have any parents.
   *
   *     const MyComponent = new ComponentDescriptor<number, void>()
   *       .update((c, props) => {
   *         c.sync(c.createVRoot().children(props.toString()));
   *       });
   *
   *     const component = MyComponent.createRootComponent(10);
   */
  createRootComponent(props?: P): Component<P, S> {
    return this.createComponent(undefined, props);
  }

  /**
   * Create a component.
   *
   *     const ChildComponent = new ComponentDescriptor()
   *       .update((c) => {
   *         c.sync(c.createVRoot().children("child"));
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

    if ("<@KIVI_COMPONENT_RECYCLING@>" as string !== "COMPONENT_RECYCLING_ENABLED" ||
        ((this._flags & ComponentDescriptorFlags.EnabledRecycling) === 0) ||
        (this._recycledPool!.length === 0)) {

      if ((this._flags & ComponentDescriptorFlags.ElementDescriptor) === 0) {
        element = ((this._flags & ComponentDescriptorFlags.Svg) === 0) ?
            document.createElement(this._tag as string) :
            document.createElementNS(SvgNamespace, this._tag as string);
      } else {
        element = (this._tag as ElementDescriptor<any>).createElement();
      }

      component = new Component<P, S>(this._markFlags, this, element, parent, props);
      if ((this._flags & ComponentDescriptorFlags.EnabledBackRef) !== 0) {
        (element as ComponentRootElement<P, S>).kiviComponent = component;
      }
      if (this._init !== null) {
        this._init(component, component.props!);
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
   *         c.sync(c.createVRoot.children([createVElement("span").children("content")]));
   *       });
   *
   *     const component = MyComponent.mountComponent(element);
   *     component.update();
   */
  mountComponent(element: Element, parent?: Component<any, any>, props?: P): Component<P, S> {
    const component = new Component<P, S>(this._markFlags , this, element, parent, props);
    if (this._init !== null) {
      this._init(component, component.props!);
    }
    componentAttached(component);
    return component;
  }

  /**
   * Create event handler.
   */
  createEventHandler<E extends Event>(handler: (event: E, component: Component<P, S>, props: P, state: S) => void):
      (event: E) => void {
    this._flags |= ComponentDescriptorFlags.EnabledBackRef;
    return function(event) {
      const component = (event.currentTarget as ComponentRootElement<P, S>).kiviComponent;
      if ("<@KIVI_DEBUG@>" as string !== "DEBUG_DISABLED") {
        if (component === undefined) {
          throw new Error(`Failed to dispatch event to event handler: cannot find reference to component on a DOM` +
                          `element.`);
        }
      }
      handler(event, component!, component!.props!, component!.state!);
    };
  }

  /**
   * Create delegated event handler.
   *
   * `selector` selector that should match an event `target` with its ancestors.
   * `componentSelector` selector that should match component instance. If it is `false`, then it will look for
   * component instance in an event `currentTarget`.
   */
  createDelegatedEventHandler<E extends Event>(selector: string, componentSelector: string | boolean,
      handler: (event: E, component: Component<P, S>, props: P, state: S, matchingTarget: Element,
      controller?: DelegatedEventController) => void):
      (event: E, controller?: DelegatedEventController) => void {
    this._flags |= ComponentDescriptorFlags.EnabledBackRef;
    return function(event, controller) {
      if (controller === undefined || !controller.isStopped()) {
        let matchingTarget = matchesWithAncestors(event.target as Element, selector, event.currentTarget as Element);
        if (matchingTarget !== null) {
          let target: Element | null = matchingTarget;
          if (typeof componentSelector === "boolean") {
            if (!componentSelector) {
              target = event.currentTarget as Element;
            }
          } else {
            target = matchesWithAncestors(matchingTarget, componentSelector, event.currentTarget as Element);
          }
          const component = (target as ComponentRootElement<P, S>).kiviComponent;
          if ("<@KIVI_DEBUG@>" as string !== "DEBUG_DISABLED") {
            if (component === undefined) {
              throw new Error(`Failed to dispatch event to event handler: cannot find reference to component on a DOM` +
                `element.`);
            }
          }
          handler(event, component!, component!.props!, component!.state!, matchingTarget, controller);
        }
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
  readonly element: ComponentRootElement<P, S>;
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
    this.element = element as ComponentRootElement<P, S>;
    this.depth = parent === undefined ? 0 : parent.depth + 1;
    this.props = props === undefined ? null : props;
    this.state = null;
    this._root = ((flags & ComponentFlags.Canvas2D) === 0) ? null : (element as HTMLCanvasElement).getContext("2d");
    this._subscriptions = null;
    this._transientSubscriptions = null;

    if ("<@KIVI_DEBUG@>" as string !== "DEBUG_DISABLED") {
      this.element.kiviDebugComponent = this;
    }
  }

  /**
   * Get canvas 2d rendering context.
   */
  get2DContext(): CanvasRenderingContext2D {
    if ("<@KIVI_DEBUG@>" as string !== "DEBUG_DISABLED") {
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
    return new VNode(this.descriptor._markRootFlags, this.descriptor._tag, null);
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
      startUpdateComponentEachFrame(this);
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
    updateComponent(this, newProps);
  }

  /**
   * Sync internal representation using Virtual DOM API.
   *
   * If this method is called during mounting phase, then Virtual DOM will be mounted on top of the existing document
   * tree.
   *
   * When virtual dom is passed to sync method, its ownership is transfered. Mutating and reading from virtual dom
   * after it is passed to sync is an undefined behavior.
   */
  sync(newRoot: VNode): void {
    if ("<@KIVI_DEBUG@>" as string !== "DEBUG_DISABLED") {
      if ((newRoot._flags & VNodeFlags.Root) === 0) {
        throw new Error("Failed to sync: sync methods accepts only VNodes representing root node.");
      }
      if ((this.flags & ComponentFlags.ElementDescriptor) !== (newRoot._flags & VNodeFlags.ElementDescriptor)) {
        if ((this.flags & ComponentFlags.ElementDescriptor) === 0) {
          throw new Error("Failed to sync: vdom root should have the same type as root registered in component " +
                          "descriptor, component descriptor is using ElementDescriptor.");
        } else {
          throw new Error("Failed to sync: vdom root should have the same type as root registered in component " +
                          "descriptor, component descriptor is using a simple element.");
        }
      }
    }

    if (this._root === null) {
      newRoot.cref = this;
      if ("<@KIVI_MOUNTING@>" as string === "MOUNTING_ENABLED" && isMounting()) {
        vNodeMount(newRoot, this.element, this);
      } else {
        newRoot.ref = this.element;
        vNodeRender(newRoot, this);
      }
    } else {
      syncVNodes(this._root as VNode, newRoot, this);
    }
    this._root = newRoot;
  }

  /**
   * Invalidate component and schedule component to update on the next frame.
   *
   * Dirty flags parameter can be used to add hints that describe what has been changed.
   * This method will automatically cancel all transient subscriptions if preserve transient subscriptions is false.
   */
  invalidate(dirtyFlags: number = ComponentFlags.DirtyView, preserveTransientSubscriptions = false): void {
    this.flags |= dirtyFlags;
    if ((this.flags & (ComponentFlags.Dirty | ComponentFlags.Disposed)) === 0) {
      this.flags |= ComponentFlags.Dirty;
      if (!preserveTransientSubscriptions) {
        componentCancelTransientSubscriptions(this);
      }
      nextFrame().updateComponent(this);
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
    if ("<@KIVI_DEBUG@>" as string !== "DEBUG_DISABLED") {
      if ((this.flags & ComponentFlags.Disposed) !== 0) {
        throw new Error("Failed to dispose Component: component is already disposed.");
      }
    }

    if ("<@KIVI_COMPONENT_RECYCLING@>" as string !== "COMPONENT_RECYCLING_ENABLED" ||
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

export function updateComponent(component: Component<any, any>, newProps?: any): void {
  if (newProps !== undefined && (component.flags & ComponentFlags.ImmutableProps) === 0) {
    const oldProps = component.props;
    const newPropsReceived = component.descriptor._newPropsReceived;
    if (newPropsReceived !== null) {
      newPropsReceived(component, oldProps, newProps);
    } else {
      component.markDirty();
    }
    component.props = newProps;
  }

  if ((component.flags & (ComponentFlags.Dirty | ComponentFlags.Attached)) ===
      (ComponentFlags.Dirty | ComponentFlags.Attached)) {
    component.descriptor._update!(component, component.props, component.state);
    component.mtime = clock();
    component.flags &= ~(ComponentFlags.Dirty | ComponentFlags.InUpdateQueue);
  }
}

function componentAttached(component: Component<any, any>): void {
  if ("<@KIVI_DEBUG@>" as string !== "DEBUG_DISABLED") {
    if ((component.flags & ComponentFlags.Attached) !== 0) {
      throw new Error("Failed to attach Component: component is already attached.");
    }
  }
  component.flags |= ComponentFlags.Attached;
  if ("<@KIVI_COMPONENT_RECYCLING@>" as string === "COMPONENT_RECYCLING_ENABLED") {
    component.flags &= ~ComponentFlags.Recycled;
  }

  const attached = component.descriptor._attached;
  if (attached !== null) {
    attached(component, component.props, component.state);
  }
}

function componentDetached(component: Component<any, any>): void {
  if ("<@KIVI_DEBUG@>" as string !== "DEBUG_DISABLED") {
    if ((component.flags & ComponentFlags.Attached) === 0) {
      throw new Error("Failed to detach Component: component is already detached.");
    }
  }
  component.flags &= ~(ComponentFlags.Attached | ComponentFlags.UpdateEachFrame);
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
function componentCancelSubscriptions(component: Component<any, any>): void {
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
function componentCancelTransientSubscriptions(component: Component<any, any>): void {
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
    updateComponent(c);
  } else {
    nextFrame().write(function() {
      container.appendChild(c.element as Node);
      componentAttached(c);
      updateComponent(c);
    });
  }
  return c;
}

/**
 * Mount component on top of existing DOM.
 */
export function mountComponent<P, S>(descriptor: ComponentDescriptor<P, S>, element: Element, props?: P,
    sync?: boolean): Component<P, S> {
  const c = descriptor.mountComponent(element, undefined, props);
  if (sync) {
    startMounting();
    componentAttached(c);
    updateComponent(c);
    finishMounting();
  } else {
    nextFrame().write(function() {
      startMounting();
      componentAttached(c);
      updateComponent(c);
      finishMounting();
    });
  }
  return c;
}
