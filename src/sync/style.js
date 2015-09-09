goog.provide('kivi.sync.style');

/**
 * Synchronize styles.
 *
 * @param {?Object<string, string>} a Old style.
 * @param {?Object<string, string>} b New style.
 * @param {!CSSStyleDeclaration} style
 */
kivi.sync.style = function(a, b, style) {
  var i, il;

  /**
   * @type {string}
   */
  var key;

  /**
   * @type {!Array<string>}
   */
  var keys;

  if (a !== null) {
    if (b === null) {
      // b is empty, remove all styles from a.
      keys = Object.keys(a);
      for (i = 0, il = keys.length; i < il; i++) {
        style.removeProperty(keys[i]);
      }
    } else {
      // Remove and update styles.
      keys = Object.keys(a);
      for (i = 0, il = keys.length; i < il; i++) {
        key = keys[i];
        if (b.hasOwnProperty(key)) {
          style.setProperty(key, b[key], '');
        } else {
          style.removeProperty(key);
        }
      }

      // Insert new styles.
      keys = Object.keys(b);
      for (i = 0, il = keys.length; i < il; i++) {
        key = keys[i];
        if (!a.hasOwnProperty(key)) {
          style.setProperty(key, b[key], '');
        }
      }
    }
  } else if (b !== null) {
    // a is empty, insert all styles from b.
    keys = Object.keys(b);
    for (i = 0, il = keys.length; i < il; i++) {
      key = keys[i];
      style.setProperty(key, b[key], '');
    }
  }
};
