goog.provide('kivi.ContainerManager');
goog.provide('kivi.ContainerManagerDescriptor');

/**
 * Container Manager Descriptor
 *
 * @template S
 * @constructor
 * @struct
 * @final
 */
kivi.ContainerManagerDescriptor = function() {
  /**
   * Insert child hook.
   *
   * @type {?function (!kivi.ContainerManager<S>, !kivi.VNode, !kivi.VNode, ?Node, !kivi.Component)}
   */
  this.insertChild = null;

  /**
   * Replace child hook.
   *
   * @type {?function (!kivi.ContainerManager<S>, !kivi.VNode, !kivi.VNode, !kivi.VNode, !kivi.Component)}
   */
  this.replaceChild = null;

  /**
   * Move child hook.
   *
   * @type {?function (!kivi.ContainerManager<S>, !kivi.VNode, !kivi.VNode, ?Node, !kivi.Component)}
   */
  this.moveChild = null;

  /**
   * Remove child hook.
   *
   * @type {?function (!kivi.ContainerManager<S>, !kivi.VNode, !kivi.VNode, !kivi.Component)}
   */
  this.removeChild = null;
};

/**
 * Create container manager descriptor.
 *
 * @returns {!kivi.ContainerManagerDescriptor}
 */
kivi.ContainerManagerDescriptor.create = function() {
  return new kivi.ContainerManagerDescriptor();
};

/**
 * Container Manager.
 *
 * @template S
 * @param {!kivi.ContainerManagerDescriptor<S>} descriptor
 * @param {*} state
 * @constructor
 * @struct
 * @final
 */
kivi.ContainerManager = function(descriptor, state) {
  this.descriptor = descriptor;
  this.state = state;
};

/**
 * Create container manager.
 *
 * @param {!kivi.ContainerManagerDescriptor} descriptor
 * @param {*} state
 * @returns {kivi.ContainerManager}
 */
kivi.ContainerManager.create = function(descriptor, state) {
  return new kivi.ContainerManager(descriptor, state);
};