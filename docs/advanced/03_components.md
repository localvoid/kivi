# Component advanced techniques

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

## Shallow update

Shallow updates will perform updates on a subtree of nodes without binding new props and triggering updates for
subcomponents.

```ts
const MyComponent = new ComponentDescriptor()
  .update((c) => {
    c.advancedVSync(RenderFlags.ShallowUpdate, c.createVRoot().children([
      ChildComponent.createVRoot(),
      ChildComponent.createVRoot(),
    ]));
  });
```

`RenderFlags` also has a flag for shallow rendering `ShallowRender` that prevents from rendering subcomponents when they
are created for the first time.

## Incremental rendering

Components provide two methods that can trigger incremental rendering: `startInteraction()` and `stopInteraction()`.

`startInteraction()` will enable throttling mode in the scheduler, increment its dependency counter, and mark component
as a high priority component. High priority components will be updated even if timeframe for a throttled frame is over.

`finishInteraction()` will decrease throttling mode dependency counter, and when this counter gets to zero, it will
disable throttling mode. It also removes flag indicating that component should be a high priority for updates.
