import {XmlNamespace, XlinkNamespace} from '../namespace';

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
export function syncStaticShapeAttrs(a: any, b: any, node: Element) : void {
  let keys = Object.keys(a);
  let key: string;
  let i: number;

  if ('<@KIVI_DEBUG@>' !== 'DEBUG_DISABLED') {
    if (a === null || b === null) {
      throw new Error('Failed to update attrs with static shape: attrs object have dynamic shape.');
    }
  }

  for (i = 0; i < keys.length; i++) {
    key = keys[i];
    let bValue = b[key];
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
export function syncDynamicShapeAttrs(a: any, b: any, node: Element) : void {
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
