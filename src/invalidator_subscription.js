goog.provide('kivi.InvalidatorSubscription');
goog.require('kivi.InvalidatorSubscriptionFlags');

/**
 * Invalidator Subscription.
 *
 * @param {number} flags
 * @param {!kivi.Invalidator} invalidator
 * @param {function()|!kivi.Component} subscriber
 * @constructor
 * @struct
 * @final
 */
kivi.InvalidatorSubscription = function(flags, invalidator, subscriber) {
  this.flags = flags;
  this.invalidator = invalidator;
  this.subscriber = subscriber;

  if (kivi.DEBUG) {
    this._isCanceled = false;
  }
};

/**
 * Cancel subscription.
 */
kivi.InvalidatorSubscription.prototype.cancel = function() {
  if (kivi.DEBUG) {
    if (this._isCanceled) {
      throw 'Failed to cancel InvalidatorSubscription: subscription cannot be canceled twice';
    }
    this._isCanceled = true;
  }
  this.invalidator.removeSubscription(this);
  if ((this.flags & kivi.InvalidatorSubscriptionFlags.COMPONENT) !== 0) {
    /** @type {!kivi.Component} */(this.subscriber).removeSubscription(this);
  }
};

/**
 * Trigger invalidation.
 */
kivi.InvalidatorSubscription.prototype.invalidate = function() {
  if ((this.flags & kivi.InvalidatorSubscriptionFlags.COMPONENT) !== 0) {
    /** {!kivi.Component} */(this.subscriber).invalidate();
  } else {
    /** {!function()} */(this.subscriber).call();
  }
};
