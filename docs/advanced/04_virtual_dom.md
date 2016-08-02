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
const MyComponent = new ComponentDescriptor<void, {node: VNode}>()
  .init((c) => {
    c.state = {node: createVElement("div").children("pretend that there is some heavy content...")};
  })
  .update((c, props, state) => {
    c.vSync(c.createVRoot()
      .children([
        createVElement("section").className("header"),
        state.node,
        createVElement("section").className("footer"),
      ]));
  });
```

## Keep Alive

Keep alive prevents reconciliation algorithm from disposing components, so when they are removed from the document,
instead of disposing them, they are detached.

```ts
const MyComponent = new ComponentDescriptor<{showChild: boolean}, {aliveComponent: Component}>()
  .init((c) => {
    c.state = {aliveComponent: ChildComponent.createComponent()};
  })
  .update((c, props, state) => {
    const root = c.createVRoot();
    if (props.showChild) {
      root.children([ChildComponent.createVNode().keepAlive(state.aliveComponent)]);
    }
    c.vSync(root);
  });
```
