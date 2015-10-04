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
 * @define {boolean} ENABLE_COMPONENT_RECYCLING enable component recycling, it
 * is disabled by default because it easy to make a mistake when dealing with
 * recycled components. Make sure that you understand how component lifecycle
 * works, and clean up internal state when component is recycled.
 */
goog.define('kivi.ENABLE_COMPONENT_RECYCLING', false);

if (kivi.DEBUG) {
  console.info('kivi debug mode: on');
  console.info('kivi component recycling: ', kivi.ENABLE_COMPONENT_RECYCLING ? 'on' : 'off');
}
