goog.provide('kivi.Invalidator');
goog.provide('kivi.InvalidatorSubscription');
goog.provide('kivi.InvalidatorSubscriptionFlags');
goog.require('kivi.scheduler.instance');

/**
 * Invalidator Subscription Flags.
 *
 * @enum {number}
 */
kivi.InvalidatorSubscriptionFlags = {
  COMPONENT: 0x0001,
  TRANSIENT: 0x0002
};

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
      throw 'InvalidatorSubscription is canceled more than one time.';
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

/**
 * Invalidator object is used to trigger invalidation for subscribers.
 *
 * @constructor
 * @struct
 * @final
 */
kivi.Invalidator = function() {
  /**
   * Last modification time.
   *
   * @type {number}
   */
  this.mtime = kivi.scheduler.instance.clock;

  /** @type {?Array<!kivi.InvalidatorSubscription>} */
  this._subscriptions = null;
  /** @type {?Array<!kivi.InvalidatorSubscription>} */
  this._transientSubscriptions = null;
};

/**
 * Add Subscription.
 *
 * @param {!kivi.InvalidatorSubscription} subscription
 */
kivi.Invalidator.prototype.addSubscription = function(subscription) {
  var subscriptions;
  if ((subscription.flags & kivi.InvalidatorSubscriptionFlags.TRANSIENT) === 0) {
    subscriptions = this._subscriptions;
    if (subscriptions === null) {
      this._subscriptions = subscriptions = [];
    }
  } else {
    subscriptions = this._transientSubscriptions;
    if (subscriptions === null) {
      this._transientSubscriptions = subscriptions = [];
    }
  }
  subscriptions.push(subscription);
};

/**
 * Remove Subscription.
 *
 * @param {!kivi.InvalidatorSubscription} subscription
 */
kivi.Invalidator.prototype.removeSubscription = function(subscription) {
  var subscriptions = /** @type {!Array<!kivi.InvalidatorSubscription>} */(
      ((subscription.flags & kivi.InvalidatorSubscriptionFlags.TRANSIENT) === 0) ?
          this._subscriptions : this._transientSubscriptions);

  if (subscriptions.length === 1) {
    subscriptions.pop();
  } else {
    var i = subscriptions.indexOf(subscription);
    if (i !== -1) {
      subscriptions[i] = subscriptions.pop();
    }
  }
};

/**
 * Trigger invalidation.
 */
kivi.Invalidator.prototype.invalidate = function() {
  var now = kivi.scheduler.instance.clock;
  if (this.mtime < now) {
    this.mtime = now;

    var subscriptions = this._subscriptions;
    var i;

    if (subscriptions !== null) {
      for (i = 0; i < subscriptions.length; i++) {
        subscriptions[i].invalidate();
      }
    }

    subscriptions = this._transientSubscriptions;
    if (subscriptions !== null) {
      this._transientSubscriptions = null;

      for (i = 0; i < subscriptions.length; i++) {
        subscriptions[i].invalidate();
      }
    }
  }
};
