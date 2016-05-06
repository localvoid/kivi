import {SvgNamespace, VNodeFlags, VModelFlags, setAttr} from "./misc";
import {VNode} from "./vnode";

/**
 * Update handler used to override default diff/patch behavior.
 *
 * When oldProps is undefined, it means that element was created for the first time.
 */
export type VModelUpdateHandler<D> = (element: Element, oldProps: D, newProps: D) => void;

/**
 * Model for DOM Elements.
 *
 * Models are used as an advanced optimization technique. When creating virtual nodes, or declaring root node for a
 * component, it is possible to link them to a model instead of simple HTML tagName. Model will contain all static
 * properties for the HTML Element, so there is no need to declare them each time virtual node is created. It also
 * reduces diff overhead, because there is no need to diff static model properties.
 *
 * @final
 */
export class VModel<D> {
  /**
   * Flags that should be marked on VNode and ComponentDescriptor when they are associated with VModel.
   */
  _markFlags: number;
  _flags: number;
  _tagName: string;
  _props: any;
  _attrs: any;
  _style: string;
  _className: string;
  private _updateHandler: VModelUpdateHandler<D>;
  private _ref: Element;

  constructor(tagName: string) {
    this._markFlags = VNodeFlags.VModel;
    this._flags = 0;
    this._tagName = tagName;
    this._props = undefined;
    this._attrs = undefined;
    this._style = undefined;
    this._className = undefined;
    this._updateHandler = undefined;
    this._ref = undefined;
  }

  /**
   * Use svg namespace for the DOM element.
   */
  svg(): VModel<D> {
    this._markFlags |= VNodeFlags.Svg;
    this._flags |= VModelFlags.Svg;
    return this;
  }

  /**
   * Set properties.
   */
  props(props: any): VModel<D> {
    this._props = props;
    return this;
  }

  /**
   * Set attributes.
   */
  attrs(attrs: any): VModel<D> {
    this._attrs = attrs;
    return this;
  }

  /**
   * Set style in css string format.
   */
  style(style: string): VModel<D> {
    this._style = style;
    return this;
  }

  /**
   * Set className.
   */
  className(classes: string): VModel<D> {
    this._className = classes;
    return this;
  }

  /**
   * Enable node cloning.
   *
   * Instead of creating DOM nodes, model will clone nodes from a base node with `Node.cloneNode(false)` method.
   */
  enableCloning(): VModel<D> {
    this._flags |= VModelFlags.EnabledCloning;
    return this;
  }

  /**
   * Set update handler.
   */
  updateHandler(handler: VModelUpdateHandler<D>): VModel<D> {
    this._markFlags |= VNodeFlags.VModelUpdateHandler;
    this._updateHandler = handler;
    return this;
  }

  /**
   * Create a Virtual DOM Node from model.
   */
  createVNode(data?: D): VNode {
    return new VNode(VNodeFlags.Element | this._markFlags, this, data);
  }

  /**
   * Create a Virtual DOM Node for Component root from model.
   */
  createVRoot(data?: D): VNode {
    return new VNode(VNodeFlags.Root | this._markFlags, this, data);
  }

  /**
   * Create a DOM Element from model.
   */
  createElement(): Element {
    let i: number;
    let keys: string[];
    let key: string;
    let ref = this._ref;

    if (ref === undefined) {
      if ((this._flags & VModelFlags.Svg) === 0) {
        ref = document.createElement(this._tagName);
      } else {
        ref = document.createElementNS(SvgNamespace, this._tagName);
      }

      if (this._props !== undefined) {
        keys = Object.keys(this._props);
        for (i = 0; i < keys.length; i++) {
          key = keys[i];
          (ref as {[key: string]: any})[key] = this._props[key];
        }
      }

      if (this._attrs !== undefined) {
        keys = Object.keys(this._attrs);
        for (i = 0; i < keys.length; i++) {
          key = keys[i];
          setAttr(ref, key, this._attrs[key]);
        }
      }

      if (this._style !== undefined) {
        if ((this._flags & VModelFlags.Svg) === 0) {
          (ref as HTMLElement).style.cssText = this._style;
        } else {
          (ref as SVGElement).setAttribute("style", this._style);
        }
      }

      if (this._className !== undefined) {
        if ((this._flags & VModelFlags.Svg) === 0) {
          (ref as HTMLElement).className = this._className;
        } else {
          (ref as SVGElement).setAttribute("class", this._className);
        }
      }

      if ((this._flags & VModelFlags.EnabledCloning) !== 0) {
        this._ref = ref;
        return ref.cloneNode(false) as Element;
      }

      return ref;
    } else {
      return ref.cloneNode(false) as Element;
    }
  }

  /**
   * Update DOM Node with an update handler.
   */
  update(element: Element, oldProps: D, newProps: D): void {
    this._updateHandler(element, oldProps, newProps);
  }
}
