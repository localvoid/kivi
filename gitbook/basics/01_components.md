# Components

Components are the foundational feature of the kivi library. They are tightly integrated with kivi Scheduler, and should
be used as a basic building block for creating user interfaces. Component can be a simple HTML element, SVG element,
or a canvas object. To update its representation it is possible to use direct DOM manipulations, Virtual DOM API, or
draw on a canvas.

To create components, we need to declare its properties and behavior in `ComponentDescriptor` instance, it acts as a
virtual table for component instances. Each component created from component descriptor will be automatically linked
to its descriptor.

## ComponentDescriptor

TypeScript developers can provide types for props and state, ComponentDescriptor has two parameteric types: `P` for
props type and `S` for state type.

To create component instances, we can use one of the two methods: `createComponent`, or `createRootComponent`. The
difference between them is that root component doesn't have a parent component. For example:

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
  .init((c, props) => {
    c.state = new State(props);
  })
  .update((c, props, state) => {
    const ctx = c.get2DContext();
    ctx.fillStyle = 'rgba(0, 0, 0, 1)';
    ctx.fillRect(props.x, props.y, state.xy, state.xy);
  });

const componentInstance = MyComponent.createRootComponent(new Props(10, 20));
```

### Setting component properties

Component descriptor instance has many different methods to set properties, all property methods support method
chaining. For example:

```ts
const MyComponent = new ComponentDescriptor<number, void>()
  .svg()
  .tagName("a")
  .update((c) => { c.element.width = this.props; });
```

List of basic properties:

```
ComponentDescriptor<P, S>.tagName(tagName: string): ComponentDescriptor<P, S>;
ComponentDescriptor<P, S>.svg(): ComponentDescriptor<P, S>;
```

## Using Virtual DOM

To use virtual dom in components, we need to call a `sync` method that will sync component's representation with a
virtual dom. For example:

```ts
const MyComponent = new ComponentDescriptor<{title: string, content: string}, void>()
  .update((c, props) => {
    c.sync(c.createVRoot()
      .children([
        createVElement("h1").child(props.title),
        createVElement("p").child(props.content),
      ]));
  });
```
To create virtual nodes that represent components, use component descriptor method `createVNode(data?: D)`. For example:

```ts
const vnode = MyComponent.createVNode({
  title: "Component Example",
  content: "content",
});
```

## Drawing on a canvas

To use canvas as a surface for component representation, enable canvas mode with component descriptor method
`descriptor.canvas()`. For example:

```ts
const MyCanvasComponent = new ComponentDescriptor<void, void>()
  .canvas()
  .update((c) => {
    const ctx = c.get2DContext();
    ctx.fillStyle = "red";
    ctx.fillRect(0, 0, 10, 10);
  });
```

## Lifecycle methods

### init

Init handler will be invoked after component state is created, `element` and `props` properties will be
initialized before init handler is invoked.

```ts
const MyComponent = new ComponentDescriptor<void, void>()
  .tagName("button")
  .init((c, props, state) => {
    c.element.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log("clicked");
    });
  })
  .update((c) => {
    c.sync(c.createVRoot().child("click me"));
  });
```

### update

Update handler will be invoked when component gets updated either by binding new props, or when it is registered in
one of the scheduler component queues.

Update handler completely overrides default update behavior, so to continue using virtual dom for updates, we can
use `sync` method.

```ts
const MyComponent = new ComponentDescriptor<{a: number}, void>()
  .update((c, props, state) => {
     c.sync(c.createVRoot().child(props.a.toString()));
  });
```

### attached

Attached handler will be invoked when component is attached to the document.

```ts
const onChange = new Invalidator();

const MyComponent = new ComponentDescriptor<void, void>()
  .attached((c, props, state) => {
    c.subscribe(onChange);
  })
  .update((c) => {
     c.sync(c.createVRoot().child("content"));
  });

onChange.invalidate();
```

### detached

Detached handler will be invoked when component is detached from the document.

```ts
const MyComponent = new ComponentDescriptor<void, {onResize: (e: Event) => void}>()
  .init((c) => {
    c.state = {onResize: (e) => { console.log("window resized"); }};
  })
  .attached((c, props, state) => {
    window.addEventListener("resize", state.onResize);
  })
  .detached((c, props, state) => {
    window.removeEventListener(state.onResize);
  })
  .update((c) => {
     c.sync(c.createVRoot().child("content"));
  });
```

### disposed

Disposed handler will be invoked when component is disposed.

```ts
let allocatedComponents = 0;

const MyComponent = new ComponentDescriptor<void, void>()
  .init((c) => {
    allocatedComponents++;
  })
  .disposed((c) => {
    allocatedComponents--;
  })
  .update((c) => {
     c.sync(c.createVRoot().child("content"));
  });
```

### newPropsReceived

New props received handler overrides default props received behavior and it should mark component as dirty if new
received props will cause change in component's representation.

```ts
const MyComponent = new ComponentDescriptor<{a: number}, void>()
  .newPropsReceived((c, oldProps, newProps) => {
    if (oldProps.a !== newProps.a) {
      c.markDirty();
    }
  })
  .update((c) => {
     c.sync(c.createVRoot().child(props.a.toString()));
  });
```
