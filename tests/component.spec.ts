import {LifecycleComponent} from './lifecycle';

describe('Component', () => {
  describe('lifecycle methods', () => {
    it('should execute init hook when component is created', () => {
      const c = LifecycleComponent.createComponent(null);
      expect(c.state.checkInit).toBe(0);
      expect(c.state.checkUpdate).toBe(-1);
      expect(c.state.checkInvalidated).toBe(-1);
      expect(c.state.checkAttached).toBe(-1);
      expect(c.state.checkDetached).toBe(-1);
      expect(c.state.checkDisposed).toBe(-1);
    });

    it('shouldn\'t execute update hook on update in detached state', () => {
      const c = LifecycleComponent.createComponent(null);
      c.update();
      expect(c.state.checkInit).toBe(0);
      expect(c.state.checkUpdate).toBe(-1);
      expect(c.state.checkInvalidated).toBe(-1);
      expect(c.state.checkAttached).toBe(-1);
      expect(c.state.checkDetached).toBe(-1);
      expect(c.state.checkDisposed).toBe(-1);
    });

    it('should execute update hook on update in attached state', () => {
      const c = LifecycleComponent.createComponent(null);
      c.attach();
      c.update();
      expect(c.state.checkInit).toBe(0);
      expect(c.state.checkUpdate).toBe(2);
      expect(c.state.checkInvalidated).toBe(-1);
      expect(c.state.checkAttached).toBe(1);
      expect(c.state.checkDetached).toBe(-1);
      expect(c.state.checkDisposed).toBe(-1);
    });

    it('should execute detached hook when component is detached', () => {
      const c = LifecycleComponent.createComponent(null);
      c.attach();
      c.detach();
      expect(c.state.checkInit).toBe(0);
      expect(c.state.checkUpdate).toBe(-1);
      expect(c.state.checkInvalidated).toBe(-1);
      expect(c.state.checkAttached).toBe(1);
      expect(c.state.checkDetached).toBe(2);
      expect(c.state.checkDisposed).toBe(-1);
    });

    it('should execute detached and disposed hook when component is disposed', () => {
      const c = LifecycleComponent.createComponent(null);
      c.attach();
      c.dispose();
      expect(c.state.checkInit).toBe(0);
      expect(c.state.checkUpdate).toBe(-1);
      expect(c.state.checkInvalidated).toBe(-1);
      expect(c.state.checkAttached).toBe(1);
      expect(c.state.checkDetached).toBe(2);
      expect(c.state.checkDisposed).toBe(3);
    });

    it('should execute invalidated hook when component is invalidated', () => {
      const c = LifecycleComponent.createComponent(null);
      c.attach();
      c.update();
      c.invalidate();
      expect(c.state.checkInit).toBe(0);
      expect(c.state.checkUpdate).toBe(2);
      expect(c.state.checkInvalidated).toBe(3);
      expect(c.state.checkAttached).toBe(1);
      expect(c.state.checkDetached).toBe(-1);
      expect(c.state.checkDisposed).toBe(-1);
    });
  });
});
