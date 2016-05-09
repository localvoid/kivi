import {printError} from "./debug";
import {
  SvgNamespace, VNodeFlags, VNodeDebugFlags, RenderFlags, ContainerManagerDescriptorDebugFlags,
  syncStaticShapeProps, syncDynamicShapeProps, syncStaticShapeAttrs, syncDynamicShapeAttrs, setAttr,
  ComponentDescriptorFlags,
} from "./misc";
import {Component, ComponentDescriptor} from "./component";
import {VModel} from "./vmodel";
import {ContainerManager} from "./container_manager";

/**
 * Virtual DOM Node.
 *
 * @final
 */
export class VNode {
  _flags: number;
  /**
   * Tag name of the element, or reference to VModel or ComponentDescriptor.
   */
  _tag: string|VModel<any>|ComponentDescriptor<any, any>;
  /**
   * Key that should be unique among its siblings.
   */
  _key: any;
  /**
   * Properties.
   */
  _props: any;
  /**
   * Attributes.
   */
  _attrs: {[key: string]: any};
  /**
   * Style in css string format.
   */
  _style: string;
  /**
   * Class name.
   */
  _className: string;
  /**
   * Children property can represent actual children, or value for input fields.
   * When VNode is a Component, then instead of rendering children in place, they
   * are transferred to the Component.
   */
  _children: VNode[]|string|boolean;
  /**
   * Reference to HTML Node. It will be available after VNode is created or synced.
   * Each time VNode is synced, reference to the Html Node is transferred from old
   * VNode to the new one.
   */
  ref: Node;
  /**
   * Cref property can be a reference to the Component or Container Manager.
   * If VNode is a Component, then cref will be available after VNode is created
   * or synced. Each time VNode is synced, reference to the Component is transferred
   * from old VNode to the new one.
   */
  cref: Component<any, any>|ContainerManager<any>;

  /**
   * Debug properties are used because VNode properties are frozen.
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
   * Set key, key should be unique among its siblings.
   */
  key(key: any): VNode {
    this._key = key;
    return this;
  }

  /**
   * Set properties.
   *
   * When virtual node is mounted on top of existing HTML, all properties will
   * be assigned during mounting phase.
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
   * When virtual node is mounted on top of existing HTML, all properties will
   * be assigned during mounting phase.
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
   * Set VModel data.
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
   */
  className(className: string): VNode {
    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      if ((this._flags & (VNodeFlags.Element | VNodeFlags.Root)) === 0) {
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
   * Set children.
   */
  children(children: VNode[]|string): VNode {
    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      if ((this._flags & (VNodeFlags.Element | VNodeFlags.Root | VNodeFlags.Component)) === 0) {
        throw new Error("Failed to set children on VNode: children method should be called on element, component" +
                        " or component root nodes only.");
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
   * Enable tracking by key in children reconciliation algorithm.
   *
   * When tracking by key is enabled, all children should have unique key
   * property.
   */
  trackByKeyChildren(children: VNode[]): VNode {
    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      if ((this._flags & (VNodeFlags.Element | VNodeFlags.Root | VNodeFlags.Component)) === 0) {
        throw new Error("Failed to set children on VNode: children method should be called on element, component" +
                        " or component root nodes only.");
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
   * Keep alive Node when removing from the document.
   *
   * Keep alive nodes should be manually disposed by Component.
   */
  keepAlive(): VNode {
    this._flags |= VNodeFlags.KeepAlive;
    return this;
  }

  /**
   * Set container manager for this node.
   *
   * Container Manager will be responsible for inserting, removing, replacing,
   * moving children nodes.
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
   * One use case when it is quite useful, it is for ContentEditable editor.
   * We can monitor small changes in DOM, and apply this changes to VNodes,
   * so that when we rerender text block, we don"t touch anything that is
   * already up to date (prevents spellchecker flickering).
   */
  disableFreeze(): VNode {
    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      this._debugProperties.flags |= VNodeDebugFlags.DisabledFreeze;
    }
    return this;
  }

  /**
   * Check if two nodes can be synced.
   */
  private _canSync(other: VNode): boolean {
    return (this._flags === other._flags &&
            this._tag === other._tag &&
            this._key === other._key);
  }

  /**
   * Create a DOM Node from the Virtual DOM Node.
   *
   * This method doesn"t set any attributes, or create children, render method
   * is responsible for setting up internal representation of the Node.
   */
  create(owner: Component<any, any>): void {
    let flags = this._flags;

    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      if (this.ref !== null && ((flags & VNodeFlags.CommentPlaceholder) === 0)) {
        throw new Error("Failed to create VNode: VNode already has a reference to the DOM node.");
      }
    }
    this._flags &= ~VNodeFlags.CommentPlaceholder;

    if ((flags & VNodeFlags.Text) !== 0) {
      this.ref = document.createTextNode(this._props);
    } else if ((flags & VNodeFlags.Element) !== 0) {
      if ((flags & VNodeFlags.VModel) === 0) {
        if ((flags & VNodeFlags.Svg) === 0) {
          this.ref = document.createElement(this._tag as string);
        } else {
          this.ref = document.createElementNS(SvgNamespace, this._tag as string);
        }
      } else {
        this.ref = (this._tag as VModel<any>).createElement();
      }
    } else {
      const c = (this._tag as ComponentDescriptor<any, any>)
        .createComponent(owner, this._props, this._children as string|VNode[]);
      this.ref = c.element;
      this.cref = c;
    }
  }

  /**
   * Create Comment placeholder.
   *
   * Comment placeholder can be used to delay element appearance in animations.
   */
  createCommentPlaceholder(): void {
    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      if (this.ref !== null) {
        throw new Error("Failed to create a VNode Comment Placeholder: VNode already has a reference to the DOM node.");
      }
    }
    this._flags |= VNodeFlags.CommentPlaceholder;
    this.ref = document.createComment("");
  }

  /**
   * Render internal representation of the Virtual DOM Node.
   */
  render(owner: Component<any, any>, renderFlags: number): void {
    let i: number;

    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      if (this.ref === null) {
        throw new Error("Failed to render VNode: VNode should be created before render.");
      }
      if ((this._flags & VNodeFlags.CommentPlaceholder) !== 0) {
        throw new Error("Failed to render VNode: VNode comment placeholder cannot be rendered.");
      }
      if ((this._debugProperties.flags & VNodeDebugFlags.Rendered) !== 0) {
        throw new Error("Failed to render VNode: VNode cannot be rendered twice.");
      }
      if ((this._debugProperties.flags & VNodeDebugFlags.Mounted) !== 0) {
        throw new Error("Failed to render VNode: VNode cannot be rendered after mount.");
      }
      this._debugProperties.flags |= VNodeDebugFlags.Mounted;
    }

    let il: number;
    let key: any;
    let keys: any[];
    const flags = this._flags;

    let ref: Element;

    if ((flags & (VNodeFlags.Element | VNodeFlags.Root)) !== 0) {
      ref = this.ref as Element;
      if ((flags & VNodeFlags.VModelUpdateHandler) === 0) {
        const props = this._props;
        if (props !== null) {
          keys = Object.keys(props);
          for (i = 0, il = keys.length; i < il; i++) {
            key = keys[i];
            (ref as any)[key] = props[key];
          }
        }

        if (this._attrs !== null) {
          keys = Object.keys(this._attrs);
          for (i = 0, il = keys.length; i < il; i++) {
            key = keys[i];
            setAttr(ref, key, (this._attrs as any)[key]);
          }
        }

        if (this._style !== null) {
          if ((flags & VNodeFlags.Svg) === 0) {
            (ref as HTMLElement).style.cssText = this._style;
          } else {
            ref.setAttribute("style", this._style);
          }
        }

        if (this._className !== null) {
          if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
            let className = ref.getAttribute("class");
            if ((flags & VNodeFlags.Root) !== 0 && className) {
              printError(`VNode render: Component root node overwrited className property` +
                         ` "${className}" with "${this._className}".`);
            }
          }
          if ((flags & VNodeFlags.Svg) === 0) {
            (ref as HTMLElement).className = this._className;
          } else {
            ref.setAttribute("class", this._className);
          }
        }
      } else {
        if ((flags & VNodeFlags.Root) === 0) {
          (this._tag as VModel<any>).update(ref, null, this._props);
        } else {
          (owner.descriptor._tag as VModel<any>).update(ref, null, this._props);
        }
      }

      const children = this._children;
      if (children !== null) {
        if ((this._flags & VNodeFlags.InputElement) === 0) {
          if (typeof children === "string") {
            ref.textContent = children;
          } else {
            for (i = 0, il = (children as VNode[]).length; i < il; i++) {
              this._insertChild((children as VNode[])[i], null, owner, renderFlags);
            }
          }
        } else {
          if ((this._flags & VNodeFlags.TextInputElement) !== 0) {
            (this.ref as HTMLInputElement).value = this._children as string;
          } else { // ((this.flags & VNodeFlags.CheckedInputElement) !== 0)
            (this.ref as HTMLInputElement).checked = this._children as boolean;
          }
        }
      }
    } else if ((flags & VNodeFlags.Component) !== 0) {
      ref = this.ref as Element;

      if (this._className !== null) {
        if ((flags & VNodeFlags.Svg) === 0) {
          (ref as HTMLElement).className = this._className;
        } else {
          ref.setAttribute("class", this._className);
        }
      }

      if ((renderFlags & RenderFlags.ShallowRender) === 0) {
        (this.cref as Component<any, any>).update();
      }
    }

    this._freeze();
  }

  /**
   * Mount VNode on top of existing html document.
   */
  mount(node: Node, owner: Component<any, any>): void {
    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      if (this.ref !== null) {
        throw new Error("Failed to mount VNode: VNode cannot be mounted if it already has a reference to DOM Node.");
      }
      if ((this._flags & VNodeFlags.CommentPlaceholder) !== 0) {
        throw new Error("Failed to mount VNode: VNode comment placeholder cannot be mounted.");
      }
      if ((this._debugProperties.flags & VNodeDebugFlags.Rendered) !== 0) {
        throw new Error("Failed to mount VNode: VNode cannot be mounted after render.");
      }
      if ((this._debugProperties.flags & VNodeDebugFlags.Mounted) !== 0) {
        throw new Error("Failed to mount VNode: VNode cannot be mounted twice.");
      }
      this._debugProperties.flags |= VNodeDebugFlags.Mounted;
    }

    const flags = this._flags;
    const children = this._children;
    let i: number;

    this.ref = node;

    if ((flags & VNodeFlags.Component) !== 0) {
      const cref = this.cref = (this._tag as ComponentDescriptor<any, any>)
        .mountComponent(node as Element, owner, this._props, this._children as string|VNode[]);
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
          if (this._className !== null) {
            const eClassName = (node as Element).getAttribute("class");
            if (this._className !== eClassName) {
              throw new Error(`Failed to mount VNode: invalid className, component expects className` +
                              ` "${this._className}", but found "${eClassName}".`);
            }
          }
        }
      }
      cref.setData(this._props);
      cref.setChildren(this._children as VNode[]|string);
      cref.update();
    } else {
      if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
        if ((this._flags & (VNodeFlags.Element | VNodeFlags.Root)) !== 0) {
          if (node.nodeType !== 1) {
            throw new Error("Failed to mount VNode: invalid node type, VNode expects Element node.");
          }

          if (this._className !== null) {
            const eClassName = (node as Element).getAttribute("class");
            if (this._className !== eClassName) {
              throw new Error(`Failed to mount VNode: invalid className, VNode expects className` +
                              ` "${this._className}", but found "${eClassName}".`);
            }
          }
          if (this._style !== null) {
            const eStyle = (node as Element).getAttribute("style");
            if (this._style !== eStyle) {
              throw new Error(`Failed to mount VNode: invalid style, VNode expects style` +
                              ` "${this._style}", but found "${eStyle}".`);
            }
          }
        } else {
          if (node.nodeType !== 3) {
            throw new Error("Failed to mount VNode: invalid node type, VNode expects Text node.");
          }
          const text = node.nodeValue;
          if (this._props !== text) {
            throw new Error(`Failed to mount VNode: invalid text, VNode expects text "${this._props}", but found` +
                            ` "${text}".`);
          }
        }
      }

      if ((this._flags & (VNodeFlags.Element | VNodeFlags.Root)) !== 0) {
        // Assign properties on mount, because they don"t exist in html markup.
        if (this._props !== null) {
          const keys = Object.keys(this._props);
          for (i = 0; i < keys.length; i++) {
            const key = keys[i];
            (node as any)[key] = this._props[key];
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
            (children as VNode[])[i].mount(child, owner);
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

    this._freeze();
  }

  /**
   * Sync this VNode with other VNode.
   *
   * When this node is synced with other node, this node should be considered as
   * destroyed, and any access to it after sync is an null behavior.
   */
  sync(other: VNode, owner: Component<any, any>, renderFlags: number): void {
    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      if ((this._debugProperties.flags & (VNodeDebugFlags.Rendered | VNodeDebugFlags.Mounted)) === 0) {
        throw new Error("Failed to sync VNode: VNode should be rendered or mounted before sync.");
      }
      other._debugProperties.flags |= this._debugProperties.flags &
          (VNodeDebugFlags.Rendered | VNodeDebugFlags.Mounted |
           VNodeDebugFlags.Attached | VNodeDebugFlags.Detached);
    }

    const ref = this.ref as Element;
    const flags = this._flags;

    let component: Component<any, any>;
    let className: string;

    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      if (this._flags !== other._flags) {
        throw new Error(`Failed to sync VNode: flags does not match (old: ${this._flags}, new: ${other._flags}).`);
      }
      if (this._tag !== other._tag) {
        throw new Error(`Failed to sync VNode: tags does not match (old: ${this._tag}, new: ${other._tag}).`);
      }
      if (this._key !== other._key) {
        throw new Error(`Failed to sync VNode: keys does not match (old: ${this._key}, new: ${other._key}).`);
      }
      if (other.ref !== null && this.ref !== other.ref) {
        throw new Error("Failed to sync VNode: reusing VNodes isn't allowed unless it has the same ref.");
      }
    }

    other.ref = ref;

    if ((flags & VNodeFlags.Text) !== 0) {
      if (this._props !== other._props) {
        this.ref.nodeValue = other._props as string;
      }
    } else if ((flags & (VNodeFlags.Element | VNodeFlags.Root)) !== 0) {
      if ((flags & VNodeFlags.VModelUpdateHandler) === 0) {
        if (this._props !== other._props) {
          if ((this._flags & VNodeFlags.DynamicShapeProps) === 0) {
            syncStaticShapeProps(ref, this._props, other._props);
          } else {
            syncDynamicShapeProps(ref, this._props, other._props);
          }
        }
        if (this._attrs !== other._attrs) {
          if ((this._flags & VNodeFlags.DynamicShapeAttrs) === 0) {
            syncStaticShapeAttrs(ref, this._attrs, other._attrs);
          } else {
            syncDynamicShapeAttrs(ref, this._attrs, other._attrs);
          }
        }
        if (this._style !== other._style) {
          const style = (other._style === null) ? "" : other._style;
          if ((flags & VNodeFlags.Svg) === 0) {
            (ref as HTMLElement).style.cssText = style;
          } else {
            ref.setAttribute("style", style);
          }
        }

        if (this._className !== other._className) {
          className = (other._className === null) ? "" : other._className;
          if ((flags & VNodeFlags.Svg) === 0) {
            (ref as HTMLElement).className = className;
          } else {
            ref.setAttribute("class", className);
          }
        }

      } else if (this._props !== other._props) {
        if ((flags & VNodeFlags.Root) === 0) {
          (this._tag as VModel<any>).update(ref, this._props, other._props);
        } else {
          (owner.descriptor._tag as VModel<any>).update(ref, this._props, other._props);
        }
      }

      if ((this._flags & VNodeFlags.InputElement) === 0) {
        if (this._children !== other._children) {
          this.syncChildren(
            this._children as VNode[] | string,
            other._children as VNode[] | string,
            owner,
            renderFlags);
        }
      } else {
        if ((flags & VNodeFlags.TextInputElement) !== 0) {
          if ((ref as HTMLInputElement).value !== other._children) {
            (ref as HTMLInputElement).value = other._children as string;
          }
        } else { // ((flags & VNodeFlags.CheckedInputElement) !== 0)
          if ((ref as HTMLInputElement).checked !== other._children) {
            (ref as HTMLInputElement).checked = other._children as boolean;
          }
        }
      }
    } else { // if ((flags & VNodeFlags.Component) !== 0)
      component = other.cref = this.cref as Component<any, any>;

      if (this._className !== other._className) {
        className = (other._className === null) ? "" : other._className;
        if ((flags & VNodeFlags.Svg) === 0) {
          (ref as HTMLElement).className = className;
        } else {
          ref.setAttribute("class", className);
        }
      }

      if ((flags & VNodeFlags.BindOnce) === 0) {
        if ((renderFlags & RenderFlags.ShallowUpdate) === 0) {
          component.setData(other._props);
          component.setChildren(other._children as VNode[] | string);
          component.update();
        }
      }
    }

    other._freeze();
  }

  /**
   * Recursively attach all nodes.
   */
  attach(): void {
    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      if ((this._debugProperties.flags & VNodeDebugFlags.Attached) !== 0) {
        throw new Error("Failed to attach VNode: VNode is already attached.");
      }
      this._debugProperties.flags |= VNodeDebugFlags.Attached;
      this._debugProperties.flags &= ~VNodeDebugFlags.Detached;
    }
    if ((this._flags & VNodeFlags.Component) === 0) {
      const children = this._children;
      if (children !== null && typeof children !== "string") {
        for (let i = 0; i < (children as VNode[]).length; i++) {
          (children as VNode[])[i].attach();
        }
      }
    } else {
      (this.cref as Component<any, any>).attach();
    }
  }

  /**
   * This method should be invoked when node is attached, we don"t use
   * recursive implementation because we appending nodes to the document
   * as soon as they created and children nodes aren"t attached at this
   * time.
   */
  attached(): void {
    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      if ((this._debugProperties.flags & VNodeDebugFlags.Attached) !== 0) {
        throw new Error("Failed to attach VNode: VNode is already attached.");
      }
      this._debugProperties.flags |= VNodeDebugFlags.Attached;
      this._debugProperties.flags &= ~VNodeDebugFlags.Detached;
    }
    if ((this._flags & VNodeFlags.Component) !== 0) {
      (this.cref as Component<any, any>).attach();
    }
  }

  /**
   * Recursively detach all nodes.
   */
  detach(): void {
    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      if ((this._debugProperties.flags & VNodeDebugFlags.Detached) !== 0) {
        throw new Error("Failed to detach VNode: VNode is already detached.");
      }
      this._debugProperties.flags |= VNodeDebugFlags.Detached;
      this._debugProperties.flags &= ~VNodeDebugFlags.Attached;
    }
    if ((this._flags & VNodeFlags.Component) === 0) {
      const children = this._children;
      if (children !== null && typeof children !== "string") {
        for (let i = 0; i < (children as VNode[]).length; i++) {
          (children as VNode[])[i].detach();
        }
      }
    } else {
      (this.cref as Component<any, any>).detach();
    }
  }

  /**
   * Recursively dispose all nodes.
   */
  dispose(): void {
    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      if ((this._debugProperties.flags & VNodeDebugFlags.Disposed) !== 0) {
        throw new Error("Failed to dispose VNode: VNode is already disposed.");
      }
      if ((this._debugProperties.flags & (VNodeDebugFlags.Rendered | VNodeDebugFlags.Mounted)) === 0) {
        throw new Error("Failed to dispose VNode: VNode should be rendered or mounted before disposing.");
      }
      this._debugProperties.flags |= VNodeDebugFlags.Disposed;
    }
    if ((this._flags & VNodeFlags.KeepAlive) === 0) {
      if ((this._flags & VNodeFlags.Component) !== 0) {
        (this.cref as Component<any, any>).dispose();
      } else if (this._children !== null) {
        const children = this._children;
        if (typeof children !== "string") {
          for (let i = 0; i < (children as VNode[]).length; i++) {
            (children as VNode[])[i].dispose();
          }
        }
      }
    } else {
      this.detach();
    }
  }

  /**
   * Sync old children list with the new one.
   */
  syncChildren(a: VNode[]|string, b: VNode[]|string, owner: Component<any, any>, renderFlags: number): void {
    let aNode: VNode;
    let bNode: VNode;
    let i = 0;
    let synced = false;

    if (typeof a === "string") {
      if (b === null) {
        this.ref.removeChild(this.ref.firstChild);
      } else if (typeof b === "string") {
        let c = this.ref.firstChild;
        if (c) {
          c.nodeValue = b;
        } else {
          this.ref.textContent = b;
        }
      } else {
        this.ref.removeChild(this.ref.firstChild);
        while (i < b.length) {
          this._insertChild(b[i++], null, owner, renderFlags);
        }
      }
    } else if (typeof b === "string") {
      if (a !== null) {
        while (i < a.length) {
          this._removeChild(a[i++], owner);
        }
      }
      this.ref.textContent = b;
    } else {
      if (a !== null && a.length !== 0) {
        if (b === null || b.length === 0) {
          // b is empty, remove all children from a.
          while (i < a.length) {
            this._removeChild(a[i++], owner);
          }
        } else {
          if (a.length === 1 && b.length === 1) {
            // Fast path when a and b have only one child.
            aNode = a[0];
            bNode = b[0];

            if (aNode._canSync(bNode)) {
              aNode.sync(bNode, owner, renderFlags);
            } else {
              this._replaceChild(bNode, aNode, owner, renderFlags);
            }
          } else if (a.length === 1) {
            // Fast path when a have 1 child.
            aNode = a[0];
            if ((this._flags & VNodeFlags.TrackByKeyChildren) === 0) {
              if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
                if ((this._debugProperties.flags & VNodeDebugFlags.DisabledChildrenShapeError) === 0) {
                  printError(
                      "VNode sync children: children shape is changing, you should enable tracking by key with " +
                      "VNode method trackByKeyChildren(children).\n" +
                      "If you certain that children shape changes won't cause any problems with losing " +
                      "state, you can remove this warning with VNode method disableChildrenShapeError().");
                }
              }
              while (i < b.length) {
                bNode = b[i++];
                if (aNode._canSync(bNode)) {
                  aNode.sync(bNode, owner, renderFlags);
                  synced = true;
                  break;
                }
                this._insertChild(bNode, aNode.ref, owner, renderFlags);
              }
            } else {
              while (i < b.length) {
                bNode = b[i++];
                if (aNode._key === bNode._key) {
                  if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
                    if (!aNode._canSync(bNode)) {
                      throw new Error("VNode sync children failed: cannot sync two different children with the" +
                                      " same key.");
                    }
                  }
                  aNode.sync(bNode, owner, renderFlags);
                  synced = true;
                  break;
                }
                this._insertChild(bNode, aNode.ref, owner, renderFlags);
              }
            }
            if (synced) {
              while (i < b.length) {
                this._insertChild(b[i++], null, owner, renderFlags);
              }
            } else {
              this._removeChild(aNode, owner);
            }
          } else if (b.length === 1) {
            // Fast path when b have 1 child.
            bNode = b[0];
            if ((this._flags & VNodeFlags.TrackByKeyChildren) === 0) {
              if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
                if ((this._debugProperties.flags & VNodeDebugFlags.DisabledChildrenShapeError) === 0) {
                  printError(
                      "VNode sync children: children shape is changing, you should enable tracking by key with " +
                      "VNode method trackByKeyChildren(children).\n" +
                      "If you certain that children shape changes won't cause any problems with losing " +
                      "state, you can remove this warning with VNode method disableChildrenShapeError().");
                }
              }
              while (i < a.length) {
                aNode = a[i++];
                if (aNode._canSync(bNode)) {
                  aNode.sync(bNode, owner, renderFlags);
                  synced = true;
                  break;
                }
                this._removeChild(aNode, owner);
              }
            } else {
              while (i < a.length) {
                aNode = a[i++];
                if (aNode._key === bNode._key) {
                  if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
                    if (!aNode._canSync(bNode)) {
                      throw new Error("VNode sync children failed: cannot sync two different children with the" +
                                      " same key.");
                    }
                  }
                  aNode.sync(bNode, owner, renderFlags);
                  synced = true;
                  break;
                }
                this._removeChild(aNode, owner);
              }
            }

            if (synced) {
              while (i < a.length) {
                this._removeChild(a[i++], owner);
              }
            } else {
              this._insertChild(bNode, null, owner, renderFlags);
            }
          } else {
            // a and b have more than 1 child.
            if ((this._flags & VNodeFlags.TrackByKeyChildren) === 0) {
              this._syncChildren(a, b, owner, renderFlags);
            } else {
              this._syncChildrenTrackingByKeys(a, b, owner, renderFlags);
            }
          }
        }
      } else if (b !== null && b.length > 0) {
        // a is empty, insert all children from b.
        for (i = 0; i < b.length; i++) {
          this._insertChild(b[i], null, owner, renderFlags);
        }
      }
    }
  }

  /**
   * Sync children.
   *
   * Any heuristics that is used in this algorithm is an null behaviour,
   * and external dependencies should not rely on the knowledge about this
   * algorithm, because it can be changed in any time.
   */
  private _syncChildren(a: VNode[], b: VNode[], owner: Component<any, any>, renderFlags: number): void {
    let aStart = 0;
    let bStart = 0;
    let aEnd = a.length - 1;
    let bEnd = b.length - 1;
    let aNode: VNode;
    let bNode: VNode;
    let nextPos: number;
    let next: Node;

    // Sync similar nodes at the beginning.
    while (aStart <= aEnd && bStart <= bEnd) {
      aNode = a[aStart];
      bNode = b[bStart];

      if (!aNode._canSync(bNode)) {
        break;
      }

      aStart++;
      bStart++;

      aNode.sync(bNode, owner, renderFlags);
    }

    // Sync similar nodes at the end.
    while (aStart <= aEnd && bStart <= bEnd) {
      aNode = a[aEnd];
      bNode = b[bEnd];

      if (!aNode._canSync(bNode)) {
        break;
      }

      aEnd--;
      bEnd--;

      aNode.sync(bNode, owner, renderFlags);
    }

    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      if ((aStart <= aEnd || bStart <= bEnd) &&
          ((this._debugProperties.flags & VNodeDebugFlags.DisabledChildrenShapeError) === 0)) {
        printError(
            "VNode sync children: children shape is changing, you should enable tracking by key with " +
            "VNode method trackByKeyChildren(children).\n" +
            "If you certain that children shape changes won't cause any problems with losing " +
            "state, you can remove this warning with VNode method disableChildrenShapeError().");
      }
    }

    // Iterate through the remaining nodes and if they have the same type, then sync, otherwise just
    // remove the old node and insert the new one.
    while (aStart <= aEnd && bStart <= bEnd) {
      aNode = a[aStart++];
      bNode = b[bStart++];
      if (aNode._canSync(bNode)) {
        aNode.sync(bNode, owner, renderFlags);
      } else {
        this._replaceChild(bNode, aNode, owner, renderFlags);
      }
    }

    if (aStart <= aEnd) {
      // All nodes from a are synced, remove the rest.
      do {
        this._removeChild(a[aStart++], owner);
      } while (aStart <= aEnd);
    } else if (bStart <= bEnd) {
      // All nodes from b are synced, insert the rest.
      nextPos = bEnd + 1;
      next = nextPos < b.length ? b[nextPos].ref : null;
      do {
        this._insertChild(b[bStart++], next, owner, renderFlags);
      } while (bStart <= bEnd);
    }
  }

  /**
   * Sync children tracking by keys.
   */
  private _syncChildrenTrackingByKeys(a: VNode[], b: VNode[], owner: Component<any, any>, renderFlags: number): void {
    let aStart = 0;
    let bStart = 0;
    let aEnd = a.length - 1;
    let bEnd = b.length - 1;
    let aStartNode = a[aStart];
    let bStartNode = b[bStart];
    let aEndNode = a[aEnd];
    let bEndNode = b[bEnd];
    let i: number;
    let j: number;
    let stop = false;
    let nextPos: number;
    let next: Node;
    let aNode: VNode;
    let bNode: VNode;
    let lastTarget = 0;
    let pos: number;
    let node: VNode;

    // Algorithm that works on simple cases with basic list transformations.
    //
    // It tries to reduce the diff problem by simultaneously iterating from the beginning and the end of both
    // lists, if keys are the same, they"re synced, if node is moved from the beginning to the end of the
    // current cursor positions or vice versa it just performs move operation and continues to reduce the diff
    // problem.
    outer: do {
      stop = true;

      // Sync nodes with the same key at the beginning.
      while (aStartNode._key === bStartNode._key) {
        if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
          if (!aStartNode._canSync(bStartNode)) {
            throw new Error("VNode sync children failed: cannot sync two different children with the same key.");
          }
        }
        aStartNode.sync(bStartNode, owner, renderFlags);
        aStart++;
        bStart++;
        if (aStart > aEnd || bStart > bEnd) {
          break outer;
        }
        aStartNode = a[aStart];
        bStartNode = b[bStart];
        stop = false;
      }

      // Sync nodes with the same key at the end.
      while (aEndNode._key === bEndNode._key) {
        if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
          if (!aEndNode._canSync(bEndNode)) {
            throw new Error("VNode sync children failed: cannot sync two different children with the same key.");
          }
        }
        aEndNode.sync(bEndNode, owner, renderFlags);
        aEnd--;
        bEnd--;
        if (aStart > aEnd || bStart > bEnd) {
          break outer;
        }
        aEndNode = a[aEnd];
        bEndNode = b[bEnd];
        stop = false;
      }

      // Move and sync nodes from left to right.
      while (aStartNode._key === bEndNode._key) {
        if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
          if (!aStartNode._canSync(bEndNode)) {
            throw new Error("VNode sync children failed: cannot sync two different children with the same key.");
          }
        }
        aStartNode.sync(bEndNode, owner, renderFlags);
        nextPos = bEnd + 1;
        next = nextPos < b.length ? b[nextPos].ref : null;
        this._moveChild(bEndNode, next, owner);
        aStart++;
        bEnd--;
        if (aStart > aEnd || bStart > bEnd) {
          break outer;
        }
        aStartNode = a[aStart];
        bEndNode = b[bEnd];
        stop = false;
        // In real-world scenarios there is a higher chance that next node after we move
        // this one will be the same, so we are jumping to the top of this loop immediately.
        continue outer;
      }

      // Move and sync nodes from right to left
      while (aEndNode._key === bStartNode._key) {
        if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
          if (!aEndNode._canSync(bStartNode)) {
            throw new Error("VNode sync children failed: cannot sync two different children with the same key.");
          }
        }
        aEndNode.sync(bStartNode, owner, renderFlags);
        this._moveChild(bStartNode, aStartNode.ref, owner);
        aEnd--;
        bStart++;
        if (aStart > aEnd || bStart > bEnd) {
          break outer;
        }
        aEndNode = a[aEnd];
        bStartNode = b[bStart];
        stop = false;
        continue outer;
      }
    } while (!stop && aStart <= aEnd && bStart <= bEnd);

    if (aStart > aEnd) {
      // All nodes from a are synced, insert the rest from b.
      nextPos = bEnd + 1;
      next = nextPos < b.length ? b[nextPos].ref : null;
      while (bStart <= bEnd) {
        this._insertChild(b[bStart++], next, owner, renderFlags);
      }
    } else if (bStart > bEnd) {
      // All nodes from b are synced, remove the rest from a.
      while (aStart <= aEnd) {
        this._removeChild(a[aStart++], owner);
      }
    } else {
      // Perform more complex sync algorithm on the remaining nodes.
      //
      // We start by marking all nodes from b as inserted, then we try to find all removed nodes and
      // simultaneously perform syncs on nodes that exists in both lists and replacing "inserted"
      // marks with the position of the node from list b in list a. Then we just need to perform
      // slightly modified LIS algorithm, that ignores "inserted" marks and find common subsequence and
      // move all nodes that doesn"t belong to this subsequence, or insert if they have "inserted" mark.
      let aLength = aEnd - aStart + 1;
      let bLength = bEnd - bStart + 1;
      const sources = new Array<number>(bLength);

      // Mark all nodes as inserted.
      for (i = 0; i < bLength; i++) {
        sources[i] = -1;
      }

      let moved = false;
      let removeOffset = 0;

      // When lists a and b are small, we are using naive O(M*N) algorithm to find removed children.
      if (aLength * bLength <= 16) {
        for (i = aStart; i <= aEnd; i++) {
          let removed = true;
          aNode = a[i];
          for (j = bStart; j <= bEnd; j++) {
            bNode = b[j];
            if (aNode._key === bNode._key) {
              sources[j - bStart] = i;

              if (lastTarget > j) {
                moved = true;
              } else {
                lastTarget = j;
              }
              if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
                if (!aNode._canSync(bNode)) {
                  throw new Error("VNode sync children failed: cannot sync two different children with the same key.");
                }
              }
              aNode.sync(bNode, owner, renderFlags);
              removed = false;
              break;
            }
          }
          if (removed) {
            this._removeChild(aNode, owner);
            removeOffset++;
          }
        }
      } else {
        let keyIndex = new Map<any, number>();

        for (i = bStart; i <= bEnd; i++) {
          node = b[i];
          keyIndex.set(node._key, i);
        }

        for (i = aStart; i <= aEnd; i++) {
          aNode = a[i];
          j = keyIndex.get(aNode._key);

          if (j !== undefined) {
            bNode = b[j];
            sources[j - bStart] = i;
            if (lastTarget > j) {
              moved = true;
            } else {
              lastTarget = j;
            }
            if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
              if (!aNode._canSync(bNode)) {
                throw new Error("VNode sync children failed: cannot sync two different children with the same key.");
              }
            }
            aNode.sync(bNode, owner, renderFlags);
          } else {
            this._removeChild(aNode, owner);
            removeOffset++;
          }
        }
      }

      if (moved) {
        const seq = _lis(sources);
        // All modifications are performed from the right to left, so we can use insertBefore method and use
        // reference to the html element from the next VNode. All Nodes from the right side should always be
        // in the correct state.
        j = seq.length - 1;
        for (i = bLength - 1; i >= 0; i--) {
          if (sources[i] === -1) {
            pos = i + bStart;
            node = b[pos];
            nextPos = pos + 1;
            next = nextPos < b.length ? b[nextPos].ref : null;
            this._insertChild(node, next, owner, renderFlags);
          } else {
            if (j < 0 || i !== seq[j]) {
              pos = i + bStart;
              node = b[pos];
              nextPos = pos + 1;
              next = nextPos < b.length ? b[nextPos].ref : null;
              this._moveChild(node, next, owner);
            } else {
              j--;
            }
          }
        }
      } else if (aLength - removeOffset !== bLength) {
        for (i = bLength - 1; i >= 0; i--) {
          if (sources[i] === -1) {
            pos = i + bStart;
            node = b[pos];
            nextPos = pos + 1;
            next = nextPos < b.length ? b[nextPos].ref : null;
            this._insertChild(node, next, owner, renderFlags);
          }
        }
      }
    }
  }

  private _insertChild(node: VNode, nextRef: Node, owner: Component<any, any>, renderFlags: number): void {
    if (((this._flags & VNodeFlags.ManagedContainer) !== 0) &&
        (this.cref as ContainerManager<any>).descriptor._insertChild !== null) {
      (this.cref as ContainerManager<any>).descriptor._insertChild(
        this.cref as ContainerManager<any>, this.ref as Element, node, nextRef, owner, renderFlags);
    } else {
      insertVNodeBefore(this.ref as Element, node, nextRef, owner, renderFlags);
    }
  }

  private _replaceChild(newNode: VNode, refNode: VNode, owner: Component<any, any>, renderFlags: number): void {
    if (((this._flags & VNodeFlags.ManagedContainer) !== 0) &&
        (this.cref as ContainerManager<any>).descriptor._replaceChild !== null) {
      (this.cref as ContainerManager<any>).descriptor._replaceChild(
        this.cref as ContainerManager<any>, this.ref as Element, newNode, refNode, owner, renderFlags);
    } else {
      replaceVNode(this.ref as Element, newNode, refNode, owner, renderFlags);
    }
  }

  private _moveChild(node: VNode, nextRef: Node, owner: Component<any, any>): void {
    if (((this._flags & VNodeFlags.ManagedContainer) !== 0) &&
        (this.cref as ContainerManager<any>).descriptor._moveChild !== null) {
      (this.cref as ContainerManager<any>).descriptor._moveChild(
        this.cref as ContainerManager<any>, this.ref as Element, node, nextRef, owner);
    } else {
      moveVNode(this.ref as Element, node, nextRef, owner);
    }
  }

  private _removeChild(node: VNode, owner: Component<any, any>): void {
    if (((this._flags & VNodeFlags.ManagedContainer) !== 0) &&
        (this.cref as ContainerManager<any>).descriptor._removeChild !== null) {
      (this.cref as ContainerManager<any>).descriptor._removeChild(
        this.cref as ContainerManager<any>, this.ref as Element, node, owner);
    } else {
      removeVNode(this.ref as Element, node, owner);
    }
  }

  private _freeze(): void {
    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      if ((this._debugProperties.flags & VNodeDebugFlags.DisabledFreeze) === 0) {
        Object.freeze(this);
        if (this._attrs !== null && !Object.isFrozen(this._attrs)) {
          Object.freeze(this._attrs);
        }
        // Don't freeze props in Components.
        if (((this._flags & VNodeFlags.Component) === 0) &&
            this._props !== null &&
            typeof this._props === "object" &&
            !Object.isFrozen(this._props)) {
          Object.freeze(this._props);
        }
        if (this._children !== null &&
            Array.isArray((this._children)) &&
            !Object.isFrozen(this._children)) {
          Object.freeze(this._children);
        }
      }
    }
  }
}

/**
 * Slightly modified Longest Increased Subsequence algorithm, it ignores items that have -1 value.
 * They"re representing new items.
 *
 * This algorithm is used to find minimum number of move operations when updating children with explicit
 * keys.
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
 * Insert VNode before [nextRef] DOM Node.
 *
 * Can be used as a generic method to insert nodes in ContainerManager.
 */
export function insertVNodeBefore(container: Element, node: VNode, nextRef: Node, owner: Component<any, any>,
    renderFlags: number): void {
  if (node.ref === null) {
    node.create(owner);
    container.insertBefore(node.ref, nextRef);
    node.attached();
    node.render(owner, renderFlags);
  } else {
    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      if ((node._flags & VNodeFlags.KeepAlive) === 0) {
        throw new Error("Failed to replace node: VNode instance already has been used to create DOM node.");
      }
    }
    container.insertBefore(node.ref, nextRef);
    node.attach();
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
    newNode.create(owner);
    container.replaceChild(newNode.ref, refNode.ref);
    newNode.attached();
    newNode.render(owner, renderFlags);
  } else {
    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      if ((newNode._flags & VNodeFlags.KeepAlive) === 0) {
        throw new Error("Failed to replace node: VNode instance already has been used to create DOM node.");
      }
    }
    container.replaceChild(newNode.ref, refNode.ref);
    newNode.attach();
  }
  refNode.dispose();
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
  node.dispose();
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

/**
 * Create a VNode representing a HTMLInputElement with text value.
 */
export function createVTextInput(): VNode {
  return new VNode(VNodeFlags.Element | VNodeFlags.TextInputElement, "input", null);
}

/**
 * Create a VNode representing a HTMLInputElement with checked value.
 */
export function createVCheckedInput(): VNode {
  return new VNode(VNodeFlags.Element | VNodeFlags.CheckedInputElement, "input", null);
}
