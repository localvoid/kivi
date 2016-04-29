[kivi](github.com/localvoid/kivi) is a javascript library (with TypeScript
typings) for building web interfaces. It provides Virtual DOM API for DOM
manipulations, Components, Scheduler tightly integrated with Components,
and several tools for advanced use cases. It doesn't have a router, or
anything that is related to application state, kivi is just a view library.

It was heavily inspired by the [React](https://facebook.github.io/react/)
library, but it has completely different API, implementation and architecture.

## Getting started

Install `kivi` library.

```sh
npm install --save kivi
```

Create a javascript file.

```js
import { createVRoot, createVElement, ComponentDescriptor, scheduler, injectComponent } from 'kivi';

// Component Descriptor is an object that stores the behavior of
// the Component.
const Box = new ComponentDescriptor()
  // Tag name of the root element for this Component. Default tag is 'div'.
  .rootTag('span')
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

## Performance Benchmarks

- [uibench](https://localvoid.github.io/uibench/)
- [dbmonster](https://localvoid.github.io/kivi-dbmonster/)

## Virtual DOM

Virtual DOM simplifies the way to manage DOM mutations, just describe how your
Component should look at any point in time and Virtual DOM reconciliation
algorithm will make all necessary DOM operations in a most efficient way.

In addition to standard Virtual DOM API, kivi provides different tools for
advanced optimizations that can be used to reduce Virtual DOM overhead:

- `VModel` objects allow to specify static properties, so each time `VNode`
object is created, it will be unnecessary to set static properties on virtual
node, and reconciliation algorithm will ignore this static properties.
- `VModel.enableCloning()` enables DOM node cloning instead of creating them
from scratch when creating DOM elements from this model.
- Completely override reconciliation algorithm for a `VNode` with custom
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

## License

MIT