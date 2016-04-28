import {SvgNamespace} from './namespace';
import {setAttr} from './sync/attrs';
import {VNodeFlags, VNode} from './vnode';

/**
 * VModel flags
 */
const enum VModelFlags {
  EnabledCloning       = 1,
  /**
   * 16-23 bits: shared flags between kivi objects
   */
  Svg                  = 1 << 15,
  IsVModel             = 1 << 19,
  VModelUpdateHandler  = 1 << 20,
}

/**
 * VModel debug flags
 */
export const enum VModelDebugFlags {
  AssignedStyle     = 1,
  AssignedClassName = 1 << 1,
}

/**
 * Update handler used to override default diff/patch behavior
 *
 * When oldProps is undefined, it means that element was created for the
 * first time.
 */
export type VModelUpdateHandler<D> = (element: Element, oldProps: D, newProps: D) => void;

/**
 * Model for DOM Elements
 *
 * @final
 */
export class VModel<D> {
  /**
   * Flags marked on VNode/ComponentDescriptor when it is created
   */
  markFlags: number;
  private _flags: number;
  private _tag: string;
  private _props: any;
  private _attrs: any;
  private _style: string;
  private _className: string;
  private _updateHandler: VModelUpdateHandler<D>;
  private _ref: Element;
  _debugFlags: number;

  constructor(tag: string) {
    this.markFlags = VModelFlags.IsVModel;
    this._flags = 0;
    this._tag = tag;
    this._props = null;
    this._attrs = null;
    this._style = null;
    this._className = null;
    this._updateHandler = null;
    this._ref = null;

    if ('<@KIVI_DEBUG@>' !== 'DEBUG_DISABLED') {
      this._debugFlags = 0;
    }
  }

  /**
   * Use svg namespace for the dom element
   */
  svg() : VModel<D> {
    this.markFlags |= VModelFlags.Svg;
    this._flags |= VModelFlags.Svg;
    return this;
  }

  /**
   * Set properties
   */
  props(props: any) : VModel<D> {
    this._props = props;
    return this;
  }

  /**
   * Set attributes
   */
  attrs(attrs: any) : VModel<D> {
    this._attrs = attrs;
    return this;
  }

  /**
   * Set style in css string format
   */
  style(style: string) : VModel<D> {
    if ('<@KIVI_DEBUG@>' !== 'DEBUG_DISABLED') {
      this._debugFlags |= VModelDebugFlags.AssignedStyle;
    }

    this._style = style;
    return this;
  }

  /**
   * Set className
   */
  className(classes: string) : VModel<D> {
    if ('<@KIVI_DEBUG@>' !== 'DEBUG_DISABLED') {
      this._debugFlags |= VModelDebugFlags.AssignedClassName;
    }

    this._className = classes;
    return this;
  }

  /**
   * Enable use of Node.cloneNode(false) to clone DOM elements
   */
  enableCloning() : VModel<D> {
    this._flags |= VModelFlags.EnabledCloning;
    return this;
  }

  /**
   * Set update handler
   */
  updateHandler(handler: VModelUpdateHandler<D>) : VModel<D> {
    this.markFlags |= VModelFlags.VModelUpdateHandler;
    this._updateHandler = handler;
    return this;
  }

  /**
   * Create a Virtual DOM Node from this model
   */
  createVNode(data: D = null) : VNode {
    return new VNode(VNodeFlags.Element | this.markFlags, this, data);
  }

  /**
   * Create a Virtual DOM Node for Component root from this model
   */
  createVRoot(data: D = null) : VNode {
    return new VNode(VNodeFlags.Root | this.markFlags, this, data);
  }

  /**
   * Create a DOM Element from this model
   */
  createElement() : Element {
    let ref: Element;
    let i: number;
    let keys: string[];
    let key: string;

    if (this._ref === null) {
      if ((this._flags & VModelFlags.Svg) === 0) {
        ref = document.createElement(this._tag);
      } else {
        ref = document.createElementNS(SvgNamespace, this._tag);
      }

      if (this._props !== null) {
        keys = Object.keys(this._props);
        for (i = 0; i < keys.length; i++) {
          key = keys[i];
          (ref as any)[key] = this._props[key];
        }
      }

      if (this._attrs !== null) {
        keys = Object.keys(this._attrs);
        for (i = 0; i < keys.length; i++) {
          key = keys[i];
          setAttr(ref, key, this._attrs[key]);
        }
      }

      if (this._style !== null) {
        (ref as HTMLElement).style.cssText = this._style;
      }

      if (this._className !== null) {
        (ref as HTMLElement).className = this._className;
      }

      if ((this._flags & VModelFlags.EnabledCloning) !== 0) {
        this._ref = ref;
        return this._ref.cloneNode(false) as Element;
      }

      return ref;
    } else {
      return this._ref.cloneNode(false) as Element;
    }
  }

  /**
   * Update DOM Node with an update handler
   */
  update(element: Element, oldProps: D, newProps: D) : void {
    this._updateHandler(element, oldProps, newProps);
  }
}