import {SvgNamespace} from './namespace';
import {setAttr} from './sync/attrs';

/**
 * VModel flags
 */
const enum VModelFlags {
  EnabledCloning       = 1,
  /**
   * 16-23 bits: shared flags between kivi objects
   */
  Svg                  = 1 << 16,
  IsVModel             = 1 << 20,
  VModelUpdateHandler  = 1 << 21,
}

export type VModelUpdateHandler<D> = (node: Node, oldProps: D, newProps: D) => void;

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
  private _ref: Element;
  private _updateHandler: VModelUpdateHandler<D>;

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
  }

  svg() : VModel<D> {
    this.markFlags |= VModelFlags.Svg;
    this._flags |= VModelFlags.Svg;
    return this;
  }

  props(props: any) : VModel<D> {
    this._props = props;
    return this;
  }

  attrs(attrs: any) : VModel<D> {
    this._attrs = attrs;
    return this;
  }

  style(style: string) : VModel<D> {
    this._style = style;
    return this;
  }

  className(classes: string) : VModel<D> {
    this._className = classes;
    return this;
  }

  enableCloning() : VModel<D> {
    this._flags |= VModelFlags.EnabledCloning;
    return this;
  }

  updateHandler(handler: VModelUpdateHandler<D>) : VModel<D> {
    this.markFlags |= VModelFlags.VModelUpdateHandler;
    this._updateHandler = handler;
    return this;
  }

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
      }

      return ref;
    } else {
      return this._ref.cloneNode(false) as Element;
    }
  }

  update(node: Node, oldProps: D, newProps: D) {
    this._updateHandler(node, oldProps, newProps);
  }
}
