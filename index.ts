export * from './lib/scheduler';
export * from './lib/invalidator';
export * from './lib/vmodel';
export * from './lib/vnode';
export * from './lib/container_manager';
export * from './lib/component';

if ('<@KIVI_DEBUG@>' !== 'KIVI_DEBUG_DISABLED') {
  console.info('KIVI_DEBUG: enabled');
  if ('<@KIVI_COMPONENT_RECYCLING@>' === 'KIVI_COMPONENT_RECYCLING_ENABLED') {
    console.info('KIVI_COMPONENT_RECYCLING: enabled');
  } else {
    console.info('KIVI_COMPONENT_RECYCLING: disabled');
  }
}
