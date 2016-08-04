# Events

## Event Delegation

Event delegation is an old optimization technique and there are [many](https://davidwalsh.name/event-delegate)
[good](https://learn.jquery.com/events/event-delegation/) explanations of this technique.

Kivi provides several methods that can help writing delegated event handlers.

Component descriptor method `createDelegatedEventHandler` returns a function that can be used as an event handler.

First parameter is a selector that will be used to match the `target` element. Second parameter is a selector for a
component's root element, it can be a string or a boolean value, if it is a boolean value and it is `true` then
matching target will be used as a root element, if it is `false` then `currentTarget` element will be used as a root.
Third parameter is an event handler that receives event, component, props and state params.

Component's root element is required because we need to find reference to a component instance from this element, by
default component instances aren't associated with root elements. To enable back references, component descriptors has
a method `enableBackRef()`.

```ts
const ClickableComponent = new ComponentDescriptor<string, void>()
  .enableBackRef()
  .update((c, text) => {
    c.sync(c.createVRoot().className("clickable").children(text));
  });

ClickableComponent.createDelegatedEventHandler(".clickable", true, (e, c, text) => {
  e.stopPropagation();
  console.log(`Clicked on ${text}`);
});

const Container = new ComponentDescriptor<string[], void>()
  .attached((c) => {
    c.element.onclick = onClick;
  })
  .update((c, items) => {
    c.sync(c.createVRoot()
      .children(items.map((i) => ClickableComonent.createVNode(i))));
  })
```