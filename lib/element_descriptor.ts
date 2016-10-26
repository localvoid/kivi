import { SvgNamespace, VNodeFlags, ElementDescriptorFlags, setAttr } from "./misc";
import { VNode } from "./vnode";

/**
 * Element Descriptor.
 *
 * ElementDescriptors are used as an advanced optimization technique. When creating virtual nodes, or declaring root
 * node for a component, it is possible to link them to an element descriptor instead of simple HTML tagName.
 *
 * Element Descriptor will contain all static properties for the HTML Element, so there is no need to declare them
 * each time virtual node is created. It also reduces diff overhead, because there is no need to diff static properties.
 *
 * Creating a virtual dom node from ElementDescriptor:
 *
 *     const d = new ElementDescriptor("div").attrs({"id": "element"});
 *     // Element node
 *     const node = d.createVNode();
 *     // Component's root node
 *     const root = d.createVRoot();
 *
 * Creating a DOM Element from ElementDescriptor:
 *
 *     const d = new ElementDescriptor("div").attrs({"id": "element"});
 *     const div = d.createElement();
 *
 * @final
 */
export class ElementDescriptor<D> {
  /**
   * Flags that should be marked on VNode and ComponentDescriptor when they are associated with ElementDescriptor.
   *
   * See `SharedFlags` for details.
   */
  _markFlags: number;
  /**
   * Flags, see `ElementDescriptorFlags` for details.
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
   * When virtual node is mounted on top of existing HTML, all properties from descriptor will be assigned during
   * mounting phase.
   */
  _props: { [key: string]: any } | null;
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
   * Update handler is used to override default reconciliation algorithm.
   */
  _update: ((element: Element, oldProps: D | undefined, newProps: D) => void) | null;
  /**
   * Reference to an element that will be cloned when DOM node cloning is enabled.
   */
  private _ref: Element | null;

  constructor(tagName: string) {
    this._markFlags = VNodeFlags.ElementDescriptor;
    this._flags = 0;
    this._tagName = tagName;
    this._props = null;
    this._attrs = null;
    this._style = null;
    this._className = null;
    this._update = null;
    this._ref = null;
  }

  /**
   * Use svg namespace for the DOM element.
   */
  svg(): ElementDescriptor<D> {
    this._markFlags |= VNodeFlags.Svg;
    this._flags |= ElementDescriptorFlags.Svg;
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
   * When virtual node is mounted on top of existing HTML, all properties from descritpro will be assigned during
   * mounting phase.
   */
  props(props: { [key: string]: any }): ElementDescriptor<D> {
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
  attrs(attrs: { [key: string]: any }): ElementDescriptor<D> {
    this._attrs = attrs;
    return this;
  }

  /**
   * Set style in css string format.
   *
   * Style is assigned to DOM nodes with `style.cssText` property, if virtual node represents an element from svg
   * namespace, style will be assigned with `setAttribute("style", "cssText")` method.
   */
  style(style: string): ElementDescriptor<D> {
    this._style = style;
    return this;
  }

  /**
   * Set className.
   *
   * Class name is assigned to DOM nodes with `className` property, if virtual node represents an element from svg
   * namespace, class name will be assigned with `setAttribute("class", "className")` method.
   */
  className(classes: string): ElementDescriptor<D> {
    this._className = classes;
    return this;
  }

  /**
   * Enable node cloning.
   *
   * Instead of creating DOM nodes, descriptor will clone nodes from a base node with `Node.cloneNode(false)` method.
   */
  enableCloning(): ElementDescriptor<D> {
    this._flags |= ElementDescriptorFlags.EnabledCloning;
    return this;
  }

  /**
   * Set update handler.
   *
   * Update handler is used to override default reconciliation algorithm.
   */
  update(handler: (element: Element, oldProps: D | undefined, newProps: D) => void): ElementDescriptor<D> {
    this._markFlags |= VNodeFlags.ElementDescriptorUpdateHandler;
    this._update = handler;
    return this;
  }

  /**
   * Create a Virtual DOM Node.
   */
  createVNode(data?: D): VNode {
    return new VNode(VNodeFlags.Element | this._markFlags, this, data === undefined ? null : data);
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
      if ((this._flags & ElementDescriptorFlags.Svg) === 0) {
        ref = document.createElement(this._tagName);
      } else {
        ref = document.createElementNS(SvgNamespace, this._tagName);
      }

      if (this._props !== null) {
        keys = Object.keys(this._props);
        for (i = 0; i < keys.length; i++) {
          key = keys[i];
          (ref as { [key: string]: any })[key] = this._props[key];
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
        if ((this._flags & ElementDescriptorFlags.Svg) === 0) {
          (ref as HTMLElement).style.cssText = this._style;
        } else {
          (ref as SVGElement).setAttribute("style", this._style);
        }
      }

      if (this._className !== null) {
        if ((this._flags & ElementDescriptorFlags.Svg) === 0) {
          (ref as HTMLElement).className = this._className;
        } else {
          (ref as SVGElement).setAttribute("class", this._className);
        }
      }

      if ((this._flags & ElementDescriptorFlags.EnabledCloning) !== 0) {
        this._ref = ref;
        return ref.cloneNode(false) as Element;
      }

      return ref;
    } else {
      return ref.cloneNode(false) as Element;
    }
  }
}
