import {Component} from "./component";
import {clock} from "./scheduler";
import {InvalidatorSubscriptionFlags} from "./misc";

/**
 * Invalidator Subscription.
 *
 * @final
 */
export class InvalidatorSubscription {
  _flags: number;
  invalidator: Invalidator;
  private _component: Component<any, any> | null;
  private _callback: Function | null;
  _invalidatorPrev: InvalidatorSubscription | null;
  _invalidatorNext: InvalidatorSubscription | null;
  _componentPrev: InvalidatorSubscription | null;
  _componentNext: InvalidatorSubscription | null;
  // used for debugging
  private _isCanceled: boolean;

  constructor(flags: number, invalidator: Invalidator, component: Component<any, any> | null,
      callback: Function | null) {
    this._flags = flags;
    this.invalidator = invalidator;
    this._component = component;
    this._callback = callback;
    this._invalidatorPrev = null;
    this._invalidatorNext = null;
    this._componentPrev = null;
    this._componentNext = null;

    if ("<@KIVI_DEBUG@>" !== "DEBUG_DISABLED") {
      this._isCanceled = false;
    }
  }

  _cancel(): void {
    if (this._invalidatorPrev === null) {
      if ((this._flags & InvalidatorSubscriptionFlags.Transient) === 0) {
        this.invalidator._subscriptions = this._invalidatorNext;
      } else {
        this.invalidator._transientSubscriptions = this._invalidatorNext;
      }
    } else {
      this._invalidatorPrev._invalidatorNext = this._invalidatorNext;
    }
    if (this._invalidatorNext !== null) {
      this._invalidatorNext._invalidatorPrev = this._invalidatorPrev;
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

    this._cancel();

    if ((this._flags & InvalidatorSubscriptionFlags.Component) !== 0) {
      if (this._componentPrev === null) {
        if ((this._flags & InvalidatorSubscriptionFlags.Transient) === 0) {
          this._component!._subscriptions = this._componentNext;
        } else {
          this._component!._transientSubscriptions = this._componentNext;
        }
      } else {
        this._componentPrev._componentNext = this._componentNext;
      }
      if (this._componentNext !== null) {
        this._componentNext._componentPrev = this._componentPrev;
      }
    }
  }

  _invalidate(): void {
    if ((this._flags & InvalidatorSubscriptionFlags.Component) !== 0) {
      this._component!.invalidate();
    } else {
      this._callback!();
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

  _subscriptions: InvalidatorSubscription | null;
  _transientSubscriptions: InvalidatorSubscription | null;

  constructor() {
    this.mtime = clock();
    this._subscriptions = null;
    this._transientSubscriptions = null;
  }

  /**
   * Create a subscription with a callback handler.
   */
  subscribe(callback: Function): InvalidatorSubscription {
    const s = new InvalidatorSubscription(0, this, null, callback);
    const firstSubscription = this._subscriptions;

    if (firstSubscription !== null) {
      firstSubscription._invalidatorPrev = s;
      s._invalidatorNext = firstSubscription;
    }

    this._subscriptions = s;
    return s;
  }

  /**
   * Create a transient subscription with a callback handler.
   */
  transientSubscribe(callback: Function): InvalidatorSubscription {
    const s = new InvalidatorSubscription(InvalidatorSubscriptionFlags.Transient, this, null, callback);
    const firstSubscription = this._transientSubscriptions;

    if (firstSubscription !== null) {
      firstSubscription._invalidatorPrev = s;
      s._invalidatorNext = firstSubscription;
    }

    this._transientSubscriptions = s;
    return s;
  }

  /**
   * Create a subscription that will invalidate component.
   */
  subscribeComponent(component: Component<any, any>): InvalidatorSubscription {
    const s = new InvalidatorSubscription(InvalidatorSubscriptionFlags.Component, this, component, null);
    const firstSubscription = this._subscriptions;
    const firstComponentSubscription = component._subscriptions;

    if (firstSubscription !== null) {
      firstSubscription._invalidatorPrev = s;
      s._invalidatorNext = firstSubscription;
    }
    if (firstComponentSubscription !== null) {
      firstComponentSubscription._componentPrev = s;
      s._componentNext = firstComponentSubscription;
    }

    this._subscriptions = s;
    component._subscriptions = s;

    return s;
  }

  /**
   * Create a transient subscription that will invalidate component.
   */
  transientSubscribeComponent(component: Component<any, any>): InvalidatorSubscription {
    const s = new InvalidatorSubscription(
      InvalidatorSubscriptionFlags.Component | InvalidatorSubscriptionFlags.Transient,
      this, component, null);
    const firstSubscription = this._transientSubscriptions;
    const firstComponentSubscription = component._transientSubscriptions;

    if (firstSubscription !== null) {
      firstSubscription._invalidatorPrev = s;
      s._invalidatorNext = firstSubscription;
    }
    if (firstComponentSubscription !== null) {
      firstComponentSubscription._componentPrev = s;
      s._componentNext = firstComponentSubscription;
    }

    this._transientSubscriptions = s;
    component._transientSubscriptions = s;

    return s;
  }

  /**
   * Returns true if invalidator object has subscriptions.
   */
  hasSubscriptions(): boolean {
    return (this._subscriptions !== null || this._transientSubscriptions !== null);
  }

  /**
   * Invalidate all subscriptions.
   */
  invalidate(): void {
    const now = clock();
    if (this.mtime < now) {
      this.mtime = now;

      let subscription = this._subscriptions;
      while (subscription !== null) {
        subscription._invalidate();
        subscription = subscription._invalidatorNext;
      }

      subscription = this._transientSubscriptions;
      while (subscription !== null) {
        subscription._invalidate();
        subscription = subscription._invalidatorNext;
      }

      this._transientSubscriptions = null;
    }
  }
}
