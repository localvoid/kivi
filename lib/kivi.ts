export {
  SchedulerTask,
  clock,
  scheduleMicrotask,
  scheduleMacrotask,
  currentFrame,
  nextFrame,
  enableThrottling,
  disableThrottling,
  isMounting,
} from "./scheduler";

export { VModel } from "./vmodel";

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
  XTagElement,
  ComponentDescriptor,
  Component,
  injectComponent,
  mountComponent,
} from "./component";

export {
  SelectorFn,
  VNodeFlags,
  VModelFlags,
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
