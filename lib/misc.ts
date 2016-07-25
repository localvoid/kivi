export const SvgNamespace = "http://www.w3.org/2000/svg";
export const XlinkNamespace = "http://www.w3.org/1999/xlink";
export const XmlNamespace = "http://www.w3.org/XML/1998/namespace";

declare global {
  interface Element {
    closest(selector: string): Element | null;
  }
}

const ElementPrototype = Element.prototype;

/**
 * Matches polyfill.
 *
 * Edge14, Android 4.4
 */
if (ElementPrototype.matches === undefined) {
  ElementPrototype.matches = ElementPrototype.webkitMatchesSelector || ElementPrototype.msMatchesSelector;
}

/**
 * Selector function should return true if element matches this selector.
 */
export type SelectorFn = (element: Element) => boolean;

/**
 * Flags shared between VModel, VNode, ComponentDescriptor and Component objects.
 *
 * They can be easily copied with a binary or operator from object with one type to another with different type. For
 * example, when creating VNode from VModel, we are marking flags like `VModel` directly on a VModel object.
 *
 * 16-24 bits are reserved for shared flags.
 */
const enum SharedFlags {
  /// DOM Element is in SVG namespace.
  Svg                 = 1 << 15,
  /// Component is using 2d canvas to render its contents.
  Canvas2D            = 1 << 16,
  /// Element is created from VModel.
  VModel              = 1 << 17,
  /// Element is using custom reconciliation algorithm to update.
  VModelUpdateHandler = 1 << 18,
  /// Recycling is enabled, items should be allocated from recycled pool.
  EnabledRecycling    = 1 << 19,
}

/**
 * VModel flags.
 */
export const enum VModelFlags {
  /// DOM Node cloning is enabled.
  ///
  /// Instead of creating DOM nodes, model will clone nodes from a base node with `Node.cloneNode(false)` method.
  EnabledCloning = 1,

  /// See `SharedFlags.Svg`.
  Svg = SharedFlags.Svg,
}

/**
 * VNode flags.
 */
export const enum VNodeFlags {
  /// VNode is representing a Text node.
  Text                = 1,
  /// VNode is representing an Element node. When Svg flag is off, it represents HTMLElement.
  Element             = 1 << 1,
  /// VNode is representing a component.
  Component           = 1 << 2,
  /// VNode is representing a component's root.
  Root                = 1 << 3,
  /// Children reconciliation algorithm should use key property to find same nodes in old children list.
  TrackByKeyChildren  = 1 << 4,
  /// Attrs property can have a dynamic shape.
  DynamicShapeAttrs   = 1 << 5,
  /// VNode represents an input element with text value.
  TextInputElement    = 1 << 6,
  /// VNode represents an input element with checked value.
  CheckedInputElement = 1 << 7,
  /// VNode represents an input element.
  InputElement        = TextInputElement | CheckedInputElement,
  /// Prevent from disposing this virtual node.
  KeepAlive           = 1 << 8,
  /// Prevent from updating component's props on each update.
  BindOnce            = 1 << 9,
  /// Immutable props.
  ImmutableProps      = 1 << 10,
  /// Children contains unsafe HTML.
  UnsafeHTML          = 1 << 11,

  /// See `SharedFlags.Svg`.
  Svg                 = SharedFlags.Svg,
  /// See `SharedFlags.VModel`.
  VModel              = SharedFlags.VModel,
  /// See `SharedFlags.VModelUpdateHandler`.
  VModelUpdateHandler = SharedFlags.VModelUpdateHandler,
}

/**
 * VNode flags used when DEBUG mode is enabled.
 */
export const enum VNodeDebugFlags {
  /// VNode has been rendered.
  Rendered                   = 1,
  /// VNode has been mounted.
  Mounted                    = 1 << 1,
  /// VNode is in attached state.
  Attached                   = 1 << 2,
  /// VNode is in detached state.
  Detached                   = 1 << 3,
  /// VNode is in disposed state.
  Disposed                   = 1 << 4,
  /// Disable children shape error.
  DisabledChildrenShapeError = 1 << 5,
  /// Disable freezing VNode properties.
  DisabledFreeze             = 1 << 6,
}

/**
 * ComponentDescriptor flags.
 */
export const enum ComponentDescriptorFlags {
  /// Create `element.xtag` back reference to component instance when component is instantiated.
  EnabledBackRef = 1,

  /// See `SharedFlags.Svg`.
  Svg              = SharedFlags.Svg,
  /// See `SharedFlags.Canvas2D`.
  Canvas2D         = SharedFlags.Canvas2D,
  /// See `SharedFlags.VModel`.
  VModel           = SharedFlags.VModel,
  /// See `SharedFlags.EnabledRecycling`.
  EnabledRecycling = SharedFlags.EnabledRecycling,
}

/**
 * Component flags.
 */
export const enum ComponentFlags {
  /// Component is in disposed state.
  Disposed                   = 1,
  /// Component is in attached state.
  Attached                   = 1 << 1,
  /// Component is dirty and should be updated.
  Dirty                      = 1 << 2,
  /// Default dirty flag. Component doesn't have any tips that describe which part is dirty.
  DirtyView                  = 1 << 3,
  /// Component should be updated on each frame with high priority.
  UpdateEachFrame            = 1 << 4,
  /// Component is registered in update each frame queue, when this flag is off, it will be removed from queue on next
  /// frame.
  InUpdateEachFrameQueue     = 1 << 5,
  /// Component is in recycled pool.
  Recycled                   = 1 << 6,
  /// Component is registered in scheduler frame task queue for updates.
  InUpdateQueue              = 1 << 7,
  /// Component has a high priority and should be updated even when time frame for incremental rendering is exhausted.
  HighPriorityUpdate         = 1 << 8,
  /// Component is enabled scheduler throttling.
  EnabledThrottling          = 1 << 9,
  /// Component has immutable props.
  ImmutableProps             = 1 << 10,

  /// See `SharedFlags.Svg`.
  Svg              = SharedFlags.Svg,
  /// See `SharedFlags.Canvas2D`.
  Canvas2D         = SharedFlags.Canvas2D,
  /// See `SharedFlags.VModel`.
  VModel           = SharedFlags.VModel,
  /// See `SharedFlags.EnabledRecycling`.
  EnabledRecycling = SharedFlags.EnabledRecycling,
}

/**
 * Set HTML attribute.
 */
export function setAttr(node: Element, key: string, value: string): void {
  if (key.charCodeAt(0) !== 120) { // x
    node.setAttribute(key, value);
  } else {
    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      if (key.length <= 3) {
        throw new Error(`Failed to set attr: invalid attribute "${key}", attributes starting with letter "x" should` +
                        ` have length 4 or more.`);
      }
    }

    if (key.charCodeAt(1) === 109 && key.charCodeAt(2) === 108) { // ml
      if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
        if (key.charCodeAt(3) !== 58) { // :
          throw new Error(`Failed to set attr: invalid attribute "${key}", attributes with "xml" prefix should be in` +
                          ` the form "xml:attr".`);
        }
      }
      node.setAttributeNS(XmlNamespace, key, value);
    } else if (key.charCodeAt(1) === 108 && key.charCodeAt(2) === 105) { // li
      if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
        if (key.charCodeAt(3) !== 110 || key.charCodeAt(4) !== 107 || key.charCodeAt(5) !== 58) { // nk:
          throw new Error(`Failed to set attr: invalid attribute "${key}", attributes with "xli" prefix should be in` +
                          ` the form "xlink:attr".`);
        }
      }
      node.setAttributeNS(XlinkNamespace, key, value);
    } else {
      node.setAttribute(key, value);
    }
  }
}

/**
 * This function doesn't do anything, it just returns the same `tagName` value.
 *
 * It is used so that when building application in production mode, we can replace all occurences of `getTagName`
 * function and minify all tag names.
 */
export function getTagName(tagName: string): string {
  return tagName;
}

/**
 * This function doesn't do anything, it just returns the same `className` value.
 *
 * It is used so that when building application in production mode, we can replace all occurences of `getClassName`
 * function and minify all class names.
 */
export function getClassName(className: string): string {
  return className;
}

export function matchesWithAncestors(element: Element, selector: string | SelectorFn, sentinel: Element | null = null):
    Element | null {
  let e = element;
  do {
    if (typeof selector === "string") {
      if (e.matches(selector)) {
        return e;
      }
    } else if (selector(e)) {
      return e;
    }
    e = e.parentElement;
  } while (e !== sentinel);

  return null;
}
