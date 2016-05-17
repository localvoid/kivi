# Container Manager

Container Manager can override default virtual dom reconciliation functions for DOM node lists manipulations. This
feature is quite useful for implementing complicated animated containers.

It has a similar way for declaring properties and behavior to components model. `ContainerManagerDescriptor` instance
contains virtual table of properties and methods, and can create `ContainerManager` instances linked to descriptor.

Each container manager should override four functions for DOM node lists manipulations:

```ts
type InsertChildHandler<S> = (manager: ContainerManager<S>,
                              container: Element,
                              node: VNode,
                              nextRef: Node,
                              renderFlags: number,
                              owner: Component<any, any> | undefined) => void;

type ReplaceChildHandler<S> = (manager: ContainerManager<S>,
                               container: Element,
                               newNode: VNode,
                               refNode: VNode,
                               renderFlags: number,
                               owner: Component<any, any> | undefined) => void;

type MoveChildHandler<S> = (manager: ContainerManager<S>,
                            container: Element,
                            node: VNode,
                            nextRef: Node,
                            owner: Component<any, any> | undefined) => void;

type RemoveChildHandler<S> = (manager: ContainerManager<S>,
                              container: Element,
                              now: VNode,
                              owner: Component<any, any> | undefined) => void;
```

To make things easier, kivi provides generic functions for DOM node lists manipulations that will invoke all lifecycle
handlers in a proper way:

```ts
function insertVNodeBefore(
  container: Element,
  node: VNode,
  nextRef: Node,
  renderFlags: number,
  owner: Component<any, any> | undefined): void;

function replaceVNode(
  container: Element,
  newNode: VNode,
  refNode: VNode,
  renderFlags: numberm
  owner: Component<any, any> | undefined): void;

function moveVNode(
  container: Element,
  node: VNode,
  nextRef: Node,
  owner: Component<any, any> | undefined): void;

function removeVNode(
  container: Element,
  node: VNode,
  owner: Component<any, any> | undefined): void;
```

To use container manager in a virtual dom, just assign container manager instance to a virtual dom element with
`managedContainer(manager: ContainerManager<any>)` method.

## Example

```ts
const MyManager = new ContainerManagerDescriptor()
  .insertChild((manager: ContainerManager<any>, container: Element, node: VNode,
      nextRef: Node, renderFlags: number, owner: Component<any, any> | undefined) => {
    console.log("Node inserted");
  })
  .removeChild((manager: ContainerManager<any>, container: Element, node: VNode,
      owner: Component<any, any> | undefined) => {
    console.log("Node removed");
  });
  .moveChild((manager: ContainerManager<any>, container: Element, node: VNode,
      nextRef: Node, owner: Component<any, any> | undefined) => {
    console.log("Node moved");
  });
  .replaceChild((manager: ContainerManager<any>, container: Element, newNode: VNode,
      refNode: VNode, renderFlags: number, owner: Component<any, any> | undefined) => {
    console.log("Node replaced");
  });

const manager = MyManager.create();

const vnode = createVElement("div")
  .managedContainer(manager)
  .children([
    createVElement("span"),
    createVElement("span"),
  ]);
```
