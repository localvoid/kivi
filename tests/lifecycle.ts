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

export const LifecycleComponent = new ComponentDescriptor<any, LifecycleState, any>()
  .init((c) => {
    c.state = new LifecycleState();
    c.state.checkInit = c.state.lifecycleCounter++;
  })
  .update((c) => { c.state.checkUpdate = c.state.lifecycleCounter++; })
  .attached((c) => { c.state.checkAttached = c.state.lifecycleCounter++; })
  .detached((c) => { c.state.checkDetached = c.state.lifecycleCounter++; })
  .disposed((c) => { c.state.checkDisposed = c.state.lifecycleCounter++; });
