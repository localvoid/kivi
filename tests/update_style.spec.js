'use strict';

var vdom = require('../lib/vdom');

function injectBefore(parent, node, nextRef) {
  vdom.create(node, null);
  parent.insertBefore(node.ref, nextRef);
  vdom.render(node, null);
}

describe('update style', function() {
  it('null => null', function() {
    var f = document.createDocumentFragment();
    var a = vdom.e('div');
    var b = vdom.e('div');
    injectBefore(f, a, null);
    vdom.update(a, b, null);
    expect(f.firstChild.style.cssText).to.be.empty();
  });

  it('null => {}', function() {
    var f = document.createDocumentFragment();
    var a = vdom.e('div');
    var b = vdom.e('div');
    b.style = {};
    injectBefore(f, a, null);
    vdom.update(a, b, null);
    expect(f.firstChild.style.cssText).to.be.empty();
  });

  it('{} => {}', function() {
    var f = document.createDocumentFragment();
    var a = vdom.e('div');
    var b = vdom.e('div');
    a.style = {};
    b.style = {};
    injectBefore(f, a, null);
    vdom.update(a, b, null);
    expect(f.firstChild.style.cssText).to.be.empty();
  });

  it('{} => null', function() {
    var f = document.createDocumentFragment();
    var a = vdom.e('div');
    var b = vdom.e('div');
    a.style = {};
    injectBefore(f, a, null);
    vdom.update(a, b, null);
    expect(f.firstChild.style.cssText).to.be.empty();
  });

  it('null => {top: 10px}', function() {
    var f = document.createDocumentFragment();
    var a = vdom.e('div');
    var b = vdom.e('div');
    b.style = {top: '10px'};
    injectBefore(f, a, null);
    vdom.update(a, b, null);
    expect(f.firstChild.style.top).to.be.equal('10px');
  });

  it('{} => {top: 10px}', function() {
    var f = document.createDocumentFragment();
    var a = vdom.e('div');
    var b = vdom.e('div');
    a.style = {};
    b.style = {top: '10px'};
    injectBefore(f, a, null);
    vdom.update(a, b, null);
    expect(f.firstChild.style.top).to.be.equal('10px');
  });

  it('{} => {top: 10px, left: 10px}', function() {
    var f = document.createDocumentFragment();
    var a = vdom.e('div');
    var b = vdom.e('div');
    a.style = {};
    b.style = {top: '10px', left: '5px'};
    injectBefore(f, a, null);
    vdom.update(a, b, null);
    expect(f.firstChild.style.top).to.be.equal('10px');
    expect(f.firstChild.style.left).to.be.equal('5px');
  });

  it('{top: 10px} => null', function() {
    var f = document.createDocumentFragment();
    var a = vdom.e('div');
    var b = vdom.e('div');
    a.style = {top: '10px'};
    injectBefore(f, a, null);
    vdom.update(a, b, null);
    expect(f.firstChild.style.top).to.be.equal('');
  });

  it('{top: 10px} => {}', function() {
    var f = document.createDocumentFragment();
    var a = vdom.e('div');
    var b = vdom.e('div');
    a.style = {top: '10px'};
    b.style = {};
    injectBefore(f, a, null);
    vdom.update(a, b, null);
    expect(f.firstChild.style.top).to.be.equal('');
  });

  it('{top: 10px, left: 5px} => {}', function() {
    var f = document.createDocumentFragment();
    var a = vdom.e('div');
    var b = vdom.e('div');
    a.style = {top: '10px', left: '5px'};
    b.style = {};
    injectBefore(f, a, null);
    vdom.update(a, b, null);
    expect(f.firstChild.style.top).to.be.equal('');
    expect(f.firstChild.style.left).to.be.equal('');
  });

  it('{top: 10px} => {left: 20px}', function() {
    var f = document.createDocumentFragment();
    var a = vdom.e('div');
    var b = vdom.e('div');
    a.style = {top: '10px'};
    b.style = {left: '20px'};
    injectBefore(f, a, null);
    vdom.update(a, b, null);
    expect(f.firstChild.style.top).to.be.equal('');
    expect(f.firstChild.style.left).to.be.equal('20px');
  });

  it('{top: 10px, left: 20px} => {right: 30px, bottom: 40px}', function() {
    var f = document.createDocumentFragment();
    var a = vdom.e('div');
    var b = vdom.e('div');
    a.style = {top: '10px', left: '20px'};
    b.style = {right: '30px', bottom: '40px'};
    injectBefore(f, a, null);
    vdom.update(a, b, null);
    expect(f.firstChild.style.top).to.be.equal('');
    expect(f.firstChild.style.left).to.be.equal('');
    expect(f.firstChild.style.right).to.be.equal('30px');
    expect(f.firstChild.style.bottom).to.be.equal('40px');
  });

  it('{top: 10px} => {top: 100px}', function() {
    var f = document.createDocumentFragment();
    var a = vdom.e('div');
    var b = vdom.e('div');
    a.style = {top: '10px'};
    b.style = {top: '100px'};
    injectBefore(f, a, null);
    vdom.update(a, b, null);
    expect(f.firstChild.style.top).to.be.equal('100px');
  });

  it('{top: 10px, left: 20px} => {top: 100px, left: 200px}', function() {
    var f = document.createDocumentFragment();
    var a = vdom.e('div');
    var b = vdom.e('div');
    a.style = {top: '10px', left: '20px'};
    b.style = {top: '100px', left: '200px'};
    injectBefore(f, a, null);
    vdom.update(a, b, null);
    expect(f.firstChild.style.top).to.be.equal('100px');
    expect(f.firstChild.style.left).to.be.equal('200px');
  });
});
