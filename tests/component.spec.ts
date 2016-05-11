import {ComponentDescriptor} from "../lib/component";
import {LifecycleComponent} from "./lifecycle";
import {VModel} from "../lib/vmodel";

describe("Component", () => {
  describe("create dom", () => {
    it("should create element with default tag: div", () => {
      const d = new ComponentDescriptor<any, any>();
      const c = d.createComponent();
      expect(c.element.tagName).toBe("DIV");
      expect(c.element).isPrototypeOf(HTMLElement);
    });

    it("should create element with tag span", () => {
      const d = new ComponentDescriptor<any, any>()
        .tagName("span");
      const c = d.createComponent();
      expect(c.element.tagName).toBe("SPAN");
      expect(c.element).isPrototypeOf(HTMLElement);
    });

    it("should create svg element with tag a", () => {
      const d = new ComponentDescriptor<any, any>()
        .tagName("a")
        .svg();
      const c = d.createComponent();
      expect(c.element).isPrototypeOf(SVGElement);
    });

    it("should create canvas element", () => {
      const d = new ComponentDescriptor<any, any>()
        .canvas();
      const c = d.createComponent();
      expect(c.element.tagName).toBe("CANVAS");
      expect(c.element).isPrototypeOf(HTMLCanvasElement);
      expect(c.get2DContext()).isPrototypeOf(CanvasRenderingContext2D);
    });

    it("should create element from vmodel", () => {
      const m = new VModel("span");
      const d = new ComponentDescriptor<any, any>()
        .vModel(m);
      const c = d.createComponent();
      expect(c.element.tagName).toBe("SPAN");
      expect(c.element).isPrototypeOf(HTMLElement);
    });

    it("should have depth 0 if no parent", () => {
      const d = new ComponentDescriptor<any, any>();
      const c = d.createComponent();
      expect(c.depth).toBe(0);
    });

    it("should have depth 1 if parent have depth 0", () => {
      const d = new ComponentDescriptor<any, any>();
      const p = d.createComponent();
      const c = d.createComponent(p);
      expect(c.depth).toBe(1);
    });

    it("should have depth 2 if parent have depth 1", () => {
      const d = new ComponentDescriptor<any, any>();
      const gp = d.createComponent();
      const p = d.createComponent(gp);
      const c = d.createComponent(p);
      expect(c.depth).toBe(2);
    });

    it("should have parent assigned to parent component", () => {
      const d = new ComponentDescriptor<any, any>();
      const p = d.createComponent();
      const c = d.createComponent(p);
      expect(c.parent).toBe(p);
    });

    it("should have mtime 0 when created", () => {
      const d = new ComponentDescriptor<any, any>();
      const c = d.createComponent();
      expect(c.mtime).toBe(0);
    });
  });

  describe("lifecycle methods", () => {
    it("should execute init hook when component is created", () => {
      const c = LifecycleComponent.createComponent();
      expect(c.state.checkInit).toBe(0);
      expect(c.state.checkUpdate).toBe(-1);
      expect(c.state.checkAttached).toBe(-1);
      expect(c.state.checkDetached).toBe(-1);
      expect(c.state.checkDisposed).toBe(-1);
    });

    it("shouldn't execute update hook on update in detached state", () => {
      const c = LifecycleComponent.createComponent();
      c.update();
      expect(c.state.checkInit).toBe(0);
      expect(c.state.checkUpdate).toBe(-1);
      expect(c.state.checkAttached).toBe(-1);
      expect(c.state.checkDetached).toBe(-1);
      expect(c.state.checkDisposed).toBe(-1);
    });

    it("should execute update hook on update in attached state", () => {
      const c = LifecycleComponent.createComponent();
      c.attach();
      c.update();
      expect(c.state.checkInit).toBe(0);
      expect(c.state.checkUpdate).toBe(2);
      expect(c.state.checkAttached).toBe(1);
      expect(c.state.checkDetached).toBe(-1);
      expect(c.state.checkDisposed).toBe(-1);
    });

    it("should execute detached hook when component is detached", () => {
      const c = LifecycleComponent.createComponent();
      c.attach();
      c.detach();
      expect(c.state.checkInit).toBe(0);
      expect(c.state.checkUpdate).toBe(-1);
      expect(c.state.checkAttached).toBe(1);
      expect(c.state.checkDetached).toBe(2);
      expect(c.state.checkDisposed).toBe(-1);
    });

    it("should execute detached and disposed hook when component is disposed", () => {
      const c = LifecycleComponent.createComponent();
      c.attach();
      c.dispose();
      expect(c.state.checkInit).toBe(0);
      expect(c.state.checkUpdate).toBe(-1);
      expect(c.state.checkAttached).toBe(1);
      expect(c.state.checkDetached).toBe(2);
      expect(c.state.checkDisposed).toBe(3);
    });
  });
});
