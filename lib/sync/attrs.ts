import {XmlNamespace, XlinkNamespace} from '../namespace';

/**
 * Get attribute namespace
 */
function _getAttrNamespace(key: string) : string {
  if ('<@KIVI_DEBUG@>' !== 'KIVI_DEBUG_DISABLED') {
    if (key.substring(1, 4) === 'xml') {
      return XmlNamespace;
    } else if (key.substring(1, 6) === 'xlink') {
      return XlinkNamespace;
    } else {
      throw new Error('Invalid attribute namespace: ' + key);
    }
  }
  return (key[2] === 'm') ? XmlNamespace : XlinkNamespace;
}

/**
 * Set attribute
 *
 * If attribute name starts with '$', treat it as a special attribute.
 */
export function setAttr(node: Element, key: string, value: string) {
  if (key[0] !== '$') {
    node.setAttribute(key, value);
  } else {
    node.setAttributeNS(_getAttrNamespace(key), key.substring(1), value);
  }
}

/**
 * Remove attribute
 *
 * If attribute name starts with '$', treat it as a special attribute.
 */
export function removeAttr(node: Element, key: string) {
  if (key[0] !== '$') {
    node.removeAttribute(key);
  } else {
    node.removeAttributeNS(_getAttrNamespace(key), key.substring(1));
  }
}

/**
 * Sync attributes with static shape
 */
export function syncStaticShapeAttrs(a: any, b: any, node: Element) {
  let keys = Object.keys(a);
  let key: string;
  let i: number;

  if ('<@KIVI_DEBUG@>' !== 'KIVI_DEBUG_DISABLED') {
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

  if ('<@KIVI_DEBUG@>' !== 'KIVI_DEBUG_DISABLED') {
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
export function syncDynamicShapeAttrs(a: any, b: any, node: Element) {
  let i: number;
  let keys: Array<string>;
  let key: string;

  if (a !== null) {
    if (b === null) {
      // b is empty, remove all attributes from a
      keys = Object.keys(a);
      for (i = 0; i < keys.length; i++) {
        removeAttr(node, keys[i]);
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
          removeAttr(node, key);
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
