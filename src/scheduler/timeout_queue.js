goog.provide('kivi.scheduler.TimeoutQueue');
goog.require('kivi.scheduler.instance');

/**
 * Timeout Handler
 *
 * @param {number} timestamp
 * @param {!Function} cb
 * @param {*=} opt_ctx
 * @constructor
 * @struct
 * @final
 */
kivi.scheduler.TimeoutHandler = function(timestamp, cb, opt_ctx) {
  /** @package {?kivi.scheduler.TimeoutHandler} */
  this._prev = null;
  /** @package {?kivi.scheduler.TimeoutHandler} */
  this._next = null;
  this.timestamp = timestamp;
  this.cb = cb;
  this.ctx = opt_ctx;
};

/**
 * Static Timeout Queue.
 *
 * @param {number} timeout
 * @constructor
 * @struct
 * @final
 */
kivi.scheduler.TimeoutQueue = function(timeout) {
  this.timeout = timeout;
  /** @type {?kivi.scheduler.TimeoutHandler} */
  this._first = null;
  /** @type {?kivi.scheduler.TimeoutHandler} */
  this._last = null;
  this._timeoutId = -1;

  var self = this;
  this._handler = function() {
    var now = kivi.scheduler.instance.time;
    var h = self._first;
    while (h !== null) {
      h._prev = null;
      if (now >= h.timestamp) {
        if (h.ctx === void 0) {
          h.cb();
        } else {
          h.cb.call(h.ctx);
        }

        var tmp = h._next;
        h._next = null;
        h = tmp;
      } else {
        break;
      }
    }

    if (h === null) {
      self._first = null;
      self._last = null;
      self._timeoutId = -1;
    } else {
      self._first = h;
      self._timeoutId = setTimeout(self._handler, h.timestamp - now);
    }
  };
};

/**
 * Wait for next browser timeout.
 *
 * @private
 */
kivi.scheduler.TimeoutQueue.prototype._requestTimeout = function() {
  if (this._timeoutId === -1) {
    this._timeoutId = setTimeout(this._handler, this.timeout);
  }
};

/**
 * Add callback to Timeout Queue.
 *
 * @param {!Function} cb
 * @param {*=} opt_ctx
 * @returns {!kivi.scheduler.TimeoutHandler}
 */
kivi.scheduler.TimeoutQueue.prototype.add = function(cb, opt_ctx) {
  var h = new kivi.scheduler.TimeoutHandler(kivi.scheduler.instance.time + this.timeout, cb, opt_ctx);
  if (this._first === null) {
    this._first = h;
  } else {
    h._prev = this._last;
    this._last._next = h;
  }
  this._last = h;

  this._requestTimeout();

  return h;
};

/**
 * Cancel handler.
 *
 * @param {!kivi.scheduler.TimeoutHandler} handler
 */
kivi.scheduler.TimeoutQueue.prototype.cancel = function(handler) {
  if (handler._prev === null) {
    this._first = handler._next;
  } else {
    handler._prev._next = handler._next;
  }
  if (handler._next === null) {
    this._last = handler._prev;
  } else {
    handler._next._prev = handler._prev;
  }
};
