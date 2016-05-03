import {ContainerManager, ContainerManagerDescriptor} from "../lib/container_manager";
import {VNode, createVElement} from "../lib/vnode";
import {Component} from "../lib/component";

describe("ContainerManager", () => {
  it("should invoke insertChild", () => {
    let testManager: ContainerManager<any> = undefined;
    let testContainer: Element = undefined;
    let testNode: VNode = undefined;
    let testNextRef: Node = undefined;
    let testOwner: Component<any, any> = undefined;

    const CM = new ContainerManagerDescriptor()
      .insertChild((manager: ContainerManager<any>, container: Element, node: VNode, nextRef: Node,
          owner: Component<any, any>, renderFlags: number) => {
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

    a.create(undefined);
    a.attached();
    a.render(undefined, 0);
    a.sync(b, undefined, 0);

    expect(testManager).toBe(manager);
    expect(testContainer).toBe(b.ref);
    expect(testNode).toBe(insertedChild);
    expect(testNextRef).toBeUndefined();
    expect(testOwner).toBeUndefined();
  });

  it("should invoke removeChild", () => {
    let testManager: ContainerManager<any> = undefined;
    let testContainer: Element = undefined;
    let testNode: VNode = undefined;
    let testOwner: Component<any, any> = undefined;

    const CM = new ContainerManagerDescriptor()
      .removeChild((manager: ContainerManager<any>, container: Element, node: VNode, owner: Component<any, any>) => {
        testManager = manager;
        testContainer = container;
        testNode = node;
        testOwner = owner;
      });

    const manager = CM.create();
    const removedChild = createVElement("span");
    const a = createVElement("div").managedContainer(manager).children([removedChild]);
    const b = createVElement("div").managedContainer(manager);

    a.create(undefined);
    a.attached();
    a.render(undefined, 0);
    a.sync(b, undefined, 0);

    expect(testManager).toBe(manager);
    expect(testContainer).toBe(b.ref);
    expect(testNode).toBe(removedChild);
    expect(testOwner).toBeUndefined();
  });

  it("should invoke moveChild", () => {
    let testManager: ContainerManager<any> = undefined;
    let testContainer: Element = undefined;
    let testNode: VNode = undefined;
    let testNextRef: Node = undefined;
    let testOwner: Component<any, any> = undefined;

    const CM = new ContainerManagerDescriptor()
      .moveChild((manager: ContainerManager<any>, container: Element, node: VNode, nextRef: Node,
          owner: Component<any, any>) => {
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

    a.create(undefined);
    a.attached();
    a.render(undefined, 0);
    a.sync(b, undefined, 0);

    expect(testManager).toBe(manager);
    expect(testContainer).toBe(b.ref);
    expect(testNode).toBe(movedChildB);
    expect(testNextRef).toBeUndefined();
    expect(testOwner).toBeUndefined();
  });

  it("should invoke replaceChild", () => {
    let testManager: ContainerManager<any> = undefined;
    let testContainer: Element = undefined;
    let testNewNode: VNode = undefined;
    let testRefNode: VNode = undefined;
    let testOwner: Component<any, any> = undefined;

    const CM = new ContainerManagerDescriptor()
      .replaceChild((manager: ContainerManager<any>, container: Element, newNode: VNode, refNode: VNode,
          owner: Component<any, any>, renderFlags: number) => {
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

    a.create(undefined);
    a.attached();
    a.render(undefined, 0);
    a.sync(b, undefined, 0);

    expect(testManager).toBe(manager);
    expect(testContainer).toBe(b.ref);
    expect(testNewNode).toBe(replacedChild);
    expect(testRefNode).toBe(tmpChild);
    expect(testOwner).toBeUndefined();
  });
});
