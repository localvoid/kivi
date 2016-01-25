goog.provide('kivi.ComponentFlags');

/**
 * Component Flags.
 *
 * @enum {number}
 */
kivi.ComponentFlags = {
  DISPOSED:            0x0001,
  ATTACHED:            0x0002,
  MOUNTING:            0x0004,
  DIRTY:               0x0008,
  UPDATE_EACH_FRAME:   0x0010, // Component should be updated on next frame.
  IN_UPDATE_QUEUE:     0x0020, // Component is registered in update queue.
  RECYCLED:            kivi.ENABLE_COMPONENT_RECYCLING ? 0x0040 : 0,
  SVG:                 0x0100,
  SHOULD_UPDATE_FLAGS: 0x000A
};
