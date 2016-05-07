# Components

Components are the foundational feature of the kivi library. They are tightly integrated with kivi Scheduler, and should
be used as a basic building block for creating a user interface. Component can be a simple HTML element, SVG element,
or a canvas object. To update its representation it is possible to use direct DOM manipulations, Virtual DOM API, or
draw on a canvas.

## ComponentDescriptor

Each component should declare its properties and behavior in `ComponentDescriptor` object. TypeScript users can specify
its input data type and state type with parametric types `ComponentDescriptor<D, S>`.

Component descriptor provides a `createComponent` method to create component instances. First parameter is a parent
component, second is an input data and third is a children. Parent component is used to determine the depth of the
component in components tree, scheduler is using this information to prioritize updates of components with the lowest
depth, so when several components are invalidated, parents should update before its children to prevent unnecessary
computation when invalidated child is removed.

### Example

```ts
class Data {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}

class State {
  xy: number;

  constructor(data: Data) {
    this.xy = data.x * data.y;
  }
}

const MyComponent = new ComponentDescriptor<Data, State>()
  .canvas()
  .init((c) => {
    c.state = new State(c.data);
  })
  .update((c) => {
    const ctx = c.get2DContext();
    ctx.fillStyle = 'rgba(0, 0, 0, 1)';
    ctx.fillRect(c.data.x, c.data.y, c.state.xy, c.state.xy);
  });

const componentInstance = MyComponent.createComponent(undefined, new Data(10, 20));
```

### Properties

##### `tagName(tagName: string): ComponentDescriptor`

Specifies a tagName of the root element.

##### `svg(): ComponentDescriptor`

Root element will be created in SVG namespace.

##### `canvas(): ComponentDescriptor`

Root element will be a canvas object, `Component.get2DContext(): CanvasRenderingContext2D` will return a canvas context.

### Data setters

##### `setData(c: Component<D, S>, oldData: D, newData: D)`

If new data changes representation of the component, data setter should mark component as dirty with
`Component.markDirty()` method.

Default data setter will check identity of the data objects, and mark component as dirty when its identity isn't the
same. To prevent identity checking, use `ComponentDescriptor.disableIdentityChecking()` method.

##### `setChildren(c: Component<D, S>, oldChildren: VNode[]|string, newChildren: VNode[]|string)`

If new children changes representation of the component, children setter should mark component as dirty with
`Component.markDirty()` method.

Default children setter will check identity of the children objects, and mark component as dirty when its identity isn't
the same.

### Lifecycle Methods

##### `init(c: Component<D, S>)`

Init callback will be invoked when component is instantiated, `element`, `data` and `children` properties will be
ready before init callback.

##### `update(c: Component<D, S>)`

The update method is required by all components.

It will be invoked each time when component should update its state or representation.

##### `invalidated(c: Component<D, S>)`

Invalidated callback will be invoked when component is invalidated with `Component.invalidate()` method.

##### `attached(c: Component<D, S>)`

Attached callback will be invoked when component is attached to the document.

##### `detached(c: Component<D, S>)`

Detached callback will be invoked when component is detached from the document.

##### `disposed(c: Component<D, S>)`

Disposed callback will be invoked when component is disposed.

## Component

Most of the time components will be created and destroyed automatically with Virtual DOM API, but it is possible to use
them directly.

When using components directly, all lifecycle methods should be invoked manually, so when component is created it can be
attached to the document with a simple native DOM call `element.appendChild(component.element)`, immediately after
attaching it is required to call `component.attach()` method and then it can be updated with `component.update()`
method. When component is removed, depending on the use case it can be temporarily detached and then it is required to
call `component.detach()`, otherwise if component isn't needed anymore it is required to call `component.dispose()` to
destroy component.

Kivi also provides a simple function
`injectComponent(descriptor: ComponentDescriptor<D, S>, container: Element, data?: D): Component<D, S>` that hides all
this details when injecting component to the document.

##### `Component<D>.setData(newData: D)`

Sets a new data for a component.

##### `Component<D>.setChildren(newChildren: VNode[]|string)`

Sets a new children for a component.

##### `Component.invalidate()`

Invalidates a component and registers in the scheduler queue for updates, when scheduler starts writing to the DOM, it
will invoke `update` method of the invalidated component.

##### `Component.markDirty()`

Mark component as dirty without registering in the scheduler queue.

##### `Component.update()`

Update component if component is dirty and attached to the document.
