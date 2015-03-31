'use strict';

var ENV = require('./env');
var vdom = require('./vdom');
var utils = require('./utils');

function init(scheduler) {
  ENV.scheduler = scheduler;
}

function nextFrame() {
  return ENV.scheduler.nextFrame();
}

function scheduleMicrotask(cb) {
  ENV.scheduler.scheduleMicrotask(cb);
}

function action(cb) {
  ENV.scheduler.action(cb);
}

module.exports = {
  ENV: ENV,
  vdom: vdom,
  init: init,
  nextFrame: nextFrame,
  scheduleMicrotask: scheduleMicrotask,
  action: action,
  toFastObj: utils.toFastObj,
  inherits: utils.inherits,
  shallowEq: utils.shallowEq
};
