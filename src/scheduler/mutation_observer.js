goog.provide('kivi.scheduler.MutationObserver');

/**
 * MutationObserver helper for microtasks.
 *
 * @param {!Function} cb
 * @constructor
 * @struct
 * @final
 */
kivi.scheduler.MutationObserver = function(cb) {
  this._observer = new window.MutationObserver(cb);
  this._node = document.createTextNode('');
  this._observer.observe(this._node, {characterData: true});
  this._toggle = 0;
};

/**
 * Request a next tick.
 */
kivi.scheduler.MutationObserver.prototype.requestNextTick = function() {
  this._toggle ^= 1;
  this._node.data = this._toggle.toString();
};
