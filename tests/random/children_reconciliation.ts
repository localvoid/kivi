import {VNode, vNodeInstantiate, vNodeRender, createVElement, createVText} from "../../lib/vnode";
import {reconciler} from "../../lib/reconciler";
import {scheduler} from "../../lib/scheduler";

function injectVNode(parent: DocumentFragment, node: VNode, nextRef?: Element): void {
  vNodeInstantiate(node, undefined);
  parent.insertBefore(node.ref!, nextRef!);
  vNodeRender(node, 0, undefined);
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

  reconciler.sync(a, c, 0, undefined);

  if (aDiv.innerHTML !== bDiv.innerHTML) {
    throw Error(`html doesn't match: ${aDiv.innerHTML} => ${bDiv.innerHTML}`);
  }
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min)) + min;
}

function generateRandomSeq(length: number): number[] {
  const result = [] as number[];
  const length2 = length << 1;
  const used = new Set();

  for (let i = 0; i < length; i++) {
    let id = getRandomInt(0, length2);
    while (used.has(id)) {
      id = getRandomInt(0, length2);
    }
    used.add(id);
    result.push(id);
  }

  return result;
}

function createTestCase(a: number[], b: number[]): void {
  checkInnerHtmlEquals(gen(a, true) as VNode[],
    gen(b, true) as VNode[],
    gen(b, true) as VNode[],
    true);
}

document.addEventListener("DOMContentLoaded", () => {
  let j = 0;
  document.body.innerText = j.toString();
  function runTests() {
    for (let i = 0; i < 1000; i++) {
      const aLength = getRandomInt(0, 32);
      const bLength = getRandomInt(0, 32);
      const a = generateRandomSeq(aLength);
      const b = generateRandomSeq(bLength);
      createTestCase(a, b);
    }
    document.body.innerText = (++j).toString();
    scheduler.scheduleMacrotask(runTests);
  }
  runTests();
});
