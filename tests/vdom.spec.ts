import {VNode, createVElement, createVText} from '../lib/kivi';
import {LifecycleComponent} from './lifecycle';

function injectVNode(parent: DocumentFragment, node: VNode, nextRef: Element) : void {
  node.create(null);
  parent.insertBefore(node.ref, nextRef);
  node.render(null);
}

function ee(key: any, c: VNode[]) : VNode {
  return createVElement('div').key(key).trackByKeyChildren(c === void 0 ? null : c);
}

function ei(c: VNode[]) : VNode {
  return createVElement('div').children(c === void 0 ? null : c);
}

function gen(item: any, keys: boolean) : VNode|VNode[] {
  if (typeof item === 'number') {
    return keys ? createVText(item.toString()).key(item.toString()) : createVText(item.toString());
  } else if (Array.isArray(item)) {
    let result: VNode[] = [];
    for (let i = 0; i < item.length; i++) {
      result.push(gen(item[i], keys) as VNode);
    }
    return result;
  } else {
    let e = createVElement('div').key(item.key);
    if (keys) {
      e.trackByKeyChildren(gen(item.children, keys) as VNode[]);
    } else {
      e.children(gen(item.children, keys) as VNode[]);
    }
    return e;
  }
}

function checkInnerHtmlEquals(ax: VNode[], bx: VNode[], cx: VNode[], keys: boolean) : void {
  const a = createVElement('div');
  const b = createVElement('div');
  const c = createVElement('div');

  if (keys) {
    a.trackByKeyChildren(ax);
    b.trackByKeyChildren(bx);
    c.trackByKeyChildren(cx);
  } else {
    a.children(ax).disableChildrenShapeError();
    b.children(bx).disableChildrenShapeError();
    c.children(cx).disableChildrenShapeError();
  }

  const aDiv = document.createElement('div');
  const bDiv = document.createElement('div');
  injectVNode(aDiv, a, null);
  injectVNode(bDiv, b, null);

  a.sync(c, null);

  expect(aDiv.innerHTML).toBe(bDiv.innerHTML)
}

describe('VNode', () => {
  describe('render', () => {
    it('should create empty div', () => {
      let f = document.createDocumentFragment();
      let a = createVElement('div');
      injectVNode(f, a, null);
      expect((f.firstChild as Element).tagName).toBe('DIV');
    });

    it('should create empty span', () => {
      const f = document.createDocumentFragment();
      const a = createVElement('span');
      injectVNode(f, a, null);
      expect((f.firstChild as Element).tagName).toBe('SPAN');
    });

    it('should create div with 1 attribute', () => {
      const f = document.createDocumentFragment();
      const a = createVElement('div');
      a.dynamicShapeAttrs({
        a: '1'
      });
      injectVNode(f, a, null);
      expect((f.firstChild as Element).hasAttributes()).toBeTruthy();
      expect((f.firstChild as Element).getAttribute('a')).toBe('1');
    });

    it('should create div with 2 attributes', () => {
      const f = document.createDocumentFragment();
      const a = createVElement('div').dynamicShapeAttrs({
        a: '1',
        b: '2'
      });
      injectVNode(f, a, null);
      expect((f.firstChild as Element).hasAttributes()).toBeTruthy();
      expect((f.firstChild as Element).getAttribute('a')).toBe('1');
      expect((f.firstChild as Element).getAttribute('b')).toBe('2');
    });

    it('should create div with style', () => {
      const f = document.createDocumentFragment();
      const a = createVElement('div').style('top: 10px');
      injectVNode(f, a, null);
      expect((f.firstChild as HTMLElement).style.top).toBe('10px');
    });

    it('should create div with className', () => {
      const f = document.createDocumentFragment();
      const a = createVElement('div').className('a');
      injectVNode(f, a, null);
      expect((f.firstChild as Element).classList.length).toBe(1);
      expect((f.firstChild as Element).classList[0]).toBe('a');
    });

    it('should create div with 1 child', () => {
      const f = document.createDocumentFragment();
      const a = createVElement('div').children([createVElement('span')]);
      injectVNode(f, a, null);
      expect((f.firstChild as Element).childNodes.length).toBe(1);
    });

    it('should create div with 2 children', () => {
      const f = document.createDocumentFragment();
      const a = createVElement('div').children([
        createVElement('span'),
        createVElement('span')
      ]);
      injectVNode(f, a, null);
      expect((f.firstChild as Element).childNodes.length).toBe(2);
    });

    it('should create div with child "abc"', () => {
      const f = document.createDocumentFragment();
      const a = createVElement('div').children('abc');
      injectVNode(f, a, null);
      expect((f.firstChild as Element).childNodes.length).toBe(1);
      expect((f.firstChild as Element).firstChild.nodeValue).toBe('abc');
    });
  });

  describe('sync', () => {
    describe('dynamic shape attrs', () => {
      it('null => null', () => {
        const f = document.createDocumentFragment();
        const a = createVElement('div');
        const b = createVElement('div');
        injectVNode(f, a, null);
        a.sync(b, null);
        expect((f.firstChild as Element).hasAttributes()).toBeFalsy();
      });

      it('null => {}', () => {
        const f = document.createDocumentFragment();
        const a = createVElement('div').dynamicShapeAttrs(null);
        const b = createVElement('div').dynamicShapeAttrs({});
        injectVNode(f, a, null);
        a.sync(b, null);
        expect((f.firstChild as Element).hasAttributes()).toBeFalsy();
      });

      it('{} => null', () => {
        const f = document.createDocumentFragment();
        const a = createVElement('div').dynamicShapeAttrs({});
        const b = createVElement('div').dynamicShapeAttrs(null);
        injectVNode(f, a, null);
        a.sync(b, null);
        expect((f.firstChild as Element).hasAttributes()).toBeFalsy();
      });

      it('{} => {}', () => {
        const f = document.createDocumentFragment();
        const a = createVElement('div').dynamicShapeAttrs({});
        const b = createVElement('div').dynamicShapeAttrs({});
        injectVNode(f, a, null);
        a.sync(b, null);
        expect((f.firstChild as Element).hasAttributes()).toBeFalsy();
      });

      it('null => {a: 1}', () => {
        const f = document.createDocumentFragment();
        const a = createVElement('div').dynamicShapeAttrs(null);
        const b = createVElement('div').dynamicShapeAttrs({ a: '1' });
        injectVNode(f, a, null);
        a.sync(b, null);
        expect((f.firstChild as Element).hasAttributes()).toBeTruthy();
        expect((f.firstChild as Element).getAttribute('a')).toBe('1');
      });

      it('{} => {a: 1}', () => {
        const f = document.createDocumentFragment();
        const a = createVElement('div').dynamicShapeAttrs({});
        const b = createVElement('div').dynamicShapeAttrs({ a: '1' });
        injectVNode(f, a, null);
        a.sync(b, null);
        expect((f.firstChild as Element).hasAttributes()).toBeTruthy();
        expect((f.firstChild as Element).getAttribute('a')).toBe('1');
      });

      it('{} => {a: 1, b: 2}', () => {
        const f = document.createDocumentFragment();
        const a = createVElement('div').dynamicShapeAttrs({});
        const b = createVElement('div').dynamicShapeAttrs({ a: '1', b: '2' });
        injectVNode(f, a, null);
        a.sync(b, null);
        expect((f.firstChild as Element).hasAttributes()).toBeTruthy();
        expect((f.firstChild as Element).getAttribute('a')).toBe('1');
        expect((f.firstChild as Element).getAttribute('b')).toBe('2');
      });

      it('{} => {a: 1, b: 2, c: 3}', () => {
        const f = document.createDocumentFragment();
        const a = createVElement('div').dynamicShapeAttrs({});
        const b = createVElement('div').dynamicShapeAttrs({ a: '1', b: '2', c: '3' });
        injectVNode(f, a, null);
        a.sync(b, null);
        expect((f.firstChild as Element).hasAttributes()).toBeTruthy();
        expect((f.firstChild as Element).getAttribute('a')).toBe('1');
        expect((f.firstChild as Element).getAttribute('b')).toBe('2');
        expect((f.firstChild as Element).getAttribute('c')).toBe('3');
      });

      it('{a: 1} => null', () => {
        const f = document.createDocumentFragment();
        const a = createVElement('div').dynamicShapeAttrs({ a: '1' });
        const b = createVElement('div').dynamicShapeAttrs(null);
        injectVNode(f, a, null);
        a.sync(b, null);
        expect((f.firstChild as Element).hasAttributes()).toBeFalsy();
      });

      it('{a: 1} => {}', () => {
        const f = document.createDocumentFragment();
        const a = createVElement('div').dynamicShapeAttrs({ a: '1' });
        const b = createVElement('div').dynamicShapeAttrs({});
        injectVNode(f, a, null);
        a.sync(b, null);
        expect((f.firstChild as Element).hasAttributes()).toBeFalsy();
      });

      it('{a: 1, b: 2} => {}', () => {
        const f = document.createDocumentFragment();
        const a = createVElement('div').dynamicShapeAttrs({ a: '1', b: '2' });
        const b = createVElement('div').dynamicShapeAttrs({});
        injectVNode(f, a, null);
        a.sync(b, null);
        expect((f.firstChild as Element).hasAttributes()).toBeFalsy();
      });

      it('{a: 1} => {b: 2}', () => {
        const f = document.createDocumentFragment();
        const a = createVElement('div').dynamicShapeAttrs({ a: '1' });
        const b = createVElement('div').dynamicShapeAttrs({ b: '2' });
        injectVNode(f, a, null);
        a.sync(b, null);
        expect((f.firstChild as Element).hasAttributes()).toBeTruthy();
        expect((f.firstChild as Element).hasAttribute('a')).toBeFalsy();
        expect((f.firstChild as Element).getAttribute('b')).toBe('2');
      });

      it('{a: 1, b: 2} => {c: 3: d: 4}', () => {
        const f = document.createDocumentFragment();
        const a = createVElement('div').dynamicShapeAttrs({ a: '1', b: '2' });
        const b = createVElement('div').dynamicShapeAttrs({ c: '3', d: '4' });
        injectVNode(f, a, null);
        a.sync(b, null);
        expect((f.firstChild as Element).hasAttributes()).toBeTruthy();
        expect((f.firstChild as Element).hasAttribute('a')).toBeFalsy();
        expect((f.firstChild as Element).hasAttribute('b')).toBeFalsy();
        expect((f.firstChild as Element).getAttribute('c')).toBe('3');
        expect((f.firstChild as Element).getAttribute('d')).toBe('4');
      });

      it('{a: 1} => {a: 10}', () => {
        const f = document.createDocumentFragment();
        const a = createVElement('div').dynamicShapeAttrs({ a: '1' });
        const b = createVElement('div').dynamicShapeAttrs({ a: '10' });
        injectVNode(f, a, null);
        a.sync(b, null);
        expect((f.firstChild as Element).hasAttributes()).toBeTruthy();
        expect((f.firstChild as Element).getAttribute('a')).toBe('10');
      });

      it('{a: 1, b: 2} => {a: 10, b: 20}', () => {
        const f = document.createDocumentFragment();
        const a = createVElement('div').dynamicShapeAttrs({ a: '1', b: '2' });
        const b = createVElement('div').dynamicShapeAttrs({ a: '10', b: '20' });
        injectVNode(f, a, null);
        a.sync(b, null);
        expect((f.firstChild as Element).hasAttributes()).toBeTruthy();
        expect((f.firstChild as Element).getAttribute('a')).toBe('10');
        expect((f.firstChild as Element).getAttribute('b')).toBe('20');
      });
    });

    describe('className', () => {
      it('null => null', () => {
        const f = document.createDocumentFragment();
        const a = createVElement('div');
        const b = createVElement('div');
        injectVNode(f, a, null);
        a.sync(b, null);
        expect((f.firstChild as Element).classList.length).toBe(0);
      });

      it('null => [1]', () => {
        const f = document.createDocumentFragment();
        const a = createVElement('div');
        const b = createVElement('div').className('1');
        injectVNode(f, a, null);
        a.sync(b, null);
        expect((f.firstChild as Element).classList.length).toBe(1);
        expect((f.firstChild as Element).classList[0]).toBe('1');
      });

      it('[1] => null', () => {
        const f = document.createDocumentFragment();
        const a = createVElement('div').className('1');
        const b = createVElement('div');
        injectVNode(f, a, null);
        a.sync(b, null);
        expect((f.firstChild as Element).classList.length).toBe(0);
      });

      it('null => [1, 2]', () => {
        const f = document.createDocumentFragment();
        const a = createVElement('div');
        const b = createVElement('div').className('1 2');
        injectVNode(f, a, null);
        a.sync(b, null);
        expect((f.firstChild as Element).classList.length).toBe(2);
        expect((f.firstChild as Element).classList[0]).toBe('1');
        expect((f.firstChild as Element).classList[1]).toBe('2');
      });
    });

    describe('style', () => {
      it('null => null', () => {
        const f = document.createDocumentFragment();
        const a = createVElement('div');
        const b = createVElement('div');
        injectVNode(f, a, null);
        a.sync(b, null);
        expect((f.firstChild as HTMLElement).style.cssText).toBe('');
      });

      it('null => {top: 10px}', () => {
        const f = document.createDocumentFragment();
        const a = createVElement('div');
        const b = createVElement('div').style('top: 10px');
        injectVNode(f, a, null);
        a.sync(b, null);
        expect((f.firstChild as HTMLElement).style.top).toBe('10px');
      });

      it('{top: 10px} => null', () => {
        const f = document.createDocumentFragment();
        const a = createVElement('div');
        const b = createVElement('div');
        a.style('top: 10px');
        injectVNode(f, a, null);
        a.sync(b, null);
        expect((f.firstChild as HTMLElement).style.top).toBe('');
      });

      it('null => {top: 10px, left: 20px}', () => {
        const f = document.createDocumentFragment();
        const a = createVElement('div');
        const b = createVElement('div').style('top: 10px; left: 20px');
        injectVNode(f, a, null);
        a.sync(b, null);
        expect((f.firstChild as HTMLElement).style.top).toBe('10px');
        expect((f.firstChild as HTMLElement).style.left).toBe('20px');
      });
    });

    describe('children', () => {
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

        [[0, 1, { key: 2, children: [0] }],
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
          [{ key: 6, children: [{ key: 1, children: [1] }] }, 7, { key: 3, children: [1] }, { key: 2, children: [1] }, { key: 4, children: [1] }]],

        [[0, 1, { key: 2, children: [0] }, 3, { key: 4, children: [0] }, 5],
          [6, 7, 3, { key: 2, children: [] }, { key: 4, children: [] }]]
      ];

      describe('syncChildren string children', () => {
        it('null => "abc"', () => {
          const f = document.createDocumentFragment();
          const a = createVElement('div');
          const b = createVElement('div').children('abc');
          injectVNode(f, a, null);
          a.sync(b, null);
          expect((f.firstChild as Element).childNodes.length).toBe(1);
          expect((f.firstChild as Element).firstChild.nodeValue).toBe('abc');
        });

        it('"abc" => null', () => {
          const f = document.createDocumentFragment();
          const a = createVElement('div').children('abc');
          const b = createVElement('div');
          injectVNode(f, a, null);
          a.sync(b, null);
          expect((f.firstChild as Element).childNodes.length).toBe(0);
        });

        it('"abc" => "cde"', () => {
          const f = document.createDocumentFragment();
          const a = createVElement('div').children('abc');
          const b = createVElement('div').children('cde');
          injectVNode(f, a, null);
          a.sync(b, null);
          expect((f.firstChild as Element).childNodes.length).toBe(1);
          expect((f.firstChild as Element).firstChild.nodeValue).toBe('cde');
        });

        it('[div] => "cde"', () => {
          const f = document.createDocumentFragment();
          const a = createVElement('div').children([createVElement('div')]);
          const b = createVElement('div').children('cde');
          injectVNode(f, a, null);
          a.sync(b, null);
          expect((f.firstChild as Element).childNodes.length).toBe(1);
          expect((f.firstChild as Element).firstChild.nodeValue).toBe('cde');
        });

        it('[div, div] => "cde"', () => {
          const f = document.createDocumentFragment();
          const a = createVElement('div').children([createVElement('div'), createVElement('div')]);
          const b = createVElement('div').children('cde');
          injectVNode(f, a, null);
          a.sync(b, null);
          expect((f.firstChild as Element).childNodes.length).toBe(1);
          expect((f.firstChild as Element).firstChild.nodeValue).toBe('cde');
        });

        it('"cde" => [div]', () => {
          const f = document.createDocumentFragment();
          const a = createVElement('div').children('cde');
          const b = createVElement('div').children([createVElement('div')]);
          injectVNode(f, a, null);
          a.sync(b, null);
          expect((f.firstChild as Element).childNodes.length).toBe(1);
          expect((f.firstChild.firstChild as Element).tagName).toBe('DIV');
        });

        it('"cde" => [div, span]', () => {
          const f = document.createDocumentFragment();
          const a = createVElement('div').children('cde');
          const b = createVElement('div').children([createVElement('div'), createVElement('span')]);
          injectVNode(f, a, null);
          a.sync(b, null);
          expect((f.firstChild as Element).childNodes.length).toBe(2);
          expect((f.firstChild.firstChild as Element).tagName).toBe('DIV');
          expect((f.firstChild.lastChild as Element).tagName).toBe('SPAN');
        });
      });

      describe('with trackByKey', () => {
        TESTS.forEach((t) => {
          const name = JSON.stringify(t[0]) + ' => ' + JSON.stringify(t[1]);
          const testFn = () => {
            checkInnerHtmlEquals(gen(t[0], true) as VNode[],
              gen(t[1], true) as VNode[],
              gen(t[1], true) as VNode[],
              true);
          };
          it(name, testFn);
        });
      });

      describe('without trackByKey and without keys', () => {
        TESTS.forEach((t) => {
          const name = JSON.stringify(t[0]) + ' => ' + JSON.stringify(t[1]);
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

  describe('lifecycle', () => {
    it('should invoke init, attached and update hook when parent vnode is created and rendered', () => {
      const component = LifecycleComponent.createVNode();
      const node = createVElement('div').children([component]);
      node.create(null);
      node.render(null);
      expect(component.cref.state.checkInit).toBe(0);
      expect(component.cref.state.checkAttached).toBe(1);
      expect(component.cref.state.checkUpdate).toBe(2);
      expect(component.cref.state.checkDetached).toBe(-1);
      expect(component.cref.state.checkDisposed).toBe(-1);
    });

    it('should invoke detached hook when parent vnode is detached', () => {
      const component = LifecycleComponent.createVNode();
      const node = createVElement('div').children([component]);
      node.create(null);
      node.attached();
      node.render(null);
      node.detach()
      expect(component.cref.state.checkInit).toBe(0);
      expect(component.cref.state.checkAttached).toBe(1);
      expect(component.cref.state.checkUpdate).toBe(2);
      expect(component.cref.state.checkDetached).toBe(3);
      expect(component.cref.state.checkDisposed).toBe(-1);
    });

    it('should invoke attached hook when parent vnode is detached and attached', () => {
      const component = LifecycleComponent.createVNode();
      const node = createVElement('div').children([component]);
      node.create(null);
      node.attached();
      node.render(null);
      node.detach()
      node.attach();
      expect(component.cref.state.checkInit).toBe(0);
      expect(component.cref.state.checkAttached).toBe(4);
      expect(component.cref.state.checkUpdate).toBe(2);
      expect(component.cref.state.checkDetached).toBe(3);
      expect(component.cref.state.checkDisposed).toBe(-1);
    });

    it('should invoke detached and disposed hook when parent vnode is disposed in attached state', () => {
      const component = LifecycleComponent.createVNode();
      const node = createVElement('div').children([component]);
      node.create(null);
      node.attached();
      node.render(null);
      node.dispose();
      expect(component.cref.state.checkInit).toBe(0);
      expect(component.cref.state.checkAttached).toBe(1);
      expect(component.cref.state.checkUpdate).toBe(2);
      expect(component.cref.state.checkDetached).toBe(3);
      expect(component.cref.state.checkDisposed).toBe(4);
    });

    it('should invoke disposed hook when parent vnode is disposed in detached state', () => {
      const component = LifecycleComponent.createVNode();
      const node = createVElement('div').children([component]);
      node.create(null);
      node.attached();
      node.render(null);
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

    it('shouldn\'t dispose keep alive nodes', () => {
      const component = LifecycleComponent.createVNode().keepAlive();
      const node = createVElement('div').children([component]);
      node.create(null);
      node.attached();
      node.render(null);
      node.dispose();
      expect(component.cref.state.checkInit).toBe(0);
      expect(component.cref.state.checkAttached).toBe(1);
      expect(component.cref.state.checkUpdate).toBe(2);
      expect(component.cref.state.checkDetached).toBe(3);
      expect(component.cref.state.checkDisposed).toBe(-1);
    });

    it('should reattach the same keep alive node without updating (bind-once)', () => {
      const component = LifecycleComponent.createVNode().keepAlive();
      const a = createVElement('div').children([component]);
      const b = createVElement('div');
      const c = createVElement('div').children([component]);
      a.create(null);
      a.attached();
      a.render(null);
      a.sync(b, null);
      expect(component.cref.state.checkInit).toBe(0);
      expect(component.cref.state.checkAttached).toBe(1);
      expect(component.cref.state.checkUpdate).toBe(2);
      expect(component.cref.state.checkDetached).toBe(3);
      expect(component.cref.state.checkDisposed).toBe(-1);

      b.sync(c, null);
      expect(component.cref.state.checkInit).toBe(0);
      expect(component.cref.state.checkAttached).toBe(4);
      expect(component.cref.state.checkUpdate).toBe(2);
      expect(component.cref.state.checkDetached).toBe(3);
      expect(component.cref.state.checkDisposed).toBe(-1);

      expect(c.ref.firstChild).toBe(component.ref);
    });
  });
});
