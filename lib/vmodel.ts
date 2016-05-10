import {SvgNamespace, VNodeFlags, VModelFlags, setAttr} from "./misc";
import {VNode} from "./vnode";

/**
 * Model for DOM Elements.
 *
 * Models are used as an advanced optimization technique. When creating virtual nodes, or declaring root node for a
 * component, it is possible to link them to a model instead of simple HTML tagName. Model will contain all static
 * properties for the HTML Element, so there is no need to declare them each time virtual node is created. It also
 * reduces diff overhead, because there is no need to diff static model properties.
 *
 * Creating a virtual dom node from VModel:
 *
 *     const model = new VModel("div").attrs({"id": "model"});
 *     // Element node
 *     const node = mode.createVNode();
 *     // Component's root node
 *     const root = mode.createVRoot();
 *
 * Creating a DOM node from VModel:
 *
 *     const model = new VModel("div").attrs({"id": "model"});
 *     const div = model.createElement();
 *
 * @final
 */
export class VModel<D> {
  /**
   * Flags that should be marked on VNode and ComponentDescriptor when they are associated with VModel.
   *
   * See `SharedFlags` for details.
   */
  _markFlags: number;
  /**
   * Flags, see `VModelFlags` for details.
   */
  _flags: number;
  /**
   * Tag name of the element.
   */
  _tagName: string;
  /**
   * Properties.
   *
   * All properties are assigned to DOM nodes directly:
   *
   *     e: HTMLElement;
   *     e.propertyName = propertyValue;
   *
   * When virtual node is mounted on top of existing HTML, all properties from model will be assigned during mounting
   * phase.
   */
  _props: {[key: string]: any};
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
   * Update handler is used to override default reconciliation algorithm.
   */
  private _updateHandler: VModelUpdateHandler<D>;
  /**
   * Reference to an element that will be cloned when DOM node cloning is enabled.
   */
  private _ref: Element;

  constructor(tagName: string) {
    this._markFlags = VNodeFlags.VModel;
    this._flags = 0;
    this._tagName = tagName;
    this._props = null;
    this._attrs = null;
    this._style = null;
    this._className = null;
    this._updateHandler = null;
    this._ref = null;
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
   *
   * All properties are assigned to DOM nodes directly:
   *
   *     e: HTMLElement;
   *     e.propertyName = propertyValue;
   *
   * When virtual node is mounted on top of existing HTML, all properties from model will be assigned during mounting
   * phase.
   */
  props(props: {[key: string]: any}): VModel<D> {
    this._props = props;
    return this;
  }

  /**
   * Set attributes.
   *
   * All attributes are assigned to DOM nodes with `setAttribute` method:
   *
   *     e: HTMLElement;
   *     e.setAttribute(key, value);
   *
   * If attribute is prefixed with "xlink:", or "xml:" namespace, it will assign attributes with `setAttributeNS`
   * method and use appropriate namespaces.
   */
  attrs(attrs: {[key: string]: any}): VModel<D> {
    this._attrs = attrs;
    return this;
  }

  /**
   * Set style in css string format.
   *
   * Style is assigned to DOM nodes with `style.cssText` property, if virtual node represents an element from svg
   * namespace, style will be assigned with `setAttribute("style", "cssText")` method.
   */
  style(style: string): VModel<D> {
    this._style = style;
    return this;
  }

  /**
   * Set className.
   *
   * Class name is assigned to DOM nodes with `className` property, if virtual node represents an element from svg
   * namespace, class name will be assigned with `setAttribute("class", "className")` method.
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
   *
   * Update handler is used to override default reconciliation algorithm.
   */
  updateHandler(handler: VModelUpdateHandler<D>): VModel<D> {
    this._markFlags |= VNodeFlags.VModelUpdateHandler;
    this._updateHandler = handler;
    return this;
  }

  /**
   * Create a Virtual DOM Node.
   */
  createVNode(data?: D): VNode {
    return new VNode(VNodeFlags.Element | this._markFlags, this, data === undefined ? null : data);
  }

  /**
   * Create a Virtual DOM Node for component's root.
   */
  createVRoot(data?: D): VNode {
    return new VNode(VNodeFlags.Root | this._markFlags, this, data === undefined ? null : data);
  }

  /**
   * Create a DOM Element.
   */
  createElement(): Element {
    let i: number;
    let keys: string[];
    let key: string;
    let ref = this._ref;

    if (ref === null) {
      if ((this._flags & VModelFlags.Svg) === 0) {
        ref = document.createElement(this._tagName);
      } else {
        ref = document.createElementNS(SvgNamespace, this._tagName);
      }

      if (this._props !== null) {
        keys = Object.keys(this._props);
        for (i = 0; i < keys.length; i++) {
          key = keys[i];
          (ref as {[key: string]: any})[key] = this._props[key];
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
        if ((this._flags & VModelFlags.Svg) === 0) {
          (ref as HTMLElement).style.cssText = this._style;
        } else {
          (ref as SVGElement).setAttribute("style", this._style);
        }
      }

      if (this._className !== null) {
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

/**
 * VModel update handler is used to override default reconciliation algorithm.
 *
 * When `oldProps` is `null`, it means that element is created.
 */
export type VModelUpdateHandler<D> = (element: Element, oldProps: D, newProps: D) => void;

