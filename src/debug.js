goog.provide('kivi.debug');
goog.provide('kivi.debug.printError');

/**
 * Print error to the console and throw local exception, so that we can break
 * on caught errors.
 *
 * @param {string} message
 */
kivi.debug.printError = function(message) {
  console.error(message);
  try {
    throw new Error(message);
  } catch(_) {}
};
