goog.provide('kivi.VNodeDebugFlags');
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
  /** [kivi.VNode] is a [HTMLInputElement] that contains text value. */
  TEXT_INPUT_ELEMENT:           0x00100,
  /** [kivi.VNode] is a [HTMLInputElement] that contains boolean value. */
  CHECKED_INPUT_ELEMENT:        0x00200,
  /** [kivi.VNode] is a [HTMLInputElement]. */
  INPUT_ELEMENT:                0x00300,
  /**
   * [kivi.VNode] contains a Comment placeholder.
   *
   * Comment placeholder can be used to delay element appearance in animations.
   */
  COMMENT_PLACEHOLDER:          0x04000
};

/**
 * VNode Debug Flags
 *
 * @enum {number}
 */

kivi.VNodeDebugFlags = {
  /** [kivi.VNode] is rendered */
  RENDERED:                     0x00001,
  /** [kivi.VNode] is mounted */
  MOUNTED:                      0x00002,
  /** [kivi.VNode] is attached */
  ATTACHED:                     0x00004,
  /** [kivi.VNode] is detached */
  DETACHED:                     0x00008,
  /** [kivi.VNode] is disposed */
  DISPOSED:                     0x00010,
  /** Disable warnings in DEBUG mode when children shape is changing. */
  DISABLE_CHILDREN_SHAPE_ERROR: 0x00020,
  /**
   * Disable [kivi.VNode] freezing in DEBUG mode.
   *
   * One use case when it is quite useful, it is for ContentEditable editor.
   * We monitoring changes in DOM, and apply this changes to VNodes, so that
   * when we rerender text block, we don't touch properties that is already
   * up to date (prevents spellchecker flickering).
   */
  DISABLE_FREEZE:               0x00040
};