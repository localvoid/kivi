goog.provide('kivi.dispatcher.logger');

/**
 * Print signal.
 *
 * @param {string} name
 * @param {*} props
 */
kivi.dispatcher.logger.printSignal = function(name, props) {
  console.log.info('*SIGNAL*', name, props);
};
