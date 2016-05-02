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
