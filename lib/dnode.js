'use strict';

var ENV = require('./env');

function DNode() {
  this.dirty = false;
  this.rev = ENV.scheduler.clock;
  this.data = null;
  this.deps = null;
  this.subs = null;
  this.invalidated = null;
  this.ctx = null;
}

DNode.create = function() {
  return new DNode();
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

DNode.prototype.update = function() {
  this.rev = ENV.scheduler.clock;
  this.dirty = false;
};

DNode.prototype.commit = function() {
  this.rev = ENV.scheduler.clock;

  var subs = this.subs;
  if (subs != null) {
    for (var i = 0; i < subs.length; i++) {
      _invalidate(subs[i]);
    }
  }
};

DNode.prototype.isOlder = function(other) {
  if (this.rev < other.rev) {
    return true;
  }
  return false;
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
