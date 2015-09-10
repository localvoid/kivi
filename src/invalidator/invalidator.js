goog.provide('kivi.Invalidator');
goog.require('kivi.InvalidatorSubscription');
goog.require('kivi.InvalidatorSubscriptionFlags');
goog.require('kivi.scheduler.instance');

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

  /** @type {?Array<!kivi.InvalidatorSubscription>|?kivi.InvalidatorSubscription} */
  this._subscriptions = null;
  /** @type {?Array<!kivi.InvalidatorSubscription>|?kivi.InvalidatorSubscription} */
  this._transientSubscriptions = null;
};

/**
 * Returns `true` if Invalidator has active subscription.
 *
 * @returns {boolean}
 */
kivi.Invalidator.prototype.hasSubscriptions = function() {
  return ((this._subscriptions !== null &&
           (this._subscriptions.constructor === kivi.InvalidatorSubscription || this._subscriptions.length > 0)) ||
          (this._transientSubscriptions !== null &&
           (this._transientSubscriptions.constructor === kivi.InvalidatorSubscription || this._transientSubscriptions.length > 0)));
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
      this._subscriptions = subscription;
    } else if (subscriptions.constructor === kivi.InvalidatorSubscription) {
      this._subscriptions = [this._subscriptions, subscription];
    } else {
      subscriptions.push(subscription);
    }
  } else {
    subscriptions = this._transientSubscriptions;
    if (subscriptions === null) {
      this._transientSubscriptions = subscription;
    } else if (subscriptions.constructor === kivi.InvalidatorSubscription) {
      this._transientSubscriptions = [this._transientSubscriptions, subscription];
    } else {
      subscriptions.push(subscription);
    }
  }
};

/**
 * Remove Subscription.
 *
 * @param {!kivi.InvalidatorSubscription} subscription
 */
kivi.Invalidator.prototype.removeSubscription = function(subscription) {
  var subscriptions;
  var i;
  if ((subscription.flags & kivi.InvalidatorSubscriptionFlags.TRANSIENT) === 0) {
    subscriptions = this._subscriptions;
    if (subscriptions.constructor === kivi.InvalidatorSubscription ||
        subscriptions.length === 1) {
      if (kivi.DEBUG) {
        if (subscriptions.constructor === kivi.InvalidatorSubscription) {
          if (subscriptions !== subscription) {
            throw 'Failed to remove subscription from Invalidator: cannot find appropriate subscription';
          }
        } else {
          subscriptions = /** @type {!Array<!kivi.InvalidatorSubscription>} */(subscriptions);
          if (subscriptions[0] !== subscription) {
            throw 'Failed to remove subscription from Invalidator: cannot find appropriate subscription';
          }
        }
      }
      this._subscriptions = null;
    } else {
      subscriptions = /** @type {!Array<!kivi.InvalidatorSubscription>} */(subscriptions);
      i = subscriptions.indexOf(subscription);
      if (kivi.DEBUG) {
        if (i === -1) {
          throw 'Failed to remove subscription from Invalidator: cannot find appropriate subscription';
        }
      }
      subscriptions[i] = subscriptions.pop();
    }
  } else {
    subscriptions = this._transientSubscriptions;
    if (subscriptions.constructor === kivi.InvalidatorSubscription ||
        subscriptions.length === 1) {
      if (kivi.DEBUG) {
        if (subscriptions.constructor === kivi.InvalidatorSubscription) {
          if (subscriptions !== subscription) {
            throw 'Failed to remove subscription from Invalidator: cannot find appropriate subscription';
          }
        } else {
          subscriptions = /** @type {!Array<!kivi.InvalidatorSubscription>} */(subscriptions);
          if (subscriptions[0] !== subscription) {
            throw 'Failed to remove subscription from Invalidator: cannot find appropriate subscription';
          }
        }
      }
      this._transientSubscriptions = null;
    } else {
      subscriptions = /** @type {!Array<!kivi.InvalidatorSubscription>} */(subscriptions);
      i = subscriptions.indexOf(subscription);
      if (kivi.DEBUG) {
        if (i === -1) {
          throw 'Failed to remove subscription from Invalidator: cannot find appropriate subscription';
        }
      }
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
      if (subscriptions.constructor === kivi.InvalidatorSubscription) {
        subscriptions.invalidate();
      } else {
        subscriptions = /** @type {!Array<!kivi.InvalidatorSubscription>} */(subscriptions);
        for (i = 0; i < subscriptions.length; i++) {
          subscriptions[i].invalidate();
        }
      }
    }

    subscriptions = this._transientSubscriptions;
    if (subscriptions !== null) {
      this._transientSubscriptions = null;
      if (subscriptions.constructor === kivi.InvalidatorSubscription) {
        subscriptions.invalidate();
      } else {
        subscriptions = /** @type {!Array<!kivi.InvalidatorSubscription>} */(subscriptions);
        for (i = 0; i < subscriptions.length; i++) {
          subscriptions[i].invalidate();
        }
      }
    }
  }
};
