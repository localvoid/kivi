import {ComponentDescriptor} from "../lib/kivi";

export class LifecycleState {
  lifecycleCounter = 0;
  checkInit = -1;
  checkUpdate = -1;
  checkInvalidated = -1;
  checkAttached = -1;
  checkDetached = -1;
  checkDisposed = -1;
}

export const LifecycleComponent = new ComponentDescriptor<number, LifecycleState>()
  .createState((c) => new LifecycleState())
  .init((c, props, state) => {
    state.checkInit = state.lifecycleCounter++;
  })
  .update((c, props, state) => { state.checkUpdate = state.lifecycleCounter++; })
  .attached((c, props, state) => { state.checkAttached = state.lifecycleCounter++; })
  .detached((c, props, state) => { state.checkDetached = state.lifecycleCounter++; })
  .disposed((c, props, state) => { state.checkDisposed = state.lifecycleCounter++; });
