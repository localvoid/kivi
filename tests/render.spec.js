'use strict';

var vdom = require('../lib/vdom');

function injectBefore(parent, node, nextRef) {
  vdom.create(node, null);
  parent.insertBefore(node.ref, nextRef);
  vdom.render(node, null);
}

describe('render', function() {
  it('should create empty div', function() {
    var f = document.createDocumentFragment('div');
    var a = vdom.e('div');
    injectBefore(f, a, null);
    expect(f.firstChild.tagName).to.be.equal('DIV');
  });

  it('should create empty span', function() {
    var f = document.createDocumentFragment('div');
    var a = vdom.e('span');
    injectBefore(f, a, null);
    expect(f.firstChild.tagName).to.be.equal('SPAN');
  });

  it('should create div with 1 attribute', function() {
    var f = document.createDocumentFragment('div');
    var a = vdom.e('div');
    a.attrs = {
      a: '1'
    };
    injectBefore(f, a, null);
    expect(f.firstChild.hasAttributes()).to.be.true();
    expect(f.firstChild.getAttribute('a')).to.be.equal('1');
  });

  it('should create div with 2 attributes', function() {
    var f = document.createDocumentFragment('div');
    var a = vdom.e('div');
    a.attrs = {
      a: '1',
      b: '2'
    };
    injectBefore(f, a, null);
    expect(f.firstChild.hasAttributes()).to.be.true();
    expect(f.firstChild.getAttribute('a')).to.be.equal('1');
    expect(f.firstChild.getAttribute('b')).to.be.equal('2');
  });

  it('should create div with 1 style', function() {
    var f = document.createDocumentFragment('div');
    var a = vdom.e('div');
    a.style = {
      top: '10px'
    };
    injectBefore(f, a, null);
    expect(f.firstChild.style.top).to.be.equal('10px');
  });

  it('should create div with 2 styles', function() {
    var f = document.createDocumentFragment('div');
    var a = vdom.e('div');
    a.style = {
      top: '10px',
      left: '20px'
    };
    injectBefore(f, a, null);
    expect(f.firstChild.style.top).to.be.equal('10px');
    expect(f.firstChild.style.left).to.be.equal('20px');
  });

  it('should create div with 1 class', function() {
    var f = document.createDocumentFragment('div');
    var a = vdom.e('div');
    a.classes = ['a'];
    injectBefore(f, a, null);
    expect(f.firstChild.classList.length).to.be.equal(1);
    expect(f.firstChild.classList[0]).to.be.equal('a');
  });

  it('should create div with 2 classes', function() {
    var f = document.createDocumentFragment('div');
    var a = vdom.e('div');
    a.classes = ['a', 'b'];
    injectBefore(f, a, null);
    expect(f.firstChild.classList.length).to.be.equal(2);
    expect(f.firstChild.classList[0]).to.be.equal('a');
    expect(f.firstChild.classList[1]).to.be.equal('b');
  });

  it('should create div with 1 child', function() {
    var f = document.createDocumentFragment('div');
    var a = vdom.e('div');
    var b = vdom.e('span');
    a.children = [b];
    injectBefore(f, a, null);
    expect(f.firstChild.childNodes.length).to.be.equal(1);
  });

  it('should create div with 2 children', function() {
    var f = document.createDocumentFragment('div');
    var a = vdom.e('div');
    var b = vdom.e('span');
    var c = vdom.e('span');
    a.children = [b, c];
    injectBefore(f, a, null);
    expect(f.firstChild.childNodes.length).to.be.equal(2);
  });
});
