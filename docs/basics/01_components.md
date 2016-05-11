# Components

Components are the foundational feature of the kivi library. They are tightly integrated with kivi Scheduler, and should
be used as a basic building block for creating user interfaces. Component can be a simple HTML element, SVG element,
or a canvas object. To update its representation it is possible to use direct DOM manipulations, Virtual DOM API, or
draw on a canvas.

## ComponentDescriptor

Each component should declare its properties and behavior in `ComponentDescriptor` object. TypeScript users can specify
its props type and state type with parametric types P and S `ComponentDescriptor<P, S>`.

Component descriptor provides a `createComponent` and `createRootComponent` methods to create component instances.

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

const MyComponent = new ComponentDescriptor<Props, State>()
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

Method: `componentDescriptor.tagName(tagName: string): ComponentDescriptor<P, S>`

Set tag name for the root element.

```ts
const MyComponent = new ComponentDescriptor<any, any>()
  .tagName("table");
```

##### svg

Method: `componentDescriptor.svg(): ComponentDescriptor<P, S>`

Use SVG Namespace to create a root element.

```ts
const MySvgComponent = new ComponentDescriptor<any, any>()
  .svg()
  .tagName("circle");
```

##### canvas

Method: `componentDescriptor.canvas(): ComponentDescriptor<P, S>`

Turn component into a canvas.

```ts
const MyCanvasComponent = new ComponentDescriptor<any, any>()
  .canvas()
  .update((c) => {
    const ctx = c.get2DContext();
    ctx.fillStyle = "red";
    ctx.fillRect(0, 0, 10, 10);
  });
```

### Lifecycle Handlers

##### init

Method: `componentDescriptor.init((c: Component<P, S>) => void): ComponentDescriptor<P, S>`

Set lifecycle handler init.

`element` and `props` properties will be initialized before init handler is invoked.

```ts
const MyComponent = new ComponentDescriptor<any, any>()
  .tagName("button")
  .init((c) => {
    c.element.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log("clicked");
    });
  })
  .vRender((c, root) => { root.children("click me"); });
```

##### update

Method: `componentDescriptor.update((c: Component<P, S>) => void): ComponentDescriptor<P, S>`

Set lifecycle handler update.

Update handler overrides default update behavior.

```ts
const MyComponent = new ComponentDescriptor<{a: number}, any>()
  .update((c) => { c.sync(c.createVRoot().children("content")); });
```

##### attached

Method: `componentDescriptor.attached((c: Component<P, S>) => void): ComponentDescriptor<P, S>`

Set lifecycle handler attached.

Attached handler will be invoked when component is attached to the document.

```ts
const onChange = new Invalidator();

const MyComponent = new ComponentDescriptor<any, any>()
  .attached((c) => {
    c.subscribe(onChange);
  })
  .vRender((c, root) => { root.children("content"); });

onChange.invalidate();
```

##### detached

Method: `componentDescriptor.detached((c: Component<P, S>) => void): ComponentDescriptor<P, S>`

Set lifecycle handler detached.

Detached handler will be invoked when component is detached from the document.

```ts
const MyComponent = new ComponentDescriptor<any, {onResize: (e: Event) => void}>()
  .init((c) => {
    c.state = {
      onResize: (e) => { console.log("window resized"); }
    };
  })
  .attached((c) => {
    window.addEventListener("resize", c.state.onResize);
  })
  .detached((c) => {
    window.removeEventListener(c.state.onResize);
  })
  .vRender((c, root) => { root.children("content"); });
```

##### disposed

Method: `componentDescriptor.disposed((c: Component<P, S>) => void): ComponentDescriptor<P, S>`

Set lifecycle handler disposed.

Disposed handler will be invoked when component is disposed.

```ts
let allocatedComponents = 0;

const MyComponent = new ComponentDescriptor<any, {onResize: (e: Event) => void}>()
  .init((c) => {
    allocatedComponents++;
  })
  .disposed((c) => {
    allocatedComponents--;
  })
  .vRender((c, root) => { root.children("content"); });
```

##### newPropsReceived

Method: `componentDescriptor.newPropsReceived((c: Component<P, S>, newProps: P) => void): ComponentDescriptor<P, S>`

Set newPropsReceived handler.

New props received handler overrides default props received behavior and it should mark component as dirty if new
received props will cause change in component's representation.

```ts
const MyComponent = new ComponentDescriptor<{a: number}, any>()
  .newPropsReceived((c, newProps) => {
    if (c.props.a !== newProps.a) {
      c.markDirty();
    }
  })
  .vRender((c, root) => { root.children(c.props.toString()); });
```

## Component

### Basic API

##### invalidate

Method: `component.invalidate(): boolean`

Invalidates a component and registers in the scheduler queue for update, when scheduler starts writing to the DOM, it
will invoke `update` method of the invalidated component.

##### update

Method: `component.update(newProps?: P)`

Set new props and update component.

Props are checked by their identity, unless it is disabled by component descriptor method `disableCheckDataIdentity()`.
