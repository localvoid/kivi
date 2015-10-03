/**
 * kivi - library for building web UIs.
 */

goog.provide('kivi');

/**
 * @define {boolean} DEBUG is provided as a convenience so that debugging code
 * that should not be included in a production js_binary can be easily stripped
 * by specifying --define kivi.DEBUG=false to the JSCompiler.
 */
goog.define('kivi.DEBUG', true);

/**
 * @define {boolean} DISABLE_COMPONENT_RECYCLING is provided so it easy to
 * disable recycling for benchmarks.
 */
goog.define('kivi.DISABLE_COMPONENT_RECYCLING', false);

if (kivi.DEBUG) {
  console.info('kivi debug mode: on');
  console.info('kivi component recycling: ', kivi.DISABLE_COMPONENT_RECYCLING ? 'off' : 'on');
}
