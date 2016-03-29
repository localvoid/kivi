goog.provide('kivi.sync.dynamicShapeAttrs');
goog.provide('kivi.sync.removeAttr');
goog.provide('kivi.sync.setAttr');
goog.provide('kivi.sync.staticShapeAttrs');
goog.require('kivi');
goog.require('kivi.HtmlNamespace');

/**
 * Get attribute namespace
 *
 * @param {string} key
 * @returns {string}
 * @package
 */
kivi.sync._getAttrNamespace = function(key) {
  if (kivi.DEBUG) {
    if (key.substring(1, 4) === 'xml') {
      return kivi.HtmlNamespace.XML;
    } else if (key.substring(1, 6) === 'xlink') {
      return kivi.HtmlNamespace.XLINK;
    } else {
      throw new Error('Invalid attribute namespace: ' + key);
    }
  } else {
    return (key[2] == 'm') ? kivi.HtmlNamespace.XML : kivi.HtmlNamespace.XLINK;
  }
};

/**
 * Set Attribute.
 *
 * If attribute name starts with '$', treat it as a special attribute.
 *
 * @param {!Element} node
 * @param {string} key
 * @param {string} value
 */
kivi.sync.setAttr = function(node, key, value) {
  if (key[0] !== '$') {
    node.setAttribute(key, value);
  } else {
    node.setAttributeNS(kivi.sync._getAttrNamespace(key), key.substring(1), value);
  }
};

/**
 * Remove Attribute.
 *
 * If attribute name starts with '$', treat it as a special attribute.
 *
 * @param {!Element} node
 * @param {string} key
 */
kivi.sync.removeAttr = function(node, key) {
  if (key[0] !== '$') {
    node.removeAttribute(key);
  } else {
    node.removeAttributeNS(kivi.sync._getAttrNamespace(key), key.substring(1));
  }
};

/**
 * Synchronize attributes with static shape.
 *
 * @param {?Object<string, string>} a Old attributes.
 * @param {?Object<string, string>} b New attributes.
 * @param {!Element} node
 */
kivi.sync.staticShapeAttrs = function(a, b, node) {
  var i, il;
  var key;
  var keys;
  var aValue;
  var bValue;

  keys = Object.keys(a);
  for (i = 0, il = keys.length; i < il; i++) {
    key = keys[i];
    aValue = a[key];
    bValue = b[key];
    if (aValue !== bValue) {
      kivi.sync.setAttr(node, key, bValue);
    }
  }
};

/**
 * Synchronize attributes with dynamic shape.
 *
 * @param {?Object<string, string>} a Old attributes.
 * @param {?Object<string, string>} b New attributes.
 * @param {!Element} node
 */
kivi.sync.dynamicShapeAttrs = function(a, b, node) {
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
        kivi.sync.removeAttr(node, keys[i]);
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
            kivi.sync.setAttr(node, key, bValue);
          }
        } else {
          kivi.sync.removeAttr(node, key);
        }
      }

      // Insert new attributes.
      keys = Object.keys(b);
      for (i = 0, il = keys.length; i < il; i++) {
        key = keys[i];
        if (!a.hasOwnProperty(key)) {
          kivi.sync.setAttr(node, key, b[key]);
        }
      }
    }
  } else if (b !== null) {
    // a is empty, insert all attributes from b.
    keys = Object.keys(b);
    for (i = 0, il = keys.length; i < il; i++) {
      key = keys[i];
      kivi.sync.setAttr(node, key, b[key]);
    }
  }
};
