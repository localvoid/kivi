# kivi

Library for building web UIs.

Kivi is written for
[google-closure-compiler](https://github.com/google/closure-compiler)
ADVANCED_MODE, and it is using closure modules. There are no plans for
distributing it as a standalone library without closure compiler
dependency.

If you are choosing between [React](https://facebook.github.io/react/)
and any other similar library, I'd strongly recommend to use React,
because its community and ecosystem is way more important than slight
performance advantage of kivi, so if you don't have any serious
reasons to choose kivi over React, just use React.

Kivi was created to solve one specific problem when dealing with
updates in extremely large documents, and there is a little chance
that you'll have the same problems in a typical SPA.

### Virtual DOM

Virtual DOM simplifies the way to manage DOM mutations, just describe
how your Component should look at any point in time.

- Extremely fast ([see benchmarks below](#benchmarks)).
- Minimal number of move operations in children reconciliation using
  [Longest Increasing Subsequence](https://en.wikipedia.org/wiki/Longest_increasing_subsequence)
  algorithm.
- Mounting on top of existing html (adjacent text nodes should be
  separated by Comment nodes `<!---->` when rendered to string).

### Scheduler

- Batching for read and write DOM tasks.
- Write DOM tasks sorted by their priority.
- Microtask queue.
- Macrotask queue.

### Misc

- Automatic management of data dependencies in UI components with
  `Invalidator` objects.

```js
app.entry.d = new kivi.CDescriptor('Entry');
app.entry.d.update = function(c) {
  // `subscribe(d)` and `transientSubscribe(d)` are used to subscribe for
  // `Invalidator` objects.
  //
  // Each time Component is invalidated, old transient subscriptions will
  // be automatically canceled, so we just register a new one when
  // something is changed.
  c.transientSubscribe(c.data.dependency);

  c.syncVRoot(...);
};
```

## Example

```js
goog.provide('app');
goog.provide('app.box');
goog.provide('app.main');
goog.require('kivi.CDescriptor');
goog.require('kivi.VNode');
goog.require('kivi.injectComponent');

goog.scope(function() {
  var VNode = kivi.VNode;
  
  // Component Descriptor is an object that stores the behavior of
  // the Component.
  // First parameter is the name that is used for debugging purposes,
  // and will be automatically removed from production builds.
  // First generic type parameter is an input data type, and the
  // second is a state type.
  /** @const {!kivi.CDescriptor<string, null>} */
  app.box.d = new kivi.CDescriptor('Box');
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
  app.main.d = new kivi.CDescriptor('Main');
  
  /** @param {!kivi.Component<string, null>} c */
  app.main.d.update = function(c) {
    c.syncVRoot(VNode.createRoot().children([
      VNode.createElement('span').children('Hello '),
      VNode.createComponent(app.box.d, c.data)
    ]));
  };
  
  // Instantiate and inject component into document body.
  kivi.injectComponent(app.main.d, 'kivi', document.body);
});
```

## Examples

- [Hello World](https://github.com/localvoid/kivi-examples/tree/master/src/hello)
- [Anim](https://github.com/localvoid/kivi-examples/tree/master/src/anim)

## Benchmarks
<a name="benchmarks"></a>

- [dbmonster](https://localvoid.github.io/kivi-dbmonster/)
- [uibench](https://localvoid.github.io/uibench/)
- [vdom benchmark](https://vdom-benchmark.github.io/vdom-benchmark/)
