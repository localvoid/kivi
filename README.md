# kivi

Javascript UI library.
 
Kivi started as an experiment to check viability of UI applications with
pull-based(lazy evaluation) architecture and now it is full-featured UI
library.

It was heavily inspired by [React](https://facebook.github.io/react/)
library, but implementation and many architecture decisions are completely
different.

Kivi doesn't have a goal to provide a small sized library and its code base
is larger than many lightweight UI libraries. But even for an average app,
there is a high chance that code compiled with 
[google-closure-compiler](https://github.com/google/closure-compiler)
and advanced optimizations like
[Type Based Property Renaming](https://github.com/google/closure-compiler/wiki/Type-Based-Property-Renaming)
will be way much smaller than code compiled by traditional js compiler
stacks.

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
- Components (with DOM nodes) recycling. It is disabled by default, and
  should be explicitly enabled for each Component type.
- Components store last modification time (internal monotonically increasing
  clock) and it is easy to implement fast `shouldComponentUpdate` methods
  without using immutable data structures.

## Scheduler

- Invalidated components updated in the lowest depth order to prevent
  unnecessary computation.
- Different task queues for DOM read and write to prevent layout thrashing.

## Example

```js
goog.provide('app');
goog.provide('app.box');
goog.provide('app.main');
goog.require('kivi.CDescriptor');
goog.require('kivi.VNode');
goog.require('kivi.injectComponent');
goog.require('kivi.start');

goog.scope(function() {
  var VNode = kivi.VNode;
  var $e = VNode.createElement;
  var $c = VNode.createComponent;
  
  // Component Descriptor is an object that stores the behavior of
  // the Component.
  // First parameter is the name that is used for debugging purposes,
  // and will be automatically removed from production builds.
  // First generic type parameter is an input data type, and the
  // second is a state type.
  /** @const {!kivi.CDescriptor<string, null>} */
  app.box.d = kivi.CDescriptor.create('Box');
  // Tag name of the root element for this Component. Default tag is 'div'.
  app.box.d.tag = 'span';
  
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
  /** @param {!kivi.Component<string, null>} c */
  app.box.d.update = function(c) {
    // syncVRoot method is used to update internal representation using
    // Virtual DOM API.
    c.syncVRoot(VNode.createRoot().children(c.data));
  };
  
  /** @const {!kivi.CDescriptor<string, null>} */
  app.main.d = kivi.CDescriptor.create('Main');
  
  /** @param {!kivi.Component<string, null>} c */
  app.main.d.update = function(c) {
    c.syncVRoot(VNode.createRoot().children([
      $e('span').children('Hello '),
      $c(app.box.d, c.data)
    ]));
  };
  
  // start function is necessary, because we need to advance scheduler
  // internal clock after DOM modifications that involve kivi Components.
  kivi.start(function() {
    // Instantiate and inject component into document body.
    kivi.injectComponent(app.main.d, 'kivi', document.body);
  });
});
```
