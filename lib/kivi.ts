export * from "./scheduler";
export * from "./invalidator";
export * from "./vmodel";
export * from "./vnode";
export * from "./container_manager";
export * from "./component";
export {
  VNodeFlags, VModelFlags, ComponentDescriptorFlags, ComponentFlags, InvalidatorSubscriptionFlags,
  RenderFlags, flattenVNodes, getBackRef
} from "./misc";

if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
  console.info("KIVI_DEBUG: enabled");
  if ("<@KIVI_COMPONENT_RECYCLING@>" === "COMPONENT_RECYCLING_ENABLED") {
    console.info("KIVI_COMPONENT_RECYCLING: enabled");
  } else {
    console.info("KIVI_COMPONENT_RECYCLING: disabled");
  }
}
