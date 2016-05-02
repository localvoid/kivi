[kivi](http://github.com/localvoid/kivi) is a javascript library (with
TypeScript typings) for building web interfaces. It provides Virtual DOM API
for DOM manipulations, Components, Scheduler tightly integrated with
Components, and several tools for advanced use cases. It doesn't have a router,
or anything that is related to application state, kivi is just a view library.

It was heavily inspired by the [React](https://facebook.github.io/react/)
library, but has completely different API, implementation and architecture.

## Getting started

Install `kivi` library.

```sh
npm install --save kivi
```

Create a javascript file:

```js
import { createVRoot, createVElement, ComponentDescriptor, scheduler, injectComponent } from 'kivi';

// Component Descriptor is an object that stores the behavior of
// the Component.
const Box = new ComponentDescriptor()
  // Tag name of the root element for this Component. Default tag is 'div'.
  .tagName('span')
  // Function that responsible for updating internal state and the view
  // of the Component.
  // First parameter is an instance of the Component.
  .update((c) => {
    // sync method is used to update internal representation with
    // Virtual DOM API.
    c.sync(createVRoot().children(c.data));
  });

const Main = new ComponentDescriptor('Main')
  .update((c) => {
    c.sync(createVRoot().children([
      createVElement('span').children('Hello '),
      Box.createVNode(c.data)
    ]));
  });

scheduler.start(() => {
  // Instantiate and inject component into document body.
  injectComponent(Main, 'kivi', document.body);
});
```

Build with any tool you like, kivi npm package provides standard commonjs
modules, typescript typings, and es6 modules at `jsnext:main` path for bundlers
like [Rollup](http://rollupjs.org/), and can be transpiled by
[Babel](https://babeljs.io), [Buble](https://gitlab.com/Rich-Harris/buble),
or [Google Closure Compiler](https://github.com/google/closure-compiler).

## Examples

- [Intro](https://github.com/localvoid/kivi/tree/master/examples/intro)
- [Stateful Component](https://github.com/localvoid/kivi/tree/master/examples/stateful_component)
- [Canvas](https://github.com/localvoid/kivi/tree/master/examples/canvas)

## Performance Benchmarks

- [uibench](https://localvoid.github.io/uibench/)
- [dbmonster](https://localvoid.github.io/kivi-dbmonster/)

## Virtual DOM

Virtual DOM simplifies the way to manage DOM mutations, just describe how your
Component should look at any point in time and Virtual DOM reconciliation
algorithm will make all necessary DOM operations to update the document in a
most efficient way.

In addition to standard Virtual DOM API, kivi provides different tools for
advanced optimizations that can be used to reduce Virtual DOM overhead:

- `VModel` objects allow to specify static properties, so each time `VNode`
object is created, it will be unnecessary to set static properties on virtual
node, and reconciliation algorithm will ignore this static properties.
- `VModel.enableCloning()` enables DOM node cloning instead of creating them
from scratch when creating DOM elements from this model.
- Overriding reconciliation algorithm for a `VNode` with custom
`VModel.update(handler: (e: Element, oldData: D, newData: D) => void)` handler.
- Implementing custom `insertChild`, `removeChild`, `replaceChild`, `moveChild`
hooks with `ContainerManager` to create efficient animations.
- `VNode.keepAlive()` prevents reconciliation algorithm from disposing virtual
nodes when it removes them from the document, owning `Component` becomes
responsible for disposing keep alived nodes.
- `ComponentDescriptor.enableRecycling(maxRecycled: number)` enables components
recycling, so when component with enabled recycling is created, it will try to
find unused component of the same type in the recycled pool and update it with
a new data.
- Shallow updating to prevent subcomponent updates.
- `Component.mtime` is a timestamp when component performed the last update, it
uses internal monotonically increasing clock from `scheduler.clock`. With
`mtime` is is quite easy to implement fast change detection without immutable
data structures.
- Different task queues for DOM read and write batching with
`Scheduler.currentFrame().read(cb: () => void)` and
`Scheduler.currentFrame().write(cb: () => void)` methods.
- Subscribing to `Invalidator` objects with
`Component.subscribe(i: Invalidator)` and
`Component.transientSubscribe(i: Invalidator)` methods to implement reactive
bindings. Transient subscriptions will be automatically canceled each time
component is invalidated.
- `Component.startUpdateEachFrame()` adds component to a list of components
that should be updated each frame, especially useful for animated components.

## Scheduler

Scheduler always updates components from the top to the bottom, so it
will guarantee that removed components will not perform any unnecessary
computations.

It also provides:

- Queues for microtasks and macrotasks.
- Task queues for DOM read and write operations for current and next frames.
- Control of the user input focus.

## High level API

### Virtual DOM

##### `createVElement(tag: string) : VNode`

Creates a virtual node for a html element.

##### `createVText(content: string): VNode`

Creates a virtual node for a html text node.

##### `VNode.attrs(attrs: any): VNode`

Set attributes for an element.

##### `VNode.props(props: any): VNode`

Set properties for an element.

##### `VNode.className(className: string): VNode`

Set className for an element.

##### `VNode.style(style: string): VNode`

Set style in css string format for an element.

##### `VNode.children(children: string|VNode[]): VNode`

Set children.

##### `VNode.key(any): VNode`

Set key to make virtual node easily distinguishable among its siblings when
performing children reconciliation algorithm.

##### `VNode.trackByKeyChildren(children: VNode[]): VNode`

Set children that should be tracked by its key.

### Components

##### `new ComponentDescriptor<DataType, StateType>()`

Creates a new component descriptor.

##### `ComponentDescriptor.tagName(tag: string) : void`

Set tag name of the root element.

##### `ComponentDescriptor.init(initHandler: (c: Component) => void): void`

Set init handler. Lifecycle method init will be invoked each time when
component is instantiated from component descriptor.

##### `ComponentDescriptor.update(updateHandler: (c: Component) => void): void`

Set update handler. Lifecycle method update will be invoked each time when
component is needs to update internal state or representation.

##### `ComponentDescriptor<D, S>.createVNode(data?: D): void`

Creates a new virtual node representing component.

##### `Component.sync(newRoot: VNode): void`

Sync DOM subtree using Virtual DOM API. `newRoot` node should be created by
`createVRoot() : VNode` function.

##### `injectComponent<D, S>(descriptor: ComponentDescriptor<D, S>, data: D, container: Element) : Component<D, S>`

Instantiates new component from descriptor and injects into container element.

## License

MIT