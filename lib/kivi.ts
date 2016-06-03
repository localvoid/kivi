export { scheduler } from "./scheduler";
export { reconciler } from "./reconciler";
export { VModel } from "./vmodel";

export {
  InvalidatorSubscription,
  Invalidator,
} from "./invalidator";

export {
  VNode,
  vNodeInstantiate,
  vNodeRender,
  vNodeMount,
  vNodeCreateCommentPlaceholder,
  vNodeAttach,
  vNodeDetach,
  vNodeDispose,
  insertVNodeBefore,
  replaceVNode,
  moveVNode,
  removeVNode,
  createVText,
  createVElement,
  createVSvgElement,
  createVRoot,
} from "./vnode";

export {
  ContainerManagerDescriptor,
  ContainerManager,
} from "./container_manager";

export {
  ComponentDescriptorRegistry,
  XTagElement,
  ComponentDescriptor,
  Component,
  injectComponent,
  mountComponent,
} from "./component";

export {
  MessageGroupRegistry,
  ActorRegistry,
  MessageFlags,
  ActorFlags,
  getMessageGroupName,
  getMessageName,
  getMessagePayload,
  acquireMessageFlag,
  MessageGroup,
  MessageDescriptor,
  Message,
  ActorDescriptor,
  Actor,
  ActorLink,
  SystemMessageGroup,
  ActorDisposedMessage,
} from "./actor";

export {
  VNodeFlags,
  VModelFlags,
  ComponentDescriptorFlags,
  ComponentFlags,
  InvalidatorSubscriptionFlags,
  RenderFlags,
  filterVNodes,
  getTagName,
  getClassName,
  matchesWithAncestors,
} from "./misc";

if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
  console.info("KIVI_DEBUG: enabled");
  if ("<@KIVI_COMPONENT_RECYCLING@>" === "COMPONENT_RECYCLING_ENABLED") {
    console.info("KIVI_COMPONENT_RECYCLING: enabled");
  } else {
    console.info("KIVI_COMPONENT_RECYCLING: disabled");
  }
}
