# Virtual DOM

Virtual DOM simplifies the way to manage DOM mutations, just describe how your component should look at any point in
time and Virtual DOM reconciliation algorithm will make all necessary DOM operations to update component representation
in a most efficient way.

The basic Virtual DOM API that kivi provides is enough for most use cases. But when it isn't enough, kivi provides many
advanced tools that can reduce Virtual DOM diffing overhead, and it will be quite hard to beat its performance without
reimplementing similar algorithms.

## Basic API

### Creating Virtual DOM Nodes

##### `createVElement(tagName: string): VNode`

Creates a virtual node representing a HTML Element.

##### `createVSvgElement(tagName: string): VNode`

Creates a virtual node representing a SVG Element.

##### `createVText(content: string): VNode`

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

##### `attrs(attrs: {[key: string]: any})`

Set HTML attributes.

Attrs object should always have the same shape when creating virtual node representing the same element. To specify
dynamic shape attributes use `dynamiShapeAttrs(attrs: {[key: string]: any})` method.

##### `props(props: {[key: string]: any})`

Set properties.

Props object should always have the same shape when creating virtual node representing the same element. To specify
dynamic shape properties use `dynamiShapeProps(props: {[key: string]: any})` method.

When virtual node is mounted on top of existing HTML, all properties will be assigned during mounting phase.

##### `style(style: string)`

Set style in CSS string format.

##### `className(className: string)`

Set class name.

##### `children(children: VNode[]|string)`

Set children.

##### `trackByKeyChildren(children: VNode[])`

Set children with enabled tracking by key, all children should have a key and it should be unique among its siblings.

##### `key(key: any)`

Set key.

Key should be unique among its siblings.

When track by key is enabled, children reconciliation algorithm uses a key value to find virtual node in old children
list that represented the same DOM node.

### Using Virtual DOM with components

##### `ComponentDescriptor<D, S>.vRender((c: Component<D, S>, root: VNode) => VNode)`

Set default Virtual DOM render function.
