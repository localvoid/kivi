# Components

## Component recycling

When there are many instances of a component and they are frequently removed and inserted into the document, it
is a good practice to enable recycling, so instead of disposing component instances when they are removed from the
document, they will be placed into recycled pool, and when component instance is created it will always check if
recycled pool has any available instance and just reuse it.

Component descriptor method `enableComponentRecycling(maxRecycled: number)` will enable recycling for component,
`maxRecycled` parameter controls the size of recycled pool for this component type.

```ts
const Button = new ComponentDescriptor()
  .enableComponentRecycling(100)
  .update((c) => {
    c.sync(c.createVRoot().className("button"));
  });
```

Note: kivi library should be compiled with enabled component recycling. To enable recycling, replace all string
occurences `<@KIVI_COMPONENT_RECYCLING@>` with `COMPONENT_RECYCLING_ENABLED`.

## Animated components

To update components on each frame, just add them to the list of components that should be updated on each frame with
method `startUpdateEachFrame()`. For example:

```ts
const AnimatedComponent = new ComponentDescriptor()
  .init((c) => {
    c.startUpdateEachFrame();
  })
  .update((c) => {
    c.element.style.color = `rgba(0, 0, 0, ${Math.random()})`;
  });
```

`stopUpdateEachFrame()` method will remove component from the list of components that should be updated on each frame.

## Immutable Component VNodes

Immutable VNodes should contain props that are deeply immutable, reconciliation algorithm will check props object for
identity before triggering an update. If props identity is the same, then component won't be updated.

```ts
const Button = new ComponentDescriptor<{text: string}, void>()
  .update((c, props) => {
    c.sync(c.createVRoot().className(props.text));
  });

Button.createImmutableVNode({text: "click me"});
```

Parents are usually know better when they are passing mutable or immutable props to the children, so instead of checking
props for identity in `newPropsReceived`, it is a good practice to use immutable vnodes.
