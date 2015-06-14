goog.provide('kivi');

goog.require('kivi.Scheduler');

/**
 * Initialize kivi library
 *
 * @param {kivi.Scheduler} scheduler
 */
kivi.init = function(scheduler) {
  kivi.env.scheduler = scheduler;
};
