import { printError } from "./debug";
import { SvgNamespace, VNodeFlags, VNodeDebugFlags, ComponentDescriptorFlags, setAttr } from "./misc";
import { Component, ComponentDescriptor, updateComponent } from "./component";
import { ElementDescriptor } from "./element_descriptor";

/**
 * Virtual DOM Node.
 *
 * VNode object is the core object in kivi Virtual DOM, it can represent any node type.
 *
 * The easiest way to create VNode instances is to use factory functions:
 *
 *     // HTMLElement
 *     const htmlElement = createVElement("div");
 *     // SVGElement
 *     const svgElement = createVSvgElement("a");
 *     // Text node
 *     const textNode = createVText("text content");
 *     // Component's root node
 *     const root = createVRoot();
 *
 * VNode instances can't be reused to represent multiple DOM nodes.
 *
 * @final
 */
export class VNode {
  /**
   * Flags, see `VNodeFlags` for details.
   */
  _flags: VNodeFlags;
  /**
   * Tag name of the element, reference to an ElementDescriptor, or ComponentDescriptor if this node represents a
   * component.
   */
  _tag: string | ElementDescriptor<any> | ComponentDescriptor<any, any> | null;
  /**
   * Children reconciliation algorithm is using key property to find the same node in the previous children array. Key
   * should be unique among its siblings.
   */
  _key: any;
  /**
   * Properties.
   *
   * When virtual node represents an element, props property is used to set properties directly on DOM node:
   *
   *     e: HTMLElement;
   *     e.propertyName = propertyValue;
   *
   * When virtual node is mounted on top of existing HTML, all properties will be assigned during mounting phase.
   */
  _props: any;
  /**
   * Attributes.
   *
   * All attributes are assigned to DOM nodes with `setAttribute` method:
   *
   *     e: HTMLElement;
   *     e.setAttribute(key, value);
   *
   * If attribute is prefixed with "xlink:", or "xml:" namespace, it will assign attributes with `setAttributeNS`
   * method and use appropriate namespaces.
   */
  _attrs: { [key: string]: any } | null;
  /**
   * Style in css string format.
   *
   * Style is assigned to DOM nodes with `style.cssText` property, if virtual node represents an element from svg
   * namespace, style will be assigned with `setAttribute("style", "cssText")` method.
   */
  _style: string | null;
  /**
   * Class name.
   *
   * Class name is assigned to DOM nodes with `className` property, if virtual node represents an element from svg
   * namespace, class name will be assigned with `setAttribute("class", "className")` method.
   */
  _className: string | null;
  /**
   * Children property can contain flat array of children virtual nodes, or text if it contains a single text node
   * child. If virtual node represents an input field, children property will contain input value.
   */
  _children: VNode[] | VNode | string | boolean | null;
  /**
   * Reference to HTML Node. It will be available after virtual node is created or synced. Each time VNode is synced,
   * reference to the HTML Node is transferred from old virtual node to the new one.
   */
  ref: Node | null;
  /**
   * Reference to a Component. If virtual node is a Component, then cref will be available after virtual node is
   * created or synced. Each time virtual node is synced, reference to a Component is transferred from old virtual
   * node to the new one.
   */
  cref: Component<any, any> | null;

  /**
   * Flags used in DEBUG mode.
   *
   * See `VNodeDebugFlags` for details.
   */
  _debugFlags: number;

  constructor(flags: number, tag: string | ElementDescriptor<any> | ComponentDescriptor<any, any> | null, props: any) {
    this._flags = flags;
    this._tag = tag;
    this._key = null;
    this._props = props;
    this._attrs = null;
    this._style = null;
    this._className = null;
    this._children = null;
    this.ref = null;
    this.cref = null;

    if ("<@KIVI_DEBUG@>" as string !== "DEBUG_DISABLED") {
      this._debugFlags = 0;
    }
  }

  /**
   * Set key.
   *
   * Children reconciliation algorithm is using key property to find the same node in the previous children array. Key
   * should be unique among its siblings.
   *
   * This method is available in all virtual node types.
   */
  key(key: any): VNode {
    this._key = key;
    return this;
  }

  /**
   * Set properties with static shape.
   *
   * Each time virtual node representing the same DOM node is created, it should have properties with exactly the same
   * shape. Values can be different, but all keys should be the same. For example:
   *
   *     const a = createVElement("div").props({"id": "Main", "title": "Title"});
   *     const b = createVElement("div").props({"id": "Main", "title": "New Title"});
   *
   * Props property is used to set properties directly on DOM node:
   *
   *     e: HTMLElement;
   *     e.propertyName = propertyValue;
   *
   * When virtual node is mounted on top of existing HTML, all properties will be assigned during mounting phase.
   *
   * If virtual node is using `ElementDescriptor` instance with custom update handler, update data should be assigned
   * with `data` method.
   *
   * This method is available on element and component's root virtual node types.
   */
  props(props: { [key: string]: any }): VNode {
    if ("<@KIVI_DEBUG@>" as string !== "DEBUG_DISABLED") {
      if ((this._flags & (VNodeFlags.Element | VNodeFlags.Root)) === 0) {
        throw new Error("Failed to set props on VNode: props method should be called on element or component" +
          " root nodes only.");
      }
      if ((this._flags & VNodeFlags.ElementDescriptor) !== 0) {
        if ((this._flags & VNodeFlags.ElementDescriptorUpdateHandler) !== 0) {
          throw new Error("Failed to set props on VNode: VNode is using ElementDescriptor with custom update handler.");
        }
        const eDescriptor = this._tag as ElementDescriptor<any>;
        if (eDescriptor._props !== null) {
          const keys = Object.keys(props);
          for (let i = 0; i < keys.length; i++) {
            if (eDescriptor._props.hasOwnProperty(keys[i])) {
              throw new Error(`Failed to set props on VNode: VNode is using ElementDescriptor that uses the same` +
                ` property "${keys[i]}".`);
            }
          }
        }
      }
    }
    this._props = props;
    return this;
  }

  /**
   * Set attributes with static shape.
   *
   * Each time virtual node representing the same DOM node is created, it should have attributes with exactly the same
   * shape. Values can be different, but all keys should be the same. For example:
   *
   *     const a = createVElement("div").attrs({"id": "Main", "title": "Title"});
   *     const b = createVElement("div").attrs({"id": "Main", "title": "New Title"});
   *
   * All attributes are assigned to DOM nodes with `setAttribute` method:
   *
   *     e: HTMLElement;
   *     e.setAttribute(key, value);
   *
   * If attribute is prefixed with "xlink:", or "xml:" namespace, it will assign attributes with `setAttributeNS`
   * method and use appropriate namespaces.
   *
   * If virtual node is using `ElementDescriptor` instance with custom update handler, update data should be assigned
   * with `data` method.
   *
   * This method is available on element and component's root virtual node types.
   */
  attrs(attrs: { [key: string]: any }): VNode {
    if ("<@KIVI_DEBUG@>" as string !== "DEBUG_DISABLED") {
      if ((this._flags & (VNodeFlags.Element | VNodeFlags.Root)) === 0) {
        throw new Error("Failed to set attrs on VNode: attrs method should be called on element or component" +
          " root nodes only.");
      }
      if ((this._flags & VNodeFlags.ElementDescriptor) !== 0) {
        if ((this._flags & VNodeFlags.ElementDescriptorUpdateHandler) !== 0) {
          throw new Error("Failed to set attrs on VNode: VNode is using ElementDescriptor with custom update handler.");
        }
        const eDescriptor = this._tag as ElementDescriptor<any>;
        if (eDescriptor._attrs !== null) {
          const keys = Object.keys(attrs);
          for (let i = 0; i < keys.length; i++) {
            if (eDescriptor._attrs.hasOwnProperty(keys[i])) {
              throw new Error(`Failed to set attrs on VNode: VNode is using ElementDescriptor that uses the same` +
                ` attribute "${keys[i]}".`);
            }
          }
        }
      }
    }
    this._attrs = attrs;
    return this;
  }

  /**
   * Set attributes with dynamic shape.
   *
   * Attributes can have different set of keys, when reconciliation algorithm updates attribute values, it will remove
   * attributes with `removeAttribute` method for all missing keys.
   *
   *     const a = createVElement("div").props({"id": "Main", "title": "Title"});
   *     const b = createVElement("div").props({"id": "Main"});
   *
   * All attributes are assigned to DOM nodes with `setAttribute` method:
   *
   *     e: HTMLElement;
   *     e.setAttribute(key, value);
   *
   * If attribute is prefixed with "xlink:", or "xml:" namespace, it will assign attributes with `setAttributeNS`
   * method and use appropriate namespaces.
   *
   * If virtual node is using `ElementDescriptor` instance with custom update handler, update data should be assigned
   * with `data` method.
   *
   * This method is available on element and component's root virtual node types.
   */
  dynamicShapeAttrs(attrs?: { [key: string]: any }): VNode {
    if ("<@KIVI_DEBUG@>" as string !== "DEBUG_DISABLED") {
      if ((this._flags & (VNodeFlags.Element | VNodeFlags.Root)) === 0) {
        throw new Error("Failed to set attrs on VNode: attrs method should be called on element or component" +
          " root nodes only.");
      }
      if ((this._flags & VNodeFlags.ElementDescriptor) !== 0) {
        if ((this._flags & VNodeFlags.ElementDescriptorUpdateHandler) !== 0) {
          throw new Error("Failed to set attrs on VNode: VNode is using ElementDescriptor with custom update handler.");
        }
        const eDescriptor = this._tag as ElementDescriptor<any>;
        if (eDescriptor._attrs !== null) {
          const keys = Object.keys(attrs);
          for (let i = 0; i < keys.length; i++) {
            if (eDescriptor._attrs.hasOwnProperty(keys[i])) {
              throw new Error(`Failed to set attrs on VNode: VNode is using ElementDescriptor that uses the same` +
                ` attribute "${keys[i]}".`);
            }
          }
        }
      }
    }
    this._flags |= VNodeFlags.DynamicShapeAttrs;
    this._attrs = attrs === undefined ? null : attrs;
    return this;
  }

  /**
   * Set data for ElementDescriptor update handler.
   *
   * This method is available on element and component's root virtual node types.
   */
  data(data: any): VNode {
    if ("<@KIVI_DEBUG@>" as string !== "DEBUG_DISABLED") {
      if ((this._flags & (VNodeFlags.Element | VNodeFlags.Root | VNodeFlags.ElementDescriptor)) === 0) {
        throw new Error("Failed to set data on VNode: data method should be called on element or component" +
          " root nodes represented by ElementDescriptors only.");
      }
      if ((this._flags & VNodeFlags.ElementDescriptorUpdateHandler) === 0) {
        throw new Error("Failed to set data on VNode: VNode should be using ElementDescriptor with update handler.");
      }
    }
    this._props = data;
    return this;
  }

  /**
   * Set style in css string format.
   *
   * Style is assigned to DOM nodes with `style.cssText` property, if virtual node represents an element from svg
   * namespace, style will be assigned with `setAttribute("style", "cssText")` method.
   *
   * This method is available on element and component's root virtual node types.
   */
  style(style: string | null): VNode {
    if ("<@KIVI_DEBUG@>" as string !== "DEBUG_DISABLED") {
      if ((this._flags & (VNodeFlags.Element | VNodeFlags.Root)) === 0) {
        throw new Error("Failed to set style on VNode: style method should be called on element or component" +
          " root nodes only.");
      }
      if ((this._flags & VNodeFlags.ElementDescriptor) !== 0) {
        if ((this._flags & VNodeFlags.ElementDescriptorUpdateHandler) !== 0) {
          throw new Error("Failed to set style on VNode: VNode is using ElementDescriptor with custom update handler.");
        }
        if (((this._tag as ElementDescriptor<any>)._style) !== null) {
          throw new Error("Failed to set style on VNode: VNode is using ElementDescriptor with assigned style.");
        }
      }
    }
    this._style = style;
    return this;
  }

  /**
   * Set className.
   *
   * Class name is assigned to DOM nodes with `className` property, if virtual node represents an element from svg
   * namespace, class name will be assigned with `setAttribute("class", "className")` method.
   *
   * This method is available on element and component's root virtual node types.
   */
  className(className: string | null): VNode {
    if ("<@KIVI_DEBUG@>" as string !== "DEBUG_DISABLED") {
      if ((this._flags & (VNodeFlags.Element | VNodeFlags.Root)) === 0) {
        throw new Error("Failed to set className on VNode: className method should be called on element or component" +
          " root nodes only.");
      }
      if ((this._flags & VNodeFlags.ElementDescriptor) !== 0) {
        if ((this._flags & VNodeFlags.ElementDescriptorUpdateHandler) !== 0) {
          throw new Error("Failed to set style on VNode: VNode is using ElementDescriptor with update handler.");
        }
        if (((this._tag as ElementDescriptor<any>)._className) !== null) {
          throw new Error("Failed to set style on VNode: VNode is using ElementDescriptor with assigned className.");
        }
      }
    }
    this._className = className;
    return this;
  }

  /**
   * Set single child.
   *
   * This method is available on element and component's root virtual node types.
   */
  child(child: VNode | string | null): VNode {
    if ("<@KIVI_DEBUG@>" as string !== "DEBUG_DISABLED") {
      if ((this._flags & (VNodeFlags.Element | VNodeFlags.Root)) === 0) {
        throw new Error("Failed to set child on VNode: child method should be called on element or component" +
          " root nodes only.");
      }
      if ((this._flags & VNodeFlags.InputElement) !== 0) {
        throw new Error("Failed to set child on VNode: input elements can't have children.");
      }
    }

    this._children = child;
    return this;
  }

  /**
   * Set children.
   *
   * This method is available on element and component's root virtual node types.
   */
  children(children: VNode[] | null): VNode {
    if ("<@KIVI_DEBUG@>" as string !== "DEBUG_DISABLED") {
      if ((this._flags & (VNodeFlags.Element | VNodeFlags.Root)) === 0) {
        throw new Error("Failed to set children on VNode: children method should be called on element or component" +
          " root nodes only.");
      }
      if ((this._flags & VNodeFlags.InputElement) !== 0) {
        throw new Error("Failed to set children on VNode: input elements can't have children.");
      }
    }
    this._flags |= VNodeFlags.ArrayChildren;
    this._children = children;
    return this;
  }

  /**
   * Set children as an innerHTML string. It is potentially vulnerable to XSS attacks.
   *
   * This method is available on element and component's root virtual node types.
   */
  unsafeHTML(html: string): VNode {
    if ("<@KIVI_DEBUG@>" as string !== "DEBUG_DISABLED") {
      if ((this._flags & (VNodeFlags.Element | VNodeFlags.Root)) === 0) {
        throw new Error("Failed to set unsafeHTML on VNode: unsafeHTML method should be called on element or" +
          " component root nodes only.");
      }
      if ((this._flags & VNodeFlags.InputElement) !== 0) {
        throw new Error("Failed to set unsafeHTML on VNode: input elements can't have children.");
      }
    }
    this._flags |= VNodeFlags.UnsafeHTML;
    this._children = html;
    return this;
  }

  /**
   * Set children and enable track by key reconciliation algorithm. Children parameter should be a flat array of
   * virtual nodes with assigned key properties.
   *
   * This method is available on element and component's root virtual node types.
   */
  trackByKeyChildren(children: VNode[] | null): VNode {
    if ("<@KIVI_DEBUG@>" as string !== "DEBUG_DISABLED") {
      if ((this._flags & (VNodeFlags.Element | VNodeFlags.Root)) === 0) {
        throw new Error("Failed to set children on VNode: children method should be called on element or component" +
          " root nodes only.");
      }
      if ((this._flags & VNodeFlags.InputElement) !== 0) {
        throw new Error("Failed to set children on VNode: input elements can't have children.");
      }
      if (children !== null) {
        for (let i = 0; i < children.length; i++) {
          if (children[i]._key === null) {
            throw new Error("Failed to set children on VNode: trackByKeyChildren method expects all children to" +
              " have a key.");
          }
        }
      }
    }
    this._flags |= VNodeFlags.ArrayChildren | VNodeFlags.TrackByKeyChildren;
    this._children = children;
    return this;
  }

  /**
   * Set text value for Input Elements.
   *
   * This method is available on text input element node type.
   */
  value(value: string): VNode {
    if ("<@KIVI_DEBUG@>" as string !== "DEBUG_DISABLED") {
      if (this._children !== null) {
        throw new Error("Failed to set value on VNode: VNode is already have either children or checked property.");
      }
    }
    this._flags |= VNodeFlags.TextInputElement;
    this._children = value;
    return this;
  }

  /**
   * Set checked value for Input Elements.
   *
   * This method is available on checked input element node type.
   */
  checked(value: boolean): VNode {
    if ("<@KIVI_DEBUG@>" as string !== "DEBUG_DISABLED") {
      if (this._children !== null) {
        throw new Error("Failed to set checked on VNode: VNode is already have either children or value property.");
      }
    }
    this._flags |= VNodeFlags.CheckedInputElement;
    this._children = value;
    return this;
  }

  /**
   * Prevents component node from syncing.
   *
   * This method is available on component node type.
   */
  bindOnce(): VNode {
    if ("<@KIVI_DEBUG@>" as string !== "DEBUG_DISABLED") {
      if ((this._flags & VNodeFlags.Component) === 0) {
        throw new Error("Failed to set bindOnce on VNode: bindOnce method should be called on component nodes only.");
      }
    }
    this._flags |= VNodeFlags.BindOnce;
    return this;
  }

  /**
   * Keep alive node when removing from the document. Keep alive nodes will be detached instead of disposed when they
   * are removed from virtual dom tree.
   *
   * Keep alive nodes should be manually disposed by owning component.
   */
  keepAlive(component: Component<any, any>): VNode {
    this._flags |= VNodeFlags.KeepAlive;
    this.ref = component.element as Node;
    this.cref = component;
    return this;
  }

  /**
   * Disable children shape errors in DEBUG mode.
   */
  disableChildrenShapeError(): VNode {
    if ("<@KIVI_DEBUG@>" as string !== "DEBUG_DISABLED") {
      if ((this._flags & (VNodeFlags.Element | VNodeFlags.Root)) === 0) {
        throw new Error("Failed to disable children shape error on VNode: disableChildrenShapeError method should" +
          " be called on element or component root nodes only.");
      }
      this._debugFlags |= VNodeDebugFlags.DisabledChildrenShapeError;
    }
    return this;
  }
}

/**
 * Recursively attach all nodes.
 */
export function vNodeAttach(vnode: VNode): void {
  if ("<@KIVI_DEBUG@>" as string !== "DEBUG_DISABLED") {
    if ((vnode._debugFlags & VNodeDebugFlags.Attached) !== 0) {
      throw new Error("Failed to attach VNode: VNode is already attached.");
    }
    vnode._debugFlags |= VNodeDebugFlags.Attached;
    vnode._debugFlags &= ~VNodeDebugFlags.Detached;
  }
  if ((vnode._flags & VNodeFlags.Component) === 0) {
    const children = vnode._children;
    if (children !== null && typeof children !== "string") {
      for (let i = 0; i < (children as VNode[]).length; i++) {
        vNodeAttach((children as VNode[])[i]);
      }
    }
  } else {
    (vnode.cref as Component<any, any>).attach();
  }
}

/**
 * This method should be invoked when node is attached, we don't use recursive implementation because we appending
 * nodes to the document as soon as they created and children nodes aren"t attached at this time.
 */
export function vNodeAttached(vnode: VNode): void {
  if ("<@KIVI_DEBUG@>" as string !== "DEBUG_DISABLED") {
    if ((vnode._debugFlags & VNodeDebugFlags.Attached) !== 0) {
      throw new Error("Failed to attach VNode: VNode is already attached.");
    }
    vnode._debugFlags |= VNodeDebugFlags.Attached;
    vnode._debugFlags &= ~VNodeDebugFlags.Detached;
  }
  if ((vnode._flags & VNodeFlags.Component) !== 0) {
    (vnode.cref as Component<any, any>).attach();
  }
}

/**
 * Recursively detach all nodes.
 */
export function vNodeDetach(vnode: VNode): void {
  if ("<@KIVI_DEBUG@>" as string !== "DEBUG_DISABLED") {
    if ((vnode._debugFlags & VNodeDebugFlags.Detached) !== 0) {
      throw new Error("Failed to detach VNode: VNode is already detached.");
    }
    vnode._debugFlags |= VNodeDebugFlags.Detached;
    vnode._debugFlags &= ~VNodeDebugFlags.Attached;
  }
  if ((vnode._flags & VNodeFlags.Component) === 0) {
    const children = vnode._children;
    if (children !== null && typeof children !== "string") {
      for (let i = 0; i < (children as VNode[]).length; i++) {
        vNodeDetach((children as VNode[])[i]);
      }
    }
  } else {
    (vnode.cref as Component<any, any>).detach();
  }
}

/**
 * Recursively dispose all nodes.
 */
export function vNodeDispose(vnode: VNode): void {
  if ("<@KIVI_DEBUG@>" as string !== "DEBUG_DISABLED") {
    if ((vnode._debugFlags & VNodeDebugFlags.Disposed) !== 0) {
      throw new Error("Failed to dispose VNode: VNode is already disposed.");
    }
    if ((vnode._debugFlags & (VNodeDebugFlags.Rendered | VNodeDebugFlags.Mounted)) === 0) {
      throw new Error("Failed to dispose VNode: VNode should be rendered or mounted before disposing.");
    }
    vnode._debugFlags |= VNodeDebugFlags.Disposed;
  }
  if ((vnode._flags & VNodeFlags.KeepAlive) === 0) {
    if ((vnode._flags & VNodeFlags.Component) !== 0) {
      (vnode.cref as Component<any, any>).dispose();
    } else if (vnode._children !== null) {
      const children = vnode._children;
      if (typeof children !== "string") {
        for (let i = 0; i < (children as VNode[]).length; i++) {
          vNodeDispose((children as VNode[])[i]);
        }
      }
    }
  } else {
    vNodeDetach(vnode);
  }
}

/**
 * Instantiate a DOM Node or Component from the Virtual DOM Node.
 *
 * This method doesn't set any attributes, or create children, to render internal representation of the virtual node,
 * use `vNodeRender` method.
 */
export function vNodeInstantiate(vnode: VNode, owner: Component<any, any> | undefined): void {
  const flags = vnode._flags;

  if ("<@KIVI_DEBUG@>" as string !== "DEBUG_DISABLED") {
    if (vnode.ref !== null) {
      throw new Error("Failed to create VNode: VNode already has a reference to the DOM node.");
    }
  }

  if ((flags & VNodeFlags.Text) !== 0) {
    vnode.ref = document.createTextNode(vnode._props);
  } else if ((flags & VNodeFlags.Element) !== 0) {
    if ((flags & VNodeFlags.ElementDescriptor) === 0) {
      if ((flags & VNodeFlags.Svg) === 0) {
        vnode.ref = document.createElement(vnode._tag as string) as Node;
      } else {
        vnode.ref = document.createElementNS(SvgNamespace, vnode._tag as string) as Node;
      }
    } else {
      vnode.ref = (vnode._tag as ElementDescriptor<any>).createElement() as Node;
    }
  } else if ((flags & VNodeFlags.KeepAlive) === 0) {
    const c = (vnode._tag as ComponentDescriptor<any, any>).createComponent(owner, vnode._props);
    vnode.ref = c.element as Node;
    vnode.cref = c;
  }
}

/**
 * Render internal representation of the Virtual DOM Node.
 */
export function vNodeRender(vnode: VNode, owner: Component<any, any> | undefined): void {
  let i: number;

  if ("<@KIVI_DEBUG@>" as string !== "DEBUG_DISABLED") {
    if (vnode.ref === null) {
      throw new Error("Failed to render VNode: VNode should be created before render.");
    }
    if ((vnode._flags & VNodeFlags.Root) !== 0 && owner === undefined) {
      throw new Error("Failed to render VNode: VNode component root should have an owner.");
    }
    if ((vnode._debugFlags & VNodeDebugFlags.Rendered) !== 0) {
      throw new Error("Failed to render VNode: VNode cannot be rendered twice.");
    }
    if ((vnode._debugFlags & VNodeDebugFlags.Mounted) !== 0) {
      throw new Error("Failed to render VNode: VNode cannot be rendered after mount.");
    }
    vnode._debugFlags |= VNodeDebugFlags.Mounted;
  }

  let il: number;
  let key: any;
  let keys: any[];
  const flags = vnode._flags;

  let ref: Element;

  if ((flags & (VNodeFlags.Element | VNodeFlags.Root)) !== 0) {
    ref = vnode.ref as Element;
    if ((flags & VNodeFlags.ElementDescriptorUpdateHandler) === 0) {
      const props = vnode._props;
      if (props !== null) {
        keys = Object.keys(props);
        for (i = 0, il = keys.length; i < il; i++) {
          key = keys[i];
          (ref as any)[key] = props[key];
        }
      }

      if (vnode._attrs !== null) {
        keys = Object.keys(vnode._attrs);
        for (i = 0, il = keys.length; i < il; i++) {
          key = keys[i];
          setAttr(ref, key, (vnode._attrs as any)[key]);
        }
      }

      if (vnode._style !== null) {
        if ((flags & VNodeFlags.Svg) === 0) {
          (ref as HTMLElement).style.cssText = vnode._style;
        } else {
          ref.setAttribute("style", vnode._style);
        }
      }

      if (vnode._className !== null) {
        if ((flags & VNodeFlags.Svg) === 0) {
          (ref as HTMLElement).className = vnode._className;
        } else {
          ref.setAttribute("class", vnode._className);
        }
      }
    } else {
      if ((flags & VNodeFlags.Root) === 0) {
        (vnode._tag as ElementDescriptor<any>)._update!(ref, undefined, vnode._props);
      } else {
        (owner!.descriptor._tag as ElementDescriptor<any>)._update!(ref, undefined, vnode._props);
      }
    }

    const children = vnode._children;
    if (children !== null) {
      if ((flags & VNodeFlags.UnsafeHTML) === 0) {
        if ((flags & VNodeFlags.InputElement) === 0) {
          if ((flags & VNodeFlags.ArrayChildren) === 0) {
            if (typeof children === "string") {
              ref.textContent = children;
            } else {
              vNodeInsertChild(vnode, children as VNode, null, owner);
            }
          } else {
            for (i = 0, il = (children as VNode[]).length; i < il; i++) {
              vNodeInsertChild(vnode, (children as VNode[])[i], null, owner);
            }
          }
        } else {
          if ((vnode._flags & VNodeFlags.TextInputElement) !== 0) {
            (vnode.ref as HTMLInputElement).value = vnode._children as string;
          } else { // ((vnode.flags & VNodeFlags.CheckedInputElement) !== 0)
            (vnode.ref as HTMLInputElement).checked = vnode._children as boolean;
          }
        }
      } else {
        ref.innerHTML = children as string;
      }
    }
  } else if ((flags & VNodeFlags.Component) !== 0) {
    updateComponent(vnode.cref as Component<any, any>);
  }
}

/**
 * Mount VNode on top of existing html document.
 */
export function vNodeMount(vnode: VNode, node: Node, owner: Component<any, any> | undefined): void {
  if ("<@KIVI_DEBUG@>" as string !== "DEBUG_DISABLED") {
    if (vnode.ref !== null) {
      throw new Error("Failed to mount VNode: VNode cannot be mounted if it already has a reference to DOM Node.");
    }
    if ((vnode._flags & VNodeFlags.Root) !== 0 && owner === undefined) {
      throw new Error("Failed to render VNode: VNode component root should have an owner.");
    }
    if ((vnode._debugFlags & VNodeDebugFlags.Rendered) !== 0) {
      throw new Error("Failed to mount VNode: VNode cannot be mounted after render.");
    }
    if ((vnode._debugFlags & VNodeDebugFlags.Mounted) !== 0) {
      throw new Error("Failed to mount VNode: VNode cannot be mounted twice.");
    }
    vnode._debugFlags |= VNodeDebugFlags.Mounted;
  }

  const flags = vnode._flags;
  const children = vnode._children;
  let keys: string[];
  let key: string;
  let i: number;

  vnode.ref = node;

  if ((flags & VNodeFlags.Component) !== 0) {
    const cref = vnode.cref = (vnode._tag as ComponentDescriptor<any, any>)
      .mountComponent(node as Element, owner, vnode._props);
    if ("<@KIVI_DEBUG@>" as string !== "DEBUG_DISABLED") {
      const dflags = cref.descriptor._flags;
      if (node.nodeType !== 1) {
        throw new Error("Failed to mount VNode: invalid node type, components can be mounted on element nodes only.");
      }
      const eTagName = ((node as Element).tagName).toLowerCase();
      let cTagName: string;
      if ((dflags & ComponentDescriptorFlags.ElementDescriptor) !== 0) {
        cTagName = (cref.descriptor._tag as ElementDescriptor<any>)._tagName.toLowerCase();
        if (cTagName !== eTagName) {
          throw new Error(`Failed to mount VNode: invalid tagName, component expects tagName "${cTagName}", but` +
            ` found "${eTagName}".`);
        }
      } else if ((dflags & ComponentDescriptorFlags.Canvas2D) !== 0) {
        if (eTagName !== "canvas") {
          throw new Error(`Failed to mount VNode: invalid tagName, component expects tagName "canvas", but` +
            ` found "${eTagName}".`);
        }
      } else {
        cTagName = (cref.descriptor._tag as string).toLowerCase();
        if (cTagName !== eTagName) {
          throw new Error(`Failed to mount VNode: invalid tagName, component expects tagName "${cTagName}", but` +
            ` found "${eTagName}".`);
        }
      }
    }
    updateComponent(cref);
  } else {
    if ("<@KIVI_DEBUG@>" as string !== "DEBUG_DISABLED") {
      if ((vnode._flags & (VNodeFlags.Element | VNodeFlags.Root)) !== 0) {
        if (node.nodeType !== 1) {
          throw new Error("Failed to mount VNode: invalid node type, VNode expects Element node.");
        }

        if (vnode._className !== null) {
          const eClassName = (node as Element).getAttribute("class");
          if (vnode._className !== eClassName) {
            throw new Error(`Failed to mount VNode: invalid className, VNode expects className` +
              ` "${vnode._className}", but found "${eClassName}".`);
          }
        }
        if (vnode._style !== null) {
          const eStyle = (node as Element).getAttribute("style");
          if (vnode._style !== eStyle) {
            throw new Error(`Failed to mount VNode: invalid style, VNode expects style` +
              ` "${vnode._style}", but found "${eStyle}".`);
          }
        }
      } else {
        if (node.nodeType !== 3) {
          throw new Error("Failed to mount VNode: invalid node type, VNode expects Text node.");
        }
        const text = node.nodeValue;
        if (vnode._props !== text) {
          throw new Error(`Failed to mount VNode: invalid text, VNode expects text "${vnode._props}", but found` +
            ` "${text}".`);
        }
      }
    }

    if ((flags & (VNodeFlags.Element | VNodeFlags.Root)) !== 0) {
      // Assign properties on mount, because they don't exist in html markup.
      if ((flags & VNodeFlags.ElementDescriptor) !== 0) {
        const eDescriptor = vnode._tag as ElementDescriptor<any>;
        if (eDescriptor._props !== null) {
          keys = Object.keys(eDescriptor._props);
          for (i = 0; i < keys.length; i++) {
            key = keys[i];
            (node as any)[key] = eDescriptor._props[key];
          }
        }
      }

      if (vnode._props !== null) {
        keys = Object.keys(vnode._props);
        for (i = 0; i < keys.length; i++) {
          key = keys[i];
          (node as any)[key] = vnode._props[key];
        }
      }

      if (children !== null) {
        if ((flags & VNodeFlags.ArrayChildren) === 0) {
          if (typeof children !== "string") {
            let child = node.firstChild;

            // Adjacent text nodes should be separated by Comment node "<!---->", so we can properly mount them.
            let commentNode: Node;
            while (child.nodeType === 8) {
              commentNode = child;
              child = child.nextSibling;
              node.removeChild(commentNode);
            }

            vNodeMount(children as VNode, child, owner);
          }
        } else if ((children as VNode[]).length > 0) {
          let child = node.firstChild;

          // Adjacent text nodes should be separated by Comment node "<!---->", so we can properly mount them.
          let commentNode: Node;
          while (child.nodeType === 8) {
            commentNode = child;
            child = child.nextSibling;
            node.removeChild(commentNode);
          }
          for (i = 0; i < (children as VNode[]).length; i++) {
            if ("<@KIVI_DEBUG@>" as string !== "DEBUG_DISABLED") {
              if (!child) {
                throw new Error("Failed to mount VNode: cannot find matching node.");
              }
            }
            vNodeMount((children as VNode[])[i], child, owner);
            child = child.nextSibling;
            while (child !== null && child.nodeType === 8) {
              commentNode = child;
              child = child.nextSibling;
              node.removeChild(commentNode);
            }
          }
        }
      }
    }
  }
}

function vNodeInsertChild(parent: VNode, node: VNode, nextRef: Node | null, owner?: Component<any, any>): void {
  const container = parent.ref as Element;
  if (node.ref === null) {
    vNodeInstantiate(node, owner);
    vNodeAttached(node);
    vNodeRender(node, owner);
    container.insertBefore(node.ref!, nextRef!);
  } else {
    if ("<@KIVI_DEBUG@>" as string !== "DEBUG_DISABLED") {
      if ((node._flags & VNodeFlags.KeepAlive) === 0) {
        throw new Error("Failed to replace node: VNode instance already has been used to create DOM node.");
      }
    }
    container.insertBefore(node.ref, nextRef!);
    vNodeAttach(node);
    updateComponent(node.cref as Component<any, any>,
      (node._flags & VNodeFlags.BindOnce) === 0 ? node._props : null);
  }
}

function vNodeReplaceChild(parent: VNode, newNode: VNode, refNode: VNode, owner?: Component<any, any>): void {
  const container = parent.ref as Element;
  if (newNode.ref === null) {
    vNodeInstantiate(newNode, owner);
    vNodeAttached(newNode);
    vNodeRender(newNode, owner);
    container.replaceChild(newNode.ref!, refNode.ref!);
  } else {
    if ("<@KIVI_DEBUG@>" as string !== "DEBUG_DISABLED") {
      if ((newNode._flags & VNodeFlags.KeepAlive) === 0) {
        throw new Error("Failed to replace node: VNode instance already has been used to create DOM node.");
      }
    }
    container.replaceChild(newNode.ref, refNode.ref!);
    vNodeAttach(newNode);
    updateComponent(newNode.cref as Component<any, any>,
      (newNode._flags & VNodeFlags.BindOnce) === 0 ? newNode._props : null);
  }
  vNodeDispose(refNode);
}

function vNodeMoveChild(parent: VNode, node: VNode, nextRef: Node | null): void {
  (parent.ref as Element).insertBefore(node.ref!, nextRef!);
}

function vNodeRemoveChild(parent: VNode, node: VNode): void {
  (parent.ref as Element).removeChild(node.ref!);
  vNodeDispose(node);
}

function vNodeRemoveAllChildren(parent: VNode, nodes: VNode[]): void {
  parent.ref!.textContent = "";
  for (let i = 0; i < nodes.length; i++) {
    vNodeDispose(nodes[i]);
  }
}

/**
 * Sync two VNodes
 *
 * When node `a` is synced with node `b`, `a` node should be considered as destroyed, and any access to it after sync
 * is an undefined behavior.
 */
export function syncVNodes(a: VNode, b: VNode, owner?: Component<any, any>): void {
  if ("<@KIVI_DEBUG@>" as string !== "DEBUG_DISABLED") {
    if ((a._debugFlags & (VNodeDebugFlags.Rendered | VNodeDebugFlags.Mounted)) === 0) {
      throw new Error("Failed to sync VNode: VNode should be rendered or mounted before sync.");
    }
    b._debugFlags |= a._debugFlags &
      (VNodeDebugFlags.Rendered | VNodeDebugFlags.Mounted |
        VNodeDebugFlags.Attached | VNodeDebugFlags.Detached);
  }

  const ref = a.ref as Element;
  const flags = a._flags;

  let component: Component<any, any>;
  let className: string;

  if ("<@KIVI_DEBUG@>" as string !== "DEBUG_DISABLED") {
    if (a._flags !== b._flags) {
      throw new Error(`Failed to sync VNode: flags does not match (old: ${a._flags}, new: ${b._flags}).`);
    }
    if (a._tag !== b._tag) {
      throw new Error(`Failed to sync VNode: tags does not match (old: ${a._tag}, new: ${b._tag}).`);
    }
    if (a._key !== b._key) {
      throw new Error(`Failed to sync VNode: keys does not match (old: ${a._key}, new: ${b._key}).`);
    }
    if (b.ref !== null && a.ref !== b.ref) {
      throw new Error("Failed to sync VNode: reusing VNodes isn't allowed unless it has the same ref.");
    }
  }

  b.ref = a.ref;

  if ((flags & VNodeFlags.Text) !== 0) {
    if (a._props !== b._props) {
      a.ref!.nodeValue = b._props as string;
    }
  } else if ((flags & (VNodeFlags.Element | VNodeFlags.Root)) !== 0) {
    if ((flags & VNodeFlags.ElementDescriptorUpdateHandler) === 0) {
      if (a._props !== b._props) {
        syncStaticShapeProps(ref, a._props, b._props);
      }
      if (a._attrs !== b._attrs) {
        if ((a._flags & VNodeFlags.DynamicShapeAttrs) === 0) {
          syncStaticShapeAttrs(ref, a._attrs, b._attrs);
        } else {
          syncDynamicShapeAttrs(ref, a._attrs, b._attrs);
        }
      }
      if (a._style !== b._style) {
        const style = (b._style === null) ? "" : b._style;
        if ((flags & VNodeFlags.Svg) === 0) {
          (ref as HTMLElement).style.cssText = style;
        } else {
          ref.setAttribute("style", style);
        }
      }

      if (a._className !== b._className) {
        className = (b._className === null) ? "" : b._className;
        if ((flags & VNodeFlags.Svg) === 0) {
          (ref as HTMLElement).className = className;
        } else {
          ref.setAttribute("class", className);
        }
      }

    } else if (a._props !== b._props) {
      if ((flags & VNodeFlags.Root) === 0) {
        (a._tag as ElementDescriptor<any>)._update!(ref, a._props, b._props);
      } else {
        (owner!.descriptor._tag as ElementDescriptor<any>)._update!(ref, a._props, b._props);
      }
    }

    if ((a._flags & VNodeFlags.InputElement) === 0) {
      if (a._children !== b._children) {
        if ((a._flags & VNodeFlags.UnsafeHTML) === 0) {
          _syncChildren(
            a,
            a._children as VNode[] | string,
            b._children as VNode[] | string,
            owner);
        } else {
          ref.innerHTML = b._children as string;
        }
      }
    } else {
      if ((flags & VNodeFlags.TextInputElement) !== 0) {
        if ((ref as HTMLInputElement).value !== b._children) {
          (ref as HTMLInputElement).value = b._children as string;
        }
      } else { // ((flags & VNodeFlags.CheckedInputElement) !== 0)
        if ((ref as HTMLInputElement).checked !== b._children) {
          (ref as HTMLInputElement).checked = b._children as boolean;
        }
      }
    }
  } else { // if ((flags & VNodeFlags.Component) !== 0)
    component = b.cref = a.cref as Component<any, any>;

    if (((flags & VNodeFlags.ImmutableProps) === 0) || a._props !== b._props) {
      updateComponent(component, (flags & VNodeFlags.BindOnce) === 0 ? b._props : undefined);
    }
  }
}

/**
 * Check if two nodes can be synced.
 *
 * Two nodes can be synced when their flags and tags are identical.
 */
function _canSyncVNodes(a: VNode, b: VNode): boolean {
  return (a._flags === b._flags &&
    a._tag === b._tag);
}

/**
 * Sync old children list with the new one.
 */
function _syncChildren(parent: VNode, a: VNode[] | VNode | string, b: VNode[] | VNode | string,
  owner: Component<any, any> | undefined): void {
  let i = 0;

  if ((parent._flags & VNodeFlags.ArrayChildren) === 0) {
    if (a === null) {
      if (typeof b === "string") {
        parent.ref!.textContent = b as string;
      } else {
        vNodeInsertChild(parent, b as VNode, null, owner);
      }
    } else if (b === null) {
      if (typeof a === "string") {
        parent.ref!.textContent = "";
      } else {
        vNodeRemoveChild(parent, a as VNode);
      }
    } else {
      if (typeof a === "string") {
        if (typeof b === "string") {
          const c = parent.ref!.firstChild;
          if (c) {
            c.nodeValue = b as string;
          } else {
            parent.ref!.textContent = b as string;
          }
        } else {
          parent.ref!.textContent = "";
          vNodeInsertChild(parent, b as VNode, null, owner);
        }
      } else {
        if (typeof b === "string") {
          parent.ref!.textContent = b;
          vNodeDispose(a as VNode);
        } else {
          a = a as VNode;
          b = b as VNode;
          if (_canSyncVNodes(a, b) && a._key === b._key) {
            syncVNodes(a, b, owner);
          } else {
            vNodeReplaceChild(parent, b, a, owner);
          }
        }
      }
    }
  } else {
    a = a as VNode[];
    b = b as VNode[];

    if (a !== null && a.length !== 0) {
      if (b === null || b.length === 0) {
        // b is empty, remove all children from a.
        vNodeRemoveAllChildren(parent, a as VNode[]);
      } else {
        if (a.length === 1 && b.length === 1) {
          // Fast path when a and b have only one child.
          const aNode = a[0] as VNode;
          const bNode = b[0] as VNode;

          if (_canSyncVNodes(aNode, bNode) && aNode._key === bNode._key) {
            syncVNodes(aNode, bNode, owner);
          } else {
            vNodeReplaceChild(parent, bNode, aNode, owner);
          }
        } else {
          // a and b have more than 1 child.
          if ((parent._flags & VNodeFlags.TrackByKeyChildren) === 0) {
            _syncChildrenNaive(parent, a as VNode[], b as VNode[], owner);
          } else {
            _syncChildrenTrackByKeys(parent, a as VNode[], b as VNode[], owner);
          }
        }
      }
    } else if (b !== null) {
      // a is empty, insert all children from b.
      for (i = 0; i < b.length; i++) {
        vNodeInsertChild(parent, b[i] as VNode, null, owner);
      }
    }
  }
}

/**
 * Sync children naive way.
 *
 * Any heuristics that is used in this algorithm is an undefined behaviour, and external dependencies should not rely on
 * any knowledge about this algorithm, because it can be changed in any time.
 *
 * This naive algorithm is quite simple:
 *
 *  A: -> [a a c d e g g] <-
 *  B: -> [a a f d c g] <-
 *
 * It starts by iterating over old children list `A` and new children list `B` from both ends.
 *
 *  A: -> [a b c d e g g] <-
 *  B: -> [a b f d c g] <-
 *
 * When it find nodes that have the same key, tag and flags, it will sync them. Node "a" and "b" on the right side, and
 * node "g" on the right side will be synced.
 *
 *  A: -> [c d e g]
 *  B: -> [f d c]
 *
 * Then it start iterating over old and new children lists from the left side and check if nodes can be synced. Nodes
 * "c" and "f" can't be synced, remove node "c" and insert new node "f".
 *
 *  A: -> [d e g]
 *  B: -> [d c]
 *
 * Node "d" is synced.
 *
 *  A: -> [e g]
 *  B: -> [c]
 *
 * Node "e" removed, node "c" inserted.
 *
 *  A: -> [g]
 *  B:    []
 *
 * Length of the old list is larger than length of the new list, remove remaining nodes from the old list.
 *
 */
function _syncChildrenNaive(parent: VNode, a: VNode[], b: VNode[], owner: Component<any, any> | undefined): void {
  let aStart = 0;
  let bStart = 0;
  let aEnd = a.length - 1;
  let bEnd = b.length - 1;
  let aNode: VNode;
  let bNode: VNode;
  let nextPos: number;
  let next: Node | null;

  // Sync similar nodes at the beginning.
  while (aStart <= aEnd && bStart <= bEnd) {
    aNode = a[aStart];
    bNode = b[bStart];

    if (!_canSyncVNodes(aNode, bNode) || aNode._key !== bNode._key) {
      break;
    }

    aStart++;
    bStart++;

    syncVNodes(aNode, bNode, owner);
  }

  // Sync similar nodes at the end.
  while (aStart <= aEnd && bStart <= bEnd) {
    aNode = a[aEnd];
    bNode = b[bEnd];

    if (!_canSyncVNodes(aNode, bNode) || aNode._key !== bNode._key) {
      break;
    }

    aEnd--;
    bEnd--;

    syncVNodes(aNode, bNode, owner);
  }

  if ("<@KIVI_DEBUG@>" as string !== "DEBUG_DISABLED") {
    if ((aStart <= aEnd || bStart <= bEnd) &&
      ((parent._debugFlags & VNodeDebugFlags.DisabledChildrenShapeError) === 0)) {
      printError(
        "VNode sync children: children shape is changing, you should enable tracking by key with " +
        "VNode method trackByKeyChildren(children).\n" +
        "If you certain that children shape changes won't cause any problems with losing " +
        "state, you can remove this error message with VNode method disableChildrenShapeError().");
    }
  }

  // Iterate over the remaining nodes and if they have the same type, then sync, otherwise just
  // remove the old node and insert the new one.
  while (aStart <= aEnd && bStart <= bEnd) {
    aNode = a[aStart++];
    bNode = b[bStart++];
    if (_canSyncVNodes(aNode, bNode) && aNode._key === bNode._key) {
      syncVNodes(aNode, bNode, owner);
    } else {
      vNodeReplaceChild(parent, bNode, aNode, owner);
    }
  }

  if (aStart <= aEnd) {
    // All nodes from a are synced, remove the rest.
    do {
      vNodeRemoveChild(parent, a[aStart++]);
    } while (aStart <= aEnd);
  } else if (bStart <= bEnd) {
    // All nodes from b are synced, insert the rest.
    nextPos = bEnd + 1;
    next = nextPos < b.length ? b[nextPos].ref : null;
    do {
      vNodeInsertChild(parent, b[bStart++], next, owner);
    } while (bStart <= bEnd);
  }
}

/**
 * Sync children with track by keys algorithm.
 *
 * This algorithm finds a minimum[1] number of DOM operations. It works in several steps:
 *
 * 1. Find common suffix and prefix, and perform simple moves on the edges.
 *
 * This optimization technique is searching for nodes with identical keys by simultaneously iterating over nodes in the
 * old children list `A` and new children list `B` from both sides:
 *
 *  A: -> [a b c d e f g] <-
 *  B: -> [a b f d c g] <-
 *
 * Here we can skip nodes "a" and "b" at the begininng, and node "g" at the end.
 *
 *  A: -> [c d e f] <-
 *  B: -> [f d c] <-
 *
 * At this position it will try to look at the opposite edge, and if there is a node with the same key at the opposite
 * edge, it will perform simple move operation. Node "c" is moved to the right edge, and node "f" is moved to the left
 * edge.
 *
 *  A: -> [d e] <-
 *  B: -> [d] <-
 *
 * Now it will try again to find common prefix and suffix, node "d" is the same, so we can skip it.
 *
 *  A: [e]
 *  B: []
 *
 * Here it will check if the size of one of the list is equal to zero, and if length of the old children list is zero,
 * it will insert all remaining nodes from the new list, or if length of the new children list is zero, it will remove
 * all remaining nodes from the old list.
 *
 * This simple optimization technique will cover most of the real world use cases, even reversing the children list,
 * except for sorting.
 *
 * When algorithm couldn't find a solution with this simple optimization technique, it will go to the next step of the
 * algorithm. For example:
 *
 *  A: -> [a b c d e f g] <-
 *  B: -> [a c b h f e g] <-
 *
 * Nodes "a" and "g" at the edges are the same, skipping them.
 *
 *  A: -> [b c d e f] <-
 *  B: -> [c b h f e] <-
 *
 * Here we are stuck, so we need to switch to the next step.
 *
 * 2. Look for removed and inserted nodes, and simultaneously check if one of the nodes is moved.
 *
 * First we create an array `P` with the length of the new children list and assign to each position value `-1`, it has
 * a meaning of a new node that should be inserted. Later we will assign node positions in the old children list to this
 * array.
 *
 *  A: [b c d e f]
 *  B: [c b h f e]
 *  P: [. . . . .] // . == -1
 *
 * Then we need to build an index `I` that maps keys with node positions of the remaining nodes from the new children
 * list.
 *
 *  A: [b c d e f]
 *  B: [c b h f e]
 *  P: [. . . . .] // . == -1
 *  I: {
 *    c: 0,
 *    b: 1,
 *    h: 2,
 *    f: 3,
 *    e: 4,
 *  }
 *  last = 0
 *
 * With this index, we start to iterate over the remaining nodes from the old children list and check if we can find a
 * node with the same key in the index. If we can't find any node, it means that it should be removed, otherwise we
 * assign position of the node in the old children list to the positions array.
 *
 *  A: [b c d e f]
 *      ^
 *  B: [c b h f e]
 *  P: [. 0 . . .] // . == -1
 *  I: {
 *    c: 0,
 *    b: 1, <-
 *    h: 2,
 *    f: 3,
 *    e: 4,
 *  }
 *  last = 1
 *
 * When we assigning positions to the positions array, we also keep a position of the last seen node in the new children
 * list, if the last seen position is larger than current position of the node at the new list, then we are switching
 * `moved` flag to `true`.
 *
 *  A: [b c d e f]
 *        ^
 *  B: [c b h f e]
 *  P: [1 0 . . .] // . == -1
 *  I: {
 *    c: 0, <-
 *    b: 1,
 *    h: 2,
 *    f: 3,
 *    e: 4,
 *  }
 *  last = 1 // last > 0; moved = true
 *
 * The last position `1` is larger than current position of the node at the new list `0`, switching `moved` flag to
 * `true`.
 *
 *  A: [b c d e f]
 *          ^
 *  B: [c b h f e]
 *  P: [1 0 . . .] // . == -1
 *  I: {
 *    c: 0,
 *    b: 1,
 *    h: 2,
 *    f: 3,
 *    e: 4,
 *  }
 *  moved = true
 *
 * Node with key "d" doesn't exist in the index, removing node.
 *
 *  A: [b c d e f]
 *            ^
 *  B: [c b h f e]
 *  P: [1 0 . . 3] // . == -1
 *  I: {
 *    c: 0,
 *    b: 1,
 *    h: 2,
 *    f: 3,
 *    e: 4, <-
 *  }
 *  moved = true
 *
 * Assign position for `e`.
 *
 *  A: [b c d e f]
 *              ^
 *  B: [c b h f e]
 *  P: [1 0 . 4 3] // . == -1
 *  I: {
 *    c: 0,
 *    b: 1,
 *    h: 2,
 *    f: 3, <-
 *    e: 4,
 *  }
 *  moved = true
 *
 * Assign position for 'f'.
 *
 * At this point we are checking if `moved` flag is on, or if the length of the old children list minus the number of
 * removed nodes isn't equal to the length of the new children list. If any of this conditions is true, then we are
 * going to the next step.
 *
 * 3. Find minimum number of moves if `moved` flag is on, or insert new nodes if the length is changed.
 *
 * When `moved` flag is on, we need to find the
 * [longest increasing subsequence](http://en.wikipedia.org/wiki/Longest_increasing_subsequence) in the positions array,
 * and move all nodes that doesn't belong to this subsequence.
 *
 *  A: [b c d e f]
 *  B: [c b h f e]
 *  P: [1 0 . 4 3] // . == -1
 *  LIS:     [1 4]
 *  moved = true
 *
 * Now we just need to simultaneously iterate over the new children list and LIS from the end and check if the current
 * position is equal to a value from LIS.
 *
 *  A: [b c d e f]
 *  B: [c b h f e]
 *              ^  // new_pos == 4
 *  P: [1 0 . 4 3] // . == -1
 *  LIS:     [1 4]
 *              ^  // new_pos == 4
 *  moved = true
 *
 * Node "e" stays at the same place.
 *
 *  A: [b c d e f]
 *  B: [c b h f e]
 *            ^    // new_pos == 3
 *  P: [1 0 . 4 3] // . == -1
 *  LIS:     [1 4]
 *            ^    // new_pos != 1
 *  moved = true
 *
 * Node "f" is moved, move it before the next node "e".
 *
 *  A: [b c d e f]
 *  B: [c b h f e]
 *          ^      // new_pos == 2
 *  P: [1 0 . 4 3] // . == -1
 *          ^      // old_pos == -1
 *  LIS:     [1 4]
 *            ^
 *  moved = true
 *
 * Node "h" has a `-1` value in the positions array, insert new node "h".
 *
 *  A: [b c d e f]
 *  B: [c b h f e]
 *        ^        // new_pos == 1
 *  P: [1 0 . 4 3] // . == -1
 *  LIS:     [1 4]
 *            ^    // new_pos == 1
 *  moved = true
 *
 * Node "b" stays at the same place.
 *
 *  A: [b c d e f]
 *  B: [c b h f e]
 *      ^          // new_pos == 0
 *  P: [1 0 . 4 3] // . == -1
 *  LIS:     [1 4]
 *          ^      // new_pos != undefined
 *  moved = true
 *
 * Node "c" is moved, move it before the next node "b".
 *
 * When moved flag is off, we don't need to find LIS, and we just iterate over the new children list and check its
 * current position in the positions array, if it is `-1`, then we insert new node.
 *
 * That is how children reconciliation algorithm is working in one of the fastest virtual dom libraries :)
 *
 * [1] Actually it is almost minimum number of dom ops, when node is removed and another one is inserted at the same
 * place, instead of insert and remove dom ops, we can use one replace op. It will make everything even more
 * complicated, and other use cases will be slower, so I don't think that it is worth to use replace here. Naive algo
 * and simple 1/N, N/1 cases are using replace op.
 */
function _syncChildrenTrackByKeys(parent: VNode, a: VNode[], b: VNode[], owner: Component<any, any> | undefined): void {
  let aStart = 0;
  let bStart = 0;
  let aEnd = a.length - 1;
  let bEnd = b.length - 1;
  let aStartNode = a[aStart];
  let bStartNode = b[bStart];
  let aEndNode = a[aEnd];
  let bEndNode = b[bEnd];
  let i: number;
  let j: number | undefined;
  let nextPos: number;
  let next: Node | null;
  let aNode: VNode | null;
  let bNode: VNode;
  let node: VNode;

  // Step 1
  outer: while (true) {
    // Sync nodes with the same key at the beginning.
    while (aStartNode._key === bStartNode._key) {
      if (_canSyncVNodes(aStartNode, bStartNode)) {
        syncVNodes(aStartNode, bStartNode, owner);
      } else {
        vNodeReplaceChild(parent, bStartNode, aStartNode, owner);
      }
      aStart++;
      bStart++;
      if (aStart > aEnd || bStart > bEnd) {
        break outer;
      }
      aStartNode = a[aStart];
      bStartNode = b[bStart];
    }

    // Sync nodes with the same key at the end.
    while (aEndNode._key === bEndNode._key) {
      if (_canSyncVNodes(aEndNode, bEndNode)) {
        syncVNodes(aEndNode, bEndNode, owner);
      } else {
        vNodeReplaceChild(parent, bEndNode, aEndNode, owner);
      }
      aEnd--;
      bEnd--;
      if (aStart > aEnd || bStart > bEnd) {
        break outer;
      }
      aEndNode = a[aEnd];
      bEndNode = b[bEnd];
    }

    // Move and sync nodes from right to left.
    if (aEndNode._key === bStartNode._key) {
      if (_canSyncVNodes(aEndNode, bStartNode)) {
        syncVNodes(aEndNode, bStartNode, owner);
      } else {
        vNodeReplaceChild(parent, bStartNode, aEndNode, owner);
      }
      vNodeMoveChild(parent, bStartNode, aStartNode.ref);
      aEnd--;
      bStart++;
      if (aStart > aEnd || bStart > bEnd) {
        break;
      }
      aEndNode = a[aEnd];
      bStartNode = b[bStart];
      // In a real-world scenarios there is a higher chance that next node after the move will be the same, so we
      // immediately jump to the start of this prefix/suffix algo.
      continue;
    }

    // Move and sync nodes from left to right.
    if (aStartNode._key === bEndNode._key) {
      if (_canSyncVNodes(aStartNode, bEndNode)) {
        syncVNodes(aStartNode, bEndNode, owner);
      } else {
        vNodeReplaceChild(parent, bEndNode, aStartNode, owner);
      }
      nextPos = bEnd + 1;
      next = nextPos < b.length ? b[nextPos].ref : null;
      vNodeMoveChild(parent, bEndNode, next);
      aStart++;
      bEnd--;
      if (aStart > aEnd || bStart > bEnd) {
        break;
      }
      aStartNode = a[aStart];
      bEndNode = b[bEnd];
      continue;
    }

    break;
  }

  if (aStart > aEnd) {
    // All nodes from a are synced, insert the rest from b.
    nextPos = bEnd + 1;
    next = nextPos < b.length ? b[nextPos].ref : null;
    while (bStart <= bEnd) {
      vNodeInsertChild(parent, b[bStart++], next, owner);
    }
  } else if (bStart > bEnd) {
    // All nodes from b are synced, remove the rest from a.
    while (aStart <= aEnd) {
      vNodeRemoveChild(parent, a[aStart++]);
    }
    // Step 2
  } else {
    let aLength = aEnd - aStart + 1;
    let bLength = bEnd - bStart + 1;
    const aNullable = a as Array<VNode | null>; // will be removed by js optimizing compilers.
    // Mark all nodes as inserted.
    const sources = new Array<number>(bLength).fill(-1);

    let moved = false;
    let pos = 0;
    let synced = 0;

    // When children lists are small, we are using naive O(N) algorithm to find if child is removed.
    if ((bLength <= 4) || ((aLength * bLength) <= 16)) {
      for (i = aStart; i <= aEnd; i++) {
        aNode = a[i];
        if (synced < bLength) {
          for (j = bStart; j <= bEnd; j++) {
            bNode = b[j];
            if (aNode._key === bNode._key) {
              sources[j - bStart] = i;

              if (pos > j) {
                moved = true;
              } else {
                pos = j;
              }
              if (_canSyncVNodes(aNode, bNode)) {
                syncVNodes(aNode, bNode, owner);
              } else {
                vNodeReplaceChild(parent, bNode, aNode, owner);
              }
              synced++;
              aNullable[i] = null;
              break;
            }
          }
        }
      }
    } else {
      const keyIndex = new Map<any, number>();

      for (i = bStart; i <= bEnd; i++) {
        node = b[i];
        keyIndex.set(node._key, i);
      }

      for (i = aStart; i <= aEnd; i++) {
        aNode = a[i];

        if (synced < bLength) {
          j = keyIndex.get(aNode._key);

          if (j !== undefined) {
            bNode = b[j];
            sources[j - bStart] = i;
            if (pos > j) {
              moved = true;
            } else {
              pos = j;
            }
            if (_canSyncVNodes(aNode, bNode)) {
              syncVNodes(aNode, bNode, owner);
            } else {
              vNodeReplaceChild(parent, bNode, aNode, owner);
            }
            synced++;
            aNullable[i] = null;
          }
        }
      }
    }

    if (aLength === a.length && synced === 0) {
      // Noone is synced, remove all children with one dom op.
      vNodeRemoveAllChildren(parent, a);
      while (bStart < bLength) {
        vNodeInsertChild(parent, b[bStart++], null, owner);
      }
    } else {
      i = aLength - synced;
      while (i > 0) {
        aNode = aNullable[aStart++];
        if (aNode !== null) {
          vNodeRemoveChild(parent, aNode);
          i--;
        }
      }

      // Step 3
      if (moved) {
        const seq = _lis(sources);
        j = seq.length - 1;
        for (i = bLength - 1; i >= 0; i--) {
          if (sources[i] === -1) {
            pos = i + bStart;
            node = b[pos];
            nextPos = pos + 1;
            next = nextPos < b.length ? b[nextPos].ref : null;
            vNodeInsertChild(parent, node, next, owner);
          } else {
            if (j < 0 || i !== seq[j]) {
              pos = i + bStart;
              node = b[pos];
              nextPos = pos + 1;
              next = nextPos < b.length ? b[nextPos].ref : null;
              vNodeMoveChild(parent, node, next);
            } else {
              j--;
            }
          }
        }
      } else if (synced !== bLength) {
        for (i = bLength - 1; i >= 0; i--) {
          if (sources[i] === -1) {
            pos = i + bStart;
            node = b[pos];
            nextPos = pos + 1;
            next = nextPos < b.length ? b[nextPos].ref : null;
            vNodeInsertChild(parent, node, next, owner);
          }
        }
      }
    }
  }
}

/**
 * Slightly modified Longest Increased Subsequence algorithm, it ignores items that have -1 value, they're representing
 * new items.
 *
 * http://en.wikipedia.org/wiki/Longest_increasing_subsequence
 */
function _lis(a: number[]): number[] {
  const p = a.slice(0);
  const result: number[] = [];
  result.push(0);
  let u: number;
  let v: number;

  for (let i = 0, il = a.length; i < il; i++) {
    if (a[i] === -1) {
      continue;
    }

    let j = result[result.length - 1];
    if (a[j] < a[i]) {
      p[i] = j;
      result.push(i);
      continue;
    }

    u = 0;
    v = result.length - 1;

    while (u < v) {
      let c = ((u + v) / 2) | 0;
      if (a[result[c]] < a[i]) {
        u = c + 1;
      } else {
        v = c;
      }
    }

    if (a[i] < a[result[u]]) {
      if (u > 0) {
        p[i] = result[u - 1];
      }
      result[u] = i;
    }
  }

  u = result.length;
  v = result[u - 1];

  while (u-- > 0) {
    result[u] = v;
    v = p[v];
  }

  return result;
}

/**
 * Sync HTML attributes with static shape.
 *
 * Attributes with static shape should have the same keys.
 *
 * Valid:
 *
 *   a: { title: "Google", href: "https://www.google.com" }
 *   b: { title: "Facebook", href: "https://www.facebook.com" }
 *
 * Invalid:
 *
 *  a: { title: "Google", href: "https://www.google.com" }
 *  b: { title: "Facebook" }
 */
function syncStaticShapeAttrs(node: Element, a: { [key: string]: any } | null, b: { [key: string]: any } | null): void {
  if ("<@KIVI_DEBUG@>" as string !== "DEBUG_DISABLED") {
    if (a === null || b === null) {
      throw new Error("Failed to update attrs with static shape: attrs object have dynamic shape.");
    }
  }

  let keys = Object.keys(a);
  let key: string;
  let i: number;

  for (i = 0; i < keys.length; i++) {
    key = keys[i];
    if ("<@KIVI_DEBUG@>" as string !== "DEBUG_DISABLED") {
      if (!b!.hasOwnProperty(key)) {
        throw new Error("Failed to update attrs with static shape: attrs object have dynamic shape.");
      }
    }
    const bValue = b![key];
    if (a![key] !== bValue) {
      setAttr(node, key, bValue);
    }
  }

  if ("<@KIVI_DEBUG@>" as string !== "DEBUG_DISABLED") {
    keys = Object.keys(b);
    for (i = 0; i < keys.length; i++) {
      key = keys[i];
      if (!a!.hasOwnProperty(key)) {
        throw new Error("Failed to update attrs with static shape: attrs object have dynamic shape.");
      }
    }
  }
}

/**
 * Sync HTML attributes with dynamic shape.
 *
 * Attributes with dynamic shape can have any keys, missing keys will be removed with `node.removeAttribute` method.
 *
 *   a: { title: "Google", href: "https://www.google.com" }
 *   b: { title: "Google" }
 *
 * In this example `href` attribute will be removed.
 */
function syncDynamicShapeAttrs(node: Element, a: { [key: string]: any } | null, b: { [key: string]: any } | null): void {
  let i: number;
  let keys: string[];
  let key: string;

  if (a !== null) {
    if (b === null) {
      // b is empty, remove all attributes from a.
      keys = Object.keys(a);
      for (i = 0; i < keys.length; i++) {
        node.removeAttribute(keys[i]);
      }
    } else {
      // Remove and update attributes.
      keys = Object.keys(a);
      for (i = 0; i < keys.length; i++) {
        key = keys[i];
        if (b.hasOwnProperty(key)) {
          const bValue = b[key];
          if (a[key] !== bValue) {
            setAttr(node, key, bValue);
          }
        } else {
          node.removeAttribute(key);
        }
      }

      // Insert new attributes.
      keys = Object.keys(b);
      for (i = 0; i < keys.length; i++) {
        key = keys[i];
        if (!a.hasOwnProperty(key)) {
          setAttr(node, key, b[key]);
        }
      }
    }
  } else if (b !== null) {
    // a is empty, insert all attributes from b.
    keys = Object.keys(b);
    for (i = 0; i < keys.length; i++) {
      key = keys[i];
      setAttr(node, key, b[key]);
    }
  }
}

/**
 * Sync HTML properties with static shape.
 *
 * Properties with static shape should have the same keys.
 *
 * Valid:
 *
 *   a: { title: "Google", href: "https://www.google.com" }
 *   b: { title: "Facebook", href: "https://www.facebook.com" }
 *
 * Invalid:
 *
 *  a: { title: "Google", href: "https://www.google.com" }
 *  b: { title: "Facebook" }
 */
function syncStaticShapeProps(node: Element, a: { [key: string]: any }, b: { [key: string]: any }): void {
  if ("<@KIVI_DEBUG@>" as string !== "DEBUG_DISABLED") {
    if (a === null || b === null) {
      throw new Error("Failed to update props with static shape: props object have dynamic shape.");
    }
  }

  let keys = Object.keys(a);
  let key: string;
  let i: number;

  for (i = 0; i < keys.length; i++) {
    key = keys[i];
    if ("<@KIVI_DEBUG@>" as string !== "DEBUG_DISABLED") {
      if (!b.hasOwnProperty(key)) {
        throw new Error("Failed to update props with static shape: props object have dynamic shape.");
      }
    }
    const bValue = b[key];
    if (a[key] !== bValue) {
      (node as { [key: string]: any })[key] = bValue;
    }
  }

  if ("<@KIVI_DEBUG@>" as string !== "DEBUG_DISABLED") {
    keys = Object.keys(b);
    for (i = 0; i < keys.length; i++) {
      key = keys[i];
      if (!a.hasOwnProperty(key)) {
        throw new Error("Failed to update attrs with static shape: attrs object have dynamic shape.");
      }
    }
  }
}

/**
 * Create a VNode representing a [Text] node.
 */
export function createVText(content: string): VNode {
  return new VNode(VNodeFlags.Text, null, content);
}

/**
 * Create a VNode representing an [Element] node.
 */
export function createVElement(tagName: string): VNode {
  return new VNode(VNodeFlags.Element, tagName, null);
}

/**
 * Create a VNode representing a [SVGElement] node.
 */
export function createVSvgElement(tagName: string): VNode {
  return new VNode(VNodeFlags.Element | VNodeFlags.Svg, tagName, null);
}
