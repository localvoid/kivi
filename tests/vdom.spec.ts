import {LifecycleComponent} from "./lifecycle";
import {XlinkNamespace, RenderFlags} from "../lib/misc";
import {VNode, createVElement, createVText, createVSvgElement} from "../lib/vnode";
import {Component} from "../lib/component";

function injectVNode(parent: DocumentFragment, node: VNode, nextRef?: Element): void {
  node.create(undefined);
  parent.insertBefore(node.ref, nextRef);
  node.render(undefined, 0);
}

function gen(item: any, keys: boolean): VNode|VNode[] {
  if (typeof item === "number") {
    return keys ? createVText(item.toString()).key(item.toString()) : createVText(item.toString());
  } else if (Array.isArray(item)) {
    let result: VNode[] = [];
    for (let i = 0; i < item.length; i++) {
      result.push(gen(item[i], keys) as VNode);
    }
    return result;
  } else {
    let e = createVElement("div").key(item.key);
    if (keys) {
      e.trackByKeyChildren(gen(item.children, keys) as VNode[]);
    } else {
      e.children(gen(item.children, keys) as VNode[]);
    }
    return e;
  }
}

function checkInnerHtmlEquals(ax: VNode[], bx: VNode[], cx: VNode[], keys: boolean): void {
  const a = createVElement("div");
  const b = createVElement("div");
  const c = createVElement("div");

  if (keys) {
    a.trackByKeyChildren(ax);
    b.trackByKeyChildren(bx);
    c.trackByKeyChildren(cx);
  } else {
    a.children(ax).disableChildrenShapeError();
    b.children(bx).disableChildrenShapeError();
    c.children(cx).disableChildrenShapeError();
  }

  const aDiv = document.createElement("div");
  const bDiv = document.createElement("div");
  injectVNode(aDiv, a, undefined);
  injectVNode(bDiv, b, undefined);

  a.sync(c, undefined, 0);

  expect(aDiv.innerHTML).toBe(bDiv.innerHTML);
}

describe("VNode", () => {
  describe("render", () => {
    it("should create empty div", () => {
      const f = document.createDocumentFragment();
      const a = createVElement("div");
      injectVNode(f, a, undefined);
      expect((f.firstChild as Element).tagName).toBe("DIV");
    });

    it("should create empty span", () => {
      const f = document.createDocumentFragment();
      const a = createVElement("span");
      injectVNode(f, a, undefined);
      expect((f.firstChild as Element).tagName).toBe("SPAN");
    });

    it("should create div with 1 static shape attribute", () => {
      const f = document.createDocumentFragment();
      const a = createVElement("div");
      a.attrs({
        a: "1",
      });
      injectVNode(f, a, undefined);
      expect((f.firstChild as Element).hasAttributes()).toBeTruthy();
      expect((f.firstChild as Element).getAttribute("a")).toBe("1");
    });

    it("should create div with 1 static shape attributes", () => {
      const f = document.createDocumentFragment();
      const a = createVElement("div");
      a.attrs({
        a: "1",
        b: "2",
      });
      injectVNode(f, a, undefined);
      expect((f.firstChild as Element).hasAttributes()).toBeTruthy();
      expect((f.firstChild as Element).getAttribute("a")).toBe("1");
      expect((f.firstChild as Element).getAttribute("b")).toBe("2");
    });

    it("should create div with 1 dynamic shape attribute", () => {
      const f = document.createDocumentFragment();
      const a = createVElement("div");
      a.dynamicShapeAttrs({
        a: "1",
      });
      injectVNode(f, a, undefined);
      expect((f.firstChild as Element).hasAttributes()).toBeTruthy();
      expect((f.firstChild as Element).getAttribute("a")).toBe("1");
    });

    it("should create div with 2 dynamic shape attributes", () => {
      const f = document.createDocumentFragment();
      const a = createVElement("div").dynamicShapeAttrs({
        a: "1",
        b: "2",
      });
      injectVNode(f, a, undefined);
      expect((f.firstChild as Element).hasAttributes()).toBeTruthy();
      expect((f.firstChild as Element).getAttribute("a")).toBe("1");
      expect((f.firstChild as Element).getAttribute("b")).toBe("2");
    });

    it("should create div with 1 static shape property", () => {
      const f = document.createDocumentFragment();
      const a = createVElement("div");
      a.props({
        xtag: "1",
      });
      injectVNode(f, a, undefined);
      expect(((f.firstChild as any) as {xtag: string}).xtag).toBe("1");
    });

    it("should create div with 2 static shape properties", () => {
      const f = document.createDocumentFragment();
      const a = createVElement("div");
      a.props({
        xtag1: "1",
        xtag2: "2",
      });
      injectVNode(f, a, undefined);
      expect(((f.firstChild as any) as {xtag1: string}).xtag1).toBe("1");
      expect(((f.firstChild as any) as {xtag2: string}).xtag2).toBe("2");
    });

    it("should create div with 1 dynamic shape property", () => {
      const f = document.createDocumentFragment();
      const a = createVElement("div");
      a.dynamicShapeProps({
        xtag: "1",
      });
      injectVNode(f, a, undefined);
      expect(((f.firstChild as any) as {xtag: string}).xtag).toBe("1");
    });

    it("should create div with 2 dynamic shape properties", () => {
      const f = document.createDocumentFragment();
      const a = createVElement("div");
      a.dynamicShapeProps({
        xtag1: "1",
        xtag2: "2",
      });
      injectVNode(f, a, undefined);
      expect(((f.firstChild as any) as {xtag1: string}).xtag1).toBe("1");
      expect(((f.firstChild as any) as {xtag2: string}).xtag2).toBe("2");
    });

    it("should create div with style", () => {
      const f = document.createDocumentFragment();
      const a = createVElement("div").style("top: 10px");
      injectVNode(f, a, undefined);
      expect((f.firstChild as HTMLElement).style.top).toBe("10px");
    });

    it("should create div with className", () => {
      const f = document.createDocumentFragment();
      const a = createVElement("div").className("a");
      injectVNode(f, a, undefined);
      expect((f.firstChild as Element).classList.length).toBe(1);
      expect((f.firstChild as Element).classList[0]).toBe("a");
    });

    it("should create svg element with style", () => {
      const f = document.createDocumentFragment();
      const a = createVSvgElement("circle").style("top: 10px");
      injectVNode(f, a, undefined);
      expect((f.firstChild as SVGElement).getAttribute("style")).toContain("10px");
    });

    it("should create svg element with className", () => {
      const f = document.createDocumentFragment();
      const a = createVSvgElement("circle").className("a");
      injectVNode(f, a, undefined);
      expect((f.firstChild as SVGElement).getAttribute("class")).toBe("a");
    });

    it("should create svg element with xlink:href attribute", () => {
      const f = document.createDocumentFragment();
      const a = createVSvgElement("circle").attrs({"xlink:href": "a"});
      injectVNode(f, a, undefined);
      expect((f.firstChild as SVGElement).getAttributeNS(XlinkNamespace, "href")).toBe("a");
    });

    it("should create div with 1 child", () => {
      const f = document.createDocumentFragment();
      const a = createVElement("div").children([createVElement("span")]);
      injectVNode(f, a, undefined);
      expect((f.firstChild as Element).childNodes.length).toBe(1);
    });

    it("should create div with 2 children", () => {
      const f = document.createDocumentFragment();
      const a = createVElement("div").children([
        createVElement("span"),
        createVElement("span"),
      ]);
      injectVNode(f, a, undefined);
      expect((f.firstChild as Element).childNodes.length).toBe(2);
    });

    it("should create div with child \"abc\"", () => {
      const f = document.createDocumentFragment();
      const a = createVElement("div").children("abc");
      injectVNode(f, a, undefined);
      expect((f.firstChild as Element).childNodes.length).toBe(1);
      expect((f.firstChild as Element).firstChild.nodeValue).toBe("abc");
    });
  });

  describe("sync", () => {
    describe("static shape attrs", () => {
      it("undefined => undefined", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div");
        const b = createVElement("div");
        injectVNode(f, a, undefined);
        a.sync(b, undefined, 0);
        expect((f.firstChild as Element).hasAttributes()).toBeFalsy();
      });

      it("undefined => {} should throw exception", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div");
        const b = createVElement("div").attrs({});
        injectVNode(f, a, undefined);
        expect(() => a.sync(b, undefined, 0)).toThrow();
      });

      it("{} => undefined should throw exception", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").attrs({});
        const b = createVElement("div");
        injectVNode(f, a, undefined);
        expect(() => a.sync(b, undefined, 0)).toThrow();
      });

      it("{} => {}", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").attrs({});
        const b = createVElement("div").attrs({});
        injectVNode(f, a, undefined);
        a.sync(b, undefined, 0);
        expect((f.firstChild as Element).hasAttributes()).toBeFalsy();
      });

      it("undefined => {a: 1} should throw exception", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div");
        const b = createVElement("div").attrs({ a: "1" });
        injectVNode(f, a, undefined);
        expect(() => a.sync(b, undefined, 0)).toThrow();
      });

      it("{} => {a: 1} should throw exception", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").attrs({});
        const b = createVElement("div").attrs({ a: "1" });
        injectVNode(f, a, undefined);
        expect(() => a.sync(b, undefined, 0)).toThrow();
      });

      it("{} => {a: 1, b: 2}", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").attrs({});
        const b = createVElement("div").attrs({ a: "1", b: "2" });
        injectVNode(f, a, undefined);
        expect(() => a.sync(b, undefined, 0)).toThrow();
      });

      it("{a: 1} => undefined", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").attrs({ a: "1" });
        const b = createVElement("div");
        injectVNode(f, a, undefined);
        expect(() => a.sync(b, undefined, 0)).toThrow();
      });

      it("{a: 1} => {}", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").attrs({ a: "1" });
        const b = createVElement("div").attrs({});
        injectVNode(f, a, undefined);
        expect(() => a.sync(b, undefined, 0)).toThrow();
      });

      it("{a: 1, b: 2} => {}", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").attrs({ a: "1", b: "2" });
        const b = createVElement("div").attrs({});
        injectVNode(f, a, undefined);
        expect(() => a.sync(b, undefined, 0)).toThrow();
      });

      it("{a: 1} => {b: 2}", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").attrs({ a: "1" });
        const b = createVElement("div").attrs({ b: "2" });
        injectVNode(f, a, undefined);
        expect(() => a.sync(b, undefined, 0)).toThrow();
      });

      it("{a: 1} => {a: 10}", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").attrs({ a: "1" });
        const b = createVElement("div").attrs({ a: "10" });
        injectVNode(f, a, undefined);
        a.sync(b, undefined, 0);
        expect((f.firstChild as Element).hasAttributes()).toBeTruthy();
        expect((f.firstChild as Element).getAttribute("a")).toBe("10");
      });

      it("{a: 1, b: 2} => {a: 10, b: 20}", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").attrs({ a: "1", b: "2" });
        const b = createVElement("div").attrs({ a: "10", b: "20" });
        injectVNode(f, a, undefined);
        a.sync(b, undefined, 0);
        expect((f.firstChild as Element).hasAttributes()).toBeTruthy();
        expect((f.firstChild as Element).getAttribute("a")).toBe("10");
        expect((f.firstChild as Element).getAttribute("b")).toBe("20");
      });
    });

    describe("dynamic shape attrs", () => {
      it("undefined => {}", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").dynamicShapeAttrs();
        const b = createVElement("div").dynamicShapeAttrs({});
        injectVNode(f, a, undefined);
        a.sync(b, undefined, 0);
        expect((f.firstChild as Element).hasAttributes()).toBeFalsy();
      });

      it("{} => undefined", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").dynamicShapeAttrs({});
        const b = createVElement("div").dynamicShapeAttrs();
        injectVNode(f, a, undefined);
        a.sync(b, undefined, 0);
        expect((f.firstChild as Element).hasAttributes()).toBeFalsy();
      });

      it("{} => {}", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").dynamicShapeAttrs({});
        const b = createVElement("div").dynamicShapeAttrs({});
        injectVNode(f, a, undefined);
        a.sync(b, undefined, 0);
        expect((f.firstChild as Element).hasAttributes()).toBeFalsy();
      });

      it("undefined => {a: 1}", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").dynamicShapeAttrs();
        const b = createVElement("div").dynamicShapeAttrs({ a: "1" });
        injectVNode(f, a, undefined);
        a.sync(b, undefined, 0);
        expect((f.firstChild as Element).hasAttributes()).toBeTruthy();
        expect((f.firstChild as Element).getAttribute("a")).toBe("1");
      });

      it("{} => {a: 1}", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").dynamicShapeAttrs({});
        const b = createVElement("div").dynamicShapeAttrs({ a: "1" });
        injectVNode(f, a, undefined);
        a.sync(b, undefined, 0);
        expect((f.firstChild as Element).hasAttributes()).toBeTruthy();
        expect((f.firstChild as Element).getAttribute("a")).toBe("1");
      });

      it("{} => {a: 1, b: 2}", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").dynamicShapeAttrs({});
        const b = createVElement("div").dynamicShapeAttrs({ a: "1", b: "2" });
        injectVNode(f, a, undefined);
        a.sync(b, undefined, 0);
        expect((f.firstChild as Element).hasAttributes()).toBeTruthy();
        expect((f.firstChild as Element).getAttribute("a")).toBe("1");
        expect((f.firstChild as Element).getAttribute("b")).toBe("2");
      });

      it("{} => {a: 1, b: 2, c: 3}", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").dynamicShapeAttrs({});
        const b = createVElement("div").dynamicShapeAttrs({ a: "1", b: "2", c: "3" });
        injectVNode(f, a, undefined);
        a.sync(b, undefined, 0);
        expect((f.firstChild as Element).hasAttributes()).toBeTruthy();
        expect((f.firstChild as Element).getAttribute("a")).toBe("1");
        expect((f.firstChild as Element).getAttribute("b")).toBe("2");
        expect((f.firstChild as Element).getAttribute("c")).toBe("3");
      });

      it("{a: 1} => undefined", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").dynamicShapeAttrs({ a: "1" });
        const b = createVElement("div").dynamicShapeAttrs();
        injectVNode(f, a, undefined);
        a.sync(b, undefined, 0);
        expect((f.firstChild as Element).hasAttributes()).toBeFalsy();
      });

      it("{a: 1} => {}", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").dynamicShapeAttrs({ a: "1" });
        const b = createVElement("div").dynamicShapeAttrs({});
        injectVNode(f, a, undefined);
        a.sync(b, undefined, 0);
        expect((f.firstChild as Element).hasAttributes()).toBeFalsy();
      });

      it("{a: 1, b: 2} => {}", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").dynamicShapeAttrs({ a: "1", b: "2" });
        const b = createVElement("div").dynamicShapeAttrs({});
        injectVNode(f, a, undefined);
        a.sync(b, undefined, 0);
        expect((f.firstChild as Element).hasAttributes()).toBeFalsy();
      });

      it("{a: 1} => {b: 2}", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").dynamicShapeAttrs({ a: "1" });
        const b = createVElement("div").dynamicShapeAttrs({ b: "2" });
        injectVNode(f, a, undefined);
        a.sync(b, undefined, 0);
        expect((f.firstChild as Element).hasAttributes()).toBeTruthy();
        expect((f.firstChild as Element).hasAttribute("a")).toBeFalsy();
        expect((f.firstChild as Element).getAttribute("b")).toBe("2");
      });

      it("{a: 1, b: 2} => {c: 3: d: 4}", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").dynamicShapeAttrs({ a: "1", b: "2" });
        const b = createVElement("div").dynamicShapeAttrs({ c: "3", d: "4" });
        injectVNode(f, a, undefined);
        a.sync(b, undefined, 0);
        expect((f.firstChild as Element).hasAttributes()).toBeTruthy();
        expect((f.firstChild as Element).hasAttribute("a")).toBeFalsy();
        expect((f.firstChild as Element).hasAttribute("b")).toBeFalsy();
        expect((f.firstChild as Element).getAttribute("c")).toBe("3");
        expect((f.firstChild as Element).getAttribute("d")).toBe("4");
      });

      it("{a: 1} => {a: 10}", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").dynamicShapeAttrs({ a: "1" });
        const b = createVElement("div").dynamicShapeAttrs({ a: "10" });
        injectVNode(f, a, undefined);
        a.sync(b, undefined, 0);
        expect((f.firstChild as Element).hasAttributes()).toBeTruthy();
        expect((f.firstChild as Element).getAttribute("a")).toBe("10");
      });

      it("{a: 1, b: 2} => {a: 10, b: 20}", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").dynamicShapeAttrs({ a: "1", b: "2" });
        const b = createVElement("div").dynamicShapeAttrs({ a: "10", b: "20" });
        injectVNode(f, a, undefined);
        a.sync(b, undefined, 0);
        expect((f.firstChild as Element).hasAttributes()).toBeTruthy();
        expect((f.firstChild as Element).getAttribute("a")).toBe("10");
        expect((f.firstChild as Element).getAttribute("b")).toBe("20");
      });
    });

    describe("static shape props", () => {
      it("undefined => {} should throw exception", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div");
        const b = createVElement("div").props({});
        injectVNode(f, a, undefined);
        expect(() => a.sync(b, undefined, 0)).toThrow();
      });

      it("{} => undefined should throw exception", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").props({});
        const b = createVElement("div");
        injectVNode(f, a, undefined);
        expect(() => a.sync(b, undefined, 0)).toThrow();
      });

      it("{} => {}", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").props({});
        const b = createVElement("div").props({});
        injectVNode(f, a, undefined);
        a.sync(b, undefined, 0);
      });

      it("undefined => {a: 1} should throw exception", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div");
        const b = createVElement("div").props({ a: "1" });
        injectVNode(f, a, undefined);
        expect(() => a.sync(b, undefined, 0)).toThrow();
      });

      it("{} => {a: 1} should throw exception", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").props({});
        const b = createVElement("div").props({ a: "1" });
        injectVNode(f, a, undefined);
        expect(() => a.sync(b, undefined, 0)).toThrow();
      });

      it("{} => {a: 1, b: 2}", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").props({});
        const b = createVElement("div").props({ a: "1", b: "2" });
        injectVNode(f, a, undefined);
        expect(() => a.sync(b, undefined, 0)).toThrow();
      });

      it("{a: 1} => undefined", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").props({ a: "1" });
        const b = createVElement("div");
        injectVNode(f, a, undefined);
        expect(() => a.sync(b, undefined, 0)).toThrow();
      });

      it("{a: 1} => {}", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").props({ a: "1" });
        const b = createVElement("div").props({});
        injectVNode(f, a, undefined);
        expect(() => a.sync(b, undefined, 0)).toThrow();
      });

      it("{a: 1, b: 2} => {}", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").props({ a: "1", b: "2" });
        const b = createVElement("div").props({});
        injectVNode(f, a, undefined);
        expect(() => a.sync(b, undefined, 0)).toThrow();
      });

      it("{a: 1} => {b: 2}", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").props({ a: "1" });
        const b = createVElement("div").props({ b: "2" });
        injectVNode(f, a, undefined);
        expect(() => a.sync(b, undefined, 0)).toThrow();
      });

      it("{a: 1} => {a: 10}", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").props({ a: "1" });
        const b = createVElement("div").props({ a: "10" });
        injectVNode(f, a, undefined);
        a.sync(b, undefined, 0);
        expect(((f.firstChild as any) as {a: string}).a).toBe("10");
      });

      it("{a: 1, b: 2} => {a: 10, b: 20}", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").props({ a: "1", b: "2" });
        const b = createVElement("div").props({ a: "10", b: "20" });
        injectVNode(f, a, undefined);
        a.sync(b, undefined, 0);
        expect(((f.firstChild as any) as {a: string}).a).toBe("10");
        expect(((f.firstChild as any) as {b: string}).b).toBe("20");
      });
    });

    describe("dynamic shape props", () => {
      it("undefined => {}", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").dynamicShapeProps();
        const b = createVElement("div").dynamicShapeProps({});
        injectVNode(f, a, undefined);
        expect(() => a.sync(b, undefined, 0)).not.toThrow();
      });

      it("{} => undefined", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").dynamicShapeProps({});
        const b = createVElement("div").dynamicShapeProps();
        injectVNode(f, a, undefined);
        expect(() => a.sync(b, undefined, 0)).not.toThrow();
      });

      it("{} => {}", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").dynamicShapeProps({});
        const b = createVElement("div").dynamicShapeProps({});
        injectVNode(f, a, undefined);
        expect(() => a.sync(b, undefined, 0)).not.toThrow();
      });

      it("undefined => {a: 1}", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").dynamicShapeProps();
        const b = createVElement("div").dynamicShapeProps({ a: "1" });
        injectVNode(f, a, undefined);
        a.sync(b, undefined, 0);
        expect(((f.firstChild as any) as {a: string}).a).toBe("1");
      });

      it("{} => {a: 1}", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").dynamicShapeProps({});
        const b = createVElement("div").dynamicShapeProps({ a: "1" });
        injectVNode(f, a, undefined);
        a.sync(b, undefined, 0);
        expect(((f.firstChild as any) as {a: string}).a).toBe("1");
      });

      it("{} => {a: 1, b: 2}", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").dynamicShapeProps({});
        const b = createVElement("div").dynamicShapeProps({ a: "1", b: "2" });
        injectVNode(f, a, undefined);
        a.sync(b, undefined, 0);
        expect(((f.firstChild as any) as {a: string}).a).toBe("1");
        expect(((f.firstChild as any) as {b: string}).b).toBe("2");
      });

      it("{} => {a: 1, b: 2, c: 3}", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").dynamicShapeProps({});
        const b = createVElement("div").dynamicShapeProps({ a: "1", b: "2", c: "3" });
        injectVNode(f, a, undefined);
        a.sync(b, undefined, 0);
        expect(((f.firstChild as any) as {a: string}).a).toBe("1");
        expect(((f.firstChild as any) as {b: string}).b).toBe("2");
        expect(((f.firstChild as any) as {c: string}).c).toBe("3");
      });

      it("{a: 1} => undefined", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").dynamicShapeProps({ a: "1" });
        const b = createVElement("div").dynamicShapeProps();
        injectVNode(f, a, undefined);
        a.sync(b, undefined, 0);
        expect(((f.firstChild as any) as {a: string}).a).toBeUndefined();
      });

      it("{a: 1} => {}", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").dynamicShapeProps({ a: "1" });
        const b = createVElement("div").dynamicShapeProps({});
        injectVNode(f, a, undefined);
        a.sync(b, undefined, 0);
        expect(((f.firstChild as any) as {a: string}).a).toBeUndefined();
      });

      it("{a: 1, b: 2} => {}", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").dynamicShapeProps({ a: "1", b: "2" });
        const b = createVElement("div").dynamicShapeProps({});
        injectVNode(f, a, undefined);
        a.sync(b, undefined, 0);
        expect(((f.firstChild as any) as {a: string}).a).toBeUndefined();
        expect(((f.firstChild as any) as {b: string}).b).toBeUndefined();
      });

      it("{a: 1} => {b: 2}", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").dynamicShapeProps({ a: "1" });
        const b = createVElement("div").dynamicShapeProps({ b: "2" });
        injectVNode(f, a, undefined);
        a.sync(b, undefined, 0);
        expect(((f.firstChild as any) as {a: string}).a).toBeUndefined();
        expect(((f.firstChild as any) as {b: string}).b).toBe("2");
      });

      it("{a: 1, b: 2} => {c: 3: d: 4}", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").dynamicShapeProps({ a: "1", b: "2" });
        const b = createVElement("div").dynamicShapeProps({ c: "3", d: "4" });
        injectVNode(f, a, undefined);
        a.sync(b, undefined, 0);
        expect(((f.firstChild as any) as {a: string}).a).toBeUndefined();
        expect(((f.firstChild as any) as {b: string}).b).toBeUndefined();
        expect(((f.firstChild as any) as {c: string}).c).toBe("3");
        expect(((f.firstChild as any) as {d: string}).d).toBe("4");
      });

      it("{a: 1} => {a: 10}", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").dynamicShapeProps({ a: "1" });
        const b = createVElement("div").dynamicShapeProps({ a: "10" });
        injectVNode(f, a, undefined);
        a.sync(b, undefined, 0);
        expect(((f.firstChild as any) as {a: string}).a).toBe("10");
      });

      it("{a: 1, b: 2} => {a: 10, b: 20}", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").dynamicShapeProps({ a: "1", b: "2" });
        const b = createVElement("div").dynamicShapeProps({ a: "10", b: "20" });
        injectVNode(f, a, undefined);
        a.sync(b, undefined, 0);
        expect(((f.firstChild as any) as {a: string}).a).toBe("10");
        expect(((f.firstChild as any) as {b: string}).b).toBe("20");
      });
    });

    describe("className", () => {
      it("undefined => undefined", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div");
        const b = createVElement("div");
        injectVNode(f, a, undefined);
        a.sync(b, undefined, 0);
        expect((f.firstChild as Element).classList.length).toBe(0);
      });

      it("undefined => [1]", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div");
        const b = createVElement("div").className("1");
        injectVNode(f, a, undefined);
        a.sync(b, undefined, 0);
        expect((f.firstChild as Element).classList.length).toBe(1);
        expect((f.firstChild as Element).classList[0]).toBe("1");
      });

      it("[1] => undefined", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").className("1");
        const b = createVElement("div");
        injectVNode(f, a, undefined);
        a.sync(b, undefined, 0);
        expect((f.firstChild as Element).classList.length).toBe(0);
      });

      it("undefined => [1, 2]", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div");
        const b = createVElement("div").className("1 2");
        injectVNode(f, a, undefined);
        a.sync(b, undefined, 0);
        expect((f.firstChild as Element).classList.length).toBe(2);
        expect((f.firstChild as Element).classList[0]).toBe("1");
        expect((f.firstChild as Element).classList[1]).toBe("2");
      });
    });

    describe("style", () => {
      it("undefined => undefined", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div");
        const b = createVElement("div");
        injectVNode(f, a, undefined);
        a.sync(b, undefined, 0);
        expect((f.firstChild as HTMLElement).style.cssText).toBe("");
      });

      it("undefined => {top: 10px}", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div");
        const b = createVElement("div").style("top: 10px");
        injectVNode(f, a, undefined);
        a.sync(b, undefined, 0);
        expect((f.firstChild as HTMLElement).style.top).toBe("10px");
      });

      it("{top: 10px} => undefined", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div");
        const b = createVElement("div");
        a.style("top: 10px");
        injectVNode(f, a, undefined);
        a.sync(b, undefined, 0);
        expect((f.firstChild as HTMLElement).style.top).toBe("");
      });

      it("undefined => {top: 10px, left: 20px}", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div");
        const b = createVElement("div").style("top: 10px; left: 20px");
        injectVNode(f, a, undefined);
        a.sync(b, undefined, 0);
        expect((f.firstChild as HTMLElement).style.top).toBe("10px");
        expect((f.firstChild as HTMLElement).style.left).toBe("20px");
      });
    });

    describe("children", () => {
      const TESTS = [
        [[0], [0]],
        [[0, 1, 2], [0, 1, 2]],

        [[], [1]],
        [[], [4, 9]],
        [[], [9, 3, 6, 1, 0]],

        [[999], [1]],
        [[999], [1, 999]],
        [[999], [999, 1]],
        [[999], [4, 9, 999]],
        [[999], [999, 4, 9]],
        [[999], [9, 3, 6, 1, 0, 999]],
        [[999], [999, 9, 3, 6, 1, 0]],
        [[999], [0, 999, 1]],
        [[999], [0, 3, 999, 1, 4]],
        [[999], [0, 999, 1, 4, 5]],

        [[998, 999], [1, 998, 999]],
        [[998, 999], [998, 999, 1]],
        [[998, 999], [998, 1, 999]],
        [[998, 999], [1, 2, 998, 999]],
        [[998, 999], [998, 999, 1, 2]],
        [[998, 999], [1, 998, 999, 2]],
        [[998, 999], [1, 998, 2, 999, 3]],
        [[998, 999], [1, 4, 998, 2, 5, 999, 3, 6]],
        [[998, 999], [1, 998, 2, 999]],
        [[998, 999], [998, 1, 999, 2]],
        [[998, 999], [1, 2, 998, 3, 4, 999]],
        [[998, 999], [998, 1, 2, 999, 3, 4]],
        [[998, 999], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 998, 999]],
        [[998, 999], [998, 999, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9]],
        [[998, 999], [0, 1, 2, 3, 4, 998, 999, 5, 6, 7, 8, 9]],
        [[998, 999], [0, 1, 2, 998, 3, 4, 5, 6, 999, 7, 8, 9]],
        [[998, 999], [0, 1, 2, 3, 4, 998, 5, 6, 7, 8, 9, 999]],
        [[998, 999], [998, 0, 1, 2, 3, 4, 999, 5, 6, 7, 8, 9]],

        [[1], []],
        [[1, 2], [2]],
        [[1, 2], [1]],
        [[1, 2, 3], [2, 3]],
        [[1, 2, 3], [1, 2]],
        [[1, 2, 3], [1, 3]],
        [[1, 2, 3, 4, 5], [2, 3, 4, 5]],
        [[1, 2, 3, 4, 5], [1, 2, 3, 4]],
        [[1, 2, 3, 4, 5], [1, 2, 4, 5]],

        [[1, 2], []],
        [[1, 2, 3], [3]],
        [[1, 2, 3], [1]],
        [[1, 2, 3, 4], [3, 4]],
        [[1, 2, 3, 4], [1, 2]],
        [[1, 2, 3, 4], [1, 4]],
        [[1, 2, 3, 4, 5, 6], [2, 3, 4, 5]],
        [[1, 2, 3, 4, 5, 6], [2, 3, 5, 6]],
        [[1, 2, 3, 4, 5, 6], [1, 2, 3, 5]],
        [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [2, 3, 4, 5, 6, 7, 8, 9]],
        [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [0, 1, 2, 3, 4, 5, 6, 7]],
        [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 2, 3, 4, 6, 7, 8, 9]],
        [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [0, 1, 2, 3, 4, 6, 7, 8]],
        [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [0, 1, 2, 4, 6, 7, 8, 9]],

        [[0, 1], [1, 0]],
        [[0, 1, 2, 3], [3, 2, 1, 0]],
        [[0, 1, 2, 3, 4], [1, 2, 3, 4, 0]],
        [[0, 1, 2, 3, 4], [4, 0, 1, 2, 3]],
        [[0, 1, 2, 3, 4], [1, 0, 2, 3, 4]],
        [[0, 1, 2, 3, 4], [2, 0, 1, 3, 4]],
        [[0, 1, 2, 3, 4], [0, 1, 4, 2, 3]],
        [[0, 1, 2, 3, 4], [0, 1, 3, 4, 2]],
        [[0, 1, 2, 3, 4], [0, 1, 3, 2, 4]],
        [[0, 1, 2, 3, 4, 5, 6], [2, 1, 0, 3, 4, 5, 6]],
        [[0, 1, 2, 3, 4, 5, 6], [0, 3, 4, 1, 2, 5, 6]],
        [[0, 1, 2, 3, 4, 5, 6], [0, 2, 3, 5, 6, 1, 4]],
        [[0, 1, 2, 3, 4, 5, 6], [0, 1, 5, 3, 2, 4, 6]],
        [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [8, 1, 3, 4, 5, 6, 0, 7, 2, 9]],
        [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [9, 5, 0, 7, 1, 2, 3, 4, 6, 8]],

        [[0, 1], [2, 1, 0]],
        [[0, 1], [1, 0, 2]],
        [[0, 1, 2], [3, 0, 2, 1]],
        [[0, 1, 2], [0, 2, 1, 3]],
        [[0, 1, 2], [0, 2, 3, 1]],
        [[0, 1, 2], [1, 2, 3, 0]],
        [[0, 1, 2, 3, 4], [5, 4, 3, 2, 1, 0]],
        [[0, 1, 2, 3, 4], [5, 4, 3, 6, 2, 1, 0]],
        [[0, 1, 2, 3, 4], [5, 4, 3, 6, 2, 1, 0, 7]],

        [[0, 1, 2], [1, 0]],
        [[2, 0, 1], [1, 0]],
        [[7, 0, 1, 8, 2, 3, 4, 5, 9], [7, 5, 4, 8, 3, 2, 1, 0]],
        [[7, 0, 1, 8, 2, 3, 4, 5, 9], [5, 4, 8, 3, 2, 1, 0, 9]],
        [[7, 0, 1, 8, 2, 3, 4, 5, 9], [7, 5, 4, 3, 2, 1, 0, 9]],
        [[7, 0, 1, 8, 2, 3, 4, 5, 9], [5, 4, 3, 2, 1, 0, 9]],
        [[7, 0, 1, 8, 2, 3, 4, 5, 9], [5, 4, 3, 2, 1, 0]],

        [[0], [1]],
        [[0], [1, 2]],
        [[0, 2], [1]],
        [[0, 2], [1, 2]],
        [[0, 2], [2, 1]],
        [[0, 1, 2], [3, 4, 5]],
        [[0, 1, 2], [2, 4, 5]],
        [[0, 1, 2, 3, 4, 5], [6, 7, 8, 9, 10, 11]],
        [[0, 1, 2, 3, 4, 5], [6, 1, 7, 3, 4, 8]],
        [[0, 1, 2, 3, 4, 5], [6, 7, 3, 8]],

        [[0, 1, 2], [3, 2, 1]],
        [[0, 1, 2], [2, 1, 3]],
        [[1, 2, 0], [2, 1, 3]],
        [[1, 2, 0], [3, 2, 1]],
        [[0, 1, 2, 3, 4, 5], [6, 1, 3, 2, 4, 7]],
        [[0, 1, 2, 3, 4, 5], [6, 1, 7, 3, 2, 4]],
        [[0, 1, 2, 3, 4, 5], [6, 7, 3, 2, 4]],
        [[0, 2, 3, 4, 5], [6, 1, 7, 3, 2, 4]],

        [[{ key: 0, children: [0] }],
          [{ key: 0, children: [] }]],

        [[0, 1, { children: [0], key: 2 }],
          [{ key: 2, children: [] }]],

        [[{ key: 0, children: [] }],
          [1, 2, { key: 0, children: [0] }]],

        [[0, { key: 1, children: [0, 1] }, 2],
          [3, 2, { key: 1, children: [1, 0] }]],

        [[0, { key: 1, children: [0, 1] }, 2],
          [2, { key: 1, children: [1, 0] }, 3]],

        [[{ key: 1, children: [0, 1] }, { key: 2, children: [0, 1] }, 0],
          [{ key: 2, children: [1, 0] }, { key: 1, children: [1, 0] }, 3]],

        [[{ key: 1, children: [0, 1] }, { key: 2, children: [] }, 0],
          [3, { key: 2, children: [1, 0] }, { key: 1, children: [] }]],

        [[0, { key: 1, children: [] }, 2, { key: 3, children: [1, 0] }, 4, 5],
          [6, { key: 1, children: [0, 1] }, { key: 3, children: [] }, 2, 4, 7]],

        [[0, { key: 1, children: [] }, { key: 2, children: [] }, { key: 3, children: [] }, { key: 4, children: [] }, 5],
          [{ key: 6, children: [{ key: 1, children: [1] }] }, 7, { key: 3, children: [1] }, { key: 2, children: [1] },
           { key: 4, children: [1] }]],

        [[0, 1, { key: 2, children: [0] }, 3, { key: 4, children: [0] }, 5],
          [6, 7, 3, { key: 2, children: [] }, { key: 4, children: [] }]]
      ];

      describe("syncChildren string children", () => {
        it("undefined => \"abc\"", () => {
          const f = document.createDocumentFragment();
          const a = createVElement("div");
          const b = createVElement("div").children("abc");
          injectVNode(f, a, undefined);
          a.sync(b, undefined, 0);
          expect((f.firstChild as Element).childNodes.length).toBe(1);
          expect((f.firstChild as Element).firstChild.nodeValue).toBe("abc");
        });

        it("\"abc\" => undefined", () => {
          const f = document.createDocumentFragment();
          const a = createVElement("div").children("abc");
          const b = createVElement("div");
          injectVNode(f, a, undefined);
          a.sync(b, undefined, 0);
          expect((f.firstChild as Element).childNodes.length).toBe(0);
        });

        it("\"abc\" => \"cde\"", () => {
          const f = document.createDocumentFragment();
          const a = createVElement("div").children("abc");
          const b = createVElement("div").children("cde");
          injectVNode(f, a, undefined);
          a.sync(b, undefined, 0);
          expect((f.firstChild as Element).childNodes.length).toBe(1);
          expect((f.firstChild as Element).firstChild.nodeValue).toBe("cde");
        });

        it("[div] => \"cde\"", () => {
          const f = document.createDocumentFragment();
          const a = createVElement("div").children([createVElement("div")]);
          const b = createVElement("div").children("cde");
          injectVNode(f, a, undefined);
          a.sync(b, undefined, 0);
          expect((f.firstChild as Element).childNodes.length).toBe(1);
          expect((f.firstChild as Element).firstChild.nodeValue).toBe("cde");
        });

        it("[div, div] => \"cde\"", () => {
          const f = document.createDocumentFragment();
          const a = createVElement("div").children([createVElement("div"), createVElement("div")]);
          const b = createVElement("div").children("cde");
          injectVNode(f, a, undefined);
          a.sync(b, undefined, 0);
          expect((f.firstChild as Element).childNodes.length).toBe(1);
          expect((f.firstChild as Element).firstChild.nodeValue).toBe("cde");
        });

        it("\"cde\" => [div]", () => {
          const f = document.createDocumentFragment();
          const a = createVElement("div").children("cde");
          const b = createVElement("div").children([createVElement("div")]);
          injectVNode(f, a, undefined);
          a.sync(b, undefined, 0);
          expect((f.firstChild as Element).childNodes.length).toBe(1);
          expect((f.firstChild.firstChild as Element).tagName).toBe("DIV");
        });

        it("\"cde\" => [div, span]", () => {
          const f = document.createDocumentFragment();
          const a = createVElement("div").children("cde");
          const b = createVElement("div").children([createVElement("div"), createVElement("span")]);
          injectVNode(f, a, undefined);
          a.sync(b, undefined, 0);
          expect((f.firstChild as Element).childNodes.length).toBe(2);
          expect((f.firstChild.firstChild as Element).tagName).toBe("DIV");
          expect((f.firstChild.lastChild as Element).tagName).toBe("SPAN");
        });
      });

      describe("with trackByKey", () => {
        TESTS.forEach((t) => {
          const name = JSON.stringify(t[0]) + " => " + JSON.stringify(t[1]);
          const testFn = () => {
            checkInnerHtmlEquals(gen(t[0], true) as VNode[],
              gen(t[1], true) as VNode[],
              gen(t[1], true) as VNode[],
              true);
          };
          it(name, testFn);
        });
      });

      describe("without trackByKey and without keys", () => {
        TESTS.forEach((t) => {
          const name = JSON.stringify(t[0]) + " => " + JSON.stringify(t[1]);
          const testFn = () => {
            checkInnerHtmlEquals(gen(t[0], false) as VNode[],
              gen(t[1], false) as VNode[],
              gen(t[1], false) as VNode[],
              false);
          };
          it(name, testFn);
        });
      });
    });
  });

  describe("lifecycle", () => {
    it("should invoke init, attached and update hook when parent vnode is created and rendered", () => {
      const component = LifecycleComponent.createVNode();
      const node = createVElement("div").children([component]);
      node.create(undefined);
      node.render(undefined, 0);
      expect(component.cref.state.checkInit).toBe(0);
      expect(component.cref.state.checkAttached).toBe(1);
      expect(component.cref.state.checkUpdate).toBe(2);
      expect(component.cref.state.checkDetached).toBe(-1);
      expect(component.cref.state.checkDisposed).toBe(-1);
    });

    it("should invoke detached hook when parent vnode is detached", () => {
      const component = LifecycleComponent.createVNode();
      const node = createVElement("div").children([component]);
      node.create(undefined);
      node.attached();
      node.render(undefined, 0);
      node.detach();
      expect(component.cref.state.checkInit).toBe(0);
      expect(component.cref.state.checkAttached).toBe(1);
      expect(component.cref.state.checkUpdate).toBe(2);
      expect(component.cref.state.checkDetached).toBe(3);
      expect(component.cref.state.checkDisposed).toBe(-1);
    });

    it("should invoke attached hook when parent vnode is detached and attached", () => {
      const component = LifecycleComponent.createVNode();
      const node = createVElement("div").children([component]);
      node.create(undefined);
      node.attached();
      node.render(undefined, 0);
      node.detach();
      node.attach();
      expect(component.cref.state.checkInit).toBe(0);
      expect(component.cref.state.checkAttached).toBe(4);
      expect(component.cref.state.checkUpdate).toBe(2);
      expect(component.cref.state.checkDetached).toBe(3);
      expect(component.cref.state.checkDisposed).toBe(-1);
    });

    it("should invoke detached and disposed hook when parent vnode is disposed in attached state", () => {
      const component = LifecycleComponent.createVNode();
      const node = createVElement("div").children([component]);
      node.create(undefined);
      node.attached();
      node.render(undefined, 0);
      node.dispose();
      expect(component.cref.state.checkInit).toBe(0);
      expect(component.cref.state.checkAttached).toBe(1);
      expect(component.cref.state.checkUpdate).toBe(2);
      expect(component.cref.state.checkDetached).toBe(3);
      expect(component.cref.state.checkDisposed).toBe(4);
    });

    it("should invoke disposed hook when parent vnode is disposed in detached state", () => {
      const component = LifecycleComponent.createVNode();
      const node = createVElement("div").children([component]);
      node.create(undefined);
      node.attached();
      node.render(undefined, 0);
      node.detach();
      node.attach();
      node.detach();
      node.dispose();
      expect(component.cref.state.checkInit).toBe(0);
      expect(component.cref.state.checkAttached).toBe(4);
      expect(component.cref.state.checkUpdate).toBe(2);
      expect(component.cref.state.checkDetached).toBe(5);
      expect(component.cref.state.checkDisposed).toBe(6);
    });

    it("shouldn\"t dispose keep alive nodes", () => {
      const component = LifecycleComponent.createVNode().keepAlive();
      const node = createVElement("div").children([component]);
      node.create(undefined);
      node.attached();
      node.render(undefined, 0);
      node.dispose();
      expect(component.cref.state.checkInit).toBe(0);
      expect(component.cref.state.checkAttached).toBe(1);
      expect(component.cref.state.checkUpdate).toBe(2);
      expect(component.cref.state.checkDetached).toBe(3);
      expect(component.cref.state.checkDisposed).toBe(-1);
    });

    it("should reattach the same keep alive node without updating (bind-once)", () => {
      const component = LifecycleComponent.createVNode().keepAlive();
      const a = createVElement("div").children([component]);
      const b = createVElement("div");
      const c = createVElement("div").children([component]);
      a.create(undefined);
      a.attached();
      a.render(undefined, 0);
      a.sync(b, undefined, 0);
      expect(component.cref.state.checkInit).toBe(0);
      expect(component.cref.state.checkAttached).toBe(1);
      expect(component.cref.state.checkUpdate).toBe(2);
      expect(component.cref.state.checkDetached).toBe(3);
      expect(component.cref.state.checkDisposed).toBe(-1);

      b.sync(c, undefined, 0);
      expect(component.cref.state.checkInit).toBe(0);
      expect(component.cref.state.checkAttached).toBe(4);
      expect(component.cref.state.checkUpdate).toBe(2);
      expect(component.cref.state.checkDetached).toBe(3);
      expect(component.cref.state.checkDisposed).toBe(-1);

      expect(c.ref.firstChild).toBe(component.ref);
    });

    it("shouldn\"t render component when shallow rendering is used", () => {
      const component = LifecycleComponent.createVNode();
      const a = createVElement("div").children([component]);
      a.create(undefined);
      a.attached();
      a.render(undefined, RenderFlags.ShallowRender);
      expect(component.cref.state.checkInit).toBe(0);
      expect(component.cref.state.checkAttached).toBe(1);
      expect(component.cref.state.checkUpdate).toBe(-1);
      expect(component.cref.state.checkDetached).toBe(-1);
      expect(component.cref.state.checkDisposed).toBe(-1);
    });

    it("should update component on sync", () => {
      const componentA = LifecycleComponent.createVNode(0);
      const componentB = LifecycleComponent.createVNode(1);
      const a = createVElement("div").children([componentA]);
      const b = createVElement("div").children([componentB]);
      a.create(undefined);
      a.attached();
      a.render(undefined, 0);
      expect((componentA.cref as Component<number, any>).data).toBe(0);
      expect(componentA.cref.state.checkInit).toBe(0);
      expect(componentA.cref.state.checkAttached).toBe(1);
      expect(componentA.cref.state.checkUpdate).toBe(2);
      expect(componentA.cref.state.checkDetached).toBe(-1);
      expect(componentA.cref.state.checkDisposed).toBe(-1);

      a.sync(b, undefined, 0);
      expect((componentB.cref as Component<number, any>).data).toBe(1);
      expect(componentB.cref.state.checkInit).toBe(0);
      expect(componentB.cref.state.checkAttached).toBe(1);
      expect(componentB.cref.state.checkUpdate).toBe(3);
      expect(componentB.cref.state.checkDetached).toBe(-1);
      expect(componentB.cref.state.checkDisposed).toBe(-1);
    });

    it("shouldn\"t update component when shallow updating is used", () => {
      const componentA = LifecycleComponent.createVNode();
      const componentB = LifecycleComponent.createVNode();
      const a = createVElement("div").children([componentA]);
      const b = createVElement("div").children([componentB]);
      a.create(undefined);
      a.attached();
      a.render(undefined, 0);
      expect(componentA.cref.state.checkInit).toBe(0);
      expect(componentA.cref.state.checkAttached).toBe(1);
      expect(componentA.cref.state.checkUpdate).toBe(2);
      expect(componentA.cref.state.checkDetached).toBe(-1);
      expect(componentA.cref.state.checkDisposed).toBe(-1);

      a.sync(b, undefined, RenderFlags.ShallowUpdate);
      expect(componentB.cref.state.checkInit).toBe(0);
      expect(componentB.cref.state.checkAttached).toBe(1);
      expect(componentB.cref.state.checkUpdate).toBe(2);
      expect(componentB.cref.state.checkDetached).toBe(-1);
      expect(componentB.cref.state.checkDisposed).toBe(-1);
    });

    it("shouldn\"t update component when shallow updating is used", () => {
      const componentA = LifecycleComponent.createVNode(0);
      const componentB = LifecycleComponent.createVNode(1);
      const a = createVElement("div").children([componentA]);
      const b = createVElement("div").children([componentB]);
      a.create(undefined);
      a.attached();
      a.render(undefined, 0);
      expect((componentA.cref as Component<number, any>).data).toBe(0);
      expect(componentA.cref.state.checkInit).toBe(0);
      expect(componentA.cref.state.checkAttached).toBe(1);
      expect(componentA.cref.state.checkUpdate).toBe(2);
      expect(componentA.cref.state.checkDetached).toBe(-1);
      expect(componentA.cref.state.checkDisposed).toBe(-1);

      a.sync(b, undefined, RenderFlags.ShallowUpdate);
      expect((componentB.cref as Component<number, any>).data).toBe(0);
      expect(componentB.cref.state.checkInit).toBe(0);
      expect(componentB.cref.state.checkAttached).toBe(1);
      expect(componentB.cref.state.checkUpdate).toBe(2);
      expect(componentB.cref.state.checkDetached).toBe(-1);
      expect(componentB.cref.state.checkDisposed).toBe(-1);
    });
  });

  describe("mounting", () => {
    it("<div>abc</div>", () => {
      const e = document.createElement("div");
      e.textContent = "abc";

      const v = createVElement("div").children("abc");
      v.mount(e, undefined);
      expect(v.ref).toBe(e);
    });

    it("<div>\"abc\"</div>", () => {
      const e = document.createElement("div");
      e.textContent = "abc";

      const t = createVText("abc");
      const v = createVElement("div").children([t]);
      v.mount(e, undefined);
      expect(v.ref).toBe(e);
      expect(t.ref).toBe(e.firstChild);
    });

    it("<div>\"abc\"\"def\"</div>", () => {
      const e = document.createElement("div");
      e.appendChild(document.createTextNode("abc"));
      e.appendChild(document.createTextNode("def"));

      const t1 = createVText("abc");
      const t2 = createVText("def");
      const v = createVElement("div").children([t1, t2]);
      v.mount(e, undefined);
      expect(v.ref).toBe(e);
      expect(t1.ref).toBe(e.firstChild);
      expect(t2.ref).toBe(e.lastChild);
    });

    it("<div>\"abc\"<span>\"123\"</span>\"def\"</div>", () => {
      const e = document.createElement("div");
      e.appendChild(document.createTextNode("abc"));
      const e2 = document.createElement("span");
      e2.textContent = "123";
      e.appendChild(e2);
      e.appendChild(document.createTextNode("def"));

      const t1 = createVText("abc");
      const t2 = createVText("def");
      const t3 = createVText("123");
      const s = createVElement("span").children([t3]);
      const v = createVElement("div").children([t1, s, t2]);
      v.mount(e, undefined);
      expect(v.ref).toBe(e);
      expect(t1.ref).toBe(e.firstChild);
      expect(t2.ref).toBe(e.lastChild);
      expect(s.ref).toBe(e2);
      expect(t3.ref).toBe(e2.firstChild);
    });

    it("<div>\"abc\"<LifeCycleComponent />\"def\"</div>", () => {
      const component = LifecycleComponent.createVNode();

      const e = document.createElement("div");
      e.appendChild(document.createTextNode("abc"));
      const e2 = document.createElement("div");
      e.appendChild(e2);
      e.appendChild(document.createTextNode("def"));

      const t1 = createVText("abc");
      const t2 = createVText("def");
      const v = createVElement("div").children([t1, component, t2]);
      v.mount(e, undefined);
      expect(v.ref).toBe(e);
      expect(t1.ref).toBe(e.firstChild);
      expect(t2.ref).toBe(e.lastChild);
      expect(component.ref).toBe(e2);

      expect(component.cref.state.checkInit).toBe(0);
      expect(component.cref.state.checkAttached).toBe(1);
      expect(component.cref.state.checkUpdate).toBe(2);
      expect(component.cref.state.checkDetached).toBe(-1);
      expect(component.cref.state.checkDisposed).toBe(-1);
    });
  });

  describe("comment placeholder", () => {
    it("should create placeholder", () => {
      const e = createVElement("div");
      e.createCommentPlaceholder();
      expect(e.ref.nodeType).toBe(8);
    });

    it("should create element from placeholder", () => {
      const e = createVElement("div");
      e.createCommentPlaceholder();
      expect(e.ref.nodeType).toBe(8);
      e.create(undefined);
      expect((e.ref as Element).tagName).toBe("DIV");
    });
  });
});
