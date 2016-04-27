# kivi

TypeScript (javascript) UI library.

## Virtual DOM

kivi Virtual DOM implementation is
[extremely fast](https://localvoid.github.io/uibench/) and has many
different optimizations:

- Minimum number of DOM operations for children reconciliation (most of the
  virtual DOM implementations will perform N-1 `insertBefore` operations even
  for simple move of one child).
- Virtual DOM nodes store references to the actual DOM nodes, so they can't
  be reused to render several different nodes. Immutable VNodes pros aren't
  worth it in real projects, kivi implementation is optimized for real use
  cases.
- Element templates to remove unnecessary diffing for static properties.
- Overriding diffing algorithm for elements that use element templates.
- Components recycling. It is disabled by default, and should be explicitly
  enabled for each Component type.

## Scheduler

- Invalidated components updated in the lowest depth order to prevent
  unnecessary computation.
- Different task queues for DOM read and write to prevent layout thrashing.

## Example

```ts
import {
  createRoot,
  createElement,
  ComponentDescriptor,
  scheduler,
  injectComponent
} from 'kivi';

// Component Descriptor is an object that stores the behavior of
// the Component.
// First parameter is the name that is used for debugging purposes,
// and will be automatically removed from production builds.
// First generic type parameter is an input data type, and the
// second is a state type.
const Box = new ComponentDescriptor<string, any>('Box')
  // Tag name of the root element for this Component. Default tag is 'div'.
  .rootTag('span')
  // Function that responsible for updating internal state and the view
  // of the Component.
  // Each time when Component is invalidated (new data is passed, or
  // `invalidate()` method is called), it will be updated during Scheduler
  // write phase.
  // There are no separate functions like `render` in React, because we
  // want to preserve stack traces for better developer experience when
  // debugging or profiling.
  // Another advantage of `update` method is that Components doesn't
  // depend on virtual dom api to update its representation, just use
  // any method that is best suited for updates.
  //
  // First parameter is an instance of the Component.
  .update((c) => {
    // sync method is used to update internal representation using
    // Virtual DOM API.
    c.sync(createRoot().children(c.data));
  });

const Main = new ComponentDescriptor('Main')
  .update((c) => {
    c.sync(createRoot().children([
      createElement('span').children('Hello '),
      Box.createVNode(c.data)
    ]));
  });

// start method is necessary, because we need to advance scheduler
// internal clock after DOM modifications that involve kivi Components.
scheduler.start(() => {
  // Instantiate and inject component into document body.
  injectComponent(Main, 'kivi', document.body);
});
```
