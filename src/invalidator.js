goog.provide('kivi.Invalidator');
goog.provide('kivi.InvalidatorSubscription');
goog.require('kivi.scheduler');

/**
 * Invalidator Subscription.
 *
 * @param {number} flags
 * @param {!kivi.Invalidator} invalidator
 * @param {function()|!kivi.Component} subscriber
 * @final
 */
kivi.InvalidatorSubscription = class {
  constructor(flags, invalidator, subscriber) {
    this.flags = flags;
    this.invalidator = invalidator;
    this.subscriber = subscriber;

    if (kivi.DEBUG) {
      this._isCanceled = false;
    }
  }

  /**
   * Cancel subscription.
   */
  cancel() {
    if (kivi.DEBUG) {
      if (this._isCanceled) {
        throw 'InvalidatorSubscription is canceled more than one time.';
      }
      this._isCanceled = true;
    }
    this.invalidator.removeSubscription(this);
    if ((this.flags & kivi.InvalidatorSubscription.Flags.component) !== 0) {
      /** @type {!kivi.Component} */(this.subscriber).removeSubscription(this);
    }
  };

  /**
   * Trigger invalidation.
   */
  invalidate() {
    if ((this.flags & kivi.InvalidatorSubscription.Flags.component) !== 0) {
      /** {!kivi.Component} */(this.subscriber).invalidate();
    } else {
      /** {!function()} */(this.subscriber).call();
    }
  };
};

/**
 * Invalidator Subscription Flags.
 *
 * @enum {number}
 */
kivi.InvalidatorSubscription.Flags = {
  component: 0x0001,
  transient: 0x0002
};

/**
 * Invalidator object is used to trigger invalidation for subscribers.
 *
 * @final
 */
kivi.Invalidator = class {
  constructor() {
    /**
     * Last modification time.
     *
     * @type {number}
     */
    this.mtime = kivi.scheduler.clock;

    /** @type {?Array<!kivi.InvalidatorSubscription>} */
    this._subscriptions = null;
    /** @type {?Array<!kivi.InvalidatorSubscription>} */
    this._transientSubscriptions = null;
  }

  /**
   * Add Subscription.
   *
   * @param {!kivi.InvalidatorSubscription} subscription
   */
  addSubscription(subscription) {
    var subscriptions;
    if ((subscription.flags & kivi.InvalidatorSubscription.Flags.transient) === 0) {
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
  removeSubscription(subscription) {
    var subscriptions = /** @type {!Array<!kivi.InvalidatorSubscription>} */(
        ((subscription.flags & kivi.InvalidatorSubscription.Flags.transient) === 0) ?
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
  invalidate() {
    var now = kivi.scheduler.clock;
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
};
