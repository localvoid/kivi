goog.provide('kivi.sync.attrs');
goog.provide('kivi.sync.removeAttr');
goog.provide('kivi.sync.setAttr');

/**
 * Namespaced Attribute should be set with setAttributeNS call.
 *
 * @typedef {{name: string, namespace: kivi.HtmlNamespace}}
 * @protected
 */
kivi.sync._NamespacedAttr;

/**
 * Namespaced Attributes.
 *
 * Namespaced attribute names should start with '$' symbol, so we can easily recognize them from simple
 * attributes.
 *
 * @const {!Object<string, !kivi.sync._NamespacedAttr>}
 * @protected
 */
kivi.sync._NamespacedAttrs = {
  '$xlink:actuate': {
    name: 'xlink:actuate',
    namespace: kivi.HtmlNamespace.XLINK
  },
  '$xlink:arcrole': {
    name: 'xlink:arcrole',
    namespace: kivi.HtmlNamespace.XLINK
  },
  '$xlink:href': {
    name: 'xlink:href',
    namespace: kivi.HtmlNamespace.XLINK
  },
  '$xlink:role': {
    name: 'xlink:role',
    namespace: kivi.HtmlNamespace.XLINK
  },
  '$xlink:show': {
    name: 'xlink:show',
    namespace: kivi.HtmlNamespace.XLINK
  },
  '$xlink:title': {
    name: 'xlink:title',
    namespace: kivi.HtmlNamespace.XLINK
  },
  '$xlink:type': {
    name: 'xlink:type',
    namespace: kivi.HtmlNamespace.XLINK
  },
  '$xml:base': {
    name: 'xml:base',
    namespace: kivi.HtmlNamespace.XML
  },
  '$xml:lang': {
    name: 'xml:lang',
    namespace: kivi.HtmlNamespace.XML
  },
  '$xml:space': {
    name: 'xml:space',
    namespace: kivi.HtmlNamespace.XML
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
    var details = kivi.sync._NamespacedAttrs[key];
    if (kivi.DEBUG) {
      if (details === void 0) {
        throw new Error('Invalid namespaced attribute $' + key);
      }
    }
    node.setAttributeNS(details.namespace, details.name, value);
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
    var details = kivi.sync._NamespacedAttrs[key];
    if (kivi.DEBUG) {
      if (details === void 0) {
        throw new Error('Invalid namespaced attribute $' + key);
      }
    }
    node.removeAttributeNS(details.namespace, details.name);
  }
};

/**
 * Synchronize attributes.
 *
 * @param {?Object<string, string>} a Old attributes.
 * @param {?Object<string, string>} b New attributes.
 * @param {!Element} node
 */
kivi.sync.attrs = function(a, b, node) {
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
