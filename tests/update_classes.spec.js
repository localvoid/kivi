'use strict';

var vdom = require('../lib/vdom');

var ATTACHED_CONTEXT = {flags: vdom.Component.ATTACHED};

function injectBefore(parent, node, nextRef) {
  vdom.create(node, ATTACHED_CONTEXT);
  parent.insertBefore(node.ref, nextRef);
  vdom.render(node, ATTACHED_CONTEXT);
}

describe('update classes', function() {
  it('null => null', function() {
    var f = document.createDocumentFragment();
    var a = vdom.e('div');
    var b = vdom.e('div');
    injectBefore(f, a, null);
    vdom.update(a, b, ATTACHED_CONTEXT);
    expect(f.firstChild.classList.length).to.be.equal(0);
  });

  it('null => []', function() {
    var f = document.createDocumentFragment();
    var a = vdom.e('div');
    var b = vdom.e('div');
    b.classes = [];
    injectBefore(f, a, null);
    vdom.update(a, b, ATTACHED_CONTEXT);
    expect(f.firstChild.classList.length).to.be.equal(0);
  });

  it('[] => null', function() {
    var f = document.createDocumentFragment();
    var a = vdom.e('div');
    var b = vdom.e('div');
    a.classes = [];
    injectBefore(f, a, null);
    vdom.update(a, b, ATTACHED_CONTEXT);
    expect(f.firstChild.classList.length).to.be.equal(0);
  });

  it('[] => []', function() {
    var f = document.createDocumentFragment();
    var a = vdom.e('div');
    var b = vdom.e('div');
    a.classes = [];
    b.classes = [];
    injectBefore(f, a, null);
    vdom.update(a, b, ATTACHED_CONTEXT);
    expect(f.firstChild.classList.length).to.be.equal(0);
  });

  it('null => [1]', function() {
    var f = document.createDocumentFragment();
    var a = vdom.e('div');
    var b = vdom.e('div');
    b.classes = ['1'];
    injectBefore(f, a, null);
    vdom.update(a, b, ATTACHED_CONTEXT);
    expect(f.firstChild.classList.length).to.be.equal(1);
    expect(f.firstChild.classList[0]).to.be.equal('1');
  });

  it('[] => [1]', function() {
    var f = document.createDocumentFragment();
    var a = vdom.e('div');
    var b = vdom.e('div');
    a.classes = [];
    b.classes = ['1'];
    injectBefore(f, a, null);
    vdom.update(a, b, ATTACHED_CONTEXT);
    expect(f.firstChild.classList.length).to.be.equal(1);
    expect(f.firstChild.classList[0]).to.be.equal('1');
  });

  it('[] => [1, 2]', function() {
    var f = document.createDocumentFragment();
    var a = vdom.e('div');
    var b = vdom.e('div');
    a.classes = [];
    b.classes = ['1', '2'];
    injectBefore(f, a, null);
    vdom.update(a, b, ATTACHED_CONTEXT);
    expect(f.firstChild.classList.length).to.be.equal(2);
    expect(f.firstChild.classList[0]).to.be.equal('1');
    expect(f.firstChild.classList[1]).to.be.equal('2');
  });

  it('[1] => null', function() {
    var f = document.createDocumentFragment();
    var a = vdom.e('div');
    var b = vdom.e('div');
    a.classes = ['1'];
    injectBefore(f, a, null);
    vdom.update(a, b, ATTACHED_CONTEXT);
    expect(f.firstChild.classList.length).to.be.equal(0);
  });

  it('[1] => []', function() {
    var f = document.createDocumentFragment();
    var a = vdom.e('div');
    var b = vdom.e('div');
    a.classes = ['1'];
    b.classes = [];
    injectBefore(f, a, null);
    vdom.update(a, b, ATTACHED_CONTEXT);
    expect(f.firstChild.classList.length).to.be.equal(0);
  });

  it('[1, 2] => []', function() {
    var f = document.createDocumentFragment();
    var a = vdom.e('div');
    var b = vdom.e('div');
    a.classes = ['1', '2'];
    b.classes = [];
    injectBefore(f, a, null);
    vdom.update(a, b, ATTACHED_CONTEXT);
    expect(f.firstChild.classList.length).to.be.equal(0);
  });

  it('[1] => [10]', function() {
    var f = document.createDocumentFragment();
    var a = vdom.e('div');
    var b = vdom.e('div');
    a.classes = ['1'];
    b.classes = ['10'];
    injectBefore(f, a, null);
    vdom.update(a, b, ATTACHED_CONTEXT);
    expect(f.firstChild.classList.length).to.be.equal(1);
    expect(f.firstChild.classList[0]).to.be.equal('10');
  });

  it('[1, 2] => [10, 20]', function() {
    var f = document.createDocumentFragment();
    var a = vdom.e('div');
    var b = vdom.e('div');
    a.classes = ['1', '2'];
    b.classes = ['10', '20'];
    injectBefore(f, a, null);
    vdom.update(a, b, ATTACHED_CONTEXT);
    expect(f.firstChild.classList.length).to.be.equal(2);
    expect(f.firstChild.classList[0]).to.be.equal('10');
    expect(f.firstChild.classList[1]).to.be.equal('20');
  });

  it('[1, 2, 3, 4, 5] => [10, 20, 30, 40, 50]', function() {
    var f = document.createDocumentFragment();
    var a = vdom.e('div');
    var b = vdom.e('div');
    a.classes = ['1', '2', '3', '4', '5'];
    b.classes = ['10', '20', '30', '40', '50'];
    injectBefore(f, a, null);
    vdom.update(a, b, ATTACHED_CONTEXT);
    expect(f.firstChild.classList.length).to.be.equal(5);
    expect(f.firstChild.classList[0]).to.be.equal('10');
    expect(f.firstChild.classList[1]).to.be.equal('20');
    expect(f.firstChild.classList[2]).to.be.equal('30');
    expect(f.firstChild.classList[3]).to.be.equal('40');
    expect(f.firstChild.classList[4]).to.be.equal('50');
  });
});
