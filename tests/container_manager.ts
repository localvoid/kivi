import {ContainerManager, ContainerManagerDescriptor} from '../lib/container_manager';
import {VNode, createVElement} from '../lib/vnode';
import {Component} from '../lib/component';

describe('ContainerManager', () => {
  it('should invoke insertChild', () => {
    let testManager: ContainerManager = null;
    let testContainer: Element = null;
    let testNode: VNode = null;
    let testNextRef: Node = null;
    let testOwner: Component = null;

    const CM = new ContainerManagerDescriptor()
      .insertChild((manager: ContainerManager, container: Element, node: VNode, nextRef: Node, owner: Component, renderFlags: number) => {
        testManager = manager;
        testContainer = container;
        testNode = node;
        testNextRef = nextRef;
        testOwner = owner;
      });

    const manager = CM.create(null);
    const a = createVElement('div').managedContainer(manager);
    const insertedChild = createVElement('span');
    const b = createVElement('div').managedContainer(manager).children([insertedChild]);

    a.create(null);
    a.attached();
    a.render(null, 0);
    a.sync(b, null, 0);

    expect(testManager).toBe(manager);
    expect(testContainer).toBe(b.ref);
    expect(testNode).toBe(insertedChild);
    expect(testNextRef).toBeNull();
    expect(testOwner).toBeNull()
  });

  it('should invoke removeChild', () => {
    let testManager: ContainerManager = null;
    let testContainer: Element = null;
    let testNode: VNode = null;
    let testOwner: Component = null;

    const CM = new ContainerManagerDescriptor()
      .removeChild((manager: ContainerManager, container: Element, node: VNode, owner: Component, renderFlags: number) => {
        testManager = manager;
        testContainer = container;
        testNode = node;
        testOwner = owner;
      });

    const manager = CM.create(null);
    const removedChild = createVElement('span');
    const a = createVElement('div').managedContainer(manager).children([removedChild]);
    const b = createVElement('div').managedContainer(manager);

    a.create(null);
    a.attached();
    a.render(null, 0);
    a.sync(b, null, 0);

    expect(testManager).toBe(manager);
    expect(testContainer).toBe(b.ref);
    expect(testNode).toBe(removedChild);
    expect(testOwner).toBeNull()
  });

  it('should invoke moveChild', () => {
    let testManager: ContainerManager = null;
    let testContainer: Element = null;
    let testNode: VNode = null;
    let testNextRef: Node = null;
    let testOwner: Component = null;

    const CM = new ContainerManagerDescriptor()
      .moveChild((manager: ContainerManager, container: Element, node: VNode, nextRef: Node, owner: Component, renderFlags: number) => {
        testManager = manager;
        testContainer = container;
        testNode = node;
        testNextRef = nextRef;
        testOwner = owner;
      });

    const manager = CM.create(null);
    const movedChildA = createVElement('span').key('b');
    const movedChildB = createVElement('span').key('b');
    const tmpChildA = createVElement('span').key('a');
    const tmpChildB = createVElement('span').key('a');
    const a = createVElement('div').managedContainer(manager).trackByKeyChildren([movedChildA, tmpChildA]);
    const b = createVElement('div').managedContainer(manager).trackByKeyChildren([tmpChildB, movedChildB]);

    a.create(null);
    a.attached();
    a.render(null, 0);
    a.sync(b, null, 0);

    expect(testManager).toBe(manager);
    expect(testContainer).toBe(b.ref);
    expect(testNode).toBe(movedChildB);
    expect(testNextRef).toBeNull();
    expect(testOwner).toBeNull()
  });

  it('should invoke replaceChild', () => {
    let testManager: ContainerManager = null;
    let testContainer: Element = null;
    let testNewNode: VNode = null;
    let testRefNode: VNode = null;
    let testOwner: Component = null;

    const CM = new ContainerManagerDescriptor()
      .replaceChild((manager: ContainerManager, container: Element, newNode: VNode, refNode: VNode, owner: Component, renderFlags: number) => {
        testManager = manager;
        testContainer = container;
        testNewNode = newNode;
        testRefNode = refNode;
        testOwner = owner;
      });

    const manager = CM.create(null);
    const replacedChild = createVElement('div');
    const tmpChild = createVElement('span');
    const a = createVElement('div').managedContainer(manager).children([tmpChild]);
    const b = createVElement('div').managedContainer(manager).children([replacedChild]);

    a.create(null);
    a.attached();
    a.render(null, 0);
    a.sync(b, null, 0);

    expect(testManager).toBe(manager);
    expect(testContainer).toBe(b.ref);
    expect(testNewNode).toBe(replacedChild);
    expect(testRefNode).toBe(tmpChild);
    expect(testOwner).toBeNull()
  });
});
