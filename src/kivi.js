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

if (kivi.DEBUG) {
  console.info('kivi debug mode: on');
}
