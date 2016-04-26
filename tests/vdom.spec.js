"use strict";
var kivi_1 = require('../lib/kivi');
function injectVNode(parent, node, nextRef) {
    node.create(null);
    parent.insertBefore(node.ref, nextRef);
    node.render(null);
}
function ee(key, c) {
    return kivi_1.createElement('div').key(key).trackByKeyChildren(c === void 0 ? null : c);
}
function ei(c) {
    return kivi_1.createElement('div').children(c === void 0 ? null : c);
}
function gen(item, keys) {
    if (typeof item === 'number') {
        return keys ? kivi_1.createText(item.toString()).key(item.toString()) : kivi_1.createText(item.toString());
    }
    else if (Array.isArray(item)) {
        var result = [];
        for (var i = 0; i < item.length; i++) {
            result.push(gen(item[i], keys));
        }
        return result;
    }
    else {
        var e = kivi_1.createElement('div').key(item.key);
        if (keys) {
            e.trackByKeyChildren(gen(item.children, keys));
        }
        else {
            e.children(gen(item.children, keys));
        }
        return e;
    }
}
function checkInnerHtmlEquals(ax, bx, cx, keys) {
    var a = kivi_1.createElement('div');
    var b = kivi_1.createElement('div');
    var c = kivi_1.createElement('div');
    if (keys) {
        a.trackByKeyChildren(ax);
        b.trackByKeyChildren(bx);
        c.trackByKeyChildren(cx);
    }
    else {
        a.children(ax).disableChildrenShapeError();
        b.children(bx).disableChildrenShapeError();
        c.children(cx).disableChildrenShapeError();
    }
    var aDiv = document.createElement('div');
    var bDiv = document.createElement('div');
    injectVNode(aDiv, a, null);
    injectVNode(bDiv, b, null);
    a.sync(c, null);
    expect(aDiv.innerHTML).toBe(bDiv.innerHTML);
}
describe('render', function () {
    it('should create empty div', function () {
        var f = document.createDocumentFragment();
        var a = kivi_1.createElement('div');
        injectVNode(f, a, null);
        expect(f.firstChild.tagName).toBe('DIV');
    });
    it('should create empty span', function () {
        var f = document.createDocumentFragment();
        var a = kivi_1.createElement('span');
        injectVNode(f, a, null);
        expect(f.firstChild.tagName).toBe('SPAN');
    });
    it('should create div with 1 attribute', function () {
        var f = document.createDocumentFragment();
        var a = kivi_1.createElement('div');
        a.dynamicShapeAttrs({
            a: '1'
        });
        injectVNode(f, a, null);
        expect(f.firstChild.hasAttributes()).toBeTruthy();
        expect(f.firstChild.getAttribute('a')).toBe('1');
    });
    it('should create div with 2 attributes', function () {
        var f = document.createDocumentFragment();
        var a = kivi_1.createElement('div').dynamicShapeAttrs({
            a: '1',
            b: '2'
        });
        injectVNode(f, a, null);
        expect(f.firstChild.hasAttributes()).toBeTruthy();
        expect(f.firstChild.getAttribute('a')).toBe('1');
        expect(f.firstChild.getAttribute('b')).toBe('2');
    });
    it('should create div with style', function () {
        var f = document.createDocumentFragment();
        var a = kivi_1.createElement('div').style('top: 10px');
        injectVNode(f, a, null);
        expect(f.firstChild.style.top).toBe('10px');
    });
    it('should create div with className', function () {
        var f = document.createDocumentFragment();
        var a = kivi_1.createElement('div').className('a');
        injectVNode(f, a, null);
        expect(f.firstChild.classList.length).toBe(1);
        expect(f.firstChild.classList[0]).toBe('a');
    });
    it('should create div with 1 child', function () {
        var f = document.createDocumentFragment();
        var a = kivi_1.createElement('div').children([kivi_1.createElement('span')]);
        injectVNode(f, a, null);
        expect(f.firstChild.childNodes.length).toBe(1);
    });
    it('should create div with 2 children', function () {
        var f = document.createDocumentFragment();
        var a = kivi_1.createElement('div').children([
            kivi_1.createElement('span'),
            kivi_1.createElement('span')
        ]);
        injectVNode(f, a, null);
        expect(f.firstChild.childNodes.length).toBe(2);
    });
    it('should create div with child "abc"', function () {
        var f = document.createDocumentFragment();
        var a = kivi_1.createElement('div').children('abc');
        injectVNode(f, a, null);
        expect(f.firstChild.childNodes.length).toBe(1);
        expect(f.firstChild.firstChild.nodeValue).toBe('abc');
    });
});
describe('update attrs', function () {
    it('null => null', function () {
        var f = document.createDocumentFragment();
        var a = kivi_1.createElement('div');
        var b = kivi_1.createElement('div');
        injectVNode(f, a, null);
        a.sync(b, null);
        expect(f.firstChild.hasAttributes()).toBeFalsy();
    });
    it('null => {}', function () {
        var f = document.createDocumentFragment();
        var a = kivi_1.createElement('div').dynamicShapeAttrs(null);
        var b = kivi_1.createElement('div').dynamicShapeAttrs({});
        injectVNode(f, a, null);
        a.sync(b, null);
        expect(f.firstChild.hasAttributes()).toBeFalsy();
    });
    it('{} => null', function () {
        var f = document.createDocumentFragment();
        var a = kivi_1.createElement('div').dynamicShapeAttrs({});
        var b = kivi_1.createElement('div').dynamicShapeAttrs(null);
        injectVNode(f, a, null);
        a.sync(b, null);
        expect(f.firstChild.hasAttributes()).toBeFalsy();
    });
    it('{} => {}', function () {
        var f = document.createDocumentFragment();
        var a = kivi_1.createElement('div').dynamicShapeAttrs({});
        var b = kivi_1.createElement('div').dynamicShapeAttrs({});
        injectVNode(f, a, null);
        a.sync(b, null);
        expect(f.firstChild.hasAttributes()).toBeFalsy();
    });
    it('null => {a: 1}', function () {
        var f = document.createDocumentFragment();
        var a = kivi_1.createElement('div').dynamicShapeAttrs(null);
        var b = kivi_1.createElement('div').dynamicShapeAttrs({ a: '1' });
        injectVNode(f, a, null);
        a.sync(b, null);
        expect(f.firstChild.hasAttributes()).toBeTruthy();
        expect(f.firstChild.getAttribute('a')).toBe('1');
    });
    it('{} => {a: 1}', function () {
        var f = document.createDocumentFragment();
        var a = kivi_1.createElement('div').dynamicShapeAttrs({});
        var b = kivi_1.createElement('div').dynamicShapeAttrs({ a: '1' });
        injectVNode(f, a, null);
        a.sync(b, null);
        expect(f.firstChild.hasAttributes()).toBeTruthy();
        expect(f.firstChild.getAttribute('a')).toBe('1');
    });
    it('{} => {a: 1, b: 2}', function () {
        var f = document.createDocumentFragment();
        var a = kivi_1.createElement('div').dynamicShapeAttrs({});
        var b = kivi_1.createElement('div').dynamicShapeAttrs({ a: '1', b: '2' });
        injectVNode(f, a, null);
        a.sync(b, null);
        expect(f.firstChild.hasAttributes()).toBeTruthy();
        expect(f.firstChild.getAttribute('a')).toBe('1');
        expect(f.firstChild.getAttribute('b')).toBe('2');
    });
    it('{} => {a: 1, b: 2, c: 3}', function () {
        var f = document.createDocumentFragment();
        var a = kivi_1.createElement('div').dynamicShapeAttrs({});
        var b = kivi_1.createElement('div').dynamicShapeAttrs({ a: '1', b: '2', c: '3' });
        injectVNode(f, a, null);
        a.sync(b, null);
        expect(f.firstChild.hasAttributes()).toBeTruthy();
        expect(f.firstChild.getAttribute('a')).toBe('1');
        expect(f.firstChild.getAttribute('b')).toBe('2');
        expect(f.firstChild.getAttribute('c')).toBe('3');
    });
    it('{a: 1} => null', function () {
        var f = document.createDocumentFragment();
        var a = kivi_1.createElement('div').dynamicShapeAttrs({ a: '1' });
        var b = kivi_1.createElement('div').dynamicShapeAttrs(null);
        injectVNode(f, a, null);
        a.sync(b, null);
        expect(f.firstChild.hasAttributes()).toBeFalsy();
    });
    it('{a: 1} => {}', function () {
        var f = document.createDocumentFragment();
        var a = kivi_1.createElement('div').dynamicShapeAttrs({ a: '1' });
        var b = kivi_1.createElement('div').dynamicShapeAttrs({});
        injectVNode(f, a, null);
        a.sync(b, null);
        expect(f.firstChild.hasAttributes()).toBeFalsy();
    });
    it('{a: 1, b: 2} => {}', function () {
        var f = document.createDocumentFragment();
        var a = kivi_1.createElement('div').dynamicShapeAttrs({ a: '1', b: '2' });
        var b = kivi_1.createElement('div').dynamicShapeAttrs({});
        injectVNode(f, a, null);
        a.sync(b, null);
        expect(f.firstChild.hasAttributes()).toBeFalsy();
    });
    it('{a: 1} => {b: 2}', function () {
        var f = document.createDocumentFragment();
        var a = kivi_1.createElement('div').dynamicShapeAttrs({ a: '1' });
        var b = kivi_1.createElement('div').dynamicShapeAttrs({ b: '2' });
        injectVNode(f, a, null);
        a.sync(b, null);
        expect(f.firstChild.hasAttributes()).toBeTruthy();
        expect(f.firstChild.hasAttribute('a')).toBeFalsy();
        expect(f.firstChild.getAttribute('b')).toBe('2');
    });
    it('{a: 1, b: 2} => {c: 3: d: 4}', function () {
        var f = document.createDocumentFragment();
        var a = kivi_1.createElement('div').dynamicShapeAttrs({ a: '1', b: '2' });
        var b = kivi_1.createElement('div').dynamicShapeAttrs({ c: '3', d: '4' });
        injectVNode(f, a, null);
        a.sync(b, null);
        expect(f.firstChild.hasAttributes()).toBeTruthy();
        expect(f.firstChild.hasAttribute('a')).toBeFalsy();
        expect(f.firstChild.hasAttribute('b')).toBeFalsy();
        expect(f.firstChild.getAttribute('c')).toBe('3');
        expect(f.firstChild.getAttribute('d')).toBe('4');
    });
    it('{a: 1} => {a: 10}', function () {
        var f = document.createDocumentFragment();
        var a = kivi_1.createElement('div').dynamicShapeAttrs({ a: '1' });
        var b = kivi_1.createElement('div').dynamicShapeAttrs({ a: '10' });
        injectVNode(f, a, null);
        a.sync(b, null);
        expect(f.firstChild.hasAttributes()).toBeTruthy();
        expect(f.firstChild.getAttribute('a')).toBe('10');
    });
    it('{a: 1, b: 2} => {a: 10, b: 20}', function () {
        var f = document.createDocumentFragment();
        var a = kivi_1.createElement('div').dynamicShapeAttrs({ a: '1', b: '2' });
        var b = kivi_1.createElement('div').dynamicShapeAttrs({ a: '10', b: '20' });
        injectVNode(f, a, null);
        a.sync(b, null);
        expect(f.firstChild.hasAttributes()).toBeTruthy();
        expect(f.firstChild.getAttribute('a')).toBe('10');
        expect(f.firstChild.getAttribute('b')).toBe('20');
    });
});
describe('update classes', function () {
    it('null => null', function () {
        var f = document.createDocumentFragment();
        var a = kivi_1.createElement('div');
        var b = kivi_1.createElement('div');
        injectVNode(f, a, null);
        a.sync(b, null);
        expect(f.firstChild.classList.length).toBe(0);
    });
    it('null => [1]', function () {
        var f = document.createDocumentFragment();
        var a = kivi_1.createElement('div');
        var b = kivi_1.createElement('div').className('1');
        injectVNode(f, a, null);
        a.sync(b, null);
        expect(f.firstChild.classList.length).toBe(1);
        expect(f.firstChild.classList[0]).toBe('1');
    });
    it('[1] => null', function () {
        var f = document.createDocumentFragment();
        var a = kivi_1.createElement('div').className('1');
        var b = kivi_1.createElement('div');
        injectVNode(f, a, null);
        a.sync(b, null);
        expect(f.firstChild.classList.length).toBe(0);
    });
    it('null => [1, 2]', function () {
        var f = document.createDocumentFragment();
        var a = kivi_1.createElement('div');
        var b = kivi_1.createElement('div').className('1 2');
        injectVNode(f, a, null);
        a.sync(b, null);
        expect(f.firstChild.classList.length).toBe(2);
        expect(f.firstChild.classList[0]).toBe('1');
        expect(f.firstChild.classList[1]).toBe('2');
    });
});
describe('update style', function () {
    it('null => null', function () {
        var f = document.createDocumentFragment();
        var a = kivi_1.createElement('div');
        var b = kivi_1.createElement('div');
        injectVNode(f, a, null);
        a.sync(b, null);
        expect(f.firstChild.style.cssText).toBe('');
    });
    it('null => {top: 10px}', function () {
        var f = document.createDocumentFragment();
        var a = kivi_1.createElement('div');
        var b = kivi_1.createElement('div').style('top: 10px');
        injectVNode(f, a, null);
        a.sync(b, null);
        expect(f.firstChild.style.top).toBe('10px');
    });
    it('{top: 10px} => null', function () {
        var f = document.createDocumentFragment();
        var a = kivi_1.createElement('div');
        var b = kivi_1.createElement('div');
        a.style('top: 10px');
        injectVNode(f, a, null);
        a.sync(b, null);
        expect(f.firstChild.style.top).toBe('');
    });
    it('null => {top: 10px, left: 20px}', function () {
        var f = document.createDocumentFragment();
        var a = kivi_1.createElement('div');
        var b = kivi_1.createElement('div').style('top: 10px; left: 20px');
        injectVNode(f, a, null);
        a.sync(b, null);
        expect(f.firstChild.style.top).toBe('10px');
        expect(f.firstChild.style.left).toBe('20px');
    });
});
var TESTS = [
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
describe('syncChildren string children', function () {
    it('null => "abc"', function () {
        var f = document.createDocumentFragment();
        var a = kivi_1.createElement('div');
        var b = kivi_1.createElement('div').children('abc');
        injectVNode(f, a, null);
        a.sync(b, null);
        expect(f.firstChild.childNodes.length).toBe(1);
        expect(f.firstChild.firstChild.nodeValue).toBe('abc');
    });
    it('"abc" => null', function () {
        var f = document.createDocumentFragment();
        var a = kivi_1.createElement('div').children('abc');
        var b = kivi_1.createElement('div');
        injectVNode(f, a, null);
        a.sync(b, null);
        expect(f.firstChild.childNodes.length).toBe(0);
    });
    it('"abc" => "cde"', function () {
        var f = document.createDocumentFragment();
        var a = kivi_1.createElement('div').children('abc');
        var b = kivi_1.createElement('div').children('cde');
        injectVNode(f, a, null);
        a.sync(b, null);
        expect(f.firstChild.childNodes.length).toBe(1);
        expect(f.firstChild.firstChild.nodeValue).toBe('cde');
    });
    it('[div] => "cde"', function () {
        var f = document.createDocumentFragment();
        var a = kivi_1.createElement('div').children([kivi_1.createElement('div')]);
        var b = kivi_1.createElement('div').children('cde');
        injectVNode(f, a, null);
        a.sync(b, null);
        expect(f.firstChild.childNodes.length).toBe(1);
        expect(f.firstChild.firstChild.nodeValue).toBe('cde');
    });
    it('[div, div] => "cde"', function () {
        var f = document.createDocumentFragment();
        var a = kivi_1.createElement('div').children([kivi_1.createElement('div'), kivi_1.createElement('div')]);
        var b = kivi_1.createElement('div').children('cde');
        injectVNode(f, a, null);
        a.sync(b, null);
        expect(f.firstChild.childNodes.length).toBe(1);
        expect(f.firstChild.firstChild.nodeValue).toBe('cde');
    });
    it('"cde" => [div]', function () {
        var f = document.createDocumentFragment();
        var a = kivi_1.createElement('div').children('cde');
        var b = kivi_1.createElement('div').children([kivi_1.createElement('div')]);
        injectVNode(f, a, null);
        a.sync(b, null);
        expect(f.firstChild.childNodes.length).toBe(1);
        expect(f.firstChild.firstChild.tagName).toBe('DIV');
    });
    it('"cde" => [div, span]', function () {
        var f = document.createDocumentFragment();
        var a = kivi_1.createElement('div').children('cde');
        var b = kivi_1.createElement('div').children([kivi_1.createElement('div'), kivi_1.createElement('span')]);
        injectVNode(f, a, null);
        a.sync(b, null);
        expect(f.firstChild.childNodes.length).toBe(2);
        expect(f.firstChild.firstChild.tagName).toBe('DIV');
        expect(f.firstChild.lastChild.tagName).toBe('SPAN');
    });
});
describe('syncChildren with keys', function () {
    TESTS.forEach(function (t) {
        var name = JSON.stringify(t[0]) + ' => ' + JSON.stringify(t[1]);
        var testFn = function () {
            checkInnerHtmlEquals(gen(t[0], true), gen(t[1], true), gen(t[1], true), true);
        };
        it(name, testFn);
    });
});
describe('syncChildren without keys', function () {
    TESTS.forEach(function (t) {
        var name = JSON.stringify(t[0]) + ' => ' + JSON.stringify(t[1]);
        var testFn = function () {
            checkInnerHtmlEquals(gen(t[0], false), gen(t[1], false), gen(t[1], false), false);
        };
        it(name, testFn);
    });
});
