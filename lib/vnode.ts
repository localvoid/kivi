import {printError} from "./debug";
import {
  SvgNamespace, VNodeFlags, VNodeDebugFlags, RenderFlags, ContainerManagerDescriptorDebugFlags,
  ComponentDescriptorFlags, setAttr,
} from "./misc";
import {Component, ComponentDescriptor} from "./component";
import {VModel} from "./vmodel";
import {ContainerManager} from "./container_manager";
import {scheduler, schedulerUpdateComponent} from "./scheduler";

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
   * Tag name of the element, or reference to VModel if virtual node represents an element, or ComponentDescriptor
   * if it represents a component.
   */
  _tag: string|VModel<any>|ComponentDescriptor<any, any>;
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
  _attrs: {[key: string]: any};
  /**
   * Style in css string format.
   *
   * Style is assigned to DOM nodes with `style.cssText` property, if virtual node represents an element from svg
   * namespace, style will be assigned with `setAttribute("style", "cssText")` method.
   */
  _style: string;
  /**
   * Class name.
   *
   * Class name is assigned to DOM nodes with `className` property, if virtual node represents an element from svg
   * namespace, class name will be assigned with `setAttribute("class", "className")` method.
   */
  _className: string;
  /**
   * Children property can contain flat array of children virtual nodes, or text if it contains a single text node
   * child. If virtual node represents an input field, children property will contain input value.
   */
  _children: VNode[]|string|boolean;
  /**
   * Reference to HTML Node. It will be available after virtual node is created or synced. Each time VNode is synced,
   * reference to the HTML Node is transferred from old virtual node to the new one.
   */
  ref: Node;
  /**
   * cref property can be a reference to a Component or Container Manager. If virtual node is a Component, then cref
   * will be available after virtual node is created or synced. Each time virtual node is synced, reference to a
   * Component is transferred from old virtual node to the new one.
   */
  cref: Component<any, any>|ContainerManager<any>;

  /**
   * Debug properties are used because VNode properties are frozen.
   *
   * See `VNodeDebugFlags` for details.
   */
  _debugProperties: {flags: number};

  constructor(flags: number, tag: string|VModel<any>|ComponentDescriptor<any, any>, props: any) {
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

    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      this._debugProperties = {
        flags: 0,
      };
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
   * If virtual node is using `VModel` instance with custom update handler, update data should be assigned with `data`
   * method.
   *
   * This method is available on element and component's root virtual node types.
   */
  props(props: {[key: string]: any}): VNode {
    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      if ((this._flags & (VNodeFlags.Element | VNodeFlags.Root)) === 0) {
        throw new Error("Failed to set props on VNode: props method should be called on element or component" +
                        " root nodes only.");
      }
      if ((this._flags & VNodeFlags.VModel) !== 0) {
        if ((this._flags & VNodeFlags.VModelUpdateHandler) !== 0) {
          throw new Error("Failed to set props on VNode: VNode is using VModel with custom update handler.");
        }
        const model = this._tag as VModel<any>;
        if (model._props !== null) {
          const keys = Object.keys(props);
          for (let i = 0; i < keys.length; i++) {
            if (model._attrs.hasOwnProperty(keys[i])) {
              throw new Error(`Failed to set props on VNode: VNode is using VModel that uses the same` +
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
   * Set properties with dynamic shape.
   *
   * Properties can have different set of keys, when reconciliation algorithm updates property values, it will assign
   * `undefined` to all missing keys.
   *
   *     const a = createVElement("div").props({"id": "Main", "title": "Title"});
   *     const b = createVElement("div").props({"id": "Main"});
   *
   * Props property is used to set properties directly on DOM node:
   *
   *     e: HTMLElement;
   *     e.propertyName = propertyValue;
   *
   * When virtual node is mounted on top of existing HTML, all properties will be assigned during mounting phase.
   *
   * If virtual node is using `VModel` instance with custom update handler, update data should be assigned with `data`
   * method.
   *
   * This method is available on element and component's root virtual node types.
   */
  dynamicShapeProps(props?: {[key: string]: any}): VNode {
    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      if ((this._flags & (VNodeFlags.Element | VNodeFlags.Root)) === 0) {
        throw new Error("Failed to set props on VNode: props method should be called on element or component" +
                        " root nodes only.");
      }
      if ((this._flags & VNodeFlags.VModel) !== 0) {
        if ((this._flags & VNodeFlags.VModelUpdateHandler) !== 0) {
          throw new Error("Failed to set props on VNode: VNode is using VModel with custom update handler.");
        }
        const model = this._tag as VModel<any>;
        if (model._props !== null) {
          const keys = Object.keys(props);
          for (let i = 0; i < keys.length; i++) {
            if (model._attrs.hasOwnProperty(keys[i])) {
              throw new Error(`Failed to set props on VNode: VNode is using VModel that uses the same` +
                              ` property "${keys[i]}".`);
            }
          }
        }
      }
    }
    this._flags |= VNodeFlags.DynamicShapeProps;
    this._props = props === undefined ? null : props;
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
   * If virtual node is using `VModel` instance with custom update handler, update data should be assigned with `data`
   * method.
   *
   * This method is available on element and component's root virtual node types.
   */
  attrs(attrs: {[key: string]: any}): VNode {
    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      if ((this._flags & (VNodeFlags.Element | VNodeFlags.Root)) === 0) {
        throw new Error("Failed to set attrs on VNode: attrs method should be called on element or component" +
                        " root nodes only.");
      }
      if ((this._flags & VNodeFlags.VModel) !== 0) {
        if ((this._flags & VNodeFlags.VModelUpdateHandler) !== 0) {
          throw new Error("Failed to set attrs on VNode: VNode is using VModel with custom update handler.");
        }
        const model = this._tag as VModel<any>;
        if (model._attrs !== null) {
          const keys = Object.keys(attrs);
          for (let i = 0; i < keys.length; i++) {
            if (model._attrs.hasOwnProperty(keys[i])) {
              throw new Error(`Failed to set attrs on VNode: VNode is using VModel that uses the same` +
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
   * If virtual node is using `VModel` instance with custom update handler, update data should be assigned with `data`
   * method.
   *
   * This method is available on element and component's root virtual node types.
   */
  dynamicShapeAttrs(attrs?: {[key: string]: any}): VNode {
    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      if ((this._flags & (VNodeFlags.Element | VNodeFlags.Root)) === 0) {
        throw new Error("Failed to set attrs on VNode: attrs method should be called on element or component" +
                        " root nodes only.");
      }
      if ((this._flags & VNodeFlags.VModel) !== 0) {
        if ((this._flags & VNodeFlags.VModelUpdateHandler) !== 0) {
          throw new Error("Failed to set attrs on VNode: VNode is using VModel with custom update handler.");
        }
        const model = this._tag as VModel<any>;
        if (model._attrs !== null) {
          const keys = Object.keys(attrs);
          for (let i = 0; i < keys.length; i++) {
            if (model._attrs.hasOwnProperty(keys[i])) {
              throw new Error(`Failed to set attrs on VNode: VNode is using VModel that uses the same` +
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
   * Set update data for VModel custom update handler.
   *
   * This method is available on element and component's root virtual node types.
   */
  data(data: any): VNode {
    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      if ((this._flags & (VNodeFlags.Element | VNodeFlags.Root | VNodeFlags.VModel)) === 0) {
        throw new Error("Failed to set data on VNode: data method should be called on element or component" +
                        " root nodes represented by VModel only.");
      }
      if ((this._flags & VNodeFlags.VModelUpdateHandler) === 0) {
        throw new Error("Failed to set data on VNode: VNode should be using VModel with custom update handler.");
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
  style(style: string): VNode {
    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      if ((this._flags & (VNodeFlags.Element | VNodeFlags.Root)) === 0) {
        throw new Error("Failed to set style on VNode: style method should be called on element or component" +
                        " root nodes only.");
      }
      if ((this._flags & VNodeFlags.VModel) !== 0) {
        if ((this._flags & VNodeFlags.VModelUpdateHandler) !== 0) {
          throw new Error("Failed to set style on VNode: VNode is using VModel with custom update handler.");
        }
        if (((this._tag as VModel<any>)._style) !== null) {
          throw new Error("Failed to set style on VNode: VNode is using VModel with assigned style.");
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
   * This method is available on element, component and component's root virtual node types.
   */
  className(className: string): VNode {
    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      if ((this._flags & (VNodeFlags.Element | VNodeFlags.Component | VNodeFlags.Root)) === 0) {
        throw new Error("Failed to set classes on VNode: classes method should be called on element or component" +
                        " root nodes only.");
      }
      if ((this._flags & VNodeFlags.VModel) !== 0) {
        if ((this._flags & VNodeFlags.VModelUpdateHandler) !== 0) {
          throw new Error("Failed to set style on VNode: vnode is using vmodel with custom update handler.");
        }
        if (((this._tag as VModel<any>)._className) !== null) {
          throw new Error("Failed to set style on VNode: vnode is using vmodel with assigned className.");
        }
      }
    }
    this._className = className;
    return this;
  }

  /**
   * Set children. Children parameter should be either a flat array of virtual nodes, or text if node contains a single
   * text node.
   *
   * This method is available on element and component's root virtual node types.
   */
  children(children: VNode[]|string): VNode {
    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      if ((this._flags & (VNodeFlags.Element | VNodeFlags.Root)) === 0) {
        throw new Error("Failed to set children on VNode: children method should be called on element or component" +
                        " root nodes only.");
      }
      if ((this._flags & VNodeFlags.InputElement) !== 0) {
        throw new Error("Failed to set children on VNode: input elements can't have children.");
      }
      if ((this._flags & VNodeFlags.ManagedContainer) !== 0) {
        if (typeof children === "string") {
          throw new Error("Failed to set children on VNode: VNode is using ContainerManager that doesn't accept" +
                          " children with string type.");
        }
        if (((this.cref as ContainerManager<any>).descriptor._debugFlags &
            ContainerManagerDescriptorDebugFlags.AcceptKeyedChildrenOnly) !== 0) {
          throw new Error("Failed to set children on VNode: VNode is using ContainerManager that accepts only" +
                          " children with keys.");
        }
      }
    }
    this._children = children;
    return this;
  }

  /**
   * Set children and enable track by key reconciliation algorithm. Children parameter should be a flat array of
   * virtual nodes with assigned key properties.
   *
   * This method is available on element and component's root virtual node types.
   */
  trackByKeyChildren(children: VNode[]): VNode {
    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
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
    this._flags |= VNodeFlags.TrackByKeyChildren;
    this._children = children;
    return this;
  }

  /**
   * Set text value for Input Elements.
   *
   * This method is available on text input element node type.
   */
  value(value: string): VNode {
    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
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
    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
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
    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
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
    this.ref = component.element;
    this.cref = component;
    return this;
  }

  /**
   * Set container manager.
   *
   * Container Manager will be responsible for inserting, removing, replacing and moving children nodes.
   */
  managedContainer(manager: ContainerManager<any>): VNode {
    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      if ((this._flags & (VNodeFlags.Element | VNodeFlags.Root)) === 0) {
        throw new Error("Failed to set managedContainer mode on VNode: managedContainer method should be called" +
                        " on element or component root nodes only.");
      }
      if ((this._flags & VNodeFlags.InputElement) !== 0) {
        throw new Error("Failed to set managedContainer mode on VNode: managed container doesn't work on input" +
                        " elements.");
      }
      if (this._children !== null) {
        throw new Error("Failed to set managedContainer mode on VNode: managedContainer method should be called" +
                        " before children assignment.");
      }
    }
    this._flags |= VNodeFlags.ManagedContainer;
    this.cref = manager;
    return this;
  }

  /**
   * Disable children shape errors in DEBUG mode.
   */
  disableChildrenShapeError(): VNode {
    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      if ((this._flags & (VNodeFlags.Element | VNodeFlags.Root)) === 0) {
        throw new Error("Failed to disable children shape error on VNode: disableChildrenShapeError method should" +
                        " be called on element or component root nodes only.");
      }
      this._debugProperties.flags |= VNodeDebugFlags.DisabledChildrenShapeError;
    }
    return this;
  }

  /**
   * Disable freezing all properties in DEBUG mode.
   *
   * One use case when it is quite useful, it is for ContentEditable editor We can monitor small changes in DOM, and
   * apply this changes to VNodes, so that when we rerender text block, we don"t touch anything that is already up to
   * date (prevents spellchecker flickering).
   */
  disableFreeze(): VNode {
    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      this._debugProperties.flags |= VNodeDebugFlags.DisabledFreeze;
    }
    return this;
  }
}

/**
 * Instantiate a DOM Node or Component from the Virtual DOM Node.
 *
 * This method doesn't set any attributes, or create children, to render internal representation of the virtual node,
 * use `vNodeRender` method.
 */
export function vNodeInstantiate(vnode: VNode, owner: Component<any, any>): void {
  let flags = vnode._flags;

  if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
    if (vnode.ref !== null && ((flags & VNodeFlags.CommentPlaceholder) === 0)) {
      throw new Error("Failed to create VNode: VNode already has a reference to the DOM node.");
    }
  }
  vnode._flags &= ~VNodeFlags.CommentPlaceholder;

  if ((flags & VNodeFlags.Text) !== 0) {
    vnode.ref = document.createTextNode(vnode._props);
  } else if ((flags & VNodeFlags.Element) !== 0) {
    if ((flags & VNodeFlags.VModel) === 0) {
      if ((flags & VNodeFlags.Svg) === 0) {
        vnode.ref = document.createElement(vnode._tag as string);
      } else {
        vnode.ref = document.createElementNS(SvgNamespace, vnode._tag as string);
      }
    } else {
      vnode.ref = (vnode._tag as VModel<any>).createElement();
    }
  } else if ((flags & VNodeFlags.KeepAlive) === 0) {
    const c = (vnode._tag as ComponentDescriptor<any, any>).createComponent(owner, vnode._props);
    vnode.ref = c.element;
    vnode.cref = c;
  }
}

/**
 * Render internal representation of the Virtual DOM Node.
 */
export function vNodeRender(vnode: VNode, owner: Component<any, any>, renderFlags: number): void {
  let i: number;

  if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
    if (vnode.ref === null) {
      throw new Error("Failed to render VNode: VNode should be created before render.");
    }
    if ((vnode._flags & VNodeFlags.CommentPlaceholder) !== 0) {
      throw new Error("Failed to render VNode: VNode comment placeholder cannot be rendered.");
    }
    if ((vnode._debugProperties.flags & VNodeDebugFlags.Rendered) !== 0) {
      throw new Error("Failed to render VNode: VNode cannot be rendered twice.");
    }
    if ((vnode._debugProperties.flags & VNodeDebugFlags.Mounted) !== 0) {
      throw new Error("Failed to render VNode: VNode cannot be rendered after mount.");
    }
    vnode._debugProperties.flags |= VNodeDebugFlags.Mounted;
  }

  let il: number;
  let key: any;
  let keys: any[];
  const flags = vnode._flags;

  let ref: Element;

  if ((flags & (VNodeFlags.Element | VNodeFlags.Root)) !== 0) {
    ref = vnode.ref as Element;
    if ((flags & VNodeFlags.VModelUpdateHandler) === 0) {
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
        if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
          let className = ref.getAttribute("class");
          if ((flags & VNodeFlags.Root) !== 0 && className) {
            printError(`VNode render: Component root node overwrited className property` +
              ` "${className}" with "${vnode._className}".`);
          }
        }
        if ((flags & VNodeFlags.Svg) === 0) {
          (ref as HTMLElement).className = vnode._className;
        } else {
          ref.setAttribute("class", vnode._className);
        }
      }
    } else {
      if ((flags & VNodeFlags.Root) === 0) {
        (vnode._tag as VModel<any>).update(ref, undefined, vnode._props);
      } else {
        (owner.descriptor._tag as VModel<any>).update(ref, undefined, vnode._props);
      }
    }

    const children = vnode._children;
    if (children !== null) {
      if ((vnode._flags & VNodeFlags.InputElement) === 0) {
        if (typeof children === "string") {
          ref.textContent = children;
        } else {
          for (i = 0, il = (children as VNode[]).length; i < il; i++) {
            vNodeInsertChild(vnode, (children as VNode[])[i], null, owner, renderFlags);
          }
        }
      } else {
        if ((vnode._flags & VNodeFlags.TextInputElement) !== 0) {
          (vnode.ref as HTMLInputElement).value = vnode._children as string;
        } else { // ((vnode.flags & VNodeFlags.CheckedInputElement) !== 0)
          (vnode.ref as HTMLInputElement).checked = vnode._children as boolean;
        }
      }
    }
  } else if ((flags & VNodeFlags.Component) !== 0) {
    ref = vnode.ref as Element;

    if (vnode._className !== null) {
      if ((flags & VNodeFlags.Svg) === 0) {
        (ref as HTMLElement).className = vnode._className;
      } else {
        ref.setAttribute("class", vnode._className);
      }
    }

    if ((renderFlags & RenderFlags.ShallowRender) === 0) {
      schedulerUpdateComponent(scheduler, vnode.cref as Component<any, any>);
    }
  }

  vNodeFreeze(vnode);
}

/**
 * Mount VNode on top of existing html document.
 */
export function vNodeMount(vnode: VNode, node: Node, owner: Component<any, any>): void {
  if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
    if (vnode.ref !== null) {
      throw new Error("Failed to mount VNode: VNode cannot be mounted if it already has a reference to DOM Node.");
    }
    if ((vnode._flags & VNodeFlags.CommentPlaceholder) !== 0) {
      throw new Error("Failed to mount VNode: VNode comment placeholder cannot be mounted.");
    }
    if ((vnode._debugProperties.flags & VNodeDebugFlags.Rendered) !== 0) {
      throw new Error("Failed to mount VNode: VNode cannot be mounted after render.");
    }
    if ((vnode._debugProperties.flags & VNodeDebugFlags.Mounted) !== 0) {
      throw new Error("Failed to mount VNode: VNode cannot be mounted twice.");
    }
    vnode._debugProperties.flags |= VNodeDebugFlags.Mounted;
  }

  const flags = vnode._flags;
  const children = vnode._children;
  let i: number;

  vnode.ref = node;

  if ((flags & VNodeFlags.Component) !== 0) {
    const cref = vnode.cref = (vnode._tag as ComponentDescriptor<any, any>)
      .mountComponent(node as Element, owner, vnode._props);
    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      const dflags = cref.descriptor._flags;
      if (node.nodeType !== 1) {
        throw new Error("Failed to mount VNode: invalid node type, components can be mounted on element nodes only.");
      }
      const eTagName = ((node as Element).tagName).toLowerCase();
      let cTagName: string;
      if ((dflags & ComponentDescriptorFlags.VModel) !== 0) {
        cTagName = (cref.descriptor._tag as VModel<any>)._tagName.toLowerCase();
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
        if (vnode._className !== null) {
          const eClassName = (node as Element).getAttribute("class");
          if (vnode._className !== eClassName) {
            throw new Error(`Failed to mount VNode: invalid className, component expects className` +
              ` "${vnode._className}", but found "${eClassName}".`);
          }
        }
      }
    }
    schedulerUpdateComponent(scheduler, cref);
  } else {
    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
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

    if ((vnode._flags & (VNodeFlags.Element | VNodeFlags.Root)) !== 0) {
      // Assign properties on mount, because they don"t exist in html markup.
      if (vnode._props !== null) {
        const keys = Object.keys(vnode._props);
        for (i = 0; i < keys.length; i++) {
          const key = keys[i];
          (node as any)[key] = vnode._props[key];
        }
      }

      if (children !== null && typeof children !== "string" && (children as VNode[]).length > 0) {
        let child = node.firstChild;

        // Adjacent text nodes should be separated by Comment node "<!---->", so we can properly mount them.
        let commentNode: Node;
        while (child.nodeType === 8) {
          commentNode = child;
          child = child.nextSibling;
          node.removeChild(commentNode);
        }
        for (i = 0; i < (children as VNode[]).length; i++) {
          if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
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

  vNodeFreeze(vnode);
}

  /**
   * Create Comment placeholder.
   *
   * Comment placeholder can be used to delay element appearance in animations.
   */
export function vNodeCreateCommentPlaceholder(vnode: VNode): void {
  if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
    if (vnode.ref !== null) {
      throw new Error("Failed to create a VNode Comment Placeholder: VNode already has a reference to the DOM node.");
    }
  }
  vnode._flags |= VNodeFlags.CommentPlaceholder;
  vnode.ref = document.createComment("");
}

/**
 * Recursively attach all nodes.
 */
export function vNodeAttach(vnode: VNode): void {
  if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
    if ((vnode._debugProperties.flags & VNodeDebugFlags.Attached) !== 0) {
      throw new Error("Failed to attach VNode: VNode is already attached.");
    }
    vnode._debugProperties.flags |= VNodeDebugFlags.Attached;
    vnode._debugProperties.flags &= ~VNodeDebugFlags.Detached;
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
  if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
    if ((vnode._debugProperties.flags & VNodeDebugFlags.Attached) !== 0) {
      throw new Error("Failed to attach VNode: VNode is already attached.");
    }
    vnode._debugProperties.flags |= VNodeDebugFlags.Attached;
    vnode._debugProperties.flags &= ~VNodeDebugFlags.Detached;
  }
  if ((vnode._flags & VNodeFlags.Component) !== 0) {
    (vnode.cref as Component<any, any>).attach();
  }
}

/**
 * Recursively detach all nodes.
 */
export function vNodeDetach(vnode: VNode): void {
  if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
    if ((vnode._debugProperties.flags & VNodeDebugFlags.Detached) !== 0) {
      throw new Error("Failed to detach VNode: VNode is already detached.");
    }
    vnode._debugProperties.flags |= VNodeDebugFlags.Detached;
    vnode._debugProperties.flags &= ~VNodeDebugFlags.Attached;
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
  if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
    if ((vnode._debugProperties.flags & VNodeDebugFlags.Disposed) !== 0) {
      throw new Error("Failed to dispose VNode: VNode is already disposed.");
    }
    if ((vnode._debugProperties.flags & (VNodeDebugFlags.Rendered | VNodeDebugFlags.Mounted)) === 0) {
      throw new Error("Failed to dispose VNode: VNode should be rendered or mounted before disposing.");
    }
    vnode._debugProperties.flags |= VNodeDebugFlags.Disposed;
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

export function vNodeInsertChild(parent: VNode, node: VNode, nextRef: Node, owner: Component<any, any>,
    renderFlags: number): void {
  if (((parent._flags & VNodeFlags.ManagedContainer) !== 0) &&
      (parent.cref as ContainerManager<any>).descriptor._insertChild !== null) {
    (parent.cref as ContainerManager<any>).descriptor._insertChild(
      parent.cref as ContainerManager<any>, parent.ref as Element, node, nextRef, owner, renderFlags);
  } else {
    insertVNodeBefore(parent.ref as Element, node, nextRef, owner, renderFlags);
  }
}

export function vNodeReplaceChild(parent: VNode, newNode: VNode, refNode: VNode, owner: Component<any, any>,
    renderFlags: number): void {
  if (((parent._flags & VNodeFlags.ManagedContainer) !== 0) &&
      (parent.cref as ContainerManager<any>).descriptor._replaceChild !== null) {
    (parent.cref as ContainerManager<any>).descriptor._replaceChild(
      parent.cref as ContainerManager<any>, parent.ref as Element, newNode, refNode, owner, renderFlags);
  } else {
    replaceVNode(parent.ref as Element, newNode, refNode, owner, renderFlags);
  }
}

export function vNodeMoveChild(parent: VNode, node: VNode, nextRef: Node, owner: Component<any, any>): void {
  if (((parent._flags & VNodeFlags.ManagedContainer) !== 0) &&
      (parent.cref as ContainerManager<any>).descriptor._moveChild !== null) {
    (parent.cref as ContainerManager<any>).descriptor._moveChild(
      parent.cref as ContainerManager<any>, parent.ref as Element, node, nextRef, owner);
  } else {
    moveVNode(parent.ref as Element, node, nextRef, owner);
  }
}

export function vNodeRemoveChild(parent: VNode, node: VNode, owner: Component<any, any>): void {
  if (((parent._flags & VNodeFlags.ManagedContainer) !== 0) &&
      (parent.cref as ContainerManager<any>).descriptor._removeChild !== null) {
    (parent.cref as ContainerManager<any>).descriptor._removeChild(
      parent.cref as ContainerManager<any>, parent.ref as Element, node, owner);
  } else {
    removeVNode(parent.ref as Element, node, owner);
  }
}

/**
 * Freeze VNode properties.
 */
export function vNodeFreeze(vnode: VNode): void {
  if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
    if ((vnode._debugProperties.flags & VNodeDebugFlags.DisabledFreeze) === 0) {
      Object.freeze(vnode);
      if (vnode._attrs !== null && !Object.isFrozen(vnode._attrs)) {
        Object.freeze(vnode._attrs);
      }
      // Don't freeze props in Components.
      if (((vnode._flags & VNodeFlags.Component) === 0) &&
          vnode._props !== null &&
          typeof vnode._props === "object" &&
          !Object.isFrozen(vnode._props)) {
        Object.freeze(vnode._props);
      }
      if (vnode._children !== null &&
          Array.isArray((vnode._children)) &&
          !Object.isFrozen(vnode._children)) {
        Object.freeze(vnode._children);
      }
    }
  }
}

/**
 * Insert VNode before [nextRef] DOM Node.
 *
 * Can be used as a generic method to insert nodes in ContainerManager.
 */
export function insertVNodeBefore(container: Element, node: VNode, nextRef: Node, owner: Component<any, any>,
    renderFlags: number): void {
  if (node.ref === null) {
    vNodeInstantiate(node, owner);
    container.insertBefore(node.ref, nextRef);
    vNodeAttached(node);
    vNodeRender(node, owner, renderFlags);
  } else {
    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      if ((node._flags & VNodeFlags.KeepAlive) === 0) {
        throw new Error("Failed to replace node: VNode instance already has been used to create DOM node.");
      }
    }
    container.insertBefore(node.ref, nextRef);
    vNodeAttach(node);
    if ((renderFlags & RenderFlags.ShallowUpdate) === 0) {
      schedulerUpdateComponent(scheduler, node.cref as Component<any, any>,
        (node._flags & VNodeFlags.BindOnce) === 0 ? node._props : null);
    }
  }
}

/**
 * Replace VNode.
 *
 * Can be used as a generic method to replace nodes in ContainerManager.
 */
export function replaceVNode(container: Element, newNode: VNode, refNode: VNode, owner: Component<any, any>,
    renderFlags: number): void {
  if (newNode.ref === null) {
    vNodeInstantiate(newNode, owner);
    container.replaceChild(newNode.ref, refNode.ref);
    vNodeAttached(newNode);
    vNodeRender(newNode, owner, renderFlags);
  } else {
    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      if ((newNode._flags & VNodeFlags.KeepAlive) === 0) {
        throw new Error("Failed to replace node: VNode instance already has been used to create DOM node.");
      }
    }
    container.replaceChild(newNode.ref, refNode.ref);
    vNodeAttach(newNode);
    if ((renderFlags & RenderFlags.ShallowUpdate) === 0) {
      schedulerUpdateComponent(scheduler, newNode.cref as Component<any, any>,
        (newNode._flags & VNodeFlags.BindOnce) === 0 ? newNode._props : null);
    }
  }
  vNodeDispose(refNode);
}

/**
 * Move VNode in before [nextRef] DOM node.
 *
 * Can be used as a generic method to move nodes in ContainerManager.
 */
export function moveVNode(container: Element, node: VNode, nextRef: Node, owner: Component<any, any>): void {
  container.insertBefore(node.ref, nextRef);
}

/**
 * Remove VNode.
 *
 * Can be used as a generic method to remove nodes in ContainerManager.
 */
export function removeVNode(container: Element, node: VNode, owner: Component<any, any>): void {
  container.removeChild(node.ref);
  vNodeDispose(node);
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

/**
 * Create a VNode representing a Component root node.
 */
export function createVRoot(): VNode {
  return new VNode(VNodeFlags.Root, null, null);
}
