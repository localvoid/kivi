import {VNode} from "./vnode";

export const SvgNamespace = "http://www.w3.org/2000/svg";
export const XlinkNamespace = "http://www.w3.org/1999/xlink";
export const XmlNamespace = "http://www.w3.org/XML/1998/namespace";

/**
 * InvalidatorSubscription flags.
 */
export const enum InvalidatorSubscriptionFlags {
  /// Subscribed to a component.
  Component = 1,
  /// Transient subscription. Each time subscription is invalidated, it will be automatically canceled.
  Transient = 1 << 1,
}

/**
 * Scheduler flags.
 */
export const enum SchedulerFlags {
  /// Running flag indicates that code is executed in scheduler's context.
  Running                 = 1,
  /// Microtasks are pending for execution in microtasks queue.
  MicrotaskPending        = 1 << 1,
  /// Macrotasks are pending for execution in macrotasks queue.
  MacrotaskPending        = 1 << 2,
  /// Frametasks are pending for execution in frametasks queue.
  FrametaskPending        = 1 << 3,
  /// When throttling is enabled, component updates are switched to incremental mode.
  EnabledThrottling       = 1 << 4,
  /// Time frame for executing frame tasks in the current frame is ended.
  ThrottledFrameExhausted = 1 << 5,
}

/**
 * Flags shared between VModel, VNode, ComponentDescriptor and Component objects.
 *
 * They can be easily copied with a binary or operator from object with one type to another with different type. For
 * example, when creating VNode from VModel, we are marking flags like IsVModel directly on a VModel object.
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
  /// Modification on DOM children list should be performed through ManagedContainer.
  ManagedContainer    = 1 << 5,
  /// VNode contains a comment placeholder instead of an actual node.
  CommentPlaceholder  = 1 << 6,
  /// Attrs property can have a dynamic shape.
  DynamicShapeAttrs   = 1 << 7,
  /// Props property can have a dynamic shape.
  DynamicShapeProps   = 1 << 8,
  /// VNode represents an input element with text value.
  TextInputElement    = 1 << 9,
  /// VNode represents an input element with checked value.
  CheckedInputElement = 1 << 10,
  /// VNode represents an input element.
  InputElement        = TextInputElement | CheckedInputElement,
  /// Prevent from disposing this virtual node.
  KeepAlive           = 1 << 11,
  /// Prevent from updating component's props on each update.
  BindOnce            = 1 << 12,

  /// See `SharedFlags.Svg`.
  Svg                 = SharedFlags.Svg,
  /// See `SharedFlags.VModel`.
  VModel              = SharedFlags.VModel,
  /// See `SharedFlags.VModelUpdateHandler`.
  VModelUpdateHandler = SharedFlags.VModelUpdateHandler,
}

/**
 * Rendering flags are used to control Virtual DOM syncing algorithm.
 */
export const enum RenderFlags {
  /// Prevents from rendering subcomponents.
  ShallowRender = 1,
  /// Prevents from updating subcomponents.
  ShallowUpdate = 1 << 1,
  /// Prevents from rendering and updating subcomponents.
  Shallow       = ShallowRender | ShallowUpdate,
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
  Disposed                  = 1,
  /// Component is in attached state.
  Attached                  = 1 << 1,
  /// Component in in mounting state.
  Mounting                  = 1 << 2,
  /// Component's props is changed and it should be updated.
  DirtyProps                = 1 << 3,
  /// Component's state is changed and it should be updated.
  DirtyState                = 1 << 4,
  /// Something is changed in component's environment and it should be updated.
  DirtyEnvironment          = 1 << 5,
  /// Component should be updated on each frame with high priority.
  UpdateEachFrame           = 1 << 6,
  /// Component is registered in update each frame queue, when this flag is off, it will be removed from queue on next
  /// frame.
  InUpdateEachFrameQueue    = 1 << 7,
  /// Component is in recycled pool.
  Recycled                  = 1 << 8,
  /// Prevents from checking props indentity.
  DisabledCheckPropsIdentity = 1 << 9,
  /// Component is registered in scheduler frame task queue for updates.
  InUpdateQueue             = 1 << 10,
  /// Component has a high priority and should be updated even when time frame for incremental rendering is exhausted.
  HighPriorityUpdate        = 1 << 11,

  /// See `SharedFlags.Svg`.
  Svg              = SharedFlags.Svg,
  /// See `SharedFlags.Canvas2D`.
  Canvas2D         = SharedFlags.Canvas2D,
  /// See `SharedFlags.VModel`.
  VModel           = SharedFlags.VModel,
  /// See `SharedFlags.EnabledRecycling`.
  EnabledRecycling = SharedFlags.EnabledRecycling,

  /// Component is dirty and should be updated.
  Dirty        = DirtyProps | DirtyState | DirtyEnvironment,
}

/**
 * ContainerManager flags used in DEBUG mode.
 */
export const enum ContainerManagerDescriptorDebugFlags {
  /// Throw an Error when children doesn't have keys.
  AcceptKeyedChildrenOnly = 1
}

export type VNodeRecursiveListValue = VNode|VNodeRecursiveList;
export interface VNodeRecursiveList extends Array<VNodeRecursiveListValue> {}

/**
 * Recursively flattens VNode arrays and skips null nodes.
 */
export function flattenVNodes(nodes: VNodeRecursiveList): VNode[] {
  let copy = nodes.slice(0);
  const flatten = [] as VNode[];
  while (copy.length > 0) {
    const item = copy.shift();
    if (item !== null) {
      if (item.constructor === VNode) {
        flatten.push(item as any);
      } else {
        copy = (item as any).concat(copy);
      }
    }
  }
  return flatten;
}

/**
 * Gets reference to component from a DOM node object.
 */
export function getBackRef<T>(node: Node): T {
  return (node as any as {xtag: T}).xtag;
}

/**
 * Set HTML attribute.
 */
export function setAttr(node: Element, key: string, value: string): void {
  if (key[0] !== "x") {
    node.setAttribute(key, value);
  } else {
    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      if (key.length <= 3) {
        throw new Error(`Failed to set attr: invalid attribute "${key}", attributes starting with letter "x" should` +
                        ` have length 4 or more.`);
      }
    }

    if (key[1] === "m" && key[2] === "l") {
      if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
        if (key[3] !== ":") {
          throw new Error(`Failed to set attr: invalid attribute "${key}", attributes with "xml" prefix should be in` +
                          ` the form "xml:attr".`);
        }
      }
      node.setAttributeNS(XmlNamespace, key, value);
    } else if (key[1] === "l" && key[2] === "i") {
      if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
        if (key[3] !== "n" || key[4] !== "k" || key[5] !== ":") {
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
 * Sync HTML attributes with static shape.
 */
export function syncStaticShapeAttrs(node: Element, a: {[key: string]: any}, b: {[key: string]: any}): void {
  if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
    if (a === null || b === null) {
      throw new Error("Failed to update attrs with static shape: attrs object have dynamic shape.");
    }
  }

  let keys = Object.keys(a);
  let key: string;
  let i: number;

  for (i = 0; i < keys.length; i++) {
    key = keys[i];
    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      if (!b.hasOwnProperty(key)) {
        throw new Error("Failed to update attrs with static shape: attrs object have dynamic shape.");
      }
    }
    const bValue = b[key];
    if (a[key] !== bValue) {
      setAttr(node, key, bValue);
    }
  }

  if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
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
 * Sync attributes with dynamic shape.
 */
export function syncDynamicShapeAttrs(node: Element, a: {[key: string]: any}, b: {[key: string]: any}): void {
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
 * Sync properties with static shape.
 */
export function syncStaticShapeProps(node: Element, a: {[key: string]: any}, b: {[key: string]: any}): void {
  if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
    if (a === null || b === null) {
      throw new Error("Failed to update props with static shape: props object have dynamic shape.");
    }
  }

  let keys = Object.keys(a);
  let key: string;
  let i: number;

  for (i = 0; i < keys.length; i++) {
    key = keys[i];
    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      if (!b.hasOwnProperty(key)) {
        throw new Error("Failed to update props with static shape: props object have dynamic shape.");
      }
    }
    const bValue = b[key];
    if (a[key] !== bValue) {
      (node as {[key: string]: any})[key] = bValue;
    }
  }

  if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
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
 * Sync properties with dynamic shape.
 */
export function syncDynamicShapeProps(node: Element, a: {[key: string]: any}, b: {[key: string]: any}): void {
  let i: number;
  let keys: string[];
  let key: string;

  if (a !== null) {
    if (b === null) {
      // b is empty, remove all attributes from a.
      keys = Object.keys(a);
      for (i = 0; i < keys.length; i++) {
        (node as {[key: string]: any})[keys[i]] = null;
      }
    } else {
      // Remove and update attributes.
      keys = Object.keys(a);
      for (i = 0; i < keys.length; i++) {
        key = keys[i];
        if (b.hasOwnProperty(key)) {
          const bValue = b[key];
          if (a[key] !== bValue) {
            (node as {[key: string]: any})[key] = bValue;
          }
        } else {
          (node as {[key: string]: any})[key] = null;
        }
      }

      // Insert new attributes.
      keys = Object.keys(b);
      for (i = 0; i < keys.length; i++) {
        key = keys[i];
        if (!a.hasOwnProperty(key)) {
          (node as {[key: string]: any})[key] = b[key];
        }
      }
    }
  } else if (b !== null) {
    // a is empty, insert all attributes from b.
    keys = Object.keys(b);
    for (i = 0; i < keys.length; i++) {
      key = keys[i];
      (node as {[key: string]: any})[key] = b[key];
    }
  }
}
