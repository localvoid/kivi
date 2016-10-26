import { Component } from "./component";
import { clock } from "./scheduler";

/**
 * InvalidatorSubscription flags.
 */
const enum InvalidatorSubscriptionFlags {
  /// Subscribed to a component.
  Component = 1,
  /// Transient subscription. Each time subscription is invalidated, it will be automatically canceled.
  Transient = 1 << 1,
}

/**
 * Invalidator Subscription.
 *
 * Subscriptions are returned from Invalidator objects after making a subscription, they are used for canceling
 * subscriptions. Subscriptions that were made in UI Components will be automatically canceled.
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

    if ("<@KIVI_DEBUG@>" as string !== "DEBUG_DISABLED") {
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
    if ("<@KIVI_DEBUG@>" as string !== "DEBUG_DISABLED") {
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
 * Invalidator object is used to subscribe for data changes.
 *
 * It is way much simpler than composable streams, or implicit graphs of data dependencies, it doesn't passes any
 * information except the signal that something is changed. Because all subscriptions are explicit it also has a
 * predictable performance and it is easier to review code.
 *
 * It was designed to get rid of data changes over time in as much places as possible, so instead of pushing/pulling
 * data from streams, we just reevaluate everything and using caches to prevent from unnecessary computations. This
 * programming model is significantly simpler and provides a better debugging experience, especially when investigating
 * bugs from stack traces in production builds.
 *
 *
 *     const mode: "a" | "b" = "a";
 *     const a = 0;
 *     const b = 0;
 *     const modeInvalidator = new Invalidator();
 *     const aInvalidator = new Invalidator();
 *     const bInvalidator = new Invalidator();
 *
 *     const Main = new ComponentDescriptor<void, void>()
 *       .attached((c) => {
 *         c.subscribe(modeInvalidator);
 *       })
 *       .update((c) => {
 *         let value: number;
 *         if (mode === "a") {
 *           value = a;
 *           c.transientSubscribe(aInvalidator);
 *         } else {
 *           value = b;
 *           c.transientSubscribe(bInvalidator);
 *         }
 *         c.sync(c.createVRoot().children(value.toString()));
 *       });
 *
 *     function update() {
 *       if (mode === "a") {
 *         a++;
 *         aInvalidator.invalidate();
 *         if (a === 10) {
 *           a = 0;
 *           mode = "b";
 *           modeInvalidator.invalidate();
 *         }
 *       } else {
 *         b++;
 *         bInvalidator.invalidate();
 *         if (b === 10) {
 *           b = 0;
 *           mode = "a";
 *           modeInvalidator.invalidate();
 *         }
 *       }
 *
 *       setTimeout(1000, update);
 *     }
 *     setTimeout(1000, update);
 *
 *     injectComponent(Main, document.body);
 *
 * @final
 */
export class Invalidator {
  /**
   * Updates each time when invalidator is invalidated, uses scheduler monotonically increasing clock.
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
   *
   * Callback handlers will be invoked synchronously.
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
   *
   * Callback handlers will be invoked synchronously.
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
   * Create a subscription that invalidates UI Component.
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
   * Create a transient subscription that invalidates UI Component.
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
   * Returns `true` if invalidator object has subscriptions.
   */
  hasSubscriptions(): boolean {
    return (this._subscriptions !== null || this._transientSubscriptions !== null);
  }

  /**
   * Invalidate all subscriptions.
   *
   * Automatically cancels all transient subscriptions.
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
