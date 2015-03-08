'use strict';

var ENV = require('./env');

function DNode(data) {
  if (data == null) {
    this.dirty = true;
    this.rev = -1;
    this.data = null;
  } else {
    this.dirty = false;
    this.rev = ENV.scheduler.dataClock;
    this.data = data;
  }
  this.data = data;
  this.deps = null;
  this.subs = null;
  this.invalidated = null;
  this.ctx = null;
}

DNode.create = function(data) {
  if (data === void 0) data = null;
  return new DNode(data);
};

DNode.prototype.reset = function() {
  var deps = this.deps;
  if (deps != null) {
    for (var i = 0; i < deps.length; i++) {
      var dSubs = deps[i].subs;
      dSubs[dSubs.indexOf(this)] = dSubs[dSubs.length - 1];
      dSubs.pop();
    }
  }

  this.deps = null;
};

DNode.prototype.sub = function(target) {
  if (this.deps == null) {
    this.deps = [];
  }
  this.deps.push(target);

  if (target.subs == null) {
    target.subs = [];
  }
  target.subs.push(this);
};

DNode.prototype.update = function(dirty) {
  if (dirty) this.rev = ENV.scheduler.dataClock;
  this.dirty = false;
};

DNode.prototype.commit = function() {
  this.rev = ENV.scheduler.dataClock;

  var subs = this.subs;
  if (subs != null) {
    for (var i = 0; i < subs.length; i++) {
      _invalidate(subs[i]);
    }
  }
};

function _invalidate(node) {
  if (!node.dirty) {
    node.dirty = true;

    if (node.invalidated != null) {
      node.invalidated.call(node.ctx, node);
    }

    var subs = node.subs;
    if (subs != null) {
      for (var i = 0; i < subs.length; i++) {
        _invalidate(subs[i]);
      }
    }

    node.deps = null;
    node.subs = null;
  }
}

module.exports = DNode;
