export * from "./scheduler";
export * from "./invalidator";
export * from "./vmodel";
export * from "./vnode";
export * from "./container_manager";
export * from "./component";
export {Reconciler, reconciler} from "./reconciler";
export * from "./actor";
export {
  VNodeFlags, VModelFlags, ComponentDescriptorFlags, ComponentFlags, InvalidatorSubscriptionFlags,
  RenderFlags, filterVNodes, getBackRef, getTagName, getClassName, getMessageGroupName, getMessageName,
} from "./misc";

if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
  console.info("KIVI_DEBUG: enabled");
  if ("<@KIVI_COMPONENT_RECYCLING@>" === "COMPONENT_RECYCLING_ENABLED") {
    console.info("KIVI_COMPONENT_RECYCLING: enabled");
  } else {
    console.info("KIVI_COMPONENT_RECYCLING: disabled");
  }
}
