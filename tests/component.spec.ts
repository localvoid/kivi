import {ComponentDescriptor} from "../lib/component";
import {LifecycleComponent} from "./lifecycle";
import {ElementDescriptor} from "../lib/element_descriptor";

const expect = chai.expect;

describe("Component", () => {
  describe("create dom", () => {
    it("should create element with default tag: div", () => {
      const d = new ComponentDescriptor<any, any>();
      const c = d.createRootComponent();
      expect(c.element.tagName).to.equal("DIV");
      expect(c.element instanceof HTMLElement).to.be.true;
    });

    it("should create element with tag span", () => {
      const d = new ComponentDescriptor<any, any>()
        .tagName("span");
      const c = d.createRootComponent();
      expect(c.element.tagName).to.equal("SPAN");
      expect(c.element instanceof HTMLElement).to.be.true;
    });

    it("should create svg element with tag a", () => {
      const d = new ComponentDescriptor<any, any>()
        .tagName("a")
        .svg();
      const c = d.createRootComponent();
      expect(c.element instanceof SVGElement).to.be.true;
    });

    it("should create canvas element", () => {
      const d = new ComponentDescriptor<any, any>()
        .canvas();
      const c = d.createRootComponent();
      expect(c.element.tagName).to.equal("CANVAS");
      expect(c.element).isPrototypeOf(HTMLCanvasElement);
      expect(c.get2DContext() instanceof CanvasRenderingContext2D).to.be.true;
    });

    it("should create element from ElementDescriptor", () => {
      const d = new ComponentDescriptor<any, any>()
        .tagName(new ElementDescriptor("span"));
      const c = d.createRootComponent();
      expect(c.element.tagName).to.equal("SPAN");
      expect(c.element instanceof HTMLElement).to.be.true;
    });

    it("should have depth 0 if no parent", () => {
      const d = new ComponentDescriptor<any, any>();
      const c = d.createRootComponent();
      expect(c.depth).to.equal(0);
    });

    it("should have depth 1 if parent have depth 0", () => {
      const d = new ComponentDescriptor<any, any>();
      const p = d.createRootComponent();
      const c = d.createComponent(p);
      expect(c.depth).to.equal(1);
    });

    it("should have depth 2 if parent have depth 1", () => {
      const d = new ComponentDescriptor<any, any>();
      const gp = d.createRootComponent();
      const p = d.createComponent(gp);
      const c = d.createComponent(p);
      expect(c.depth).to.equal(2);
    });

    it("should have mtime 0 when created", () => {
      const d = new ComponentDescriptor<any, any>();
      const c = d.createRootComponent();
      expect(c.mtime).to.equal(0);
    });
  });

  describe("lifecycle methods", () => {
    it("should execute init hook when component is created", () => {
      const c = LifecycleComponent.createRootComponent();
      expect(c.state!.checkInit).to.equal(0);
      expect(c.state!.checkUpdate).to.equal(-1);
      expect(c.state!.checkAttached).to.equal(-1);
      expect(c.state!.checkDetached).to.equal(-1);
      expect(c.state!.checkDisposed).to.equal(-1);
    });

    it("shouldn't execute update hook on update in detached state", () => {
      const c = LifecycleComponent.createRootComponent();
      c.update();
      expect(c.state!.checkInit).to.equal(0);
      expect(c.state!.checkUpdate).to.equal(-1);
      expect(c.state!.checkAttached).to.equal(-1);
      expect(c.state!.checkDetached).to.equal(-1);
      expect(c.state!.checkDisposed).to.equal(-1);
    });

    it("should execute update hook on update in attached state", () => {
      const c = LifecycleComponent.createRootComponent();
      c.attach();
      c.update();
      expect(c.state!.checkInit).to.equal(0);
      expect(c.state!.checkUpdate).to.equal(2);
      expect(c.state!.checkAttached).to.equal(1);
      expect(c.state!.checkDetached).to.equal(-1);
      expect(c.state!.checkDisposed).to.equal(-1);
    });

    it("should execute detached hook when component is detached", () => {
      const c = LifecycleComponent.createRootComponent();
      c.attach();
      c.detach();
      expect(c.state!.checkInit).to.equal(0);
      expect(c.state!.checkUpdate).to.equal(-1);
      expect(c.state!.checkAttached).to.equal(1);
      expect(c.state!.checkDetached).to.equal(2);
      expect(c.state!.checkDisposed).to.equal(-1);
    });

    it("should execute detached and disposed hook when component is disposed", () => {
      const c = LifecycleComponent.createRootComponent();
      c.attach();
      c.dispose();
      expect(c.state!.checkInit).to.equal(0);
      expect(c.state!.checkUpdate).to.equal(-1);
      expect(c.state!.checkAttached).to.equal(1);
      expect(c.state!.checkDetached).to.equal(2);
      expect(c.state!.checkDisposed).to.equal(3);
    });
  });
});
