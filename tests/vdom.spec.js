goog.provide('tests');
goog.require('kivi.VNode');

var VNode = kivi.VNode;

function injectVNode(parent, node, nextRef) {
  node.create(null);
  parent.insertBefore(node.ref, nextRef);
  node.render(null);
}

function ee(key, c) {
  return VNode.createElement('div').key(key).trackByKey().children(c === void 0 ? null : c);
}

function ei(c) {
  return VNode.createElement('div').children(c === void 0 ? null : c);
}

function gen(item, keys) {
  if (typeof item === 'number') {
    return keys ? VNode.createText(item.toString()).key(item.toString()) : VNode.createText(item.toString());
  } else if (Array.isArray(item)) {
    var result = [];
    for (var i = 0; i < item.length; i++) {
      result.push(gen(item[i]));
    }
    return result;
  } else {
    var e = keys ? VNode.createElement('div').key(item.key) : VNode.createElement('div');
    e.children(gen(item.children));
    if (keys) {
      e.trackByKey();
    }
    return e;
  }
}

function checkInnerHtmlEquals(ax, bx, cx) {
  var a = VNode.createElement('div');
  var b = VNode.createElement('div');
  var c = VNode.createElement('div');
  a.children = ax;
  b.children = bx;
  c.children = cx;

  var aDiv = document.createElement('div');
  var bDiv = document.createElement('div');
  injectVNode(aDiv, a, null);
  injectVNode(bDiv, b, null);

  a.sync(c, null);

  assert.equal(aDiv.innerHTML, bDiv.innerHTML);
}

describe('render', function() {
  it('should create empty div', function() {
    var f = document.createDocumentFragment();
    var a = VNode.createElement('div');
    injectVNode(f, a, null);
    assert.equal(f.firstChild.tagName, 'DIV');
  });

  it('should create empty span', function() {
    var f = document.createDocumentFragment();
    var a = VNode.createElement('span');
    injectVNode(f, a, null);
    assert.equal(f.firstChild.tagName, 'SPAN');
  });

  it('should create div with 1 attribute', function() {
    var f = document.createDocumentFragment();
    var a = VNode.createElement('div');
    a.dynamicShapeAttrs({
      a: '1'
    });
    injectVNode(f, a, null);
    assert.isTrue(f.firstChild.hasAttributes());
    assert.equal(f.firstChild.getAttribute('a'), '1');
  });

  it('should create div with 2 attributes', function() {
    var f = document.createDocumentFragment();
    var a = VNode.createElement('div').dynamicShapeAttrs({
      a: '1',
      b: '2'
    });
    injectVNode(f, a, null);
    assert.isTrue(f.firstChild.hasAttributes());
    assert.equal(f.firstChild.getAttribute('a'), '1');
    assert.equal(f.firstChild.getAttribute('b'), '2');
  });

  it('should create div with style', function() {
    var f = document.createDocumentFragment();
    var a = VNode.createElement('div').style('top: 10px');
    injectVNode(f, a, null);
    assert.equal(f.firstChild.style.top, '10px');
  });

  it('should create div with className', function() {
    var f = document.createDocumentFragment();
    var a = VNode.createElement('div').classes('a');
    injectVNode(f, a, null);
    assert.equal(f.firstChild.classList.length, 1);
    assert.equal(f.firstChild.classList[0], 'a');
  });

  it('should create div with 1 child', function() {
    var f = document.createDocumentFragment();
    var a = VNode.createElement('div').children([VNode.createElement('span')]);
    injectVNode(f, a, null);
    assert.equal(f.firstChild.childNodes.length, 1);
  });

  it('should create div with 2 children', function() {
    var f = document.createDocumentFragment();
    var a = VNode.createElement('div').children([
      VNode.createElement('span'),
      VNode.createElement('span')
    ]);
    injectVNode(f, a, null);
    assert.equal(f.firstChild.childNodes.length, 2);
  });

  it('should create div with child "abc"', function() {
    var f = document.createDocumentFragment();
    var a = VNode.createElement('div').children('abc');
    injectVNode(f, a, null);
    assert.equal(f.firstChild.childNodes.length, 1);
    assert.equal(f.firstChild.firstChild.nodeValue, 'abc');
  });
});

describe('update attrs', function() {
  it('null => null', function() {
    var f = document.createDocumentFragment();
    var a = VNode.createElement('div');
    var b = VNode.createElement('div');
    injectVNode(f, a, null);
    a.sync(b, null);
    assert.isFalse(f.firstChild.hasAttributes());
  });

  it('null => {}', function() {
    var f = document.createDocumentFragment();
    var a = VNode.createElement('div').dynamicShapeAttrs(null);
    var b = VNode.createElement('div').dynamicShapeAttrs({});
    injectVNode(f, a, null);
    a.sync(b, null);
    assert.isFalse(f.firstChild.hasAttributes());
  });

  it('{} => null', function() {
    var f = document.createDocumentFragment();
    var a = VNode.createElement('div').dynamicShapeAttrs({});
    var b = VNode.createElement('div').dynamicShapeAttrs(null);
    injectVNode(f, a, null);
    a.sync(b, null);
    assert.isFalse(f.firstChild.hasAttributes());
  });

  it('{} => {}', function() {
    var f = document.createDocumentFragment();
    var a = VNode.createElement('div').dynamicShapeAttrs({});
    var b = VNode.createElement('div').dynamicShapeAttrs({});
    injectVNode(f, a, null);
    a.sync(b, null);
    assert.isFalse(f.firstChild.hasAttributes());
  });

  it('null => {a: 1}', function() {
    var f = document.createDocumentFragment();
    var a = VNode.createElement('div').dynamicShapeAttrs(null);
    var b = VNode.createElement('div').dynamicShapeAttrs({a: '1'});
    injectVNode(f, a, null);
    a.sync(b, null);
    assert.isTrue(f.firstChild.hasAttributes());
    assert.equal(f.firstChild.getAttribute('a'), '1');
  });

  it('{} => {a: 1}', function() {
    var f = document.createDocumentFragment();
    var a = VNode.createElement('div').dynamicShapeAttrs({});
    var b = VNode.createElement('div').dynamicShapeAttrs({a: '1'});
    injectVNode(f, a, null);
    a.sync(b, null);
    assert.isTrue(f.firstChild.hasAttributes());
    assert.equal(f.firstChild.getAttribute('a'), '1');
  });

  it('{} => {a: 1, b: 2}', function() {
    var f = document.createDocumentFragment();
    var a = VNode.createElement('div').dynamicShapeAttrs({});
    var b = VNode.createElement('div').dynamicShapeAttrs({a: '1', b: '2'});
    injectVNode(f, a, null);
    a.sync(b, null);
    assert.isTrue(f.firstChild.hasAttributes());
    assert.equal(f.firstChild.getAttribute('a'), '1');
    assert.equal(f.firstChild.getAttribute('b'), '2');
  });

  it('{} => {a: 1, b: 2, c: 3}', function() {
    var f = document.createDocumentFragment();
    var a = VNode.createElement('div').dynamicShapeAttrs({});
    var b = VNode.createElement('div').dynamicShapeAttrs({a: '1', b: '2', c: '3'});
    injectVNode(f, a, null);
    a.sync(b, null);
    assert.isTrue(f.firstChild.hasAttributes());
    assert.equal(f.firstChild.getAttribute('a'), '1');
    assert.equal(f.firstChild.getAttribute('b'), '2');
    assert.equal(f.firstChild.getAttribute('c'), '3');
  });

  it('{a: 1} => null', function() {
    var f = document.createDocumentFragment();
    var a = VNode.createElement('div').dynamicShapeAttrs({a: '1'});
    var b = VNode.createElement('div').dynamicShapeAttrs(null);
    injectVNode(f, a, null);
    a.sync(b, null);
    assert.isFalse(f.firstChild.hasAttributes());
  });

  it('{a: 1} => {}', function() {
    var f = document.createDocumentFragment();
    var a = VNode.createElement('div').dynamicShapeAttrs({a: '1'});
    var b = VNode.createElement('div').dynamicShapeAttrs({});
    injectVNode(f, a, null);
    a.sync(b, null);
    assert.isFalse(f.firstChild.hasAttributes());
  });

  it('{a: 1, b: 2} => {}', function() {
    var f = document.createDocumentFragment();
    var a = VNode.createElement('div').dynamicShapeAttrs({a: '1', b: '2'});
    var b = VNode.createElement('div').dynamicShapeAttrs({});
    injectVNode(f, a, null);
    a.sync(b, null);
    assert.isFalse(f.firstChild.hasAttributes());
  });

  it('{a: 1} => {b: 2}', function() {
    var f = document.createDocumentFragment();
    var a = VNode.createElement('div').dynamicShapeAttrs({a: '1'});
    var b = VNode.createElement('div').dynamicShapeAttrs({b: '2'});
    injectVNode(f, a, null);
    a.sync(b, null);
    assert.isTrue(f.firstChild.hasAttributes());
    assert.isFalse(f.firstChild.hasAttribute('a'));
    assert.equal(f.firstChild.getAttribute('b'), '2');
  });

  it('{a: 1, b: 2} => {c: 3: d: 4}', function() {
    var f = document.createDocumentFragment();
    var a = VNode.createElement('div').dynamicShapeAttrs({a: '1', b: '2'});
    var b = VNode.createElement('div').dynamicShapeAttrs({c: '3', d: '4'});
    injectVNode(f, a, null);
    a.sync(b, null);
    assert.isTrue(f.firstChild.hasAttributes());
    assert.isFalse(f.firstChild.hasAttribute('a'));
    assert.isFalse(f.firstChild.hasAttribute('b'));
    assert.equal(f.firstChild.getAttribute('c'), '3');
    assert.equal(f.firstChild.getAttribute('d'), '4');
  });

  it('{a: 1} => {a: 10}', function() {
    var f = document.createDocumentFragment();
    var a = VNode.createElement('div').dynamicShapeAttrs({a: '1'});
    var b = VNode.createElement('div').dynamicShapeAttrs({a: '10'});
    injectVNode(f, a, null);
    a.sync(b, null);
    assert.isTrue(f.firstChild.hasAttributes());
    assert.equal(f.firstChild.getAttribute('a'), '10');
  });

  it('{a: 1, b: 2} => {a: 10, b: 20}', function() {
    var f = document.createDocumentFragment();
    var a = VNode.createElement('div').dynamicShapeAttrs({a: '1', b: '2'});
    var b = VNode.createElement('div').dynamicShapeAttrs({a: '10', b: '20'});
    injectVNode(f, a, null);
    a.sync(b, null);
    assert.isTrue(f.firstChild.hasAttributes());
    assert.equal(f.firstChild.getAttribute('a'), '10');
    assert.equal(f.firstChild.getAttribute('b'), '20');
  });
});

describe('update classes', function() {
  it('null => null', function() {
    var f = document.createDocumentFragment();
    var a = VNode.createElement('div');
    var b = VNode.createElement('div');
    injectVNode(f, a, null);
    a.sync(b, null);
    assert.equal(f.firstChild.classList.length, 0);
  });

  it('null => [1]', function() {
    var f = document.createDocumentFragment();
    var a = VNode.createElement('div');
    var b = VNode.createElement('div').classes('1');
    injectVNode(f, a, null);
    a.sync(b, null);
    assert.equal(f.firstChild.classList.length, 1);
    assert.equal(f.firstChild.classList[0], '1');
  });

  it('[1] => null', function() {
    var f = document.createDocumentFragment();
    var a = VNode.createElement('div').classes('1');
    var b = VNode.createElement('div');
    injectVNode(f, a, null);
    a.sync(b, null);
    assert.equal(f.firstChild.classList.length, 0);
  });

  it('null => [1, 2]', function() {
    var f = document.createDocumentFragment();
    var a = VNode.createElement('div');
    var b = VNode.createElement('div').classes('1 2');
    injectVNode(f, a, null);
    a.sync(b, null);
    assert.equal(f.firstChild.classList.length, 2);
    assert.equal(f.firstChild.classList[0], '1');
    assert.equal(f.firstChild.classList[1], '2');
  });

});

describe('update style', function() {
  it('null => null', function() {
    var f = document.createDocumentFragment();
    var a = VNode.createElement('div');
    var b = VNode.createElement('div');
    injectVNode(f, a, null);
    a.sync(b, null);
    assert.equal(f.firstChild.style.cssText, '');
  });

  it('null => {top: 10px}', function() {
    var f = document.createDocumentFragment();
    var a = VNode.createElement('div');
    var b = VNode.createElement('div').style('top: 10px');
    injectVNode(f, a, null);
    a.sync(b, null);
    assert.equal(f.firstChild.style.top, '10px');
  });

  it('{top: 10px} => null', function() {
    var f = document.createDocumentFragment();
    var a = VNode.createElement('div');
    var b = VNode.createElement('div');
    a.style_ = 'top: 10px';
    injectVNode(f, a, null);
    a.sync(b, null);
    assert.equal(f.firstChild.style.top, '');
  });

  it('null => {top: 10px, left: 20px}', function() {
    var f = document.createDocumentFragment();
    var a = VNode.createElement('div');
    var b = VNode.createElement('div').style('top: 10px; left: 20px');
    injectVNode(f, a, null);
    a.sync(b, null);
    assert.equal(f.firstChild.style.top, '10px');
    assert.equal(f.firstChild.style.left, '20px');
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

  [[{key: 0, children: [0]}],
    [{key: 0, children: []}]],

  [[0, 1, {key: 2, children: [0]}],
    [{key: 2, children: []}]],

  [[{key: 0, children: []}],
    [1, 2, {key: 0, children: [0]}]],

  [[0, {key: 1, children: [0, 1]}, 2],
    [3, 2, {key: 1, children: [1, 0]}]],

  [[0, {key: 1, children: [0, 1]}, 2],
    [2, {key: 1, children: [1, 0]}, 3]],

  [[{key: 1, children: [0, 1]}, {key: 2, children: [0, 1]}, 0],
    [{key: 2, children: [1, 0]}, {key: 1, children: [1, 0]}, 3]],

  [[{key: 1, children: [0, 1]}, {key: 2, children: []}, 0],
    [3, {key: 2, children: [1, 0]}, {key: 1, children: []}]],

  [[0, {key: 1, children: []}, 2, {key: 3, children: [1, 0]}, 4, 5],
    [6, {key: 1, children: [0, 1]}, {key: 3, children: []}, 2, 4, 7]],

  [[0, {key: 1, children: []}, {key: 2, children: []}, {key: 3, children: []}, {key: 4, children: []}, 5],
    [{key: 6, children: [{key: 1, children: [1]}]}, 7, {key: 3, children: [1]}, {key: 2, children: [1]}, {key: 4, children: [1]}]],

  [[0, 1, {key: 2, children: [0]}, 3, {key: 4, children: [0]}, 5],
    [6, 7, 3, {key: 2, children: []}, {key: 4, children: []}]]
];

describe('syncChildren string children', function() {
  it('null => "abc"', function() {
    var f = document.createDocumentFragment();
    var a = VNode.createElement('div');
    var b = VNode.createElement('div').children('abc');
    injectVNode(f, a, null);
    a.sync(b, null);
    assert.equal(f.firstChild.childNodes.length, 1);
    assert.equal(f.firstChild.firstChild.nodeValue, 'abc');
  });

  it('"abc" => null', function() {
    var f = document.createDocumentFragment();
    var a = VNode.createElement('div').children('abc');
    var b = VNode.createElement('div');
    injectVNode(f, a, null);
    a.sync(b, null);
    assert.equal(f.firstChild.childNodes.length, 0);
  });

  it('"abc" => "cde"', function() {
    var f = document.createDocumentFragment();
    var a = VNode.createElement('div').children('abc');
    var b = VNode.createElement('div').children('cde');
    injectVNode(f, a, null);
    a.sync(b, null);
    console.log(f);
    assert.equal(f.firstChild.childNodes.length, 1);
    assert.equal(f.firstChild.firstChild.nodeValue, 'cde');
  });

  it('[div] => "cde"', function() {
    var f = document.createDocumentFragment();
    var a = VNode.createElement('div').children([VNode.createElement('div')]);
    var b = VNode.createElement('div').children('cde');
    injectVNode(f, a, null);
    a.sync(b, null);
    assert.equal(f.firstChild.childNodes.length, 1);
    assert.equal(f.firstChild.firstChild.nodeValue, 'cde');
  });

  it('[div, div] => "cde"', function() {
    var f = document.createDocumentFragment();
    var a = VNode.createElement('div').children([VNode.createElement('div'), VNode.createElement('div')]);
    var b = VNode.createElement('div').children('cde');
    injectVNode(f, a, null);
    a.sync(b, null);
    assert.equal(f.firstChild.childNodes.length, 1);
    assert.equal(f.firstChild.firstChild.nodeValue, 'cde');
  });

  it('"cde" => [div]', function() {
    var f = document.createDocumentFragment();
    var a = VNode.createElement('div').children('cde');
    var b = VNode.createElement('div').children([VNode.createElement('div')]);
    injectVNode(f, a, null);
    a.sync(b, null);
    assert.equal(f.firstChild.childNodes.length, 1);
    assert.equal(f.firstChild.firstChild.tagName, 'DIV');
  });

  it('"cde" => [div, span]', function() {
    var f = document.createDocumentFragment();
    var a = VNode.createElement('div').children('cde');
    var b = VNode.createElement('div').children([VNode.createElement('div'), VNode.createElement('span')]);
    injectVNode(f, a, null);
    a.sync(b, null);
    assert.equal(f.firstChild.childNodes.length, 2);
    assert.equal(f.firstChild.firstChild.tagName, 'DIV');
    assert.equal(f.firstChild.lastChild.tagName, 'SPAN');
  });
});

describe('syncChildren with keys', function() {
  TESTS.forEach(function(t) {
    var name = JSON.stringify(t[0]) + ' => ' + JSON.stringify(t[1]);
    var testFn = function() { checkInnerHtmlEquals(gen(t[0], true), gen(t[1], true), gen(t[1], true)); };

    if (t.length === 3 && t[2].only === true) {
      it.only(name, testFn);
    } else {
      it(name, testFn);
    }
  });
});

describe('syncChildren without keys', function() {
  TESTS.forEach(function(t) {
    var name = JSON.stringify(t[0]) + ' => ' + JSON.stringify(t[1]);
    var testFn = function() { checkInnerHtmlEquals(gen(t[0], false), gen(t[1], false), gen(t[1], false)); };

    if (t.length === 3 && t[2].only === true) {
      it.only(name, testFn);
    } else {
      it(name, testFn);
    }
  });
});
