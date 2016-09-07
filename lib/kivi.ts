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
} from "./vnode";

export {
  ComponentDescriptorRegistry,
  ComponentRootElement,
  DelegatedEventController,
  ComponentDescriptor,
  Component,
  injectComponent,
  mountComponent,
} from "./component";

export {
  VNodeFlags,
  ElementDescriptorFlags,
  ComponentDescriptorFlags,
  ComponentFlags,
  matchesWithAncestors,
} from "./misc";

export {
  normalizeVNodes,
} from "./utils";

if ("<@KIVI_DEBUG@>" as string !== "DEBUG_DISABLED") {
  console.info("KIVI_DEBUG: enabled");
  if ("<@KIVI_COMPONENT_RECYCLING@>" as string === "COMPONENT_RECYCLING_ENABLED") {
    console.info("KIVI_COMPONENT_RECYCLING: enabled");
  } else {
    console.info("KIVI_COMPONENT_RECYCLING: disabled");
  }
}
