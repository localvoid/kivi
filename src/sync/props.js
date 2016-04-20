goog.provide('kivi.sync.dynamicShapeProps');
goog.provide('kivi.sync.staticShapeProps');

/**
 * Synchronize properties with static shape.
 *
 * @param {?Object<string, *>} a Old properties.
 * @param {?Object<string, *>} b New properties.
 * @param {!Element} node
 */
kivi.sync.staticShapeProps = function(a, b, node) {
  var i, il;
  var key;
  var keys;
  var aValue;
  var bValue;

  if (kivi.DEBUG) {
    if (a === null || b === null) {
      throw new Error("Failed to update props with static shape: props object have dynamic shape.");
    }
  }

  keys = Object.keys(/** @type {!Object} */(a));
  for (i = 0, il = keys.length; i < il; i++) {
    key = keys[i];
    if (kivi.DEBUG) {
      if (!b.hasOwnProperty(key)) {
        throw new Error("Failed to update props with static shape: props object have dynamic shape.");
      }
    }

    aValue = a[key];
    bValue = b[key];
    if (aValue !== bValue) {
      node[key] = bValue;
    }
  }
  if (kivi.DEBUG) {
    keys = Object.keys(/** @type {!Object} */(b));
    for (i = 0, il = keys.length; i < il; i++) {
      key = keys[i];
      if (!a.hasOwnProperty(key)) {
        throw new Error("Failed to update props with static shape: props object have dynamic shape.");
      }
    }
  }
};

/**
 * Synchronize properties with dynamic shape.
 *
 * @param {?Object<string, *>} a Old properties.
 * @param {?Object<string, *>} b New properties.
 * @param {!Element} node
 */
kivi.sync.dynamicShapeProps = function(a, b, node) {
  var i, il;
  var key;
  var keys;
  var aValue;
  var bValue;

  if (a !== null) {
    if (b === null) {
      // b is empty, remove all attributes from a.
      keys = Object.keys(a);
      for (i = 0, il = keys.length; i < il; i++) {
        node[keys[i]] = void 0;
      }
    } else {
      // Remove and update attributes.
      keys = Object.keys(a);
      for (i = 0, il = keys.length; i < il; i++) {
        key = keys[i];
        if (b.hasOwnProperty(key)) {
          aValue = a[key];
          bValue = b[key];
          if (aValue !== bValue) {
            node[key] = bValue;
          }
        } else {
          node[key] = void 0;
        }
      }

      // Insert new attributes.
      keys = Object.keys(b);
      for (i = 0, il = keys.length; i < il; i++) {
        key = keys[i];
        if (!a.hasOwnProperty(key)) {
          node[key] = b[key];
        }
      }
    }
  } else if (b !== null) {
    // a is empty, insert all attributes from b.
    keys = Object.keys(b);
    for (i = 0, il = keys.length; i < il; i++) {
      key = keys[i];
      node[key] = b[key];
    }
  }
};
