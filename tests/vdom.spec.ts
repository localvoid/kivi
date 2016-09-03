import {LifecycleComponent, LifecycleState} from "./lifecycle";
import {XlinkNamespace} from "../lib/misc";
import {VNode, vNodeInstantiate, vNodeRender, vNodeMount, vNodeAttached, vNodeAttach, vNodeDetach, vNodeDispose,
        createVElement, createVText, createVSvgElement, syncVNodes} from "../lib/vnode";
import {Component} from "../lib/component";

const expect = chai.expect;

function injectVNode(parent: DocumentFragment, node: VNode, nextRef?: Element): void {
  vNodeInstantiate(node, undefined);
  parent.insertBefore(node.ref!, nextRef as Node);
  vNodeRender(node, undefined);
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

  syncVNodes(a, c, undefined);

  expect(aDiv.innerHTML).to.equal(bDiv.innerHTML);
}

function getLifecycleState(n: VNode): LifecycleState {
  return n.cref!.state;
}

describe("VNode", () => {
  describe("render", () => {
    it("should create empty div", () => {
      const f = document.createDocumentFragment();
      const a = createVElement("div");
      injectVNode(f, a, undefined);
      expect((f.firstChild as Element).tagName).to.equal("DIV");
    });

    it("should create empty span", () => {
      const f = document.createDocumentFragment();
      const a = createVElement("span");
      injectVNode(f, a, undefined);
      expect((f.firstChild as Element).tagName).to.equal("SPAN");
    });

    it("should create div with 1 static shape attribute", () => {
      const f = document.createDocumentFragment();
      const a = createVElement("div");
      a.attrs({
        a: "1",
      });
      injectVNode(f, a, undefined);
      expect((f.firstChild as Element).hasAttributes()).to.be.true;
      expect((f.firstChild as Element).getAttribute("a")).to.equal("1");
    });

    it("should create div with 1 static shape attributes", () => {
      const f = document.createDocumentFragment();
      const a = createVElement("div");
      a.attrs({
        a: "1",
        b: "2",
      });
      injectVNode(f, a, undefined);
      expect((f.firstChild as Element).hasAttributes()).to.be.true;
      expect((f.firstChild as Element).getAttribute("a")).to.equal("1");
      expect((f.firstChild as Element).getAttribute("b")).to.equal("2");
    });

    it("should create div with 1 dynamic shape attribute", () => {
      const f = document.createDocumentFragment();
      const a = createVElement("div");
      a.dynamicShapeAttrs({
        a: "1",
      });
      injectVNode(f, a, undefined);
      expect((f.firstChild as Element).hasAttributes()).to.be.true;
      expect((f.firstChild as Element).getAttribute("a")).to.equal("1");
    });

    it("should create div with 2 dynamic shape attributes", () => {
      const f = document.createDocumentFragment();
      const a = createVElement("div").dynamicShapeAttrs({
        a: "1",
        b: "2",
      });
      injectVNode(f, a, undefined);
      expect((f.firstChild as Element).hasAttributes()).to.be.true;
      expect((f.firstChild as Element).getAttribute("a")).to.equal("1");
      expect((f.firstChild as Element).getAttribute("b")).to.equal("2");
    });

    it("should create div with 1 static shape property", () => {
      const f = document.createDocumentFragment();
      const a = createVElement("div");
      a.props({
        xtag: "1",
      });
      injectVNode(f, a, undefined);
      expect(((f.firstChild as any) as {xtag: string}).xtag).to.equal("1");
    });

    it("should create div with 2 static shape properties", () => {
      const f = document.createDocumentFragment();
      const a = createVElement("div");
      a.props({
        xtag1: "1",
        xtag2: "2",
      });
      injectVNode(f, a, undefined);
      expect(((f.firstChild as any) as {xtag1: string}).xtag1).to.equal("1");
      expect(((f.firstChild as any) as {xtag2: string}).xtag2).to.equal("2");
    });

    it("should create div with style", () => {
      const f = document.createDocumentFragment();
      const a = createVElement("div").style("top: 10px");
      injectVNode(f, a, undefined);
      expect((f.firstChild as HTMLElement).style.top).to.equal("10px");
    });

    it("should create div with className", () => {
      const f = document.createDocumentFragment();
      const a = createVElement("div").className("a");
      injectVNode(f, a, undefined);
      expect((f.firstChild as Element).classList.length).to.equal(1);
      expect((f.firstChild as Element).classList[0]).to.equal("a");
    });

    it("should create svg element with style", () => {
      const f = document.createDocumentFragment();
      const a = createVSvgElement("circle").style("top: 10px");
      injectVNode(f, a, undefined);
      expect((f.firstChild as SVGElement).getAttribute("style")).to.have.string("10px");
    });

    it("should create svg element with className", () => {
      const f = document.createDocumentFragment();
      const a = createVSvgElement("circle").className("a");
      injectVNode(f, a, undefined);
      expect((f.firstChild as SVGElement).getAttribute("class")).to.equal("a");
    });

    it("should create svg element with xlink:href attribute", () => {
      const f = document.createDocumentFragment();
      const a = createVSvgElement("circle").attrs({"xlink:href": "a"});
      injectVNode(f, a, undefined);
      expect((f.firstChild as SVGElement).getAttributeNS(XlinkNamespace, "href")).to.equal("a");
    });

    it("should create div with 1 child", () => {
      const f = document.createDocumentFragment();
      const a = createVElement("div").children([createVElement("span")]);
      injectVNode(f, a, undefined);
      expect((f.firstChild as Element).childNodes.length).to.equal(1);
    });

    it("should create div with 2 children", () => {
      const f = document.createDocumentFragment();
      const a = createVElement("div").children([
        createVElement("span"),
        createVElement("span"),
      ]);
      injectVNode(f, a, undefined);
      expect((f.firstChild as Element).childNodes.length).to.equal(2);
    });

    it("should create div with child 'abc'", () => {
      const f = document.createDocumentFragment();
      const a = createVElement("div").child("abc");
      injectVNode(f, a, undefined);
      expect((f.firstChild as Element).childNodes.length).to.equal(1);
      expect((f.firstChild as Element).firstChild.nodeValue).to.equal("abc");
    });
  });

  describe("sync", () => {
    describe("static shape attrs", () => {
      it("null => null", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div");
        const b = createVElement("div");
        injectVNode(f, a, undefined);
        syncVNodes(a, b, undefined);
        expect((f.firstChild as Element).hasAttributes()).to.be.false;
      });

      it("null => {} should throw exception", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div");
        const b = createVElement("div").attrs({});
        injectVNode(f, a, undefined);
        expect(() => syncVNodes(a, b, undefined)).to.throw();
      });

      it("{} => null should throw exception", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").attrs({});
        const b = createVElement("div");
        injectVNode(f, a, undefined);
        expect(() => syncVNodes(a, b, undefined)).to.throw();
      });

      it("{} => {}", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").attrs({});
        const b = createVElement("div").attrs({});
        injectVNode(f, a, undefined);
        syncVNodes(a, b, undefined);
        expect((f.firstChild as Element).hasAttributes()).to.be.false;
      });

      it("null => {a: 1} should throw exception", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div");
        const b = createVElement("div").attrs({ a: "1" });
        injectVNode(f, a, undefined);
        expect(() => syncVNodes(a, b, undefined)).to.throw();
      });

      it("{} => {a: 1} should throw exception", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").attrs({});
        const b = createVElement("div").attrs({ a: "1" });
        injectVNode(f, a, undefined);
        expect(() => syncVNodes(a, b, undefined)).to.throw();
      });

      it("{} => {a: 1, b: 2}", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").attrs({});
        const b = createVElement("div").attrs({ a: "1", b: "2" });
        injectVNode(f, a, undefined);
        expect(() => syncVNodes(a, b, undefined)).to.throw();
      });

      it("{a: 1} => null", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").attrs({ a: "1" });
        const b = createVElement("div");
        injectVNode(f, a, undefined);
        expect(() => syncVNodes(a, b, undefined)).to.throw();
      });

      it("{a: 1} => {}", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").attrs({ a: "1" });
        const b = createVElement("div").attrs({});
        injectVNode(f, a, undefined);
        expect(() => syncVNodes(a, b, undefined)).to.throw();
      });

      it("{a: 1, b: 2} => {}", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").attrs({ a: "1", b: "2" });
        const b = createVElement("div").attrs({});
        injectVNode(f, a, undefined);
        expect(() => syncVNodes(a, b, undefined)).to.throw();
      });

      it("{a: 1} => {b: 2}", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").attrs({ a: "1" });
        const b = createVElement("div").attrs({ b: "2" });
        injectVNode(f, a, undefined);
        expect(() => syncVNodes(a, b, undefined)).to.throw();
      });

      it("{a: 1} => {a: 10}", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").attrs({ a: "1" });
        const b = createVElement("div").attrs({ a: "10" });
        injectVNode(f, a, undefined);
        syncVNodes(a, b, undefined);
        expect((f.firstChild as Element).hasAttributes()).to.be.true;
        expect((f.firstChild as Element).getAttribute("a")).to.equal("10");
      });

      it("{a: 1, b: 2} => {a: 10, b: 20}", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").attrs({ a: "1", b: "2" });
        const b = createVElement("div").attrs({ a: "10", b: "20" });
        injectVNode(f, a, undefined);
        syncVNodes(a, b, undefined);
        expect((f.firstChild as Element).hasAttributes()).to.be.true;
        expect((f.firstChild as Element).getAttribute("a")).to.equal("10");
        expect((f.firstChild as Element).getAttribute("b")).to.equal("20");
      });
    });

    describe("dynamic shape attrs", () => {
      it("undefined => {}", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").dynamicShapeAttrs();
        const b = createVElement("div").dynamicShapeAttrs({});
        injectVNode(f, a, undefined);
        syncVNodes(a, b, undefined);
        expect((f.firstChild as Element).hasAttributes()).to.be.false;
      });

      it("{} => null", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").dynamicShapeAttrs({});
        const b = createVElement("div").dynamicShapeAttrs();
        injectVNode(f, a, undefined);
        syncVNodes(a, b, undefined);
        expect((f.firstChild as Element).hasAttributes()).to.be.false;
      });

      it("{} => {}", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").dynamicShapeAttrs({});
        const b = createVElement("div").dynamicShapeAttrs({});
        injectVNode(f, a, undefined);
        syncVNodes(a, b, undefined);
        expect((f.firstChild as Element).hasAttributes()).to.be.false;
      });

      it("null => {a: 1}", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").dynamicShapeAttrs();
        const b = createVElement("div").dynamicShapeAttrs({ a: "1" });
        injectVNode(f, a, undefined);
        syncVNodes(a, b, undefined);
        expect((f.firstChild as Element).hasAttributes()).to.be.true;
        expect((f.firstChild as Element).getAttribute("a")).to.equal("1");
      });

      it("{} => {a: 1}", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").dynamicShapeAttrs({});
        const b = createVElement("div").dynamicShapeAttrs({ a: "1" });
        injectVNode(f, a, undefined);
        syncVNodes(a, b, undefined);
        expect((f.firstChild as Element).hasAttributes()).to.be.true;
        expect((f.firstChild as Element).getAttribute("a")).to.equal("1");
      });

      it("{} => {a: 1, b: 2}", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").dynamicShapeAttrs({});
        const b = createVElement("div").dynamicShapeAttrs({ a: "1", b: "2" });
        injectVNode(f, a, undefined);
        syncVNodes(a, b, undefined);
        expect((f.firstChild as Element).hasAttributes()).to.be.true;
        expect((f.firstChild as Element).getAttribute("a")).to.equal("1");
        expect((f.firstChild as Element).getAttribute("b")).to.equal("2");
      });

      it("{} => {a: 1, b: 2, c: 3}", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").dynamicShapeAttrs({});
        const b = createVElement("div").dynamicShapeAttrs({ a: "1", b: "2", c: "3" });
        injectVNode(f, a, undefined);
        syncVNodes(a, b, undefined);
        expect((f.firstChild as Element).hasAttributes()).to.be.true;
        expect((f.firstChild as Element).getAttribute("a")).to.equal("1");
        expect((f.firstChild as Element).getAttribute("b")).to.equal("2");
        expect((f.firstChild as Element).getAttribute("c")).to.equal("3");
      });

      it("{a: 1} => undefined", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").dynamicShapeAttrs({ a: "1" });
        const b = createVElement("div").dynamicShapeAttrs();
        injectVNode(f, a, undefined);
        syncVNodes(a, b, undefined);
        expect((f.firstChild as Element).hasAttributes()).to.be.false;
      });

      it("{a: 1} => {}", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").dynamicShapeAttrs({ a: "1" });
        const b = createVElement("div").dynamicShapeAttrs({});
        injectVNode(f, a, undefined);
        syncVNodes(a, b, undefined);
        expect((f.firstChild as Element).hasAttributes()).to.be.false;
      });

      it("{a: 1, b: 2} => {}", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").dynamicShapeAttrs({ a: "1", b: "2" });
        const b = createVElement("div").dynamicShapeAttrs({});
        injectVNode(f, a, undefined);
        syncVNodes(a, b, undefined);
        expect((f.firstChild as Element).hasAttributes()).to.be.false;
      });

      it("{a: 1} => {b: 2}", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").dynamicShapeAttrs({ a: "1" });
        const b = createVElement("div").dynamicShapeAttrs({ b: "2" });
        injectVNode(f, a, undefined);
        syncVNodes(a, b, undefined);
        expect((f.firstChild as Element).hasAttributes()).to.be.true;
        expect((f.firstChild as Element).hasAttribute("a")).to.be.false;
        expect((f.firstChild as Element).getAttribute("b")).to.equal("2");
      });

      it("{a: 1, b: 2} => {c: 3: d: 4}", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").dynamicShapeAttrs({ a: "1", b: "2" });
        const b = createVElement("div").dynamicShapeAttrs({ c: "3", d: "4" });
        injectVNode(f, a, undefined);
        syncVNodes(a, b, undefined);
        expect((f.firstChild as Element).hasAttributes()).to.be.true;
        expect((f.firstChild as Element).hasAttribute("a")).to.be.false;
        expect((f.firstChild as Element).hasAttribute("b")).to.be.false;
        expect((f.firstChild as Element).getAttribute("c")).to.equal("3");
        expect((f.firstChild as Element).getAttribute("d")).to.equal("4");
      });

      it("{a: 1} => {a: 10}", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").dynamicShapeAttrs({ a: "1" });
        const b = createVElement("div").dynamicShapeAttrs({ a: "10" });
        injectVNode(f, a, undefined);
        syncVNodes(a, b, undefined);
        expect((f.firstChild as Element).hasAttributes()).to.be.true;
        expect((f.firstChild as Element).getAttribute("a")).to.equal("10");
      });

      it("{a: 1, b: 2} => {a: 10, b: 20}", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").dynamicShapeAttrs({ a: "1", b: "2" });
        const b = createVElement("div").dynamicShapeAttrs({ a: "10", b: "20" });
        injectVNode(f, a, undefined);
        syncVNodes(a, b, undefined);
        expect((f.firstChild as Element).hasAttributes()).to.be.true;
        expect((f.firstChild as Element).getAttribute("a")).to.equal("10");
        expect((f.firstChild as Element).getAttribute("b")).to.equal("20");
      });
    });

    describe("static shape props", () => {
      it("null => {} should throw exception", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div");
        const b = createVElement("div").props({});
        injectVNode(f, a, undefined);
        expect(() => syncVNodes(a, b, undefined)).to.throw();
      });

      it("{} => null should throw exception", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").props({});
        const b = createVElement("div");
        injectVNode(f, a, undefined);
        expect(() => syncVNodes(a, b, undefined)).to.throw();
      });

      it("{} => {}", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").props({});
        const b = createVElement("div").props({});
        injectVNode(f, a, undefined);
        syncVNodes(a, b, undefined);
      });

      it("null => {a: 1} should throw exception", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div");
        const b = createVElement("div").props({ a: "1" });
        injectVNode(f, a, undefined);
        expect(() => syncVNodes(a, b, undefined)).to.throw();
      });

      it("{} => {a: 1} should throw exception", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").props({});
        const b = createVElement("div").props({ a: "1" });
        injectVNode(f, a, undefined);
        expect(() => syncVNodes(a, b, undefined)).to.throw();
      });

      it("{} => {a: 1, b: 2}", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").props({});
        const b = createVElement("div").props({ a: "1", b: "2" });
        injectVNode(f, a, undefined);
        expect(() => syncVNodes(a, b, undefined)).to.throw();
      });

      it("{a: 1} => null", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").props({ a: "1" });
        const b = createVElement("div");
        injectVNode(f, a, undefined);
        expect(() => syncVNodes(a, b, undefined)).to.throw();
      });

      it("{a: 1} => {}", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").props({ a: "1" });
        const b = createVElement("div").props({});
        injectVNode(f, a, undefined);
        expect(() => syncVNodes(a, b, undefined)).to.throw();
      });

      it("{a: 1, b: 2} => {}", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").props({ a: "1", b: "2" });
        const b = createVElement("div").props({});
        injectVNode(f, a, undefined);
        expect(() => syncVNodes(a, b, undefined)).to.throw();
      });

      it("{a: 1} => {b: 2}", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").props({ a: "1" });
        const b = createVElement("div").props({ b: "2" });
        injectVNode(f, a, undefined);
        expect(() => syncVNodes(a, b, undefined)).to.throw();
      });

      it("{a: 1} => {a: 10}", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").props({ a: "1" });
        const b = createVElement("div").props({ a: "10" });
        injectVNode(f, a, undefined);
        syncVNodes(a, b, undefined);
        expect(((f.firstChild as any) as {a: string}).a).to.equal("10");
      });

      it("{a: 1, b: 2} => {a: 10, b: 20}", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").props({ a: "1", b: "2" });
        const b = createVElement("div").props({ a: "10", b: "20" });
        injectVNode(f, a, undefined);
        syncVNodes(a, b, undefined);
        expect(((f.firstChild as any) as {a: string}).a).to.equal("10");
        expect(((f.firstChild as any) as {b: string}).b).to.equal("20");
      });
    });

    describe("className", () => {
      it("null => null", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div");
        const b = createVElement("div");
        injectVNode(f, a, undefined);
        syncVNodes(a, b, undefined);
        expect((f.firstChild as Element).classList.length).to.equal(0);
      });

      it("null => [1]", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div");
        const b = createVElement("div").className("1");
        injectVNode(f, a, undefined);
        syncVNodes(a, b, undefined);
        expect((f.firstChild as Element).classList.length).to.equal(1);
        expect((f.firstChild as Element).classList[0]).to.equal("1");
      });

      it("[1] => null", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div").className("1");
        const b = createVElement("div");
        injectVNode(f, a, undefined);
        syncVNodes(a, b, undefined);
        expect((f.firstChild as Element).classList.length).to.equal(0);
      });

      it("null => [1, 2]", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div");
        const b = createVElement("div").className("1 2");
        injectVNode(f, a, undefined);
        syncVNodes(a, b, undefined);
        expect((f.firstChild as Element).classList.length).to.equal(2);
        expect((f.firstChild as Element).classList[0]).to.equal("1");
        expect((f.firstChild as Element).classList[1]).to.equal("2");
      });
    });

    describe("style", () => {
      it("null => null", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div");
        const b = createVElement("div");
        injectVNode(f, a, undefined);
        syncVNodes(a, b, undefined);
        expect((f.firstChild as HTMLElement).style.cssText).to.equal("");
      });

      it("null => {top: 10px}", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div");
        const b = createVElement("div").style("top: 10px");
        injectVNode(f, a, undefined);
        syncVNodes(a, b, undefined);
        expect((f.firstChild as HTMLElement).style.top).to.equal("10px");
      });

      it("{top: 10px} => null", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div");
        const b = createVElement("div");
        a.style("top: 10px");
        injectVNode(f, a, undefined);
        syncVNodes(a, b, undefined);
        expect((f.firstChild as HTMLElement).style.top).to.equal("");
      });

      it("null => {top: 10px, left: 20px}", () => {
        const f = document.createDocumentFragment();
        const a = createVElement("div");
        const b = createVElement("div").style("top: 10px; left: 20px");
        injectVNode(f, a, undefined);
        syncVNodes(a, b, undefined);
        expect((f.firstChild as HTMLElement).style.top).to.equal("10px");
        expect((f.firstChild as HTMLElement).style.left).to.equal("20px");
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
          [6, 7, 3, { key: 2, children: [] }, { key: 4, children: [] }]],
      ];

      describe("syncChildren string children", () => {
        it("null => 'abc'", () => {
          const f = document.createDocumentFragment();
          const a = createVElement("div");
          const b = createVElement("div").child("abc");
          injectVNode(f, a, undefined);
          syncVNodes(a, b, undefined);
          expect((f.firstChild as Element).childNodes.length).to.equal(1);
          expect((f.firstChild as Element).firstChild.nodeValue).to.equal("abc");
        });

        it("'abc' => null", () => {
          const f = document.createDocumentFragment();
          const a = createVElement("div").child("abc");
          const b = createVElement("div");
          injectVNode(f, a, undefined);
          syncVNodes(a, b, undefined);
          expect((f.firstChild as Element).childNodes.length).to.equal(0);
        });

        it("'abc' => 'cde'", () => {
          const f = document.createDocumentFragment();
          const a = createVElement("div").child("abc");
          const b = createVElement("div").child("cde");
          injectVNode(f, a, undefined);
          syncVNodes(a, b, undefined);
          expect((f.firstChild as Element).childNodes.length).to.equal(1);
          expect((f.firstChild as Element).firstChild.nodeValue).to.equal("cde");
        });

        it("[div] => 'cde'", () => {
          const f = document.createDocumentFragment();
          const a = createVElement("div").child(createVElement("div"));
          const b = createVElement("div").child("cde");
          injectVNode(f, a, undefined);
          syncVNodes(a, b, undefined);
          expect((f.firstChild as Element).childNodes.length).to.equal(1);
          expect((f.firstChild as Element).firstChild.nodeValue).to.equal("cde");
        });

        it("'cde' => [div]", () => {
          const f = document.createDocumentFragment();
          const a = createVElement("div").child("cde");
          const b = createVElement("div").child(createVElement("div"));
          injectVNode(f, a, undefined);
          syncVNodes(a, b, undefined);
          expect((f.firstChild as Element).childNodes.length).to.equal(1);
          expect((f.firstChild.firstChild as Element).tagName).to.equal("DIV");
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
      vNodeInstantiate(node, undefined);
      vNodeRender(node, undefined);
      const state = getLifecycleState(component);
      expect(state.checkInit).to.equal(0);
      expect(state.checkAttached).to.equal(1);
      expect(state.checkUpdate).to.equal(2);
      expect(state.checkDetached).to.equal(-1);
      expect(state.checkDisposed).to.equal(-1);
    });

    it("should invoke detached hook when parent vnode is detached", () => {
      const component = LifecycleComponent.createVNode();
      const node = createVElement("div").children([component]);
      vNodeInstantiate(node, undefined);
      vNodeAttached(node);
      vNodeRender(node, undefined);
      vNodeDetach(node);
      const state = getLifecycleState(component);
      expect(state.checkInit).to.equal(0);
      expect(state.checkAttached).to.equal(1);
      expect(state.checkUpdate).to.equal(2);
      expect(state.checkDetached).to.equal(3);
      expect(state.checkDisposed).to.equal(-1);
    });

    it("should invoke attached hook when parent vnode is detached and attached", () => {
      const component = LifecycleComponent.createVNode();
      const node = createVElement("div").children([component]);
      vNodeInstantiate(node, undefined);
      vNodeAttached(node);
      vNodeRender(node, undefined);
      vNodeDetach(node);
      vNodeAttach(node);
      const state = getLifecycleState(component);
      expect(state.checkInit).to.equal(0);
      expect(state.checkAttached).to.equal(4);
      expect(state.checkUpdate).to.equal(2);
      expect(state.checkDetached).to.equal(3);
      expect(state.checkDisposed).to.equal(-1);
    });

    it("should invoke detached and disposed hook when parent vnode is disposed in attached state", () => {
      const component = LifecycleComponent.createVNode();
      const node = createVElement("div").children([component]);
      vNodeInstantiate(node, undefined);
      vNodeAttached(node);
      vNodeRender(node, undefined);
      vNodeDispose(node);
      const state = getLifecycleState(component);
      expect(state.checkInit).to.equal(0);
      expect(state.checkAttached).to.equal(1);
      expect(state.checkUpdate).to.equal(2);
      expect(state.checkDetached).to.equal(3);
      expect(state.checkDisposed).to.equal(4);
    });

    it("should invoke disposed hook when parent vnode is disposed in detached state", () => {
      const component = LifecycleComponent.createVNode();
      const node = createVElement("div").children([component]);
      vNodeInstantiate(node, undefined);
      vNodeAttached(node);
      vNodeRender(node, undefined);
      vNodeDetach(node);
      vNodeAttach(node);
      vNodeDetach(node);
      vNodeDispose(node);
      const state = getLifecycleState(component);
      expect(state.checkInit).to.equal(0);
      expect(state.checkAttached).to.equal(4);
      expect(state.checkUpdate).to.equal(2);
      expect(state.checkDetached).to.equal(5);
      expect(state.checkDisposed).to.equal(6);
    });

    it("should update component on sync", () => {
      const componentA = LifecycleComponent.createVNode(0);
      const componentB = LifecycleComponent.createVNode(1);
      const a = createVElement("div").children([componentA]);
      const b = createVElement("div").children([componentB]);
      vNodeInstantiate(a, undefined);
      vNodeAttached(a);
      vNodeRender(a, undefined);
      const stateA = getLifecycleState(componentA);
      expect(componentA.cref!.props).to.equal(0);
      expect(stateA.checkInit).to.equal(0);
      expect(stateA.checkAttached).to.equal(1);
      expect(stateA.checkUpdate).to.equal(2);
      expect(stateA.checkDetached).to.equal(-1);
      expect(stateA.checkDisposed).to.equal(-1);

      syncVNodes(a, b, undefined);
      const stateB = getLifecycleState(componentB);
      expect(componentB.cref!.props).to.equal(1);
      expect((componentB.cref as Component<number, any>).props).to.equal(1);
      expect(stateB.checkInit).to.equal(0);
      expect(stateB.checkAttached).to.equal(1);
      expect(stateB.checkUpdate).to.equal(3);
      expect(stateB.checkDetached).to.equal(-1);
      expect(stateB.checkDisposed).to.equal(-1);
    });
  });

  describe("mounting", () => {
    it("<div>abc</div>", () => {
      const e = document.createElement("div");
      e.textContent = "abc";

      const v = createVElement("div").child("abc");
      vNodeMount(v, e, undefined);
      expect(v.ref).to.equal(e);
    });

    it("<div>'abc'</div>", () => {
      const e = document.createElement("div");
      e.textContent = "abc";

      const t = createVText("abc");
      const v = createVElement("div").children([t]);
      vNodeMount(v, e, undefined);
      expect(v.ref).to.equal(e);
      expect(t.ref).to.equal(e.firstChild);
    });

    it("<div>'abc''def'</div>", () => {
      const e = document.createElement("div");
      e.appendChild(document.createTextNode("abc"));
      e.appendChild(document.createTextNode("def"));

      const t1 = createVText("abc");
      const t2 = createVText("def");
      const v = createVElement("div").children([t1, t2]);
      vNodeMount(v, e, undefined);
      expect(v.ref).to.equal(e);
      expect(t1.ref).to.equal(e.firstChild);
      expect(t2.ref).to.equal(e.lastChild);
    });

    it("<div>'abc'<span>'123'</span>'def'</div>", () => {
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
      vNodeMount(v, e, undefined);
      expect(v.ref).to.equal(e);
      expect(t1.ref).to.equal(e.firstChild);
      expect(t2.ref).to.equal(e.lastChild);
      expect(s.ref).to.equal(e2);
      expect(t3.ref).to.equal(e2.firstChild);
    });

    it("<div>'abc'<LifeCycleComponent />'def'</div>", () => {
      const component = LifecycleComponent.createVNode();

      const e = document.createElement("div");
      e.appendChild(document.createTextNode("abc"));
      const e2 = document.createElement("div");
      e.appendChild(e2);
      e.appendChild(document.createTextNode("def"));

      const t1 = createVText("abc");
      const t2 = createVText("def");
      const v = createVElement("div").children([t1, component, t2]);
      vNodeMount(v, e, undefined);
      expect(v.ref).to.equal(e);
      expect(t1.ref).to.equal(e.firstChild);
      expect(t2.ref).to.equal(e.lastChild);
      expect(component.ref).to.equal(e2);

      const state = getLifecycleState(component);
      expect(state.checkInit).to.equal(0);
      expect(state.checkAttached).to.equal(1);
      expect(state.checkUpdate).to.equal(2);
      expect(state.checkDetached).to.equal(-1);
      expect(state.checkDisposed).to.equal(-1);
    });
  });
});
