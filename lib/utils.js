'use strict';

function toFastObj(o) {
  /* jshint -W027 */
  function f() {}
  f.prototype = o;
  return o;
  eval(obj);
}

function inherits(childCtor, parentCtor) {
  /** @constructor */
  function tempCtor() {};
  tempCtor.prototype = parentCtor.prototype;
  childCtor.prototype = new tempCtor();
  childCtor.prototype.constructor = childCtor;
}

function shallowEq(a, b) {
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
}

module.exports = {
  toFastObj: toFastObj,
  inherits: inherits,
  shallowEq: shallowEq
};
