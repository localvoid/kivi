# kivi

Library for building web UIs with large code base **>50kb**, incompatible
with [React](https://facebook.github.io/react/) API and it works only with
[google-closure-compiler](https://github.com/google/closure-compiler)
, because obviously author is a fan of Java and OOP, so you should better
go find something more lightweight and *functional*.

The core component of this library is a *virtual dom*, invented by React
developers, so don't expect that rendering will be fast, vanilla js
ninjas showed that this isn't the case for *virtual dom*.

## Example

Just look how much Java in this code, who would ever want to write
javascript code in that style:

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
  app.main.d = new kivi.CDescriptor('Main');
  
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
