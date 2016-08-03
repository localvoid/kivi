export {
  SchedulerTask,
  clock,
  scheduleMicrotask,
  scheduleMacrotask,
  currentFrame,
  nextFrame,
  isMounting,
} from "./scheduler";

export { ElementDescriptor } from "./element_descriptor";

export {
  InvalidatorSubscription,
  Invalidator,
} from "./invalidator";

export {
  VNode,
  createVText,
  createVElement,
  createVSvgElement,
  createVRoot,
} from "./vnode";

export {
  ComponentDescriptorRegistry,
  ComponentRootElement,
  ComponentDescriptor,
  Component,
  injectComponent,
  mountComponent,
} from "./component";

export {
  SelectorFn,
  VNodeFlags,
  ElementDescriptorFlags,
  ComponentDescriptorFlags,
  ComponentFlags,
  getTagName,
  getClassName,
  matchesWithAncestors,
} from "./misc";

export {
  normalizeVNodes,
} from "./utils";

if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
  console.info("KIVI_DEBUG: enabled");
  if ("<@KIVI_COMPONENT_RECYCLING@>" === "COMPONENT_RECYCLING_ENABLED") {
    console.info("KIVI_COMPONENT_RECYCLING: enabled");
  } else {
    console.info("KIVI_COMPONENT_RECYCLING: disabled");
  }
}
