import {ContainerManager, ContainerManagerDescriptor} from "../lib/container_manager";
import {VNode, vNodeInstantiate, vNodeAttached, vNodeRender, createVElement} from "../lib/vnode";
import {Component} from "../lib/component";
import {reconciler} from "../lib/reconciler";

const expect = chai.expect;

describe("ContainerManager", () => {
  it("should invoke insertChild", () => {
    let testManager: ContainerManager<any> | null = null;
    let testContainer: Element | null = null;
    let testNode: VNode | null = null;
    let testNextRef: Node | null = null;
    let testOwner: Component<any, any> | undefined | null = null;

    const CM = new ContainerManagerDescriptor()
      .insertChild((manager: ContainerManager<any>, container: Element, node: VNode, nextRef: Node,
          renderFlags: number, owner: Component<any, any> | undefined) => {
        testManager = manager;
        testContainer = container;
        testNode = node;
        testNextRef = nextRef;
        testOwner = owner;
      });

    const manager = CM.create();
    const a = createVElement("div").managedContainer(manager);
    const insertedChild = createVElement("span");
    const b = createVElement("div").managedContainer(manager).children([insertedChild]);

    vNodeInstantiate(a, undefined);
    vNodeAttached(a);
    vNodeRender(a, 0, undefined);
    reconciler.sync(a, b, 0, undefined);

    expect(testManager).to.equal(manager);
    expect(testContainer).to.equal(b.ref);
    expect(testNode).to.equal(insertedChild);
    expect(testNextRef).to.be.null;
    expect(testOwner).to.be.undefined;
  });

  it("should invoke removeChild", () => {
    let testManager: ContainerManager<any> | null = null;
    let testContainer: Element | null = null;
    let testNode: VNode | null = null;
    let testOwner: Component<any, any> | undefined | null = null;

    const CM = new ContainerManagerDescriptor()
      .removeChild((manager: ContainerManager<any>, container: Element, node: VNode,
          owner: Component<any, any> | undefined) => {
        testManager = manager;
        testContainer = container;
        testNode = node;
        testOwner = owner;
      });

    const manager = CM.create();
    const removedChild = createVElement("span");
    const a = createVElement("div").managedContainer(manager).children([removedChild]);
    const b = createVElement("div").managedContainer(manager);

    vNodeInstantiate(a, undefined);
    vNodeAttached(a);
    vNodeRender(a, 0, undefined);
    reconciler.sync(a, b, 0, undefined);

    expect(testManager).to.equal(manager);
    expect(testContainer).to.equal(b.ref);
    expect(testNode).to.equal(removedChild);
    expect(testOwner).to.be.undefined;
  });

  it("should invoke moveChild", () => {
    let testManager: ContainerManager<any> | null = null;
    let testContainer: Element | null = null;
    let testNode: VNode | null = null;
    let testNextRef: Node | null = null;
    let testOwner: Component<any, any> | undefined | null = null;

    const CM = new ContainerManagerDescriptor()
      .moveChild((manager: ContainerManager<any>, container: Element, node: VNode, nextRef: Node,
          owner: Component<any, any> | undefined) => {
        testManager = manager;
        testContainer = container;
        testNode = node;
        testNextRef = nextRef;
        testOwner = owner;
      });

    const manager = CM.create();
    const movedChildA = createVElement("span").key("b");
    const movedChildB = createVElement("span").key("b");
    const tmpChildA = createVElement("span").key("a");
    const tmpChildB = createVElement("span").key("a");
    const a = createVElement("div").managedContainer(manager).trackByKeyChildren([movedChildA, tmpChildA]);
    const b = createVElement("div").managedContainer(manager).trackByKeyChildren([tmpChildB, movedChildB]);

    vNodeInstantiate(a, undefined);
    vNodeAttached(a);
    vNodeRender(a, 0, undefined);
    reconciler.sync(a, b, 0, undefined);

    expect(testManager).to.equal(manager);
    expect(testContainer).to.equal(b.ref);
    expect(testNode).to.equal(movedChildB);
    expect(testNextRef).to.be.null;
    expect(testOwner).to.be.undefined;
  });

  it("should invoke replaceChild", () => {
    let testManager: ContainerManager<any> | null = null;
    let testContainer: Element | null = null;
    let testNewNode: VNode | null = null;
    let testRefNode: VNode | null = null;
    let testOwner: Component<any, any> | undefined | null = null;

    const CM = new ContainerManagerDescriptor()
      .replaceChild((manager: ContainerManager<any>, container: Element, newNode: VNode, refNode: VNode,
          renderFlags: number, owner: Component<any, any> | undefined) => {
        testManager = manager;
        testContainer = container;
        testNewNode = newNode;
        testRefNode = refNode;
        testOwner = owner;
      });

    const manager = CM.create();
    const replacedChild = createVElement("div");
    const tmpChild = createVElement("span");
    const a = createVElement("div").managedContainer(manager).children([tmpChild]);
    const b = createVElement("div").managedContainer(manager).children([replacedChild]);

    vNodeInstantiate(a, undefined);
    vNodeAttached(a);
    vNodeRender(a, 0, undefined);
    reconciler.sync(a, b, 0, undefined);

    expect(testManager).to.equal(manager);
    expect(testContainer).to.equal(b.ref);
    expect(testNewNode).to.equal(replacedChild);
    expect(testRefNode).to.equal(tmpChild);
    expect(testOwner).to.be.undefined;
  });
});
