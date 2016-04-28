import {SvgNamespace} from './namespace';
import {VModel} from './vmodel';
import {VNode, VNodeFlags} from './vnode';
import {InvalidatorSubscription, Invalidator} from './invalidator';
import {scheduler} from './scheduler';

const enum ComponentDescriptorFlags {
  /**
   * 16-23 bits: shared flags between kivi objects
   */
  Svg              = 1 << 15,
  Canvas           = 1 << 16,
  EnabledRecycling = 1 << 17,
  IsVModel         = 1 << 19,
}

export const enum ComponentFlags {
  Disposed        = 1,
  Attached        = 1 << 1,
  Mounting        = 1 << 2,
  Dirty           = 1 << 3,
  UpdateEachFrame = 1 << 4,
  InUpdateQueue   = 1 << 5,
  Recycled        = 1 << 6,
  ShouldUpdate    = Attached | Dirty,
  /**
   * 16-23 bits: shared flags between kivi objects
   */
  Svg              = 1 << 15,
  Canvas           = 1 << 16,
  EnabledRecycling = 1 << 17,
}

/**
 * Component Descriptor
 *
 * @final
 */
export class ComponentDescriptor<D, S> {
  /**
   * Flags marked on Component when it is created
   */
  markFlags: number;
  flags: number;
  /**
   * Tag name of the root element or reference to a model
   */
  _tag: string|VModel<any>;
  /**
   * Data setter
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
   * Lifecycle method init
   */
  _init: (component: Component<D, S>) => void;
  /**
   * Lifecycle method update
   */
  _update: (component: Component<D, S>) => void;
  /**
   * Lifecycle method invalidated
   */
  _invalidated: (component: Component<D, S>) => void;
  /**
   * Lifecycle method attached
   */
  _attached: (component: Component<D, S>) => void;
  /**
   * Lifecycle method detached
   */
  _detached: (component: Component<D, S>) => void;
  /**
   * Lifecycle method disposed
   */
  _disposed: (component: Component<D, S>) => void;

  _recycled: Component<D, S>[];
  _maxRecycled: number;

  constructor() {
    this.markFlags = ComponentFlags.Dirty;
    this.flags = 0;
    this._tag = 'div';
    this._setData = null;
    this._setChildren = null;
    this._init = null;
    this._update = null;
    this._invalidated = null;
    this._attached = null;
    this._detached = null;
    this._disposed = null;
    if ('<@KIVI_COMPONENT_RECYCLING@>' === 'COMPONENT_RECYCLING_ENABLED') {
      this._recycled = null;
      this._maxRecycled = 0;
    }
  }

  /**
   * Set tag name for the root element
   */
  rootTag(tag: string) : ComponentDescriptor<D, S> {
    this._tag = tag;
    return this;
  }

  /**
   * Use SVG Namespace to create root element
   */
  svg(tag: string) : ComponentDescriptor<D, S> {
    this.markFlags |= ComponentFlags.Svg;
    this.flags |= ComponentDescriptorFlags.Svg;
    return this;
  }

  /**
   * Set VModel for the root element
   */
  rootVModel(model: VModel<any>) : ComponentDescriptor<D, S> {
    this.markFlags |= model.markFlags;
    this.flags |= model.markFlags;
    this._tag = model;
    return this;
  }

  /**
   * Component is a Canvas object
   */
  canvas() : ComponentDescriptor<D, S> {
    this.markFlags |= ComponentFlags.Canvas;
    this.flags |= ComponentDescriptorFlags.Canvas;
    this._tag = 'canvas';
    return this;
  }

  /**
   * Set data setter
   *
   * If new data changes the representation of the Component, data setter should
   * set dirty flag for the Component.
   */
  setData(setter: (component: Component<D, S>, newData: D) => void) : ComponentDescriptor<D, S> {
    this._setData = setter;
    return this;
  }

  /**
   * Set children setter
   *
   * If new children list changes the representation of the Component, children
   * setter should set dirty flag for the Component.
   */
  setChildren(setter: (component: Component<D, S>, newChildren: VNode[]|string) => void) : ComponentDescriptor<D, S> {
    this._setChildren = setter;
    return this;
  }

  /**
   * Set lifecycle method init
   */
  init(init: (component: Component<D, S>) => void) : ComponentDescriptor<D, S> {
    this._init = init;
    return this;
  }

  /**
   * Set lifecycle method update
   */
  update(update: (component: Component<D, S>) => void) : ComponentDescriptor<D, S> {
    this._update = update;
    return this;
  }

  /**
   * Set lifecycle method invalidated
   */
  invalidated(invalidated: (component: Component<D, S>) => void) : ComponentDescriptor<D, S> {
    this._invalidated = invalidated;
    return this;
  }

  /**
   * Set lifecycle method attached
   */
  attached(attached: (component: Component<D, S>) => void) : ComponentDescriptor<D, S> {
    this._attached = attached;
    return this;
  }

  /**
   * Set lifecycle method detached
   */
  detached(detached: (component: Component<D, S>) => void) : ComponentDescriptor<D, S> {
    this._detached = detached;
    return this;
  }

  /**
   * Set lifecycle method disposed
   */
  disposed(disposed: (component: Component<D, S>) => void) : ComponentDescriptor<D, S> {
    this._disposed = disposed;
    return this;
  }

  /**
   * Enable Component recycling
   */
  enableRecycling(maxRecycled: number) : ComponentDescriptor<D, S> {
    if ('<@KIVI_COMPONENT_RECYCLING@>' === 'COMPONENT_RECYCLING_ENABLED') {
      this.markFlags |= ComponentFlags.EnabledRecycling;
      this.flags |= ComponentDescriptorFlags.EnabledRecycling;
      this._recycled = [];
      this._maxRecycled = maxRecycled;
    }
    return this;
  }

  /**
   * Create a Virtual DOM Node
   */
  createVNode(data: D = null) : VNode {
    return new VNode(VNodeFlags.Component, this, data);
  }

  /**
   * Create a Component
   */
  createComponent(parent: Component<any, any>) : Component<D, S> {
    let element: Element;
    let component: Component<D, S>;

    if ('<@KIVI_COMPONENT_RECYCLING@>' !== 'COMPONENT_RECYCLING_ENABLED' ||
        ((this.flags & ComponentDescriptorFlags.EnabledRecycling) === 0) ||
        (this._recycled.length === 0)) {

      if ((this.flags & ComponentDescriptorFlags.IsVModel) === 0) {
        element = ((this.flags & ComponentDescriptorFlags.Svg) === 0) ?
            document.createElement(this._tag as string) :
            document.createElementNS(SvgNamespace, this._tag as string);
      } else {
        element = (this._tag as VModel<any>).createElement();
      }
      component = new Component<D, S>(this.markFlags, this, parent, element);
      if (this._init !== null) {
        this._init(component);
      }
    } else {
      component = this._recycled.pop();
      component.setParent(parent);
    }

    return component;
  }

  /**
   * Mount Component on top of existing html element
   */
  mountComponent(parent: Component<any, any>, element: Element) : Component<D, S> {
    let component = new Component(this.markFlags | ComponentFlags.Mounting, this, parent, element);
    if (this._init !== null) {
      this._init(component);
    }
    return component;
  }
}

/**
 * Component
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
  descriptor: ComponentDescriptor<D, S>;
  parent: Component<any, any>;
  depth: number;
  state: S;
  data: D;
  children: VNode[]|string;
  element: Element;
  /**
   * Root node, virtual dom root if Component represents a DOM subtree,
   * or Canvas context if Component is a Canvas object.
   */
  root: VNode|CanvasRenderingContext2D;

  private _subscriptions: InvalidatorSubscription[]|InvalidatorSubscription;
  private _transientSubscriptions: InvalidatorSubscription[]|InvalidatorSubscription;

  constructor(flags: number, descriptor: ComponentDescriptor<D, S>, parent: Component<any, any>, element: Element) {
    this.flags = flags;
    this.mtime = 0;
    this.descriptor = descriptor;
    this.parent = parent;
    this.depth = parent === null ? 0 : parent.depth + 1;
    this.state = null;
    this.data = null;
    this.children = null;
    this.element = element;
    this.root = null;
    this._subscriptions = null;
    this._transientSubscriptions = null;
  }

  /**
   * Mark component as dirty
   */
  markDirty() : void {
    this.flags |= ComponentFlags.Dirty;
  }

  /**
   * Set parent Component
   */
  setParent(parent: Component<D, S>) : void {
    this.parent = parent;
    this.depth = parent === null ? 0 : parent.depth + 1;
  }

  /**
   * Set new data
   */
  setData(newData: D) : void {
    let setter = this.descriptor._setData;
    if (setter === null) {
      if (this.data !== newData) {
        this.data = newData;
        this.flags |= ComponentFlags.Dirty;
      }
    } else {
      setter(this, newData);
    }
  }

  /**
   * Set new children
   */
  setChildren(newChildren: VNode[]|string) : void {
    let setter = this.descriptor._setChildren;
    if (setter !== null) {
      setter(this, newChildren);
    }
  }

  /**
   * Update Component
   */
  update() : void {
    if ((this.flags & ComponentFlags.ShouldUpdate) === ComponentFlags.ShouldUpdate) {
      this.descriptor._update(this);
      this.mtime = scheduler.clock;
      this.flags &= ~ComponentFlags.Dirty;
    }
  }

  /**
   * Sync internal representation using Virtual DOM api
   *
   * If this method is called during mounting phase, then Virtual DOM will be
   * mounted on top of the existing document tree.
   */
  sync(newRoot: VNode) : void {
    if ('<@KIVI_DEBUG@>' !== 'DEBUG_DISABLED') {
      if (!newRoot.isRoot()) {
        throw new Error('Failed to sync: sync methods accepts only VNodes representing root node.');
      }
    }
    if (this.root === null) {
      newRoot.cref = this;
      if ((this.flags & ComponentFlags.Mounting) !== 0) {
        newRoot.mount(this.element, this);
        this.flags &= ~ComponentFlags.Mounting;
      } else {
        newRoot.ref = this.element;
        newRoot.render(this);
      }
    } else {
      (this.root as VNode).sync(newRoot, this);
    }
    this.root = newRoot;
  }

  /**
   * Invalidate Component
   *
   * It automatically cancels all transient subscriptions and schedules a
   * Component update on the next frame.
   */
  invalidate() : void {
    if ((this.flags & (ComponentFlags.Dirty | ComponentFlags.Disposed)) === 0) {
      this.flags |= ComponentFlags.Dirty;
      this.cancelTransientSubscriptions();
      scheduler.nextFrame().updateComponent(this);
    }
  }

  /**
   * Start updating Component on each frame
   */
  startUpdateEachFrame() : void {
    this.flags |= ComponentFlags.UpdateEachFrame;
    if ((this.flags & ComponentFlags.InUpdateQueue) === 0) {
      this.flags |= ComponentFlags.InUpdateQueue;
      scheduler.startUpdateComponentEachFrame(this);
    }
  }

  /**
   * Stop updating Component on each frame
   */
  stopUpdateEachFrame() : void {
    this.flags &= ~ComponentFlags.UpdateEachFrame;
  }

  /**
   * Attach method should be invoked when Component is attached to the
   * document.
   */
  attach() : void {
    this.attached();
    if (this.root !== null && ((this.flags & ComponentFlags.Canvas) === 0)) {
      (this.root as VNode).attach();
    }
  }

  attached() : void {
    if ('<@KIVI_DEBUG@>' !== 'DEBUG_DISABLED') {
      if ((this.flags & ComponentFlags.Attached) !== 0) {
        throw new Error('Failed to attach Component: component is already attached.');
      }
    }
    this.flags |= ComponentFlags.Attached;
    if ('<@KIVI_COMPONENT_RECYCLING@>' === 'COMPONENT_RECYCLING_ENABLED') {
      this.flags &= ~ComponentFlags.Recycled;
    }

    let attached = this.descriptor._attached;
    if (attached !== null) {
      attached(this);
    }
  }

  /**
   * Detach method should be invoked when Component is detached from the
   * document.
   */
  detach() : void {
    if (this.root !== null && ((this.flags & ComponentFlags.Canvas) === 0)) {
      (this.root as VNode).detach();
    }
    this.detached();
  }

  detached() : void {
    if ('<@KIVI_DEBUG@>' !== 'DEBUG_DISABLED') {
      if ((this.flags & ComponentFlags.Attached) === 0) {
        throw new Error('Failed to detach Component: component is already detached.');
      }
    }
    this.flags &= ~(ComponentFlags.Attached | ComponentFlags.UpdateEachFrame);
    this.cancelSubscriptions();
    this.cancelTransientSubscriptions();

    let detached = this.descriptor._detached;
    if (detached !== null) {
      detached(this);
    }
  }

  dispose() : void {
    if ('<@KIVI_DEBUG@>' !== 'DEBUG_DISABLED') {
      if ((this.flags & ComponentFlags.Disposed) !== 0) {
        throw new Error('Failed to dispose Component: component is already disposed');
      }
    }

    if ('<@KIVI_COMPONENT_RECYCLING@>' !== 'COMPONENT_RECYCLING_ENABLED' ||
        ((this.flags & ComponentFlags.EnabledRecycling) === 0) ||
        (this.descriptor._recycled.length >= this.descriptor._maxRecycled)) {
      this.flags |= ComponentFlags.Disposed;

      if (this.root !== null && ((this.flags & ComponentFlags.Canvas) === 0)) {
        (this.root as VNode).dispose();
      }

      this.detached();
      if (this.descriptor._disposed !== null) {
        this.descriptor._disposed(this);
      }
    } else {
      this.detach();
      this.descriptor._recycled.push(this);
    }
  }

  /**
   * Subscribe to invalidator object
   */
  subscribe(invalidator: Invalidator) : void {
    let s = invalidator.subscribeComponent(this);
    let subscriptions = this._subscriptions;
    if (subscriptions === null) {
      this._subscriptions = s;
    } else if (subscriptions.constructor === InvalidatorSubscription) {
      this._subscriptions = [this._subscriptions as InvalidatorSubscription, s];
    } else {
      (subscriptions as InvalidatorSubscription[]).push(s);
    }
  }

  /**
   * Transiently subscribe to invalidator object
   *
   * Each time component is invalidated, all transient subscriptions will be
   * canceled.
   */
  transientSubscribe(invalidator: Invalidator) : void {
    let s = invalidator.transientSubscribeComponent(this);
    let subscriptions = this._transientSubscriptions;
    if (subscriptions === null) {
      this._transientSubscriptions = s;
    } else if (subscriptions.constructor === InvalidatorSubscription) {
      this._transientSubscriptions = [this._transientSubscriptions as InvalidatorSubscription, s];
    } else {
      (subscriptions as InvalidatorSubscription[]).push(s);
    }
  }

  removeSubscription(subscription: InvalidatorSubscription) : void {
    let subscriptions = this._subscriptions;
    if (subscriptions.constructor === InvalidatorSubscription ||
        (subscriptions as InvalidatorSubscription[]).length === 1) {
      if ('<@KIVI_DEBUG@>' !== 'DEBUG_DISABLED') {
        if (subscriptions.constructor === InvalidatorSubscription) {
          if (subscriptions !== subscription) {
            throw new Error('Failed to remove subscription from Component: cannot find appropriate subscription');
          }
        } else {
          if ((subscriptions as InvalidatorSubscription[])[0] !== subscription) {
            throw new Error('Failed to remove subscription from Component: cannot find appropriate subscription');
          }
        }
      }
      this._subscriptions = null;
    } else {
      let i = (subscriptions as InvalidatorSubscription[]).indexOf(subscription);
      if ('<@KIVI_DEBUG@>' !== 'DEBUG_DISABLED') {
        if (i === -1) {
          throw new Error('Failed to remove subscription from Component: cannot find appropriate subscription');
        }
      }
      (subscriptions as InvalidatorSubscription[])[i] = (subscriptions as InvalidatorSubscription[]).pop();
    }
  }

  removeTransientSubscription(subscription: InvalidatorSubscription) : void {
    let subscriptions = this._transientSubscriptions;
    if (subscriptions.constructor === InvalidatorSubscription ||
        (subscriptions as InvalidatorSubscription[]).length === 1) {
      if ('<@KIVI_DEBUG@>' !== 'DEBUG_DISABLED') {
        if (subscriptions.constructor === InvalidatorSubscription) {
          if (subscriptions !== subscription) {
            throw new Error('Failed to remove subscription from Component: cannot find appropriate subscription');
          }
        } else {
          if ((subscriptions as InvalidatorSubscription[])[0] !== subscription) {
            throw new Error('Failed to remove subscription from Component: cannot find appropriate subscription');
          }
        }
      }
      this._transientSubscriptions = null;
    } else {
      let i = (subscriptions as InvalidatorSubscription[]).indexOf(subscription);
      if ('<@KIVI_DEBUG@>' !== 'DEBUG_DISABLED') {
        if (i === -1) {
          throw new Error('Failed to remove subscription from Component: cannot find appropriate subscription');
        }
      }
      (subscriptions as InvalidatorSubscription[])[i] = (subscriptions as InvalidatorSubscription[]).pop();
    }
  }

  /**
   * Cancel all subscriptions
   */
  cancelSubscriptions() : void {
    let subscriptions = this._subscriptions;
    if (subscriptions !== null) {
      if (subscriptions.constructor === InvalidatorSubscription) {
        (subscriptions as InvalidatorSubscription).invalidator.removeSubscription(subscriptions as InvalidatorSubscription);
      } else {
        for (let i = 0; i < (subscriptions as InvalidatorSubscription[]).length; i++) {
          let s = (subscriptions as InvalidatorSubscription[])[i];
          s.invalidator.removeSubscription(s);
        }
      }
    }
    this._subscriptions = null;
  }

  /**
   * Cancel all transient subscriptions
   */
  cancelTransientSubscriptions() {
    let subscriptions = this._transientSubscriptions;
    if (subscriptions !== null) {
      if (subscriptions.constructor === InvalidatorSubscription) {
        (subscriptions as InvalidatorSubscription).invalidator.removeSubscription(subscriptions as InvalidatorSubscription);
      } else {
        for (let i = 0; i < (subscriptions as InvalidatorSubscription[]).length; i++) {
          let s = (subscriptions as InvalidatorSubscription[])[i];
          s.invalidator.removeSubscription(s);
        }
      }
    }
    this._transientSubscriptions = null;
  }
}

/**
 * Instantiate and inject component into container.
 */
export function injectComponent<D, S>(descriptor: ComponentDescriptor<D, S>, data: D, container: Element)
    : Component<D, S> {
  let c = descriptor.createComponent(null);
  container.appendChild(c.element);
  c.attached();
  c.setData(data);
  c.update();
  return c;
};

/**
 * Instantiate and mount component on top of existing html.
 */
export function mountComponent<D, S>(descriptor: ComponentDescriptor<D, S>, data: D, element: Element)
    : Component<D, S> {
  var c = descriptor.mountComponent(null, element);
  c.attached();
  c.setData(data);
  c.update();
  return c;
};
