# VModel

VModel objects are used to reduce diff overhead by declaring static properties on VModel and linking virtual nodes
with it.

For example:

```ts
const Header = new VModel("section")
  .attrs({
    "id": "Header",
  })
  .className("container");

const vnode = Header.createVNode()
  .style("top: 20px");
```

Here we created `Header` model with static attributes and class name, and then created a virtual node with dynamic
style. When virtual node will be synced, reconciliation algorithm will perform diff only on style property.

## DOM node cloning

When element has many static properties and there are many instances of this element in application, it is useful to
use DOM node cloning to reduce overhead for creating DOM nodes.

To enable cloning, use `model.enableCloning()` method, for example:

```ts
const Header = new VModel("section")
  .enableCloning()
  .attrs({
    "id": "Header",
  })
  .className("container");
```

Each time when new DOM element represented by this model is created, it will use internal instance of this element
and clone it using DOM method `element.cloneNode(false)`.

## Overriding default diff algorithm

It is possible to completely override default diff algorithm with `updateHandler` method and use native DOM operations
to update DOM element.

For example:

```ts
const Header = new VModel<number>("section")
  .updateHandler((element, oldProps, newProps) => {
    if (oldProps === undefined || oldProps !== newProps) {
      element.style.top = newProps.toString() + "px";
    }
  )
  .attrs({
    "id": "Header",
  })
  .className("container");

Header.createVNode(10);
```

Here we declared props type as a parameteric type for a VModel, and assigned custom update handler. Custom update
handler receives element, old properties and new properties, when old properties is equal to `undefined`, it means that
element was created just now, otherwise it should be updated.
