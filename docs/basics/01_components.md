# Components

Components are the foundational feature of the kivi library. They are tightly integrated with kivi Scheduler, and should
be used as a basic building block for creating user interfaces. Component can be a simple HTML element, SVG element,
or a canvas object. To update its representation it is possible to use direct DOM manipulations, Virtual DOM API, or
draw on a canvas.

To create components, we need to declare its properties and behavior in `ComponentDescriptor` instance, it acts as a
virtual table for component instances. Each component created from component descriptor will be automatically linked
to its descriptor.

## ComponentDescriptor

For typescript developers, ComponentDescriptor has two parameteric types: `P` for props type and `S` for state type.

To create component instances, we can use one of the two methods: `createComponent`, or `createRootComponent`. The
difference between them is that root component doesn't have any parent component. For example:

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

### Setting component properties

Component descriptor instance has many different methods to set properties, all property methods support method
chaining. For example:

```ts
const MyComponent = new ComponentDescriptor<number, any>()
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

To use virtual dom in components, we need to declare a function `vRender` in `ComponentDescriptor` that will render
components representation with a virtual dom. For example:

```ts
const MyComponent = new ComponentDescriptor<{title: string, content: string}, any>()
  .vRender((c, root) => {
    root.children([
      createVElement("h1").children(c.props.title),
      createVElement("p").children(c.props.content),
    ]);
  });
```

First parameter of a render function is a component instance, and the second is a virtual node representing a root
element.

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
const MyCanvasComponent = new ComponentDescriptor<any, any>()
  .canvas()
  .update((c) => {
    const ctx = c.get2DContext();
    ctx.fillStyle = "red";
    ctx.fillRect(0, 0, 10, 10);
  });
```

## Lifecycle methods

### init

Init handler will be invoked immediately after component is instantiated, `element` and `props` properties will be
initialized before init handler is invoked.

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

### update

Update handler will be invoked when component gets updated either by binding new props, or when it is registered in
one of the scheduler component queues.

Update handler completely overrides default update behavior, so to continue using virtual dom for updates, we can
use `vSync` method.

```ts
const MyComponent = new ComponentDescriptor<{a: number}, any>()
  .update((c) => { c.vSync(c.createVRoot().children("content")); });
```

### attached

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

### detached

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

### disposed

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

### newPropsReceived

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
