/**
 * kivi - library for building web UIs.
 */

goog.provide('kivi');
goog.provide('kivi.createComponent');
goog.provide('kivi.createElement');
goog.provide('kivi.createRoot');
goog.provide('kivi.createText');
goog.provide('kivi.injectComponent');
goog.provide('kivi.mountComponent');
goog.require('kivi.Component');
goog.require('kivi.VNode');
goog.require('kivi.scheduler.instance');

/**
 * @define {boolean} DEBUG is provided as a convenience so that debugging code
 * that should not be included in a production js_binary can be easily stripped
 * by specifying --define kivi.DEBUG=false to the JSCompiler.
 */
goog.define('kivi.DEBUG', true);

if (kivi.DEBUG) {
  console.info('kivi debug mode: on');
}

/**
 * Create a [kivi.VNode] representing a [Text] node.
 *
 * @param {string} content
 * @return {!kivi.VNode}
 */
kivi.createText = function(content) {
  return new kivi.VNode(kivi.VNodeFlags.TEXT, null, content);
};

/**
 * Create a [kivi.VNode] representing a [Element] node.
 *
 * @param {string} tag
 * @return {!kivi.VNode}
 */
kivi.createElement = function(tag) {
  return new kivi.VNode(kivi.VNodeFlags.ELEMENT, tag, null);
};

/**
 * Create a [kivi.VNode] representing a [SVGElement] node.
 *
 * @param {string} tag
 * @return {!kivi.VNode}
 */
kivi.createSvgElement = function(tag) {
  return new kivi.VNode(kivi.VNodeFlags.ELEMENT | kivi.VNodeFlags.SVG, tag, null);
};

/**
 * Create a [kivi.VNode] representing a [kivi.Component] node.
 *
 * @param {!kivi.CDescriptor} descriptor
 * @param {*=} opt_data
 * @return {!kivi.VNode}
 */
kivi.createComponent = function(descriptor, opt_data) {
  if (opt_data === void 0) opt_data = null;
  return new kivi.VNode(kivi.VNodeFlags.COMPONENT, descriptor, opt_data);
};

/**
 * Create a [kivi.VNode] representing a root node.
 *
 * @return {!kivi.VNode}
 */
kivi.createRoot = function() {
  return new kivi.VNode(kivi.VNodeFlags.ROOT, null, null);
};

/**
 * Instantiate and inject component into container.
 *
 * @param {!kivi.CDescriptor} descriptor
 * @param {*} data
 * @param {!Element} container
 * @returns {!kivi.Component}
 */
kivi.injectComponent = function(descriptor, data, container) {
  var c = kivi.Component.create(descriptor, data, null, null);
  container.appendChild(c.element);
  c.update();
  return c;
};

/**
 * Instantiate and mount component on top of existing html.
 *
 * @param {!kivi.CDescriptor} descriptor
 * @param {*} data
 * @param {!Element} element
 * @return {!kivi.Component}
 */
kivi.mountComponent = function(descriptor, data, element) {
  var c = kivi.Component.mount(descriptor, data, null, null, element);
  c.update();
  return c;
};

/**
 * Shortcut for `kivi.scheduler.instance.nextFrame()`
 *
 * @returns {!kivi.scheduler.Frame}
 */
kivi.nextFrame = function() {
  return kivi.scheduler.instance.nextFrame();
};

/**
 * Shortcut for `kivi.scheduler.instance.currentFrame()`
 *
 * @returns {!kivi.scheduler.Frame}
 */
kivi.currentFrame = function() {
  return kivi.scheduler.instance.currentFrame();
};

/**
 * Shortcut for `kivi.scheduler.instance.scheduleMicrotask`
 *
 * @param {!function()} cb
 */
kivi.scheduleMicrotask = function(cb) {
  kivi.scheduler.instance.scheduleMicrotask(cb);
};

/**
 * Shortcut for `kivi.scheduler.instance.scheduleMacrotask`
 *
 * @param {!function()} cb
 */
kivi.scheduleMacrotask = function(cb) {
  kivi.scheduler.instance.scheduleMacrotask(cb);
};
