# kivi

Library for building web UIs.

Kivi is build for
[google-closure-compiler](https://github.com/google/closure-compiler)
ADVANCED_MODE, and it is using google-closure modules. There are no
plans for distributing it as a standalone library without closure
compiler dependency.

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

### Scheduler

Scheduler for batching read and write DOM tasks.

### Misc

- Automatic management of data dependencies in UI components with
  `Invalidator` objects.

```js
app.entry.d = new vdom.CDescriptor('Entry');
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
goog.require('kivi');

// Initialize kivi library with default Scheduler implementation.
kivi.init(new kivi.Scheduler());

// Component Descriptor is an object that stores the behavior of
// the Component.
// First parameter is the name that is used for debugging purposes,
// and will be automatically removed from production builds.
app.box.d = new vdom.CDescriptor('Box');
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
app.box.d.update = function(c) {
  // syncVRoot method is used to update internal representation using
  // Virtual DOM API.
  c.syncVRoot(kivi.createRoot().children(c.data));
};

app.main.d = new vdom.CDescriptor('Main');
app.main.d.update = function(c) {
  c.syncVRoot(kivi.createRoot().children([
    kivi.createElement('span').children('Hello '),
    kivi.createComponent(app.box.d, c.data)
  ]));
};

// Instantiate and inject component into document body.
kivi.injectComponent(app.main.d, 'kivi', document.body);
```

## Examples

- [Hello World](https://github.com/localvoid/kivi-examples/src/hello)
- [Anim](https://github.com/localvoid/kivi-examples/src/anim)

## Benchmarks

- [dbmonster](https://localvoid.github.io/kivi-dbmonster/)
- [uibench](https://localvoid.github.io/uibench/)
- [vdom benchmark](https://vdom-benchmark.github.io/vdom-benchmark/)
