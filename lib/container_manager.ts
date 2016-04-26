import {VNode} from './vnode';
import {Component} from './component';

/**
 * Container Manager Descriptor
 *
 * @final
 */
export class ContainerManagerDescriptor<S> {
  insertChild: (manager: ContainerManager<S>,
                container: VNode,
                node: VNode,
                nextRef: Node,
                owner: Component<any, any>) => void;

  replaceChild: (manager: ContainerManager<S>,
                 container: VNode,
                 newNode: VNode,
                 refNode: VNode,
                 owner: Component<any, any>) => void;

  moveChild: (manager: ContainerManager<S>,
              container: VNode,
              node: VNode,
              nextRef: Node,
              owner: Component<any, any>) => void;

  removeChild: (manager: ContainerManager<S>,
                container: VNode,
                now: VNode,
                owner: Component<any, any>) => void;
}

/**
 * Container Manager
 *
 * @final
 */
export class ContainerManager<S> {
  descriptor: ContainerManagerDescriptor<S>;
  state: S;

  constructor(descriptor: ContainerManagerDescriptor<S>, state: S) {
    this.descriptor = descriptor;
    this.state = state;
  }
}
