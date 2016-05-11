# Virtual DOM

Virtual DOM simplifies the way to manage DOM mutations, just describe how your component should look at any point in
time and Virtual DOM reconciliation algorithm will make all necessary DOM operations to update component representation
in a most efficient way.

The basic Virtual DOM API that kivi provides is enough for most use cases. But when it isn't enough, kivi provides many
advanced tools that can reduce Virtual DOM diffing overhead, and it will be quite hard to beat its performance without
reimplementing similar algorithms.

## Basic API

### Creating Virtual DOM Nodes

##### createVElement

Function: `createVElement(tagName: string): VNode`

Creates a virtual node representing a HTML Element.

##### createVSvgElement

Function: `createVSvgElement(tagName: string): VNode`

Creates a virtual node representing a SVG Element.

##### createVText

Function: `createVText(content: string): VNode`

Creates a virtual node representing a Text Node.

### Setting VNode properties

VNode object provides different chained methods to set properties.

For example:

```ts
const e = createVElement("a")
  .attrs({
    "href": "localhost",
    "title": "Link to localhost",
  })
  .children("Link to localhost");
```

##### attrs

Method: `vnode.attrs(attrs: {[key: string]: any}): VNode`

Set HTML attributes.

Attrs object should always have the same shape when creating virtual node representing the same element. To specify
dynamic shape attributes use `dynamiShapeAttrs` method.

##### props

Method: `vnode.props(props: {[key: string]: any}): VNode`

Set properties.

Props object should always have the same shape when creating virtual node representing the same element. To specify
dynamic shape properties use `dynamiShapeProps` method.

When virtual node is mounted on top of existing HTML, all properties will be assigned during mounting phase.

##### style

Method: `vnode.style(style: string): VNode`

Set style in CSS string format.

##### class name

Method: `vnode.className(className: string): VNode`

Set class name.

##### children

Method `vnode.children(children: VNode[]|string): VNode`

Set children.

##### trackByKeyChildren

Method: `vnode.trackByKeyChildren(children: VNode[]): VNode`

Set children with enabled tracking by key, all children should have a key and it should be unique among its siblings.

##### key

Method: `vnode.key(key: any): VNode`

Set key.

Key should be unique among its siblings.

When track by key is enabled, children reconciliation algorithm uses a key value to find virtual node in old children
list that represented the same DOM node.

### Using Virtual DOM with components

##### vRender

Method: `componentDescriptor.vRender((c: Component<P, S>, root: VNode) => VNode)`

Set default Virtual DOM render function.
