'use strict';

var ENV = require('./env');
var DNode = require('./dnode');
var vdom = require('./vdom');

function init(scheduler) {
  ENV.scheduler = scheduler;
}

function nextFrame() {
  return ENV.scheduler.nextFrame();
}

function scheduleMicrotask(cb) {
  ENV.scheduler.scheduleMicrotask(cb);
}

module.exports = {
  ENV: ENV,
  DNode: DNode,
  vdom: vdom,
  init: init,
  nextFrame: nextFrame,
  scheduleMicrotask: scheduleMicrotask
};
