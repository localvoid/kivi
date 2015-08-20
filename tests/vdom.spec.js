goog.require('kivi');

function injectVNode(parent, node, nextRef) {
  node.create(null);
  parent.insertBefore(node.ref, nextRef);
  node.render(null);
}

function ee(key, c) {
  return kivi.createElement('div').key(key).children(c === void 0 ? null : c);
}

function ei(c) {
  return kivi.createElement('div').children(c === void 0 ? null : c);
}

function gen(item, keys) {
  if (typeof item === 'number') {
    return keys ? kivi.createText(item.toString()).key(item.toString()) : kivi.createText(item.toString());
  } else if (Array.isArray(item)) {
    var result = [];
    for (var i = 0; i < item.length; i++) {
      result.push(gen(item[i]));
    }
    return result;
  } else {
    var e = keys ? kivi.createElement('div').key(item.key) : kivi.createElement('div');
    e.children(gen(item.children));
    return e;
  }
}

function checkInnerHtmlEquals(ax, bx) {
  var a = kivi.createElement('div').key(0);
  var b = kivi.createElement('div').key(0);
  a.children = ax;
  b.children = bx;

  var aDiv = document.createElement('div');
  var bDiv = document.createElement('div');
  injectVNode(aDiv, a, null);
  injectVNode(bDiv, b, null);

  a.update(b, null);

  expect(aDiv.innerHTML).to.be.equal(bDiv.innerHTML);
}

describe('render', function() {
  it('should create empty div', function() {
    var f = document.createDocumentFragment();
    var a = kivi.createElement('div');
    injectVNode(f, a, null);
    expect(f.firstChild.tagName).to.be.equal('DIV');
  });

  it('should create empty span', function() {
    var f = document.createDocumentFragment();
    var a = kivi.createElement('span');
    injectVNode(f, a, null);
    expect(f.firstChild.tagName).to.be.equal('SPAN');
  });

  it('should create div with 1 attribute', function() {
    var f = document.createDocumentFragment();
    var a = kivi.createElement('div');
    a.attrs({
      a: '1'
    });
    injectVNode(f, a, null);
    expect(f.firstChild.hasAttributes()).to.be.true();
    expect(f.firstChild.getAttribute('a')).to.be.equal('1');
  });

  it('should create div with 2 attributes', function() {
    var f = document.createDocumentFragment();
    var a = kivi.createElement('div').attrs({
      a: '1',
      b: '2'
    });
    injectVNode(f, a, null);
    expect(f.firstChild.hasAttributes()).to.be.true();
    expect(f.firstChild.getAttribute('a')).to.be.equal('1');
    expect(f.firstChild.getAttribute('b')).to.be.equal('2');
  });

  it('should create div with 1 style', function() {
    var f = document.createDocumentFragment();
    var a = kivi.createElement('div').style({
      top: '10px'
    });
    injectVNode(f, a, null);
    expect(f.firstChild.style.top).to.be.equal('10px');
  });

  it('should create div with 2 styles', function() {
    var f = document.createDocumentFragment();
    var a = kivi.createElement('div').style({
      top: '10px',
      left: '20px'
    });
    injectVNode(f, a, null);
    expect(f.firstChild.style.top).to.be.equal('10px');
    expect(f.firstChild.style.left).to.be.equal('20px');
  });

  it('should create div with 1 class', function() {
    var f = document.createDocumentFragment();
    var a = kivi.createElement('div').classes(['a']);
    injectVNode(f, a, null);
    expect(f.firstChild.classList.length).to.be.equal(1);
    expect(f.firstChild.classList[0]).to.be.equal('a');
  });

  it('should create div with 2 classes', function() {
    var f = document.createDocumentFragment();
    var a = kivi.createElement('div').classes(['a', 'b']);
    injectVNode(f, a, null);
    expect(f.firstChild.classList.length).to.be.equal(2);
    expect(f.firstChild.classList[0]).to.be.equal('a');
    expect(f.firstChild.classList[1]).to.be.equal('b');
  });

  it('should create div with 1 child', function() {
    var f = document.createDocumentFragment();
    var a = kivi.createElement('div').children([kivi.createElement('span')]);
    injectVNode(f, a, null);
    expect(f.firstChild.childNodes.length).to.be.equal(1);
  });

  it('should create div with 2 children', function() {
    var f = document.createDocumentFragment();
    var a = kivi.createElement('div').children([
      kivi.createElement('span'),
      kivi.createElement('span')
    ]);
    injectVNode(f, a, null);
    expect(f.firstChild.childNodes.length).to.be.equal(2);
  });
});

describe('update attrs', function() {
  it('null => null', function() {
    var f = document.createDocumentFragment();
    var a = kivi.createElement('div');
    var b = kivi.createElement('div');
    injectVNode(f, a, null);
    a.update(b, null);
    expect(f.firstChild.hasAttributes()).to.be.false();
  });

  it('null => {}', function() {
    var f = document.createDocumentFragment();
    var a = kivi.createElement('div');
    var b = kivi.createElement('div').attrs({});
    injectVNode(f, a, null);
    a.update(b, null);
    expect(f.firstChild.hasAttributes()).to.be.false();
  });

  it('{} => null', function() {
    var f = document.createDocumentFragment();
    var a = kivi.createElement('div').attrs({});
    var b = kivi.createElement('div');
    injectVNode(f, a, null);
    a.update(b, null);
    expect(f.firstChild.hasAttributes()).to.be.false();
  });

  it('{} => {}', function() {
    var f = document.createDocumentFragment();
    var a = kivi.createElement('div').attrs({});
    var b = kivi.createElement('div').attrs({});
    injectVNode(f, a, null);
    a.update(b, null);
    expect(f.firstChild.hasAttributes()).to.be.false();
  });

  it('null => {a: 1}', function() {
    var f = document.createDocumentFragment();
    var a = kivi.createElement('div');
    var b = kivi.createElement('div').attrs({a: '1'});
    injectVNode(f, a, null);
    a.update(b, null);
    expect(f.firstChild.hasAttributes()).to.be.true();
    expect(f.firstChild.getAttribute('a')).to.be.equal('1');
  });

  it('{} => {a: 1}', function() {
    var f = document.createDocumentFragment();
    var a = kivi.createElement('div').attrs({});
    var b = kivi.createElement('div').attrs({a: '1'});
    injectVNode(f, a, null);
    a.update(b, null);
    expect(f.firstChild.hasAttributes()).to.be.true();
    expect(f.firstChild.getAttribute('a')).to.be.equal('1');
  });

  it('{} => {a: 1, b: 2}', function() {
    var f = document.createDocumentFragment();
    var a = kivi.createElement('div').attrs({});
    var b = kivi.createElement('div').attrs({a: '1', b: '2'});
    injectVNode(f, a, null);
    a.update(b, null);
    expect(f.firstChild.hasAttributes()).to.be.true();
    expect(f.firstChild.getAttribute('a')).to.be.equal('1');
    expect(f.firstChild.getAttribute('b')).to.be.equal('2');
  });

  it('{} => {a: 1, b: 2, c: 3}', function() {
    var f = document.createDocumentFragment();
    var a = kivi.createElement('div').attrs({});
    var b = kivi.createElement('div').attrs({a: '1', b: '2', c: '3'});
    injectVNode(f, a, null);
    a.update(b, null);
    expect(f.firstChild.hasAttributes()).to.be.true();
    expect(f.firstChild.getAttribute('a')).to.be.equal('1');
    expect(f.firstChild.getAttribute('b')).to.be.equal('2');
    expect(f.firstChild.getAttribute('c')).to.be.equal('3');
  });

  it('{a: 1} => null', function() {
    var f = document.createDocumentFragment();
    var a = kivi.createElement('div').attrs({a: '1'});
    var b = kivi.createElement('div');
    injectVNode(f, a, null);
    a.update(b, null);
    expect(f.firstChild.hasAttributes()).to.be.false();
  });

  it('{a: 1} => {}', function() {
    var f = document.createDocumentFragment();
    var a = kivi.createElement('div').attrs({a: '1'});
    var b = kivi.createElement('div').attrs({});
    injectVNode(f, a, null);
    a.update(b, null);
    expect(f.firstChild.hasAttributes()).to.be.false();
  });

  it('{a: 1, b: 2} => {}', function() {
    var f = document.createDocumentFragment();
    var a = kivi.createElement('div').attrs({a: '1', b: '2'});
    var b = kivi.createElement('div').attrs({});
    injectVNode(f, a, null);
    a.update(b, null);
    expect(f.firstChild.hasAttributes()).to.be.false();
  });

  it('{a: 1} => {b: 2}', function() {
    var f = document.createDocumentFragment();
    var a = kivi.createElement('div').attrs({a: '1'});
    var b = kivi.createElement('div').attrs({b: '2'});
    injectVNode(f, a, null);
    a.update(b, null);
    expect(f.firstChild.hasAttributes()).to.be.true();
    expect(f.firstChild.hasAttribute('a')).to.be.false();
    expect(f.firstChild.getAttribute('b')).to.be.equal('2');
  });

  it('{a: 1, b: 2} => {c: 3: d: 4}', function() {
    var f = document.createDocumentFragment();
    var a = kivi.createElement('div').attrs({a: '1', b: '2'});
    var b = kivi.createElement('div').attrs({c: '3', d: '4'});
    injectVNode(f, a, null);
    a.update(b, null);
    expect(f.firstChild.hasAttributes()).to.be.true();
    expect(f.firstChild.hasAttribute('a')).to.be.false();
    expect(f.firstChild.hasAttribute('b')).to.be.false();
    expect(f.firstChild.getAttribute('c')).to.be.equal('3');
    expect(f.firstChild.getAttribute('d')).to.be.equal('4');
  });

  it('{a: 1} => {a: 10}', function() {
    var f = document.createDocumentFragment();
    var a = kivi.createElement('div').attrs({a: '1'});
    var b = kivi.createElement('div').attrs({a: '10'});
    injectVNode(f, a, null);
    a.update(b, null);
    expect(f.firstChild.hasAttributes()).to.be.true();
    expect(f.firstChild.getAttribute('a')).to.be.equal('10');
  });

  it('{a: 1, b: 2} => {a: 10, b: 20}', function() {
    var f = document.createDocumentFragment();
    var a = kivi.createElement('div').attrs({a: '1', b: '2'});
    var b = kivi.createElement('div').attrs({a: '10', b: '20'});
    injectVNode(f, a, null);
    a.update(b, null);
    expect(f.firstChild.hasAttributes()).to.be.true();
    expect(f.firstChild.getAttribute('a')).to.be.equal('10');
    expect(f.firstChild.getAttribute('b')).to.be.equal('20');
  });
});

describe('update classes', function() {
  it('null => null', function() {
    var f = document.createDocumentFragment();
    var a = kivi.createElement('div');
    var b = kivi.createElement('div');
    injectVNode(f, a, null);
    a.update(b, null);
    expect(f.firstChild.classList.length).to.be.equal(0);
  });

  it('null => []', function() {
    var f = document.createDocumentFragment();
    var a = kivi.createElement('div');
    var b = kivi.createElement('div').classes([]);
    injectVNode(f, a, null);
    a.update(b, null);
    expect(f.firstChild.classList.length).to.be.equal(0);
  });

  it('[] => null', function() {
    var f = document.createDocumentFragment();
    var a = kivi.createElement('div').classes([]);
    var b = kivi.createElement('div');
    injectVNode(f, a, null);
    a.update(b, null);
    expect(f.firstChild.classList.length).to.be.equal(0);
  });

  it('[] => []', function() {
    var f = document.createDocumentFragment();
    var a = kivi.createElement('div').classes([]);
    var b = kivi.createElement('div').classes([]);
    injectVNode(f, a, null);
    a.update(b, null);
    expect(f.firstChild.classList.length).to.be.equal(0);
  });

  it('null => [1]', function() {
    var f = document.createDocumentFragment();
    var a = kivi.createElement('div');
    var b = kivi.createElement('div').classes(['1']);
    injectVNode(f, a, null);
    a.update(b, null);
    expect(f.firstChild.classList.length).to.be.equal(1);
    expect(f.firstChild.classList[0]).to.be.equal('1');
  });

  it('[] => [1]', function() {
    var f = document.createDocumentFragment();
    var a = kivi.createElement('div').classes([]);
    var b = kivi.createElement('div').classes(['1']);
    injectVNode(f, a, null);
    a.update(b, null);
    expect(f.firstChild.classList.length).to.be.equal(1);
    expect(f.firstChild.classList[0]).to.be.equal('1');
  });

  it('[] => [1, 2]', function() {
    var f = document.createDocumentFragment();
    var a = kivi.createElement('div').classes([]);
    var b = kivi.createElement('div').classes(['1', '2']);
    injectVNode(f, a, null);
    a.update(b, null);
    expect(f.firstChild.classList.length).to.be.equal(2);
    expect(f.firstChild.classList[0]).to.be.equal('1');
    expect(f.firstChild.classList[1]).to.be.equal('2');
  });

  it('[1] => null', function() {
    var f = document.createDocumentFragment();
    var a = kivi.createElement('div').classes(['1']);
    var b = kivi.createElement('div');
    injectVNode(f, a, null);
    a.update(b, null);
    expect(f.firstChild.classList.length).to.be.equal(0);
  });

  it('[1] => []', function() {
    var f = document.createDocumentFragment();
    var a = kivi.createElement('div').classes(['1']);
    var b = kivi.createElement('div').classes([]);
    injectVNode(f, a, null);
    a.update(b, null);
    expect(f.firstChild.classList.length).to.be.equal(0);
  });

  it('[1, 2] => []', function() {
    var f = document.createDocumentFragment();
    var a = kivi.createElement('div').classes(['1', '2']);
    var b = kivi.createElement('div').classes([]);
    injectVNode(f, a, null);
    a.update(b, null);
    expect(f.firstChild.classList.length).to.be.equal(0);
  });

  it('[1] => [10]', function() {
    var f = document.createDocumentFragment();
    var a = kivi.createElement('div').classes(['1']);
    var b = kivi.createElement('div').classes(['10']);
    injectVNode(f, a, null);
    a.update(b, null);
    expect(f.firstChild.classList.length).to.be.equal(1);
    expect(f.firstChild.classList[0]).to.be.equal('10');
  });

  it('[1, 2] => [10, 20]', function() {
    var f = document.createDocumentFragment();
    var a = kivi.createElement('div').classes(['1', '2']);
    var b = kivi.createElement('div').classes(['10', '20']);
    injectVNode(f, a, null);
    a.update(b, null);
    expect(f.firstChild.classList.length).to.be.equal(2);
    expect(f.firstChild.classList[0]).to.be.equal('10');
    expect(f.firstChild.classList[1]).to.be.equal('20');
  });

  it('[1, 2, 3, 4, 5] => [10, 20, 30, 40, 50]', function() {
    var f = document.createDocumentFragment();
    var a = kivi.createElement('div').classes(['1', '2', '3', '4', '5']);
    var b = kivi.createElement('div').classes(['10', '20', '30', '40', '50']);
    injectVNode(f, a, null);
    a.update(b, null);
    expect(f.firstChild.classList.length).to.be.equal(5);
    expect(f.firstChild.classList[0]).to.be.equal('10');
    expect(f.firstChild.classList[1]).to.be.equal('20');
    expect(f.firstChild.classList[2]).to.be.equal('30');
    expect(f.firstChild.classList[3]).to.be.equal('40');
    expect(f.firstChild.classList[4]).to.be.equal('50');
  });
});

describe('update style', function() {
  it('null => null', function() {
    var f = document.createDocumentFragment();
    var a = kivi.createElement('div');
    var b = kivi.createElement('div');
    injectVNode(f, a, null);
    a.update(b, null);
    expect(f.firstChild.style.cssText).to.be.empty();
  });

  it('null => {}', function() {
    var f = document.createDocumentFragment();
    var a = kivi.createElement('div');
    var b = kivi.createElement('div').style({});
    injectVNode(f, a, null);
    a.update(b, null);
    expect(f.firstChild.style.cssText).to.be.empty();
  });

  it('{} => {}', function() {
    var f = document.createDocumentFragment();
    var a = kivi.createElement('div').style({});
    var b = kivi.createElement('div').style({});
    injectVNode(f, a, null);
    a.update(b, null);
    expect(f.firstChild.style.cssText).to.be.empty();
  });

  it('{} => null', function() {
    var f = document.createDocumentFragment();
    var a = kivi.createElement('div').style({});
    var b = kivi.createElement('div');
    injectVNode(f, a, null);
    a.update(b, null);
    expect(f.firstChild.style.cssText).to.be.empty();
  });

  it('null => {top: 10px}', function() {
    var f = document.createDocumentFragment();
    var a = kivi.createElement('div');
    var b = kivi.createElement('div').style({top: '10px'});
    injectVNode(f, a, null);
    a.update(b, null);
    expect(f.firstChild.style.top).to.be.equal('10px');
  });

  it('{} => {top: 10px}', function() {
    var f = document.createDocumentFragment();
    var a = kivi.createElement('div').style({});
    var b = kivi.createElement('div').style({top: '10px'});
    injectVNode(f, a, null);
    a.update(b, null);
    expect(f.firstChild.style.top).to.be.equal('10px');
  });

  it('{} => {top: 10px, left: 10px}', function() {
    var f = document.createDocumentFragment();
    var a = kivi.createElement('div').style({});
    var b = kivi.createElement('div').style({top: '10px', left: '5px'});
    injectVNode(f, a, null);
    a.update(b, null);
    expect(f.firstChild.style.top).to.be.equal('10px');
    expect(f.firstChild.style.left).to.be.equal('5px');
  });

  it('{top: 10px} => null', function() {
    var f = document.createDocumentFragment();
    var a = kivi.createElement('div');
    var b = kivi.createElement('div');
    a.style_ = {top: '10px'};
    injectVNode(f, a, null);
    a.update(b, null);
    expect(f.firstChild.style.top).to.be.equal('');
  });

  it('{top: 10px} => {}', function() {
    var f = document.createDocumentFragment();
    var a = kivi.createElement('div').style({top: '10px'});
    var b = kivi.createElement('div').style({});
    injectVNode(f, a, null);
    a.update(b, null);
    expect(f.firstChild.style.top).to.be.equal('');
  });

  it('{top: 10px, left: 5px} => {}', function() {
    var f = document.createDocumentFragment();
    var a = kivi.createElement('div').style({top: '10px', left: '5px'});
    var b = kivi.createElement('div').style({});
    injectVNode(f, a, null);
    a.update(b, null);
    expect(f.firstChild.style.top).to.be.equal('');
    expect(f.firstChild.style.left).to.be.equal('');
  });

  it('{top: 10px} => {left: 20px}', function() {
    var f = document.createDocumentFragment();
    var a = kivi.createElement('div').style({top: '10px'});
    var b = kivi.createElement('div').style({left: '20px'});
    injectVNode(f, a, null);
    a.update(b, null);
    expect(f.firstChild.style.top).to.be.equal('');
    expect(f.firstChild.style.left).to.be.equal('20px');
  });

  it('{top: 10px, left: 20px} => {right: 30px, bottom: 40px}', function() {
    var f = document.createDocumentFragment();
    var a = kivi.createElement('div').style({top: '10px', left: '20px'});
    var b = kivi.createElement('div').style({right: '30px', bottom: '40px'});
    injectVNode(f, a, null);
    a.update(b, null);
    expect(f.firstChild.style.top).to.be.equal('');
    expect(f.firstChild.style.left).to.be.equal('');
    expect(f.firstChild.style.right).to.be.equal('30px');
    expect(f.firstChild.style.bottom).to.be.equal('40px');
  });

  it('{top: 10px} => {top: 100px}', function() {
    var f = document.createDocumentFragment();
    var a = kivi.createElement('div').style({top: '10px'});
    var b = kivi.createElement('div').style({top: '100px'});
    injectVNode(f, a, null);
    a.update(b, null);
    expect(f.firstChild.style.top).to.be.equal('100px');
  });

  it('{top: 10px, left: 20px} => {top: 100px, left: 200px}', function() {
    var f = document.createDocumentFragment();
    var a = kivi.createElement('div').style({top: '10px', left: '20px'});
    var b = kivi.createElement('div').style({top: '100px', left: '200px'});
    injectVNode(f, a, null);
    a.update(b, null);
    expect(f.firstChild.style.top).to.be.equal('100px');
    expect(f.firstChild.style.left).to.be.equal('200px');
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

describe('updateExplicitKeys()', function() {
  TESTS.forEach(function(t) {
    var name = JSON.stringify(t[0]) + ' => ' + JSON.stringify(t[1]);
    var testFn = function() { checkInnerHtmlEquals(gen(t[0], true), gen(t[1], true)); };

    if (t.length === 3 && t[2].only === true) {
      it.only(name, testFn);
    } else {
      it(name, testFn);
    }
  });
});

describe('updateImplicitKeys()', function() {
  TESTS.forEach(function(t) {
    var name = JSON.stringify(t[0]) + ' => ' + JSON.stringify(t[1]);
    var testFn = function() { checkInnerHtmlEquals(gen(t[0], false), gen(t[1], false)); };

    if (t.length === 3 && t[2].only === true) {
      it.only(name, testFn);
    } else {
      it(name, testFn);
    }
  });
});
