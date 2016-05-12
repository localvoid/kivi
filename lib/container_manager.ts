import {VNode} from "./vnode";
import {Component} from "./component";
import {ContainerManagerDescriptorDebugFlags} from "./misc";

export type InsertChildHandler<S> = (manager: ContainerManager<S>,
                                     container: Element,
                                     node: VNode,
                                     nextRef: Node,
                                     owner: Component<any, any>,
                                     renderFlags: number) => void;

export type ReplaceChildHandler<S> = (manager: ContainerManager<S>,
                                      container: Element,
                                      newNode: VNode,
                                      refNode: VNode,
                                      owner: Component<any, any>,
                                      renderFlags: number) => void;

export type MoveChildHandler<S> = (manager: ContainerManager<S>,
                                   container: Element,
                                   node: VNode,
                                   nextRef: Node,
                                   owner: Component<any, any>) => void;

export type RemoveChildHandler<S> = (manager: ContainerManager<S>,
                                     container: Element,
                                     now: VNode,
                                     owner: Component<any, any>) => void;

/**
 * Container Manager Descriptor.
 *
 * @final
 */
export class ContainerManagerDescriptor<S> {
  _insertChild: InsertChildHandler<S>;
  _replaceChild: ReplaceChildHandler<S>;
  _moveChild: MoveChildHandler<S>;
  _removeChild: RemoveChildHandler<S>;
  _debugFlags: number;

  constructor() {
    this._insertChild = null;
    this._replaceChild = null;
    this._moveChild = null;
    this._removeChild = null;

    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      this._debugFlags = 0;
    }
  }

  create(state: S = null): ContainerManager<S> {
    return new ContainerManager<S>(this, state);
  }

  insertChild(handler: InsertChildHandler<S>): ContainerManagerDescriptor<S> {
    this._insertChild = handler;
    return this;
  }

  replaceChild(handler: ReplaceChildHandler<S>): ContainerManagerDescriptor<S> {
    this._replaceChild = handler;
    return this;
  }

  moveChild(handler: MoveChildHandler<S>): ContainerManagerDescriptor<S> {
    this._moveChild = handler;
    return this;
  }

  removeChild(handler: RemoveChildHandler<S>): ContainerManagerDescriptor<S> {
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
export class ContainerManager<S> {
  descriptor: ContainerManagerDescriptor<S>;
  state: S;

  constructor(descriptor: ContainerManagerDescriptor<S>, state?: S) {
    this.descriptor = descriptor;
    this.state = state;
  }
}
