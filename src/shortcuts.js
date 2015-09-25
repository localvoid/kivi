goog.provide('kivi.injectComponent');
goog.provide('kivi.mountComponent');
goog.provide('kivi.scheduleMacrotask');
goog.provide('kivi.scheduleMicrotask');
goog.require('kivi.Component');
goog.require('kivi.scheduler.instance');

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
 * @param {*=} opt_context
 */
kivi.scheduleMicrotask = function(cb, opt_context) {
  kivi.scheduler.instance.scheduleMicrotask(cb, opt_context);
};

/**
 * Shortcut for `kivi.scheduler.instance.scheduleMacrotask`
 *
 * @param {!function()} cb
 * @param {*=} opt_context
 */
kivi.scheduleMacrotask = function(cb, opt_context) {
  kivi.scheduler.instance.scheduleMacrotask(cb, opt_context);
};
