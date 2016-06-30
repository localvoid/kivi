import {VNode} from "./vnode";
import {ContainerManagerDescriptorDebugFlags} from "./misc";

/**
 * **EXPERIMENTAL** Container Manager Descriptor.
 *
 * @final
 */
export class ContainerManagerDescriptor<P, S> {
  _createChild: ((manager: ContainerManager<P, S>, node: VNode) => void) | null;
  _moveChild: ((manager: ContainerManager<P, S>, node: VNode) => void) | null;
  _removeChild: ((manager: ContainerManager<P, S>, node: VNode) => boolean) | null;
  _createState: ((manager: ContainerManager<P, S>, props: P) => S) | null;
  _init: ((manager: ContainerManager<P, S>, props: P, state: S) => void) | null;
  _debugFlags: number;

  constructor() {
    this._createChild = null;
    this._moveChild = null;
    this._removeChild = null;
    this._createState = null;
    this._init = null;

    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      this._debugFlags = 0;
    }
  }

  create(props: P | null = null): ContainerManager<P, S> {
    const m = new ContainerManager<P, S>(this, props!);
    if (this._createState !== null) {
      m.state = this._createState(m, m.props!);
    }
    if (this._init !== null) {
      this._init(m, m.props!, m.state!);
    }
    return m;
  }

  createState(handler: (manager: ContainerManager<P, S>, props: P) => S): ContainerManagerDescriptor<P, S> {
    this._createState = handler;
    return this;
  }

  init(handler: (manager: ContainerManager<P, S>, props: P, state: S) => void): ContainerManagerDescriptor<P, S> {
    this._init = handler;
    return this;
  }

  createChild(handler: (manager: ContainerManager<P, S>, node: VNode) => void): ContainerManagerDescriptor<P, S> {
    this._createChild = handler;
    return this;
  }

  moveChild(handler: (manager: ContainerManager<P, S>, node: VNode) => void): ContainerManagerDescriptor<P, S> {
    this._moveChild = handler;
    return this;
  }

  removeChild(handler: (manager: ContainerManager<P, S>, node: VNode) => boolean): ContainerManagerDescriptor<P, S> {
    this._removeChild = handler;
    return this;
  }

  acceptKeyedChildrenOnly(): void {
    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      this._debugFlags |= ContainerManagerDescriptorDebugFlags.AcceptKeyedChildrenOnly;
    }
  }
}

/**
 * Container Manager.
 *
 * @final
 */
export class ContainerManager<P, S> {
  descriptor: ContainerManagerDescriptor<P, S>;
  props: P | null;
  state: S | null;

  constructor(descriptor: ContainerManagerDescriptor<P, S>, props?: P) {
    this.descriptor = descriptor;
    this.props = props === undefined ? null : props;
    this.state = null;
  }
}
