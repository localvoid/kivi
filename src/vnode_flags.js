goog.provide('kivi.VNodeFlags');

/**
 * VNode Flags
 *
 * @enum {number}
 */
kivi.VNodeFlags = {
  /** [kivi.VNode] is a [Text] node. */
  TEXT:                         0x00001,
  /** [kivi.VNode] is an [Element] node. */
  ELEMENT:                      0x00002,
  /** [kivi.VNode] is a [kivi.Component] node. */
  COMPONENT:                    0x00004,
  /** [kivi.VNode] is a root element of the [kivi.Component]. */
  ROOT:                         0x00008,
  /** [kivi.VNode] represents node in svg namespace. */
  SVG:                          0x00010,
  /** [kivi.VNode] should track similar children by keys. */
  TRACK_BY_KEY:                 0x00020,
  /** Owner [kivi.Component] will be responsible for managing children lifecycle. */
  MANAGED_CONTAINER:            0x00040,
  /** Disable warnings in DEBUG mode when children shape is changing. */
  DISABLE_CHILDREN_SHAPE_ERROR: 0x01000,
  /**
   * Disable [kivi.VNode] freezing in DEBUG mode.
   *
   * One use case when it is quite useful, it is for ContentEditable editor.
   * We monitoring changes in DOM, and apply this changes to VNodes, so that
   * when we rerender text block, we don't touch properties that is already
   * up to date (prevents spellchecker flickering).
   */
  DISABLE_FREEZE:               0x02000,
  /**
   * [kivi.VNode] contains a Comment placeholder.
   *
   * Comment placeholder can be used to delay element appearance in animations.
   */
  COMMENT_PLACEHOLDER:          0x04000,
  /** [kivi.VNode] is rendered */
  DEBUG_IS_RENDERED:            0x10000,
  /** [kivi.VNode] is mounted */
  DEBUG_IS_MOUNTED:             0x20000
};
