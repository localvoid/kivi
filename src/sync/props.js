goog.provide('kivi.sync.props');

/**
 * Synchronize properties.
 *
 * @param {?Object<string, *>} a Old properties.
 * @param {?Object<string, *>} b New properties.
 * @param {!Element} node
 */
kivi.sync.props = function(a, b, node) {
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
