import {Component} from "./component";
import {scheduler} from "./scheduler";
import {InvalidatorSubscriptionFlags} from "./misc";

/**
 * Invalidator Subscription.
 *
 * @final
 */
export class InvalidatorSubscription {
  _flags: number;
  invalidator: Invalidator;
  private _component: Component<any, any>;
  private _callback: Function;
  // used for debugging
  private _isCanceled: boolean;

  constructor(flags: number, invalidator: Invalidator, component: Component<any, any>, callback: Function) {
    this._flags = flags;
    this.invalidator = invalidator;
    this._component = component;
    this._callback = callback;

    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      this._isCanceled = false;
    }
  }

  /**
   * Cancel subscription.
   */
  cancel(): void {
    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      if (this._isCanceled) {
        throw new Error("Failed to cancel InvalidatorSubscription: subscription cannot be canceled twice.");
      }
      this._isCanceled = true;
    }
    if ((this._flags & InvalidatorSubscriptionFlags.Transient) === 0) {
      this.invalidator._removeSubscription(this);
      if ((this._flags & InvalidatorSubscriptionFlags.Component) !== 0) {
        this._component._removeSubscription(this);
      }
    } else {
      this.invalidator._removeTransientSubscription(this);
      if ((this._flags & InvalidatorSubscriptionFlags.Component) !== 0) {
        this._component._removeTransientSubscription(this);
      }
    }
  }

  _invalidate(): void {
    if ((this._flags & InvalidatorSubscriptionFlags.Component) !== 0) {
      this._component.invalidate();
    } else {
      this._callback();
    }
  }
}

/**
 * Invalidator object is a low level object for implementing reactive bindings.
 *
 * @final
 */
export class Invalidator {
  /**
   * Updates each time when invalidator is invalidated, uses scheduler
   * monotonically increasing clock.
   */
  mtime: number;

  private _subscription: InvalidatorSubscription;
  private _subscriptions: InvalidatorSubscription[];
  private _transientSubscription: InvalidatorSubscription;
  private _transientSubscriptions: InvalidatorSubscription[];

  constructor() {
    this.mtime = scheduler.clock;
    this._subscription = undefined;
    this._subscriptions = undefined;
    this._transientSubscription = undefined;
    this._transientSubscriptions = undefined;
  }

  /**
   * Create a subscription with a callback handler.
   */
  subscribe(callback: Function): InvalidatorSubscription {
    const s = new InvalidatorSubscription(0, this, undefined, callback);
    this._addSubscription(s);
    return s;
  }

  /**
   * Create a transient subscription with a callback handler.
   */
  transientSubscribe(callback: Function): InvalidatorSubscription {
    const s = new InvalidatorSubscription(InvalidatorSubscriptionFlags.Transient, this, undefined, callback);
    this._addTransientSubscription(s);
    return s;
  }

  /**
   * Create a subscription that will invalidate component.
   */
  subscribeComponent(component: Component<any, any>): InvalidatorSubscription {
    const s = new InvalidatorSubscription(InvalidatorSubscriptionFlags.Component, this, component, undefined);
    this._addSubscription(s);
    return s;
  }

  /**
   * Create a transient subscription that will invalidate component.
   */
  transientSubscribeComponent(component: Component<any, any>): InvalidatorSubscription {
    const s = new InvalidatorSubscription(
      InvalidatorSubscriptionFlags.Component | InvalidatorSubscriptionFlags.Transient,
      this, component, undefined);
    this._addTransientSubscription(s);
    return s;
  }

  /**
   * Returns true if invalidator object has subscriptions.
   */
  hasSubscriptions(): boolean {
    return (this._subscription !== undefined ||
            this._subscriptions !== undefined ||
            this._transientSubscription !== undefined ||
            this._transientSubscriptions !== undefined);
  }

  /**
   * Invalidate all subscriptions.
   */
  invalidate(): void {
    const now = scheduler.clock;
    if (this.mtime < now) {
      this.mtime = now;

      let i: number;

      if (this._subscription !== undefined) {
        this._subscription._invalidate();
      } else if (this._subscriptions !== undefined) {
          for (i = 0; i < this._subscriptions.length; i++) {
            this._subscriptions[i]._invalidate();
          }
      }

      if (this._transientSubscription !== undefined) {
        this._transientSubscription._invalidate();
      } else if (this._transientSubscriptions !== undefined) {
          for (i = 0; i < this._transientSubscriptions.length; i++) {
            this._transientSubscriptions[i]._invalidate();
          }
      }
    }
  }

  _addSubscription(subscription: InvalidatorSubscription): void {
    if (this._subscription !== undefined) {
      this._subscriptions = [this._subscription, subscription];
      this._subscription = undefined;
    } else if (this._subscriptions === undefined) {
      this._subscription = subscription;
    } else {
      this._subscriptions.push(subscription);
    }
  }

  _addTransientSubscription(subscription: InvalidatorSubscription): void {
    if (this._transientSubscription !== undefined) {
      this._transientSubscriptions = [this._transientSubscription, subscription];
      this._transientSubscription = undefined;
    } else if (this._transientSubscriptions === undefined) {
      this._transientSubscription = subscription;
    } else {
      this._transientSubscriptions.push(subscription);
    }
  }

  _removeSubscription(subscription: InvalidatorSubscription): void {
    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      if ((this._subscription !== undefined && this._subscription !== subscription) ||
          (this._subscriptions !== undefined && this._subscriptions.indexOf(subscription) === -1) ||
          (this._subscription === undefined && this._subscriptions === undefined)) {
        throw new Error("Failed to remove subscription from Invalidator: cannot find appropriate subscription.");
      }
    }

    if (this._subscription === subscription) {
      this._subscription = undefined;
    } else if (this._subscriptions.length === 1) {
      this._subscriptions = undefined;
    } else {
      const i = this._subscriptions.indexOf(subscription);
      this._subscriptions[i] = this._subscriptions.pop();
    }
  }

  _removeTransientSubscription(subscription: InvalidatorSubscription): void {
    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      if ((this._transientSubscription !== undefined && this._transientSubscription !== subscription) ||
          (this._transientSubscriptions !== undefined && this._transientSubscriptions.indexOf(subscription) === -1) ||
          (this._transientSubscription === undefined && this._transientSubscriptions === undefined)) {
        throw new Error("Failed to remove subscription from Invalidator: cannot find appropriate subscription.");
      }
    }

    if (this._transientSubscription === subscription) {
      this._transientSubscription = undefined;
    } else if (this._transientSubscriptions.length === 1) {
      this._transientSubscriptions = undefined;
    } else {
      const i = this._transientSubscriptions.indexOf(subscription);
      this._transientSubscriptions[i] = this._transientSubscriptions.pop();
    }
  }
}
