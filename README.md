# kivi

Javascript UI library with TypeScript typings.

## Example

```js
import {
  createVRoot,
  createVElement,
  ComponentDescriptor,
  scheduler
} from 'kivi';

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
  Main.inject('kivi', document.body);
});
```
