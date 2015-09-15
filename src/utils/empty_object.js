goog.provide('kivi.utils.EMPTY_OBJECT');
goog.require('kivi');

/** @const */
kivi.utils.EMPTY_OBJECT = {};

if (kivi.DEBUG) {
  Object.freeze(kivi.utils.EMPTY_OBJECT);
}
