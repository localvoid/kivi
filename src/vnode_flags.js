goog.provide('kivi.VNodeFlags');

/**
 * VNode Flags
 *
 * @enum {number}
 */
kivi.VNodeFlags = {
  /** Flag indicating that [kivi.VNode] is a [Text] node. */
  TEXT:         0x0001,
  /** Flag indicating that [kivi.VNode] is an [Element] node. */
  ELEMENT:      0x0002,
  /** Flag indicating that [kivi.VNode] is a [kivi.Component] node. */
  COMPONENT:    0x0004,
  /** Flag indicating that [kivi.VNode] is a root element of the [kivi.Component]. */
  ROOT:         0x0008,
  /** Flag indicating that [kivi.VNode] represents node in svg namespace. */
  SVG:          0x0010,
  /** Flag indicating that [kivi.VNode] should track similar children by keys. */
  TRACK_BY_KEY: 0x0020
};
