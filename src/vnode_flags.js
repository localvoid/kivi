goog.provide('kivi.VNodeFlags');

/**
 * VNode Flags
 *
 * @enum {number}
 */
kivi.VNodeFlags = {
  /** [kivi.VNode] is a [Text] node. */
  TEXT:                         0x0001,
  /** [kivi.VNode] is an [Element] node. */
  ELEMENT:                      0x0002,
  /** [kivi.VNode] is a [kivi.Component] node. */
  COMPONENT:                    0x0004,
  /** [kivi.VNode] is a root element of the [kivi.Component]. */
  ROOT:                         0x0008,
  /** [kivi.VNode] represents node in svg namespace. */
  SVG:                          0x0010,
  /** [kivi.VNode] should track similar children by keys. */
  TRACK_BY_KEY:                 0x0020,
  /** Owner [kivi.Component] will be responsible for managing children lifecycle. */
  MANAGED_CONTAINER:            0x0040,
  /** Disable warnings in DEBUG mode when children shape is changing. */
  DISABLE_CHILDREN_SHAPE_ERROR: 0x1000,
  /**
   * Disable [kivi.VNode] freezing in DEBUG mode.
   *
   * One use case when it is quite useful, it is for ContentEditable editor.
   * We monitoring changes in DOM, and apply this changes to VNodes, so that
   * when we rerender text block, we don't touch properties that is already
   * up to date (prevents spellchecker flickering).
   */
  DISABLE_FREEZE:               0x2000
};
