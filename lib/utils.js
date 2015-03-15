'use strict';

function shallowEq(a, b) {
  var key;
  for (key in a) {
    var bVal = b[key];
    if (bVal === void 0 || a[key] !== bVal) {
      return false;
    }
  }
  for (key in b) {
    if (!a.hasOwnProperty(key)) {
      return false;
    }
  }
  return true;
}

module.exports = {
  shallowEq: shallowEq
};
