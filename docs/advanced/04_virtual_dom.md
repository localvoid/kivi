# Virtual DOM

## Bind Once

Bind once is a similar technique to shallow updates with a more fine-grained control.

```ts
createVElement("div").children([
  Header.createVNode({"title": "MyCompany"}).bindOnce(),
  Content.createVNode(content),
  Footer.createVNode({"key": "value"}).bindOnce(),
]);
```

## Static Nodes

When some part of component is just a large static block, it is possible to prevent reconciliation algorithm from
diffing it by reusing the same virtual node on each render. For example:

```ts
const MyComponent = new ComponentDescriptor<any, { node: VNode }>()
  .init((c) => {
    c.state = {
      node: createVElement("div").children("pretend that there is some heavy content..."),
    };
  })
  .vRender((c, root) => {
    root.children([
      createVElement("section").className("header"),
      c.state.node,
      createVElement("section").className("footer"),
    ]);
  });
```

## Keep Alive \*\*EXPERIMENTAL\*\*

Keep alive prevents reconciliation algorithm from disposing components, so when they are removed from the document,
instead of disposing them, they are detached.

```ts
const MyComponent = new ComponentDescriptor<{ showChild: boolean }, { aliveNode: VNode }>()
  .init((c) => {
    c.state = {
      aliveNode: ChildComponent.createVNode().keepAlive(),
    };
  })
  .vRender((c, root) => {
    if (this.props.showChild) {
      root.children([c.state.aliveNode]);
    }
  });
```
