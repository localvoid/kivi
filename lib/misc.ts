import {VNode} from './vnode';
import {XmlNamespace, XlinkNamespace} from './namespace';

export const enum InvalidatorSubscriptionFlags {
  Component = 1,
  Transient = 1 << 1,
}

/**
 * Flags shared between VModel, VNode, ComponentDescriptor and Component
 * objects.
 *
 * They can be easily copied with a binary or operator from object with one
 * type to another with different type. For example, when creating VNode
 * from VModel, we are marking flags like IsVModel directly on a VModel
 * object.
 *
 * 16-24 bits are reserved for shared flags.
 */
const enum SharedFlags {
  Svg                 = 1 << 15,
  Canvas2D            = 1 << 16,
  VModel              = 1 << 17,
  VModelUpdateHandler = 1 << 18,
  EnabledRecycling    = 1 << 19,
}

/**
 * VModel flags
 */
export const enum VModelFlags {
  EnabledCloning = 1,

  Svg = SharedFlags.Svg,
}

export const enum VNodeFlags {
  Text                = 1,
  Element             = 1 << 1,
  Component           = 1 << 2,
  Root                = 1 << 3,
  TrackByKeyChildren  = 1 << 4,
  ManagedContainer    = 1 << 5,
  CommentPlaceholder  = 1 << 6,
  DynamicShapeAttrs   = 1 << 7,
  DynamicShapeProps   = 1 << 8,
  TextInputElement    = 1 << 9,
  CheckedInputElement = 1 << 10,
  InputElement        = TextInputElement | CheckedInputElement,
  KeepAlive           = 1 << 11,

  Svg                 = SharedFlags.Svg,
  VModel              = SharedFlags.VModel,
  VModelUpdateHandler = SharedFlags.VModelUpdateHandler,
}

export const enum RenderFlags {
  // prevents from rendering subcomponents
  ShallowRender = 1,
  // prevents from updating subcomponents
  ShallowUpdate = 1 << 1,
  Shallow       = ShallowRender | ShallowUpdate,
}

export const enum VNodeDebugFlags {
  Rendered                   = 1,
  Mounted                    = 1 << 1,
  Attached                   = 1 << 2,
  Detached                   = 1 << 3,
  Disposed                   = 1 << 4,
  DisabledChildrenShapeError = 1 << 5,
  DisabledFreeze             = 1 << 6,
}

export const enum ComponentDescriptorFlags {
  Svg              = SharedFlags.Svg,
  Canvas2D         = SharedFlags.Canvas2D,
  VModel           = SharedFlags.VModel,
  EnabledRecycling = SharedFlags.EnabledRecycling,
}

export const enum ComponentFlags {
  Disposed                  = 1,
  Attached                  = 1 << 1,
  Mounting                  = 1 << 2,
  Dirty                     = 1 << 3,
  UpdateEachFrame           = 1 << 4,
  InUpdateQueue             = 1 << 5,
  Recycled                  = 1 << 6,
  DisabledCheckDataIdentity = 1 << 7,

  Svg              = SharedFlags.Svg,
  Canvas2D         = SharedFlags.Canvas2D,
  VModel           = SharedFlags.VModel,
  EnabledRecycling = SharedFlags.EnabledRecycling,

  ShouldUpdate = Attached | Dirty,
}

export const enum ContainerManagerDescriptorDebugFlags {
  AcceptKeyedChildrenOnly = 1
}

export type VNodeRecursiveListValue = VNode|VNodeRecursiveList;
export interface VNodeRecursiveList extends Array<VNodeRecursiveListValue> {}

export function flattenVNodes(nodes: VNodeRecursiveList) : VNode[] {
  let copy = nodes.slice(0);
  const flatten = [] as VNode[];
  while (copy.length > 0) {
    const item = copy.shift();
    if (item.constructor === VNode) {
      flatten.push(item as any);
    } else {
      copy = (item as any).concat(copy);
    }
  }
  return flatten
}

/**
 * Set attribute
 */
export function setAttr(node: Element, key: string, value: string) : void {
  if (key[0] !== 'x') {
    node.setAttribute(key, value);
  } else {
    if (key[1] === 'm' && key[2] === 'l') {
      node.setAttributeNS(XmlNamespace, key, value);
    } else if (key[1] === 'l' && key[2] === 'i') {
      node.setAttributeNS(XlinkNamespace, key, value);
    } else {
      node.setAttribute(key, value);
    }
  }
}

/**
 * Sync attributes with static shape
 */
export function syncStaticShapeAttrs(a: {[key: string]: any}, b: {[key: string]: any}, node: Element) : void {
  if ('<@KIVI_DEBUG@>' !== 'DEBUG_DISABLED') {
    if (a === null || b === null) {
      throw new Error('Failed to update attrs with static shape: attrs object have dynamic shape.');
    }
  }

  let keys = Object.keys(a);
  let key: string;
  let i: number;

  for (i = 0; i < keys.length; i++) {
    key = keys[i];
    if ('<@KIVI_DEBUG@>' !== 'DEBUG_DISABLED') {
      if (!b.hasOwnProperty(key)) {
        throw new Error('Failed to update attrs with static shape: attrs object have dynamic shape.');
      }
    }
    const bValue = b[key];
    if (a[key] !== bValue) {
      setAttr(node, key, bValue);
    }
  }

  if ('<@KIVI_DEBUG@>' !== 'DEBUG_DISABLED') {
    keys = Object.keys(b);
    for (i = 0; i < keys.length; i++) {
      key = keys[i];
      if (!a.hasOwnProperty(key)) {
        throw new Error('Failed to update attrs with static shape: attrs object have dynamic shape.');
      }
    }
  }
}

/**
 * Sync attributes with dynamic shape
 */
export function syncDynamicShapeAttrs(a: {[key: string]: any}, b: {[key: string]: any}, node: Element) : void {
  let i: number;
  let keys: string[];
  let key: string;

  if (a !== null) {
    if (b === null) {
      // b is empty, remove all attributes from a
      keys = Object.keys(a);
      for (i = 0; i < keys.length; i++) {
        node.removeAttribute(keys[i]);
      }
    } else {
      // Remove and update attributes
      keys = Object.keys(a);
      for (i = 0; i < keys.length; i++) {
        key = keys[i];
        if (b.hasOwnProperty(key)) {
          let bValue = b[key];
          if (a[key] !== bValue) {
            setAttr(node, key, bValue);
          }
        } else {
          node.removeAttribute(key);
        }
      }

      // Insert new attributes
      keys = Object.keys(b);
      for (i = 0; i < keys.length; i++) {
        key = keys[i];
        if (!a.hasOwnProperty(key)) {
          setAttr(node, key, b[key]);
        }
      }
    }
  } else if (b !== null) {
    // a is empty, insert all attributes from b
    keys = Object.keys(b);
    for (i = 0; i < keys.length; i++) {
      key = keys[i];
      setAttr(node, key, b[key]);
    }
  }
}

/**
 * Sync properties with static shape
 */
export function syncStaticShapeProps(a: {[key: string]: any}, b: {[key: string]: any}, node: Element) : void {
  if ('<@KIVI_DEBUG@>' !== 'DEBUG_DISABLED') {
    if (a === null || b === null) {
      throw new Error('Failed to update props with static shape: props object have dynamic shape.');
    }
  }

  let keys = Object.keys(a);
  let key: string;
  let i: number;

  for (i = 0; i < keys.length; i++) {
    key = keys[i];
    if ('<@KIVI_DEBUG@>' !== 'DEBUG_DISABLED') {
      if (!b.hasOwnProperty(key)) {
        throw new Error('Failed to update props with static shape: props object have dynamic shape.');
      }
    }
    const bValue = b[key];
    if (a[key] !== bValue) {
      (node as any)[key] = bValue;
    }
  }

  if ('<@KIVI_DEBUG@>' !== 'DEBUG_DISABLED') {
    keys = Object.keys(b);
    for (i = 0; i < keys.length; i++) {
      key = keys[i];
      if (!a.hasOwnProperty(key)) {
        throw new Error('Failed to update attrs with static shape: attrs object have dynamic shape.');
      }
    }
  }
}

/**
 * Sync properties with dynamic shape
 */
export function syncDynamicShapeProps(a: {[key: string]: any}, b: {[key: string]: any}, node: Element) : void {
  let i: number;
  let keys: string[];
  let key: string;

  if (a !== null) {
    if (b === null) {
      // b is empty, remove all attributes from a.
      keys = Object.keys(a);
      for (i = 0; i < keys.length; i++) {
        (node as any)[keys[i]] = void 0;
      }
    } else {
      // Remove and update attributes.
      keys = Object.keys(a);
      for (i = 0; i < keys.length; i++) {
        key = keys[i];
        if (b.hasOwnProperty(key)) {
          let bValue = b[key];
          if (a[key] !== bValue) {
            (node as any)[key] = bValue;
          }
        } else {
          (node as any)[key] = void 0;
        }
      }

      // Insert new attributes.
      keys = Object.keys(b);
      for (i = 0; i < keys.length; i++) {
        key = keys[i];
        if (!a.hasOwnProperty(key)) {
          (node as any)[key] = b[key];
        }
      }
    }
  } else if (b !== null) {
    // a is empty, insert all attributes from b.
    keys = Object.keys(b);
    for (i = 0; i < keys.length; i++) {
      key = keys[i];
      (node as any)[key] = b[key];
    }
  }
}
