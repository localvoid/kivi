goog.provide('kivi.utils');

/**
 * Shallow Equal
 *
 * @param {!Object} a
 * @param {!Object} b
 * @returns {boolean}
 */
kivi.utils.shallowEqual = function(a, b) {
  var i;
  var key;
  var keys;

  keys = Object.keys(a);
  for (i = 0; i < keys.length; i++) {
    key = keys[i];
    if (!b.hasOwnProperty(key) || a[key] !== b[key]) {
      return false;
    }
  }

  keys = Object.keys(b);
  for (i = 0; i < keys.length; i++) {
    if (!a.hasOwnProperty(key)) {
      return false;
    }
  }
  return true;
};
