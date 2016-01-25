goog.provide('kivi.CDescriptorFlags');

/**
 * CDescriptor Flags.
 *
 * @enum {number}
 */
kivi.CDescriptorFlags = {
  SVG:             0x0001,
  WRAPPER:         0x0002,
  RECYCLE_ENABLED: kivi.ENABLE_COMPONENT_RECYCLING ? 0x0004 : 0
};
