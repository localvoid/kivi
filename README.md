# kivi

Library for building web UIs.

### Virtual DOM

Virtual DOM simplifies the way to manage DOM mutations, just describe
how your Component should look at any point in time.

### Scheduler

Scheduler for batching read and write DOM tasks.

### Misc

- Automatic management of data dependencies in UI components with
  `Invalidator` objects.

```js
app.entry.d = new vdom.CDescriptor();
app.entry.d.update = function(c) {
  // `subscribe(d)` and `tempSubscribe(d)` are used to subscribe for
  // `Invalidator` objects.
  //
  // Each time Component is invalidated, old temp subscriptions will be
  // automatically canceled, so we just register a new one when something
  // is changed.
  c.tempSubscribe(c.data.dependency);

  c.updateRoot(...);
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
app.box.d = new vdom.CDescriptor();
// Tag name of the root element for this Component. Default tag is 'div'.
app.box.d.tag = 'span';

// Function that responsible for updating internal state and the view
// of the Component.
// Each time when Component is invalidated (new data is passed, or
// `invalidate()` method is called), it will be updated during Scheduler
// write phase.
// First parameter is an instance of the Component.
app.box.d.update = function(c) {
  // updateRoot method is used to update internal representation using
  // Virtual DOM API.
  c.updateRoot(kivi.createElement('span').children(c.data));
};

app.main.d = new vdom.CDescriptor();
app.main.d.update = function(c) {
  c.updateRoot(kivi.createRoot().children([
    kivi.createElement('span').children('Hello '),
    kivi.createComponent(app.box.d, c.data)
  ]));
};

// Instantiate and inject component into document body.
kivi.injectComponent(app.main.d, 'kivi', document.body);
```
