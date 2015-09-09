goog.provide('kivi.scheduler.PostMessage');

/**
 * PostMessage helper for macrotasks.
 *
 * @param {!Function} cb
 * @constructor
 * @struct
 * @final
 */
kivi.scheduler.PostMessage = function(cb) {
  this._message = '__pms' + Math.random().toString();
  var message = this._message;

  /** @param {!Event} e */
  var handler = function(e) {
    e = /** @type {!MessageEvent<string>} */(e);
    if (e.source === window && e.data === message) {
      cb();
    }
  };
  window.addEventListener('message', handler);
};

/**
 * Request a next tick.
 */
kivi.scheduler.PostMessage.prototype.requestNextTick = function() {
  window.postMessage(this._message, '*');
};
