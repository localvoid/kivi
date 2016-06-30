import {ContainerManager, ContainerManagerDescriptor} from "../lib/container_manager";
import {VNode, vNodeInstantiate, vNodeAttached, vNodeRender, createVElement} from "../lib/vnode";
import {syncVNodes} from "../lib/reconciler";

const expect = chai.expect;

describe("ContainerManager", () => {
  it("should invoke createNode", () => {
    let testManager: ContainerManager<void, void> | null = null;
    let testNode: VNode | null = null;

    const CM = new ContainerManagerDescriptor<void, void>()
      .createChild((manager: ContainerManager<void, void>, node: VNode) => {
        testManager = manager;
        testNode = node;
      });

    const manager = CM.create();
    const a = createVElement("div").managedContainer(manager);
    const insertedChild = createVElement("span");
    const b = createVElement("div").managedContainer(manager).children([insertedChild]);

    vNodeInstantiate(a, undefined);
    vNodeAttached(a);
    vNodeRender(a, undefined);
    syncVNodes(a, b, undefined);

    expect(testManager).to.equal(manager);
    expect(testNode).to.equal(insertedChild);
  });

  it("should invoke removeNode", () => {
    let testManager: ContainerManager<void, void> | null = null;
    let testNode: VNode | null = null;

    const CM = new ContainerManagerDescriptor<void, void>()
      .createChild((manager: ContainerManager<void, void>, node: VNode) => {
        // noop
      })
      .removeChild((manager: ContainerManager<void, void>, node: VNode) => {
        testManager = manager;
        testNode = node;
        return true;
      });

    const manager = CM.create();
    const removedChild = createVElement("span");
    const a = createVElement("div").managedContainer(manager).children([removedChild]);
    const b = createVElement("div").managedContainer(manager);

    vNodeInstantiate(a, undefined);
    vNodeAttached(a);
    vNodeRender(a, undefined);
    syncVNodes(a, b, undefined);

    expect(testManager).to.equal(manager);
    expect(testNode).to.equal(removedChild);
  });

  it("should invoke moveNode", () => {
    let testManager: ContainerManager<void, void> | null = null;
    let testNode: VNode | null = null;

    const CM = new ContainerManagerDescriptor<void, void>()
      .createChild((manager: ContainerManager<void, void>, node: VNode) => {
        // noop
      })
      .moveChild((manager: ContainerManager<void, void>, node: VNode) => {
        testManager = manager;
        testNode = node;
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
    vNodeRender(a, undefined);
    syncVNodes(a, b, undefined);

    expect(testManager).to.equal(manager);
    expect(testNode).to.equal(movedChildB);
  });

  it("should invoke createNode when replacing", () => {
    let testManager: ContainerManager<void, void> | null = null;
    let testNode: VNode | null = null;

    const CM = new ContainerManagerDescriptor<void, void>()
      .createChild((manager: ContainerManager<void, void>, node: VNode) => {
        testManager = manager;
        testNode = node;
      });

    const manager = CM.create();
    const replacedChild = createVElement("div");
    const tmpChild = createVElement("span");
    const a = createVElement("div").managedContainer(manager).children([tmpChild]);
    const b = createVElement("div").managedContainer(manager).children([replacedChild]);

    vNodeInstantiate(a, undefined);
    vNodeAttached(a);
    vNodeRender(a, undefined);
    syncVNodes(a, b, undefined);

    expect(testManager).to.equal(manager);
    expect(testNode).to.equal(replacedChild);
  });
});
