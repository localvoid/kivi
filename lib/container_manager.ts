import {VNode} from "./vnode";
import {Component} from "./component";
import {ContainerManagerDescriptorDebugFlags} from "./misc";

export type InsertChildHandler<P, S> = (manager: ContainerManager<P, S>,
                                        container: Element,
                                        node: VNode,
                                        nextRef: Node | null,
                                        renderFlags: number,
                                        owner: Component<any, any> | undefined) => void;

export type ReplaceChildHandler<P, S> = (manager: ContainerManager<P, S>,
                                         container: Element,
                                         newNode: VNode,
                                         refNode: VNode,
                                         renderFlags: number,
                                         owner: Component<any, any> | undefined) => void;

export type MoveChildHandler<P, S> = (manager: ContainerManager<P, S>,
                                      container: Element,
                                      node: VNode,
                                      nextRef: Node | null,
                                      owner: Component<any, any> | undefined) => void;

export type RemoveChildHandler<P, S> = (manager: ContainerManager<P, S>,
                                        container: Element,
                                        now: VNode,
                                        owner: Component<any, any> | undefined) => void;

/**
 * **EXPERIMENTAL** Container Manager Descriptor.
 *
 * @final
 */
export class ContainerManagerDescriptor<P, S> {
  _insertChild: InsertChildHandler<P, S> | null;
  _replaceChild: ReplaceChildHandler<P, S> | null;
  _moveChild: MoveChildHandler<P, S> | null;
  _removeChild: RemoveChildHandler<P, S> | null;
  _createState: ((manager: ContainerManager<P, S>, props: P) => S) | null;
  _init: ((manager: ContainerManager<P, S>, props: P, state: S) => void) | null;
  _debugFlags: number;

  constructor() {
    this._insertChild = null;
    this._replaceChild = null;
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

  insertChild(handler: InsertChildHandler<P, S>): ContainerManagerDescriptor<P, S> {
    this._insertChild = handler;
    return this;
  }

  replaceChild(handler: ReplaceChildHandler<P, S>): ContainerManagerDescriptor<P, S> {
    this._replaceChild = handler;
    return this;
  }

  moveChild(handler: MoveChildHandler<P, S>): ContainerManagerDescriptor<P, S> {
    this._moveChild = handler;
    return this;
  }

  removeChild(handler: RemoveChildHandler<P, S>): ContainerManagerDescriptor<P, S> {
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
