goog.provide('kivi.dispatcher.Signal');
goog.require('kivi.dispatcher.logger');

/**
 * Signal.
 *
 * @param {string} name
 * @template S
 * @constructor
 * @struct
 * @final
 */
kivi.dispatcher.Signal = function(name) {
  if (kivi.DEBUG || kivi.ENABLE_DISPATCHER_LOGGING) {
    this.name = name;
  }
  /** @type {!function(S)|!Array<!function(S)>} */
  this.handlers = null;
};

/**
 * Create an Action.
 *
 * @param {string} name
 * @template S
 * @returns {!kivi.dispatcher.Signal<S>}
 */
kivi.dispatcher.Signal.create = function(name) {
  return new kivi.dispatcher.Signal(name);
};

/**
 * Add a handler.
 *
 * @param {!function(S)} handler
 */
kivi.dispatcher.Signal.prototype.addHandler = function(handler) {
  if (this.handlers === null) {
    this.handlers = handler;
  } else if (this.handlers.constructor === Array) {
    this.handlers.push(handler);
  } else {
    this.handlers = [this.handlers];
  }
};

/**
 * Emit signal.
 *
 * @param {S} props
 */
kivi.dispatcher.Signal.prototype.emit = function(props) {
  if (kivi.ENABLE_DISPATCHER_LOGGING) {
    kivi.dispatcher.logger.printSignal(this.name, props);
  }
  if (this.handlers !== null) {
    if (this.handlers.constructor === Array) {
      for (var i = 0; i < this.handlers.length; i++) {
        this.handlers[i](props);
      }
    } else {
      this.handlers(props);
    }
  }
};
