import {printError} from './debug';
import {SvgNamespace} from './namespace';
import {Component, ComponentDescriptor} from './component';
import {VModel} from './vmodel';
import {ContainerManager} from './container_manager';
import {syncStaticShapeProps, syncDynamicShapeProps} from './sync/props';
import {syncStaticShapeAttrs, syncDynamicShapeAttrs, setAttr} from './sync/attrs';

export const enum VNodeFlags {
  Text                  = 1,
  Element               = 1 << 1,
  Component             = 1 << 2,
  Root                  = 1 << 3,
  TrackByKeyChildren    = 1 << 4,
  ManagedContainer      = 1 << 5,
  TextInputElement      = 1 << 6,
  CheckedInputElement   = 1 << 7,
  InputElement          = TextInputElement | CheckedInputElement,
  CommentPlaceholder    = 1 << 8,
  DynamicShapeAttrs     = 1 << 9,
  DynamicShapeProps     = 1 << 10,
  /**
   * 16-23 bits: shared flags between kivi objects
   */
  Svg                   = 1 << 15,
  IsVModel              = 1 << 19,
  VModelUpdateHandler   = 1 << 20,
}

const enum VNodeDebugFlags {
  Rendered                  = 1,
  Mounted                   = 1 << 1,
  Attached                  = 1 << 2,
  Detached                  = 1 << 3,
  Disposed                  = 1 << 4,
  DisableChildrenShapeError = 1 << 5,
  DisableFreeze             = 1 << 6,
}

/**
 * Virtual DOM Node
 *
 * @final
 */
export class VNode {
  flags: number;
  tag: string|VModel<any>|ComponentDescriptor<any, any>;
  /**
   * Key that should be unique among its siblings
   */
  _key: any;
  _props: any;
  _attrs: Object;
  /**
   * Style in css string format
   */
  _style: string;
  /**
   * Class name
   */
  _className: string;
  /**
   * Children property can represent actual children, or value for input fields.
   * When VNode is a Component, then instead of rendering children in place, they
   * are transferred to the Component.
   */
  _children: VNode[]|string|boolean;
  /**
   * Reference to Html Node. It will be available after VNode is created or synced.
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
    this.flags = flags;
    this.tag = tag;
    this._key = null;
    this._props = props;
    this._attrs = null;
    this._style = null;
    this._className = null;
    this._children = null;
    this.ref = null;
    this.cref = null;

    if ('<@KIVI_DEBUG@>' !== 'DEBUG_DISABLED') {
      this._debugProperties = {
        flags: 0,
      }
    }
  }

  /**
   * Returns true if VNode represents a component root
   */
  isRoot() : boolean {
    return (this.flags & VNodeFlags.Root) !== 0;
  }

  /**
   * Set key, key should be unique among its siblings
   */
  key(key: any) : VNode {
    this._key = key;
    return this;
  }

  /**
   * Set props
   */
  props(props: any) : VNode {
    if ('<@KIVI_DEBUG@>' !== 'DEBUG_DISABLED') {
      if ((this.flags & (VNodeFlags.Element | VNodeFlags.Root)) === 0) {
        throw new Error('Failed to set props on VNode: props method should be called on element or component root nodes only.')
      }
    }
    this._props = props;
    return this;
  }

  /**
   * Set props with dynamic shape
   */
  dynamicShapeProps(props: any) : VNode {
    if ('<@KIVI_DEBUG@>' !== 'DEBUG_DISABLED') {
      if ((this.flags & (VNodeFlags.Element | VNodeFlags.Root)) === 0) {
        throw new Error('Failed to set props on VNode: props method should be called on element or component root nodes only.')
      }
    }
    this.flags |= VNodeFlags.DynamicShapeProps;
    this._props = props;
    return this;
  }

  /**
   * Set attrs with static shape
   */
  attrs(attrs: Object) : VNode {
    if ('<@KIVI_DEBUG@>' !== 'DEBUG_DISABLED') {
      if ((this.flags & (VNodeFlags.Element | VNodeFlags.Root)) === 0) {
        throw new Error('Failed to set attrs on VNode: attrs method should be called on element or component root nodes only.')
      }
    }
    this._attrs = attrs;
    return this;
  }

  /**
   * Set attrs with dynamic shape
   */
  dynamicShapeAttrs(attrs: Object) : VNode {
    if ('<@KIVI_DEBUG@>' !== 'DEBUG_DISABLED') {
      if ((this.flags & (VNodeFlags.Element | VNodeFlags.Root)) === 0) {
        throw new Error('Failed to set attrs on VNode: attrs method should be called on element or component root nodes only.')
      }
    }
    this.flags |= VNodeFlags.DynamicShapeAttrs;
    this._attrs = attrs;
    return this;
  }

  /**
   * Set style in css string format
   */
  style(style: string) : VNode {
    if ('<@KIVI_DEBUG@>' !== 'DEBUG_DISABLED') {
      if ((this.flags & (VNodeFlags.Element | VNodeFlags.Root)) === 0) {
        throw new Error('Failed to set style on VNode: style method should be called on element or component root nodes only.')
      }
    }
    this._style = style;
    return this;
  }

  /**
   * Set className
   */
  className(className: string) : VNode {
    if ('<@KIVI_DEBUG@>' !== 'DEBUG_DISABLED') {
      if ((this.flags & (VNodeFlags.Element | VNodeFlags.Root)) === 0) {
        throw new Error('Failed to set classes on VNode: classes method should be called on element or component root nodes only.')
      }
    }
    this._className = className;
    return this;
  }

  /**
   * Set children
   */
  children(children: VNode[]|string) : VNode {
    if ('<@KIVI_DEBUG@>' !== 'DEBUG_DISABLED') {
      if ((this.flags & (VNodeFlags.Element | VNodeFlags.Root | VNodeFlags.Component)) === 0) {
        throw new Error('Failed to set children on VNode: children method should be called on element, component or component root nodes only.')
      }
    }
    this._children = children;
    return this;
  }

  /**
   * Enable tracking by key in children reconciliation algorithm
   *
   * When tracking by key is enabled, all children should have unique key
   * property.
   */
  trackByKeyChildren(children: VNode[]) : VNode {
    if ('<@KIVI_DEBUG@>' !== 'DEBUG_DISABLED') {
      if ((this.flags & (VNodeFlags.Element | VNodeFlags.Root | VNodeFlags.Component)) === 0) {
        throw new Error('Failed to set children on VNode: children method should be called on element, component or component root nodes only.')
      }
      if (children !== null) {
        for (let i = 0; i < children.length; i++) {
          if (children[i]._key === null) {
            throw new Error('Failed to set children on VNode: trackByKeyChildren method expects all children to have a key.');
          }
        }
      }
    }
    this.flags |= VNodeFlags.TrackByKeyChildren;
    this._children = children;
    return this;
  }

  /**
   * Set text value for Input Elements
   */
  value(value: string) : VNode {
    if ('<@KIVI_DEBUG@>' !== 'DEBUG_DISABLED') {
      if ((this.flags & (VNodeFlags.Element | VNodeFlags.TextInputElement)) === 0) {
        throw new Error('Failed to set value on VNode: value method should be called on input elements.')
      }
    }
    this._children = value;
    return this;
  }

  /**
   * Set checked value for Input Elements
   */
  checked(value: boolean) : VNode {
    if ('<@KIVI_DEBUG@>' !== 'DEBUG_DISABLED') {
      if ((this.flags & (VNodeFlags.Element | VNodeFlags.CheckedInputElement)) === 0) {
        throw new Error('Failed to set value on VNode: value method should be called on input elements.')
      }
    }
    this._children = value;
    return this;

  }

  /**
   * Set container manager for this node
   *
   * Container Manager will be responsible for inserting, removing, replacing,
   * moving children nodes.
   */
  managedContainer(manager: ContainerManager<any>) : VNode {
    if ('<@KIVI_DEBUG@>' !== 'DEBUG_DISABLED') {
      if ((this.flags & (VNodeFlags.Element | VNodeFlags.Root)) === 0) {
        throw new Error('Failed to set managedContainer mode on VNode: managedContainer method should be called on element or component root nodes only.')
      }
    }
    this.flags |= VNodeFlags.ManagedContainer;
    this.cref = manager;
    return this;
  }

  /**
   * Disable children shape errors in DEBUG mode
   */
  disableChildrenShapeError() : VNode {
    if ('<@KIVI_DEBUG@>' !== 'DEBUG_DISABLED') {
      if ((this.flags & (VNodeFlags.Element | VNodeFlags.Root)) === 0) {
        throw new Error('Failed to disable children shape error on VNode: disableChildrenShapeError method should' +
                        ' be called on element or component root nodes only.')
      }
      this._debugProperties.flags |= VNodeDebugFlags.DisableChildrenShapeError;
    }
    return this;
  }

  /**
   * Disable freezing all properties in DEBUG mode
   *
   * One use case when it is quite useful, it is for ContentEditable editor.
   * We can monitor small changes in DOM, and apply this changes to VNodes,
   * so that when we rerender text block, we don't touch anything that is
   * already up to date (prevents spellchecker flickering).
   */
  disableFreeze() : VNode {
    if ('<@KIVI_DEBUG@>' !== 'DEBUG_DISABLED') {
      this._debugProperties.flags |= VNodeDebugFlags.DisableFreeze;
    }
    return this;
  }

  /**
   * Check if two nodes can be synced
   */
  private _canSync(other: VNode) : boolean {
    return (this.flags === other.flags &&
            this.tag === other.tag &&
            this._key === other._key);
  }

  /**
   * Create a DOM Node from the Virtual DOM Node
   *
   * This method doesn't set any attributes, or create children, render method
   * is responsible for setting up internal representation of the Node.
   */
  create(owner: Component<any, any>) : void {
    let flags = this.flags;

    if ('<@KIVI_DEBUG@>' !== 'DEBUG_DISABLED') {
      if (this.ref !== null && ((flags & VNodeFlags.CommentPlaceholder) === 0)) {
        throw new Error('Failed to create VNode: VNode already has a reference to the DOM node.');
      }
    }
    this.flags &= ~VNodeFlags.CommentPlaceholder;

    if ((flags & VNodeFlags.Text) !== 0) {
      this.ref = document.createTextNode(this._props);
    } else if ((flags & VNodeFlags.Element) !== 0) {
      if ((flags & VNodeFlags.IsVModel) === 0) {
        if ((flags & VNodeFlags.Svg) === 0) {
          this.ref = document.createElement(this.tag as string);
        } else {
          this.ref = document.createElementNS(SvgNamespace, this.tag as string);
        }
      } else {
        this.ref = (this.tag as VModel<any>).createElement();
      }
    } else {
      let c = (this.tag as ComponentDescriptor<any, any>).createComponent(owner);
      this.ref = c.element;
      this.cref = c;
    }
  }

  /**
   * Create Comment placeholder
   *
   * Comment placeholder can be used to delay element appearance in animations.
   */
  createCommentPlaceholder() : void {
    if ('<@KIVI_DEBUG@>' !== 'DEBUG_DISABLED') {
      if (this.ref !== null) {
        throw new Error('Failed to create VNode Comment Placeholder: VNode already has a reference to the DOM node.');
      }
    }
    this.flags |= VNodeFlags.CommentPlaceholder;
    this.ref = document.createComment('');
  }

  /**
   * Render internal representation of the Virtual DOM Node
   */
  render(owner: Component<any, any>) : void {
    let i: number;

    if ('<@KIVI_DEBUG@>' !== 'DEBUG_DISABLED') {
      if (this.ref === null) {
        throw new Error('Failed to render VNode: VNode should be created before render.');
      }
      if ((this.flags & VNodeFlags.CommentPlaceholder) !== 0) {
        throw new Error('Failed to render VNode: VNode comment placeholder cannot be rendered.');
      }
      if ((this._debugProperties.flags & VNodeDebugFlags.Rendered) !== 0) {
        throw new Error('Failed to render VNode: VNode cannot be rendered twice.');
      }
      if ((this._debugProperties.flags & VNodeDebugFlags.Mounted) !== 0) {
        throw new Error('Failed to render VNode: VNode cannot be rendered after mount.');
      }
      this._debugProperties.flags |= VNodeDebugFlags.Mounted;
    }

    let il: number;
    let key: any;
    let keys: any[];
    let flags = this.flags;

    let ref: Element;

    if ((flags & (VNodeFlags.Element | VNodeFlags.Root)) !== 0) {
      ref = this.ref as Element;
      if ((flags & VNodeFlags.VModelUpdateHandler) === 0) {
        let props = this._props;
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
          // perf optimization for webkit/blink, probably will need to revisit this in the future
          if ((flags & VNodeFlags.Svg) === 0) {
            (ref as HTMLElement).style.cssText = this._style;
          } else {
            ref.setAttribute('style', this._style)
          }
        }

        if (this._className !== null) {
          if ('<@KIVI_DEBUG@>' !== 'DEBUG_DISABLED') {
            let className = ref.getAttribute('class');
            if ((flags & VNodeFlags.Root) !== 0 && className) {
              printError(`VNode render: Component root node overwrited className property` +
                  ` "${className}" with "${this._className}".`)
            }
          }
          // perf optimization for webkit/blink, probably will need to revisit this in the future
          if ((flags & VNodeFlags.Svg) === 0) {
            (ref as HTMLElement).className = this._className;
          } else {
            ref.setAttribute('class', this._className)
          }
        }
      } else {
        if ((flags & VNodeFlags.Root) === 0) {
          (this.tag as VModel<any>).update(ref, void 0, this._props);
        } else {
          (owner.descriptor._tag as VModel<any>).update(ref, void 0, this._props);
        }
      }

      let children = this._children;
      if (children !== null) {
        if ((this.flags & VNodeFlags.InputElement) === 0) {
          if (typeof children === 'string') {
            ref.textContent = children;
          } else {
            for (i = 0, il = (children as VNode[]).length; i < il; i++) {
              this._insertChild((children as VNode[])[i], null, owner);
            }
          }
        } else {
          if ((this.flags & VNodeFlags.TextInputElement) !== 0) {
            (this.ref as HTMLInputElement).value = this._children as string;
          } else { // ((this.flags & VNodeFlags.CheckedInputElement) !== 0)
            (this.ref as HTMLInputElement).checked = this._children as boolean;
          }
        }
      }
    } else if ((flags & VNodeFlags.Component) !== 0) {
      let c = this.cref as Component<any, any>;
      ref = this.ref as Element;

      if (this._className !== null) {
        // perf optimization for webkit/blink, probably will need to revisit this in the future
        if ((flags & VNodeFlags.Svg) === 0) {
          (ref as HTMLElement).className = this._className;
        } else {
          ref.setAttribute('class', this._className)
        }
      }

      c.setData(this._props);
      c.setChildren(this._children as VNode[]|string);
      c.update();
    }

    this._freeze();
  }

  /**
   * Mount VNode on top of existing html document
   */
  mount(node: Node, owner: Component<any, any>) : void {
    if ('<@KIVI_DEBUG@>' !== 'DEBUG_DISABLED') {
      if (this.ref !== null) {
        throw new Error('Failed to mount VNode: VNode cannot be mounted if it already has a reference to DOM Node.');
      }
      if ((this.flags & VNodeFlags.CommentPlaceholder) !== 0) {
        throw new Error('Failed to mount VNode: VNode comment placeholder cannot be mounted.');
      }
      if ((this._debugProperties.flags & VNodeDebugFlags.Rendered) !== 0) {
        throw new Error('Failed to mount VNode: VNode cannot be mounted after render.');
      }
      if ((this._debugProperties.flags & VNodeDebugFlags.Mounted) !== 0) {
        throw new Error('Failed to mount VNode: VNode cannot be mounted twice.');
      }
      this._debugProperties.flags |= VNodeDebugFlags.Mounted;
    }

    let flags = this.flags;
    let children = this._children;
    let i: number;

    this.ref = node;

    if ((flags & VNodeFlags.Component) !== 0) {
      let cref = this.cref = (this.tag as ComponentDescriptor<any, any>).mountComponent(owner, node as Element);
      cref.setData(this._props);
      cref.setChildren(this._children as VNode[]|string);
      cref.update();
    } else {
      if (children !== null && typeof children !== 'string' && (children as VNode[]).length > 0) {
        let child = node.firstChild;

        // Adjacent text nodes should be separated by Comment node "<!---->", so we can properly mount them
        let commentNode: Node;
        while (child.nodeType === 8) {
          commentNode = child;
          child = child.nextSibling;
          node.removeChild(commentNode);
        }
        for (i = 0; i < (children as VNode[]).length; i++) {
          if ('<@KIVI_DEBUG@>' !== 'DEBUG_DISABLED') {
            if (!child) {
              throw new Error('Failed to mount VNode: cannot find matching node.');
            }
          }
          (children as VNode[])[i].mount(child, owner);
          child = child.nextSibling;
          while (child.nodeType === 8) {
            commentNode = child;
            child = child.nextSibling;
            node.removeChild(commentNode);
          }
        }
      }
    }

    this._freeze();
  }

  /**
   * Sync this VNode with other VNode
   *
   * When this node is synced with other node, this node should be considered as
   * destroyed, and any access to it after sync is an undefined behavior.
   */
  sync(other: VNode, owner: Component<any, any>) : void {
    if ('<@KIVI_DEBUG@>' !== 'DEBUG_DISABLED') {
      if ((this._debugProperties.flags & (VNodeDebugFlags.Rendered | VNodeDebugFlags.Mounted)) === 0) {
        throw new Error('Failed to sync VNode: VNode should be rendered or mounted before sync.');
      }
      other._debugProperties.flags |= this._debugProperties.flags &
          (VNodeDebugFlags.Rendered | VNodeDebugFlags.Mounted |
           VNodeDebugFlags.Attached | VNodeDebugFlags.Detached);
    }

    let ref = this.ref as Element;
    let flags = this.flags;
    let component: Component<any, any>;
    let className: string;

    if ('<@KIVI_DEBUG@>' !== 'DEBUG_DISABLED') {
      if (this.flags !== other.flags) {
        throw new Error(`Failed to sync VNode: flags does not match (old: ${this.flags}, new: ${other.flags})`);
      }
      if (this.tag !== other.tag) {
        throw new Error(`Failed to sync VNode: tags does not match (old: ${this.tag}, new: ${other.tag})`);
      }
      if (this._key !== other._key) {
        throw new Error(`Failed to sync VNode: keys does not match (old: ${this._key}, new: ${other._key})`);
      }
      if (other.ref !== null && this.ref !== other.ref) {
        throw new Error('Failed to sync VNode: reusing VNodes isn\'t allowed unless it has the same ref.');
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
          if ((this.flags & VNodeFlags.DynamicShapeProps) === 0) {
            syncStaticShapeProps(this._props, other._props, ref);
          } else {
            syncDynamicShapeProps(this._props, other._props, ref);
          }
        }
        if (this._attrs !== other._attrs) {
          if ((this.flags & VNodeFlags.DynamicShapeAttrs) === 0) {
            syncStaticShapeAttrs(this._attrs, other._attrs, ref);
          } else {
            syncDynamicShapeAttrs(this._attrs, other._attrs, ref);
          }
        }
        if (this._style !== other._style) {
          let style = other._style === null ? '' : other._style;
          // perf optimization for webkit/blink, probably will need to revisit this in the future
          if ((flags & VNodeFlags.Svg) === 0) {
            (ref as HTMLElement).style.cssText = style;
          } else {
            ref.setAttribute('style', style);
          }
        }

        if (this._className !== other._className) {
          className = (other._className === null) ? '' : other._className;
          // perf optimization for webkit/blink, probably will need to revisit this in the future
          if ((flags & VNodeFlags.Svg) === 0) {
            (ref as HTMLElement).className = className;
          } else {
            ref.setAttribute('class', className);
          }
        }

      } else if (this._props !== other._props) {
        if ((flags & VNodeFlags.Root) === 0) {
          (this.tag as VModel<any>).update(ref, this._props, other._props);
        } else {
          (owner.descriptor._tag as VModel<any>).update(ref, this._props, other._props);
        }
      }

      if ((this.flags & VNodeFlags.InputElement) === 0) {
        if (this._children !== other._children) {
          this.syncChildren(
            this._children as VNode[]|string,
            other._children as VNode[]|string,
            owner);
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
    } else /* if ((flags & VNodeFlags.Component) !== 0) */ {
      if (this._className !== other._className) {
        className = (other._className === null) ? '' : other._className;
        // perf optimization for webkit/blink, probably will need to revisit this in the future
        if ((flags & VNodeFlags.Svg) === 0) {
          (ref as HTMLElement).className = className;
        } else {
          ref.setAttribute('class', className);
        }
      }

      component = other.cref = this.cref as Component<any, any>;
      component.setData(other._props);
      component.setChildren(other._children as VNode[]|string);
      component.update();
    }

    other._freeze();
  }

  /**
   * Recursively attach all nodes
   */
  attach() : void {
    if ('<@KIVI_DEBUG@>' !== 'DEBUG_DISABLED') {
      if ((this._debugProperties.flags & VNodeDebugFlags.Attached) !== 0) {
        throw new Error('Failed to attach VNode: VNode is already attached.');
      }
      this._debugProperties.flags |= VNodeDebugFlags.Attached;
      this._debugProperties.flags &= ~VNodeDebugFlags.Detached;
    }
    if ((this.flags & VNodeFlags.Component) === 0) {
      let children = this._children;
      if (children !== null && typeof children !== 'string') {
        for (let i = 0; i < (children as VNode[]).length; i++) {
          (children as VNode[])[i].attach();
        }
      }
    } else {
      (this.cref as Component<any, any>).attach();
    }
  }

  /**
   * This method should be invoked when node is attached, we don't use
   * recursive implementation because we appending nodes to the document
   * as soon as they created and children nodes aren't attached at this
   * time.
   */
  attached() : void {
    if ('<@KIVI_DEBUG@>' !== 'DEBUG_DISABLED') {
      if ((this._debugProperties.flags & VNodeDebugFlags.Attached) !== 0) {
        throw new Error('Failed to attach VNode: VNode is already attached.');
      }
      this._debugProperties.flags |= VNodeDebugFlags.Attached;
      this._debugProperties.flags &= ~VNodeDebugFlags.Detached;
    }
    if ((this.flags & VNodeFlags.Component) !== 0) {
      (this.cref as Component<any, any>).attach();
    }
  }

  /**
   * Recursively detach all nodes
   */
  detach() : void {
    if ('<@KIVI_DEBUG@>' !== 'DEBUG_DISABLED') {
      if ((this._debugProperties.flags & VNodeDebugFlags.Detached) !== 0) {
        throw new Error('Failed to detach VNode: VNode is already detached.');
      }
      this._debugProperties.flags |= VNodeDebugFlags.Detached;
      this._debugProperties.flags &= ~VNodeDebugFlags.Attached;
    }
    if ((this.flags & VNodeFlags.Component) === 0) {
      let children = this._children;
      if (children !== null && typeof children !== 'string') {
        for (let i = 0; i < (children as VNode[]).length; i++) {
          (children as VNode[])[i].detach();
        }
      }
    } else {
      (this.cref as Component<any, any>).detach();
    }
  }

  /**
   * Recursively dispose all nodes
   */
  dispose() : void {
    if ('<@KIVI_DEBUG@>' !== 'DEBUG_DISABLED') {
      if ((this._debugProperties.flags & VNodeDebugFlags.Disposed) !== 0) {
        throw new Error('Failed to dispose VNode: VNode is already disposed.')
      }
      if ((this._debugProperties.flags & (VNodeDebugFlags.Rendered | VNodeDebugFlags.Mounted)) === 0) {
        throw new Error('Failed to dispose VNode: VNode should be rendered or mounted before disposing.');
      }
      this._debugProperties.flags |= VNodeDebugFlags.Disposed;
    }
    if ((this.flags & VNodeFlags.Component) !== 0) {
      (this.cref as Component<any, any>).dispose();
    } else if (this._children !== null) {
      let children = this._children;
      if (typeof children !== 'string') {
        for (let i = 0; i < (children as VNode[]).length; i++) {
          (children as VNode[])[i].dispose();
        }
      }
    }
  }

  /**
   * Sync old children list with the new one
   */
  syncChildren(a: VNode[]|string, b: VNode[]|string, owner: Component<any, any>) : void {
    let aNode: VNode;
    let bNode: VNode;
    let i = 0;
    let synced = false;

    if (typeof a === 'string') {
      if (b === null) {
        this.ref.removeChild(this.ref.firstChild);
      } else if (typeof b === 'string') {
        let c = this.ref.firstChild;
        if (c) {
          c.nodeValue = b;
        } else {
          this.ref.textContent = b;
        }
      } else {
        this.ref.removeChild(this.ref.firstChild);
        while (i < b.length) {
          this._insertChild(b[i++], null, owner);
        }
      }
    } else if (typeof b === 'string') {
      if (a !== null) {
        while(i < a.length) {
          this._removeChild(a[i++], owner);
        }
      }
      this.ref.textContent = b;
    } else {
      if (a !== null && a.length !== 0) {
        if (b === null || b.length === 0) {
          // b is empty, remove all children from a
          while(i < a.length) {
            this._removeChild(a[i++], owner);
          }
        } else {
          if (a.length === 1 && b.length === 1) {
            // Fast path when a and b have only one child
            aNode = a[0];
            bNode = b[0];

            if (aNode._canSync(bNode)) {
              aNode.sync(bNode, owner);
            } else {
              this._replaceChild(bNode, aNode, owner);
            }
          } else if (a.length === 1) {
            // Fast path when a have 1 child
            aNode = a[0];
            if ((this.flags & VNodeFlags.TrackByKeyChildren) === 0) {
              if ('<@KIVI_DEBUG@>' !== 'DEBUG_DISABLED') {
                if ((this._debugProperties.flags & VNodeDebugFlags.DisableChildrenShapeError) === 0) {
                  printError(
                      'VNode sync children: children shape is changing, you should enable tracking by key with ' +
                      'VNode method trackByKeyChildren(children).\n' +
                      'If you certain that children shape changes won\'t cause any problems with losing ' +
                      'state, you can remove this warning with VNode method disableChildrenShapeError().');
                }
              }
              while (i < b.length) {
                bNode = b[i++];
                if (aNode._canSync(bNode)) {
                  aNode.sync(bNode, owner);
                  synced = true;
                  break;
                }
                this._insertChild(bNode, aNode.ref, owner);
              }
            } else {
              while (i < b.length) {
                bNode = b[i++];
                if (aNode._key === bNode._key) {
                  if ('<@KIVI_DEBUG@>' !== 'DEBUG_DISABLED') {
                    if (!aNode._canSync(bNode)) {
                      throw new Error('VNode sync children failed: cannot sync two different children with the same key.');
                    }
                  }
                  aNode.sync(bNode, owner);
                  synced = true;
                  break;
                }
                this._insertChild(bNode, aNode.ref, owner);
              }
            }
            if (synced) {
              while (i < b.length) {
                this._insertChild(b[i++], null, owner);
              }
            } else {
              this._removeChild(aNode, owner);
            }
          } else if (b.length === 1) {
            // Fast path when b have 1 child
            bNode = b[0];
            if ((this.flags & VNodeFlags.TrackByKeyChildren) === 0) {
              if ('<@KIVI_DEBUG@>' !== 'DEBUG_DISABLED') {
                if ((this._debugProperties.flags & VNodeDebugFlags.DisableChildrenShapeError) === 0) {
                  printError(
                      'VNode sync children: children shape is changing, you should enable tracking by key with ' +
                      'VNode method trackByKeyChildren(children).\n' +
                      'If you certain that children shape changes won\'t cause any problems with losing ' +
                      'state, you can remove this warning with VNode method disableChildrenShapeError().');
                }
              }
              while (i < a.length) {
                aNode = a[i++];
                if (aNode._canSync(bNode)) {
                  aNode.sync(bNode, owner);
                  synced = true;
                  break;
                }
                this._removeChild(aNode, owner);
              }
            } else {
              while (i < a.length) {
                aNode = a[i++];
                if (aNode._key === bNode._key) {
                  if ('<@KIVI_DEBUG@>' !== 'DEBUG_DISABLED') {
                    if (!aNode._canSync(bNode)) {
                      throw new Error('VNode sync children failed: cannot sync two different children with the same key.');
                    }
                  }
                  aNode.sync(bNode, owner);
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
              this._insertChild(bNode, null, owner);
            }
          } else {
            // a and b have more than 1 child
            if ((this.flags & VNodeFlags.TrackByKeyChildren) === 0) {
              this._syncChildren(a, b, owner);
            } else {
              this._syncChildrenTrackingByKeys(a, b, owner);
            }
          }
        }
      } else if (b !== null && b.length > 0) {
        // a is empty, insert all children from b
        for (i = 0; i < b.length; i++) {
          this._insertChild(b[i], null, owner);
        }
      }
    }
  }

  /**
   * Sync children
   *
   * Any heuristics that is used in this algorithm is an undefined behaviour,
   * and external dependencies should not rely on the knowledge about this
   * algorithm, because it can be changed in any time.
   */
  private _syncChildren(a: VNode[], b: VNode[], owner: Component<any, any>) : void {
    let aStart = 0;
    let bStart = 0;
    let aEnd = a.length - 1;
    let bEnd = b.length - 1;
    let aNode: VNode;
    let bNode: VNode;
    let nextPos: number;
    let next: Node;

    // Sync similar nodes at the beginning
    while (aStart <= aEnd && bStart <= bEnd) {
      aNode = a[aStart];
      bNode = b[bStart];

      if (!aNode._canSync(bNode)) {
        break;
      }

      aStart++;
      bStart++;

      aNode.sync(bNode, owner);
    }

    // Sync similar nodes at the end
    while (aStart <= aEnd && bStart <= bEnd) {
      aNode = a[aEnd];
      bNode = b[bEnd];

      if (!aNode._canSync(bNode)) {
        break;
      }

      aEnd--;
      bEnd--;

      aNode.sync(bNode, owner);
    }

    if ('<@KIVI_DEBUG@>' !== 'DEBUG_DISABLED') {
      if ((aStart <= aEnd || bStart <= bEnd) &&
          ((this._debugProperties.flags & VNodeDebugFlags.DisableChildrenShapeError) === 0)) {
        printError(
            'VNode sync children: children shape is changing, you should enable tracking by key with ' +
            'VNode method trackByKeyChildren(children).\n' +
            'If you certain that children shape changes won\'t cause any problems with losing ' +
            'state, you can remove this warning with VNode method disableChildrenShapeError().');
      }
    }

    // Iterate through the remaining nodes and if they have the same type, then sync, otherwise just
    // remove the old node and insert the new one.
    while (aStart <= aEnd && bStart <= bEnd) {
      aNode = a[aStart++];
      bNode = b[bStart++];
      if (aNode._canSync(bNode)) {
        aNode.sync(bNode, owner);
      } else {
        this._replaceChild(bNode, aNode, owner);
      }
    }

    if (aStart <= aEnd) {
      // All nodes from a are synced, remove the rest
      do {
        this._removeChild(a[aStart++], owner);
      } while (aStart <= aEnd);
    } else if (bStart <= bEnd) {
      // All nodes from b are synced, insert the rest
      nextPos = bEnd + 1;
      next = nextPos < b.length ? b[nextPos].ref : null;
      do {
        this._insertChild(b[bStart++], next, owner);
      } while (bStart <= bEnd);
    }
  }

  /**
   * Sync children tracking by keys
   */
  private _syncChildrenTrackingByKeys(a: VNode[], b: VNode[], owner: Component<any, any>) : void {
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

    // Algorithm that works on simple cases with basic list transformations
    //
    // It tries to reduce the diff problem by simultaneously iterating from the beginning and the end of both
    // lists, if keys are the same, they're synced, if node is moved from the beginning to the end of the
    // current cursor positions or vice versa it just performs move operation and continues to reduce the diff
    // problem.
    outer: do {
      stop = true;

      // Sync nodes with the same key at the beginning
      while (aStartNode._key === bStartNode._key) {
        if ('<@KIVI_DEBUG@>' !== 'DEBUG_DISABLED') {
          if (!aStartNode._canSync(bStartNode)) {
            throw new Error('VNode sync children failed: cannot sync two different children with the same key.');
          }
        }
        aStartNode.sync(bStartNode, owner);
        aStart++;
        bStart++;
        if (aStart > aEnd || bStart > bEnd) {
          break outer;
        }
        aStartNode = a[aStart];
        bStartNode = b[bStart];
        stop = false;
      }

      // Sync nodes with the same key at the end
      while (aEndNode._key === bEndNode._key) {
        if ('<@KIVI_DEBUG@>' !== 'DEBUG_DISABLED') {
          if (!aEndNode._canSync(bEndNode)) {
            throw new Error('VNode sync children failed: cannot sync two different children with the same key.');
          }
        }
        aEndNode.sync(bEndNode, owner);
        aEnd--;
        bEnd--;
        if (aStart > aEnd || bStart > bEnd) {
          break outer;
        }
        aEndNode = a[aEnd];
        bEndNode = b[bEnd];
        stop = false;
      }

      // Move and sync nodes from left to right
      while (aStartNode._key === bEndNode._key) {
        if ('<@KIVI_DEBUG@>' !== 'DEBUG_DISABLED') {
          if (!aStartNode._canSync(bEndNode)) {
            throw new Error('VNode sync children failed: cannot sync two different children with the same key.');
          }
        }
        aStartNode.sync(bEndNode, owner);
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
        if ('<@KIVI_DEBUG@>' !== 'DEBUG_DISABLED') {
          if (!aEndNode._canSync(bStartNode)) {
            throw new Error('VNode sync children failed: cannot sync two different children with the same key.');
          }
        }
        aEndNode.sync(bStartNode, owner);
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
      // All nodes from a are synced, insert the rest from b
      nextPos = bEnd + 1;
      next = nextPos < b.length ? b[nextPos].ref : null;
      while (bStart <= bEnd) {
        this._insertChild(b[bStart++], next, owner);
      }
    } else if (bStart > bEnd) {
      // All nodes from b are synced, remove the rest from a
      while (aStart <= aEnd) {
        this._removeChild(a[aStart++], owner);
      }
    } else {
      // Perform more complex sync algorithm on the remaining nodes
      //
      // We start by marking all nodes from b as inserted, then we try to find all removed nodes and
      // simultaneously perform syncs on nodes that exists in both lists and replacing "inserted"
      // marks with the position of the node from list b in list a. Then we just need to perform
      // slightly modified LIS algorithm, that ignores "inserted" marks and find common subsequence and
      // move all nodes that doesn't belong to this subsequence, or insert if they have "inserted" mark.
      let aLength = aEnd - aStart + 1;
      let bLength = bEnd - bStart + 1;
      let sources = new Array<number>(bLength);

      // Mark all nodes as inserted
      for (i = 0; i < bLength; i++) {
        sources[i] = -1;
      }

      let moved = false;
      let removeOffset = 0;

      // When lists a and b are small, we are using naive O(M*N) algorithm to find removed children
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
              if ('<@KIVI_DEBUG@>' !== 'DEBUG_DISABLED') {
                if (!aNode._canSync(bNode)) {
                  throw new Error('VNode sync children failed: cannot sync two different children with the same key.');
                }
              }
              aNode.sync(bNode, owner);
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

          if (j !== void 0) {
            bNode = b[j];
            sources[j - bStart] = i;
            if (lastTarget > j) {
              moved = true;
            } else {
              lastTarget = j;
            }
            if ('<@KIVI_DEBUG@>' !== 'DEBUG_DISABLED') {
              if (!aNode._canSync(bNode)) {
                throw new Error('VNode sync children failed: cannot sync two different children with the same key.');
              }
            }
            aNode.sync(bNode, owner);
          } else {
            this._removeChild(aNode, owner);
            removeOffset++;
          }
        }
      }

      if (moved) {
        let seq = _lis(sources);
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
            this._insertChild(node, next, owner);
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
            this._insertChild(node, next, owner);
          }
        }
      }
    }
  }

  private _insertChild(node: VNode, nextRef: Node, owner: Component<any, any>) : void {
    if (((this.flags & VNodeFlags.ManagedContainer) !== 0) &&
        (node.cref as ContainerManager<any>).descriptor.insertChild !== null) {
      (node.cref as ContainerManager<any>).descriptor.insertChild(
        (node.cref as ContainerManager<any>), this, node, nextRef, owner);
    } else {
      node.create(owner);
      this.ref.insertBefore(node.ref, nextRef);
      node.attached();
      node.render(owner);
    }
  }

  private _replaceChild(newNode: VNode, refNode: VNode, owner: Component<any, any>) : void {
    if (((this.flags & VNodeFlags.ManagedContainer) !== 0) &&
        (newNode.cref as ContainerManager<any>).descriptor.replaceChild !== null) {
      (newNode.cref as ContainerManager<any>).descriptor.replaceChild(
        (newNode.cref as ContainerManager<any>), this, newNode, refNode, owner);
    } else {
      newNode.create(owner);
      this.ref.replaceChild(newNode.ref, refNode.ref);
      refNode.dispose();
      newNode.attached();
      newNode.render(owner);
    }
  }

  private _moveChild(node: VNode, nextRef: Node, owner: Component<any, any>) : void {
    if (((this.flags & VNodeFlags.ManagedContainer) !== 0) &&
        (node.cref as ContainerManager<any>).descriptor.moveChild !== null) {
      (node.cref as ContainerManager<any>).descriptor.moveChild(
        (node.cref as ContainerManager<any>), this, node, nextRef, owner);
    } else {
      this.ref.insertBefore(node.ref, nextRef);
    }
  }

  private _removeChild(node: VNode, owner: Component<any, any>) : void {
    if (((this.flags & VNodeFlags.ManagedContainer) !== 0) &&
        (node.cref as ContainerManager<any>).descriptor.removeChild !== null) {
      (node.cref as ContainerManager<any>).descriptor.removeChild(
        (node.cref as ContainerManager<any>), this, node, owner);
    } else {
      this.ref.removeChild(node.ref);
      node.dispose();
    }
  }

  private _freeze() : void {
    if ('<@KIVI_DEBUG@>' !== 'DEBUG_DISABLED') {
      if ((this._debugProperties.flags & VNodeDebugFlags.DisableFreeze) === 0) {
        Object.freeze(this);
        if (this._attrs !== null && !Object.isFrozen(this._attrs)) {
          Object.freeze(this._attrs);
        }
        // Don't freeze props in Components.
        if (((this.flags & VNodeFlags.Component) === 0) &&
            this._props !== null &&
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
 * They're representing new items.
 *
 * This algorithm is used to find minimum number of move operations when updating children with explicit
 * keys.
 *
 * http://en.wikipedia.org/wiki/Longest_increasing_subsequence
 */
function _lis(a: number[]) : number[] {
  let p = a.slice(0);
  let result: number[] = [];
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
 * Create a VNode representing a [Text] node
 */
export function createVText(content: string) : VNode {
  return new VNode(VNodeFlags.Text, null, content);
}

/**
 * Create a VNode representing an [Element] node
 */
export function createVElement(tag: string) : VNode {
  return new VNode(VNodeFlags.Element, tag, null);
}

/**
 * Create a VNode representing a [SVGElement] node
 */
export function createVSvgElement(tag: string) : VNode {
  return new VNode(VNodeFlags.Element | VNodeFlags.Svg, tag, null);
}

/**
 * Create a VNode representing a [HTMLInputElement] node with text value
 */
export function createVTextInput() : VNode {
  return new VNode(VNodeFlags.Element | VNodeFlags.TextInputElement, 'input', null);
};

/**
 * Create a VNode representing a [HTMLInputElement] node with boolean value
 */
export function createVCheckedInput() : VNode {
  return new VNode(VNodeFlags.Element | VNodeFlags.CheckedInputElement, 'input', null);
};

/**
 * Create a VNode representing a Component root node
 */
export function createVRoot() : VNode {
  return new VNode(VNodeFlags.Root, null, null);
};
