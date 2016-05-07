import {SvgNamespace, ComponentDescriptorFlags, ComponentFlags, SchedulerFlags, VNodeFlags, RenderFlags} from "./misc";
import {VModel} from "./vmodel";
import {VNode} from "./vnode";
import {InvalidatorSubscription, Invalidator} from "./invalidator";
import {scheduler} from "./scheduler";

/**
 * Component Descriptor.
 *
 * @final
 */
export class ComponentDescriptor<D, S> {
  /**
   * Flags marked on Component when it is created.
   */
  _markFlags: number;
  _flags: number;
  /**
   * Tag name of the root element or reference to a model.
   */
  _tag: string|VModel<any>;
  /**
   * Data setter.
   *
   * If new data changes the representation of the Component, data setter should
   * set dirty flag for the Component.
   */
  _setData: (component: Component<D, S>, newData: D) => void;
  /**
   * Children setter.
   *
   * If new children list changes the representation of the Component, children
   * setter should set dirty flag for the Component.
   */
  _setChildren: (component: Component<D, S>, newChildren: VNode[]|string) => void;
  /**
   * Lifecycle method init.
   */
  _init: (component: Component<D, S>) => void;
  /**
   * Lifecycle method update.
   */
  _update: (component: Component<D, S>) => void;
  /**
   * Lifecycle method invalidated.
   */
  _invalidated: (component: Component<D, S>) => void;
  /**
   * Lifecycle method attached.
   */
  _attached: (component: Component<D, S>) => void;
  /**
   * Lifecycle method detached.
   */
  _detached: (component: Component<D, S>) => void;
  /**
   * Lifecycle method disposed.
   */
  _disposed: (component: Component<D, S>) => void;

  /**
   * Pool of recycled components.
   */
  _recycledPool: Component<D, S>[];
  /**
   * Maximum number of recycled components (recycled pool size).
   */
  _maxRecycled: number;

  constructor() {
    this._markFlags = ComponentFlags.Dirty;
    this._flags = 0;
    this._tag = "div";
    this._setData = undefined;
    this._setChildren = undefined;
    this._init = undefined;
    this._update = undefined;
    this._invalidated = undefined;
    this._attached = undefined;
    this._detached = undefined;
    this._disposed = undefined;
    if ("<@KIVI_COMPONENT_RECYCLING@>" === "COMPONENT_RECYCLING_ENABLED") {
      this._recycledPool = undefined;
      this._maxRecycled = 0;
    }
  }

  /**
   * Set tag name for the root element.
   */
  tagName(tagName: string): ComponentDescriptor<D, S> {
    this._tag = tagName;
    return this;
  }

  /**
   * Use SVG Namespace to create root element.
   */
  svg(): ComponentDescriptor<D, S> {
    this._markFlags |= ComponentFlags.Svg;
    this._flags |= ComponentDescriptorFlags.Svg;
    return this;
  }

  /**
   * Set VModel for the root element.
   */
  vModel(model: VModel<any>): ComponentDescriptor<D, S> {
    this._markFlags |= model._markFlags;
    this._flags |= model._markFlags;
    this._tag = model;
    return this;
  }

  /**
   * Component is a Canvas object.
   */
  canvas(): ComponentDescriptor<D, S> {
    this._markFlags |= ComponentFlags.Canvas2D;
    this._flags |= ComponentDescriptorFlags.Canvas2D;
    this._tag = "canvas";
    return this;
  }

  /**
   * Disable data identity checking in default data setter.
   */
  disableCheckDataIdentity(): ComponentDescriptor<D, S> {
    this._markFlags |= ComponentFlags.DisabledCheckDataIdentity;
    return this;
  }

  /**
   * Set data setter.
   *
   * If new data changes the representation of the Component, data setter should
   * set dirty flag for the Component.
   */
  setData(setter: (component: Component<D, S>, newData: D) => void): ComponentDescriptor<D, S> {
    this._setData = setter;
    return this;
  }

  /**
   * Set children setter.
   *
   * If new children list changes the representation of the Component, children
   * setter should set dirty flag for the Component.
   */
  setChildren(setter: (component: Component<D, S>, newChildren: VNode[]|string) => void): ComponentDescriptor<D, S> {
    this._setChildren = setter;
    return this;
  }

  /**
   * Set lifecycle method init.
   */
  init(init: (component: Component<D, S>) => void): ComponentDescriptor<D, S> {
    this._init = init;
    return this;
  }

  /**
   * Set lifecycle method update.
   */
  update(update: (component: Component<D, S>) => void): ComponentDescriptor<D, S> {
    this._update = update;
    return this;
  }

  /**
   * Set lifecycle method invalidated.
   */
  invalidated(invalidated: (component: Component<D, S>) => void): ComponentDescriptor<D, S> {
    this._invalidated = invalidated;
    return this;
  }

  /**
   * Set lifecycle method attached.
   */
  attached(attached: (component: Component<D, S>) => void): ComponentDescriptor<D, S> {
    this._attached = attached;
    return this;
  }

  /**
   * Set lifecycle method detached.
   */
  detached(detached: (component: Component<D, S>) => void): ComponentDescriptor<D, S> {
    this._detached = detached;
    return this;
  }

  /**
   * Set lifecycle method disposed.
   */
  disposed(disposed: (component: Component<D, S>) => void): ComponentDescriptor<D, S> {
    this._disposed = disposed;
    return this;
  }

  /**
   * Enable back reference from DOM element to component.
   */
  enableBackRef(): ComponentDescriptor<D, S> {
    this._flags |= ComponentDescriptorFlags.EnabledBackRef;
    return this;
  }

  /**
   * Enable Component recycling.
   */
  enableRecycling(maxRecycled: number): ComponentDescriptor<D, S> {
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
  createVNode(data?: D): VNode {
    return new VNode(VNodeFlags.Component, this, data);
  }

  /**
   * Create a Component.
   */
  createComponent(parent?: Component<any, any>, data?: D, children?: string|VNode[]): Component<D, S> {
    let element: Element;
    let component: Component<D, S>;

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
      component = new Component<D, S>(this._markFlags, this, element, parent, data, children);

      if ((this._flags & ComponentDescriptorFlags.EnabledBackRef) !== 0) {
        (element as any as {xtag: Component<D, S>}).xtag = component;
      }
      if (this._init !== undefined) {
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
  mountComponent(element: Element, parent?: Component<any, any>, data?: D, children?: string|VNode[]): Component<D, S> {
    const component = new Component(this._markFlags | ComponentFlags.Mounting, this, element, parent, data, children);
    if (this._init !== undefined) {
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
export class Component<D, S> {
  /**
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
  descriptor: ComponentDescriptor<D, S>;
  /**
   * Reference to the root element.
   */
  element: Element;
  /**
   * Parent component.
   */
  parent: Component<any, any>;
  /**
   * Depth in the components tree.
   *
   * Depth property is used by scheduler to determine its priority when updating components.
   */
  depth: number;
  /**
   * Component's state.
   */
  state: S;
  /**
   * Component's data.
   */
  data: D;
  /**
   * Component's parameter children.
   */
  children: VNode[]|string;
  /**
   * Root node can contain a virtual dom root if Component represents a DOM subtree, or Canvas context if Component is
   * a Canvas object.
   */
  root: VNode|CanvasRenderingContext2D;

  private _subscriptions: InvalidatorSubscription[]|InvalidatorSubscription;
  private _transientSubscriptions: InvalidatorSubscription[]|InvalidatorSubscription;

  constructor(flags: number, descriptor: ComponentDescriptor<D, S>, element: Element, parent: Component<any, any>,
      data?: D, children?: string|VNode[]) {
    this.flags = flags;
    this.mtime = 0;
    this.descriptor = descriptor;
    this.element = element;
    this.parent = parent;
    this.depth = parent === undefined ? 0 : parent.depth + 1;
    this.state = undefined;
    this.data = data;
    this.children = children;
    this.root = ((flags & ComponentFlags.Canvas2D) === 0) ? undefined : (element as HTMLCanvasElement).getContext("2d");
    this._subscriptions = undefined;
    this._transientSubscriptions = undefined;
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
   * Mark component as dirty.
   */
  markDirty(): void {
    this.flags |= ComponentFlags.Dirty;
  }

  /**
   * Set parent Component.
   */
  setParent(parent: Component<D, S>): void {
    this.parent = parent;
    this.depth = parent === undefined ? 0 : parent.depth + 1;
  }

  /**
   * Set new data.
   */
  setData(newData?: D): void {
    const setter = this.descriptor._setData;
    if (setter === undefined) {
      if ((this.flags & ComponentFlags.DisabledCheckDataIdentity) !== 0 || this.data !== newData) {
        this.data = newData;
        this.flags |= ComponentFlags.Dirty;
      }
    } else {
      setter(this, newData);
    }
  }

  /**
   * Set new children.
   */
  setChildren(newChildren?: VNode[]|string): void {
    const setter = this.descriptor._setChildren;
    if (setter === undefined) {
      if (this.children !== newChildren) {
        this.children = newChildren;
        this.flags |= ComponentFlags.Dirty;
      }
    } else {
      setter(this, newChildren);
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
    if ((this.flags & ComponentFlags.ShouldUpdate) === ComponentFlags.ShouldUpdate) {
      if (((scheduler._flags & SchedulerFlags.EnabledThrottling) === 0) ||
          ((this.flags & ComponentFlags.HighPriorityUpdate) !== 0) ||
          (scheduler.frameTimeRemaining() > 0)) {
        this.descriptor._update(this);
        this.mtime = scheduler.clock;
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
  sync(newRoot?: VNode, renderFlags: RenderFlags = 0): void {
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
    if (this.root === undefined) {
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
    if ((this.flags & (ComponentFlags.Dirty | ComponentFlags.Disposed)) === 0) {
      this.flags |= ComponentFlags.Dirty;
      this.cancelTransientSubscriptions();
      scheduler.nextFrame().updateComponent(this);

      const invalidated = this.descriptor._invalidated;
      if (invalidated !== undefined) {
        invalidated(this);
      }
    }
  }

  /**
   * Attach method should be invoked when component is attached to the document.
   */
  attach(): void {
    this.attached();
    if (this.root !== undefined && ((this.flags & ComponentFlags.Canvas2D) === 0)) {
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

    let attached = this.descriptor._attached;
    if (attached !== undefined) {
      attached(this);
    }
  }

  /**
   * Detach method should be invoked when component is detached from the document.
   */
  detach(): void {
    if (this.root !== undefined && ((this.flags & ComponentFlags.Canvas2D) === 0)) {
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
    this.cancelSubscriptions();
    this.cancelTransientSubscriptions();

    let detached = this.descriptor._detached;
    if (detached !== undefined) {
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

      if (this.root !== undefined && ((this.flags & ComponentFlags.Canvas2D) === 0)) {
        (this.root as VNode).dispose();
      }

      if ((this.flags & ComponentFlags.Attached) !== 0) {
        this.detached();
      }
      const disposed = this.descriptor._disposed;
      if (disposed !== undefined) {
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
    if (subscriptions === undefined) {
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
    if (subscriptions === undefined) {
      this._transientSubscriptions = s;
    } else if (subscriptions.constructor === InvalidatorSubscription) {
      this._transientSubscriptions = [this._transientSubscriptions as InvalidatorSubscription, s];
    } else {
      (subscriptions as InvalidatorSubscription[]).push(s);
    }
  }

  _removeSubscription(subscription: InvalidatorSubscription): void {
    const subscriptions = this._subscriptions;
    if (subscriptions.constructor === InvalidatorSubscription ||
        (subscriptions as InvalidatorSubscription[]).length === 1) {
      if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
        if (subscriptions.constructor === InvalidatorSubscription) {
          if (subscriptions !== subscription) {
            throw new Error("Failed to remove subscription from Component: cannot find appropriate subscription.");
          }
        } else {
          if ((subscriptions as InvalidatorSubscription[])[0] !== subscription) {
            throw new Error("Failed to remove subscription from Component: cannot find appropriate subscription.");
          }
        }
      }
      this._subscriptions = undefined;
    } else {
      const i = (subscriptions as InvalidatorSubscription[]).indexOf(subscription);
      if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
        if (i === -1) {
          throw new Error("Failed to remove subscription from Component: cannot find appropriate subscription.");
        }
      }
      (subscriptions as InvalidatorSubscription[])[i] = (subscriptions as InvalidatorSubscription[]).pop();
    }
  }

  _removeTransientSubscription(subscription: InvalidatorSubscription): void {
    const subscriptions = this._transientSubscriptions;
    if (subscriptions.constructor === InvalidatorSubscription ||
        (subscriptions as InvalidatorSubscription[]).length === 1) {
      if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
        if (subscriptions.constructor === InvalidatorSubscription) {
          if (subscriptions !== subscription) {
            throw new Error("Failed to remove subscription from Component: cannot find appropriate subscription.");
          }
        } else {
          if ((subscriptions as InvalidatorSubscription[])[0] !== subscription) {
            throw new Error("Failed to remove subscription from Component: cannot find appropriate subscription.");
          }
        }
      }
      this._transientSubscriptions = undefined;
    } else {
      const i = (subscriptions as InvalidatorSubscription[]).indexOf(subscription);
      if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
        if (i === -1) {
          throw new Error("Failed to remove subscription from Component: cannot find appropriate subscription.");
        }
      }
      (subscriptions as InvalidatorSubscription[])[i] = (subscriptions as InvalidatorSubscription[]).pop();
    }
  }

  /**
   * Cancel all subscriptions.
   */
  cancelSubscriptions(): void {
    const subscriptions = this._subscriptions;
    if (subscriptions !== undefined) {
      if (subscriptions.constructor === InvalidatorSubscription) {
        (subscriptions as InvalidatorSubscription).invalidator
          ._removeSubscription(subscriptions as InvalidatorSubscription);
      } else {
        for (let i = 0; i < (subscriptions as InvalidatorSubscription[]).length; i++) {
          let s = (subscriptions as InvalidatorSubscription[])[i];
          s.invalidator._removeSubscription(s);
        }
      }
    }
    this._subscriptions = undefined;
  }

  /**
   * Cancel all transient subscriptions.
   */
  cancelTransientSubscriptions(): void {
    const subscriptions = this._transientSubscriptions;
    if (subscriptions !== undefined) {
      if (subscriptions.constructor === InvalidatorSubscription) {
        (subscriptions as InvalidatorSubscription).invalidator
          ._removeTransientSubscription(subscriptions as InvalidatorSubscription);
      } else {
        for (let i = 0; i < (subscriptions as InvalidatorSubscription[]).length; i++) {
          let s = (subscriptions as InvalidatorSubscription[])[i];
          s.invalidator._removeTransientSubscription(s);
        }
      }
    }
    this._transientSubscriptions = undefined;
  }
}

/**
 * Inject component into DOM.
 */
export function injectComponent<D, S>(descriptor: ComponentDescriptor<D, S>, container: Element, data?: D,
    sync?: boolean): Component<D, S> {
  const c = descriptor.createComponent(undefined, data);
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
export function mountComponent<D, S>(descriptor: ComponentDescriptor<D, S>, element: Element, data?: D,
    sync?: boolean): Component<D, S> {
  const c = descriptor.mountComponent(element, undefined, data);
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
