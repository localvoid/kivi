# Components

Components are the foundational feature of the kivi library. They are tightly integrated with kivi Scheduler, and should
be used as a basic building block for creating user interface. Component can be a simple HTML element, SVG element,
or a canvas object. To update its representation it is possible to use direct DOM manipulations, Virtual DOM API, or
draw on a canvas.

## ComponentDescriptor

Each component should declare its properties and behavior in `ComponentDescriptor` object. TypeScript users can specify
its props type, state type and auxiliary data type with parametric types `ComponentDescriptor<P, S, D>`.

Component descriptor provides a `createComponent` and `createRootComponent` methods to create component instances.
`createRootComponent` method is used when component doesn't have any parents.

### Example

```ts
class Props {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}

class State {
  xy: number;

  constructor(props: Props) {
    this.xy = props.x * props.y;
  }
}

const MyComponent = new ComponentDescriptor<Props, State, any>()
  .canvas()
  .init((c) => {
    c.state = new State(c.props);
  })
  .update((c) => {
    const ctx = c.get2DContext();
    ctx.fillStyle = 'rgba(0, 0, 0, 1)';
    ctx.fillRect(c.props.x, c.props.y, c.state.xy, c.state.xy);
  });

const componentInstance = MyComponent.createRootComponent(new Data(10, 20));
```

### Basic API

##### tagName

Method: `componentDescriptor.tagName(tagName: string): ComponentDescriptor<P, D, S>`

Specifies a tagName of the root element.

##### svg

Method: `componentDescriptor.svg(): ComponentDescriptor<P, D, S>`

Root element will be created in SVG namespace.

##### canvas

Method: `componentDescriptor.canvas(): ComponentDescriptor<P, D, S>`

Root element will be a canvas object, `Component.get2DContext(): CanvasRenderingContext2D` will return a canvas context.

### Lifecycle Methods

##### init

Method: `componentDescriptor.init((c: Component<P, D, S>) => void): ComponentDescriptor<P, D, S>`

Init callback will be invoked when component is instantiated, `element`, `data` and `children` properties will be
ready before init callback.

##### update

Method: `componentDescriptor.update((c: Component<P, D, S>) => void): ComponentDescriptor<P, D, S>`

Update callback will be invoked each time when component should update its representation.

##### attached

Method: `componentDescriptor.attached((c: Component<P, D, S>) => void): ComponentDescriptor<P, D, S>`

Attached callback will be invoked when component is attached to the document.

##### detached

Method: `componentDescriptor.detached((c: Component<P, D, S>) => void): ComponentDescriptor<P, D, S>`

Detached callback will be invoked when component is detached from the document.

##### disposed

Method: `componentDescriptor.disposed((c: Component<P, D, S>) => void): ComponentDescriptor<P, D, S>`

Disposed callback will be invoked when component is disposed.

## Component instance API

##### setProps

Method: `component.setProps(newProps: D): boolean`

Sets a new props for a component. Returns true if props are changed.

##### invalidate

Method: `component.invalidate(): boolean`

Invalidates a component and registers in the scheduler queue for updates, when scheduler starts writing to the DOM, it
will invoke `update` method of the invalidated component.

##### update

Method: `component.update()`

Update component if component is dirty and attached to the document.
