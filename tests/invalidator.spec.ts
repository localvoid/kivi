import {Invalidator} from "../lib/invalidator";
import {scheduler} from "../lib/scheduler";

describe("Invalidator", () => {
  it("should have mtime equal to scheduler clock when created", (done) => {
    const i1 = new Invalidator();
    expect(i1.mtime).toBe(scheduler.clock);
    scheduler.scheduleMicrotask(() => {
      scheduler.scheduleMacrotask(() => {
        const i2 = new Invalidator();
        expect(i2.mtime).toBe(scheduler.clock);
        done();
      });
    });
  });

  it("shouldn't have subscriptions when created", () => {
    const i = new Invalidator();
    expect(i.hasSubscriptions()).toBeFalsy();
  });

  it("should have subscriptions after subscription", () => {
    const i = new Invalidator();
    expect(i.hasSubscriptions()).toBeFalsy();
    i.subscribe(() => 0);
    expect(i.hasSubscriptions()).toBeTruthy();
  });

  it("should have subscriptions after transient subscription", () => {
    const i = new Invalidator();
    expect(i.hasSubscriptions()).toBeFalsy();
    i.transientSubscribe(() => 0);
    expect(i.hasSubscriptions()).toBeTruthy();
  });

  it("should have subscriptions after multiple subscriptions", () => {
    const i = new Invalidator();
    expect(i.hasSubscriptions()).toBeFalsy();
    i.subscribe(() => 0);
    i.subscribe(() => 0);
    expect(i.hasSubscriptions()).toBeTruthy();
  });

  it("should have subscriptions after multiple transient subscriptions", () => {
    const i = new Invalidator();
    expect(i.hasSubscriptions()).toBeFalsy();
    i.transientSubscribe(() => 0);
    i.transientSubscribe(() => 0);
    expect(i.hasSubscriptions()).toBeTruthy();
  });

  it("should update mtime when invalidated", (done) => {
    const i = new Invalidator();
    expect(i.mtime).toBe(scheduler.clock);
    scheduler.scheduleMicrotask(() => {
      scheduler.scheduleMacrotask(() => {
        expect(i.mtime).not.toBe(scheduler.clock);
        i.invalidate();
        expect(i.mtime).toBe(scheduler.clock);
        done();
      });
    });
  });

  it("should invoke callback on subscriptions", (done) => {
    const i = new Invalidator();
    let k = 0;
    i.subscribe(() => {
      k++;
    });
    scheduler.scheduleMicrotask(() => {
      scheduler.scheduleMacrotask(() => {
        i.invalidate();
        i.invalidate();
        expect(k).toBe(1);
        done();
      });
    });
  });

  it("should invoke callback on transient subscriptions", (done) => {
    const i = new Invalidator();
    let k = 0;
    i.transientSubscribe(() => {
      k++;
    });
    scheduler.scheduleMicrotask(() => {
      scheduler.scheduleMacrotask(() => {
        i.invalidate();
        i.invalidate();
        expect(k).toBe(1);
        done();
      });
    });
  });

  it("shouldn't cancel subscriptions after invalidation", (done) => {
    const i = new Invalidator();
    let k = 0;
    i.subscribe(() => {
      k++;
    });
    scheduler.scheduleMicrotask(() => {
      scheduler.scheduleMacrotask(() => {
        expect(i.hasSubscriptions()).toBeTruthy();
        i.invalidate();
        expect(i.hasSubscriptions()).toBeTruthy();
        done();
      });
    });
  });

  it("should cancel transient subscriptions after invalidation", (done) => {
    const i = new Invalidator();
    let k = 0;
    i.transientSubscribe(() => {
      k++;
    });
    scheduler.scheduleMicrotask(() => {
      scheduler.scheduleMacrotask(() => {
        expect(i.hasSubscriptions()).toBeTruthy();
        i.invalidate();
        expect(i.hasSubscriptions()).toBeFalsy();
        done();
      });
    });
  });

  it("should cancel multiple transient subscriptions after invalidation", (done) => {
    const i = new Invalidator();
    let k = 0;
    i.transientSubscribe(() => {
      k++;
    });
    i.transientSubscribe(() => {
      k++;
    });
    scheduler.scheduleMicrotask(() => {
      scheduler.scheduleMacrotask(() => {
        expect(i.hasSubscriptions()).toBeTruthy();
        i.invalidate();
        expect(i.hasSubscriptions()).toBeFalsy();
        done();
      });
    });
  });

  it("should remove subscription from invalidator when subscription is canceled", (done) => {
    const i = new Invalidator();
    let k = 0;
    const s = i.subscribe(() => {
      k++;
    });
    s.cancel();
    expect(i.hasSubscriptions()).toBeFalsy();
    scheduler.scheduleMicrotask(() => {
      scheduler.scheduleMacrotask(() => {
        i.invalidate();
        expect(k).toBe(0);
        done();
      });
    });
  });

  it("should remove transient subscription from invalidator when subscription is canceled", (done) => {
    const i = new Invalidator();
    let k = 0;
    const s = i.transientSubscribe(() => {
      k++;
    });
    s.cancel();
    expect(i.hasSubscriptions()).toBeFalsy();
    scheduler.scheduleMicrotask(() => {
      scheduler.scheduleMacrotask(() => {
        i.invalidate();
        expect(k).toBe(0);
        done();
      });
    });
  });

  it("should invoke callback on multiple subscriptions", (done) => {
    const i = new Invalidator();
    let k = 0;
    let j = 0;
    i.subscribe(() => {
      k++;
    });
    i.subscribe(() => {
      j++;
    });
    scheduler.scheduleMicrotask(() => {
      scheduler.scheduleMacrotask(() => {
        i.invalidate();
        i.invalidate();
        expect(k).toBe(1);
        expect(j).toBe(1);
        done();
      });
    });
  });

  it("should invoke callback on multiple transient subscriptions", (done) => {
    const i = new Invalidator();
    let k = 0;
    let j = 0;
    i.transientSubscribe(() => {
      k++;
    });
    i.transientSubscribe(() => {
      j++;
    });
    scheduler.scheduleMicrotask(() => {
      scheduler.scheduleMacrotask(() => {
        i.invalidate();
        i.invalidate();
        expect(k).toBe(1);
        expect(j).toBe(1);
        done();
      });
    });
  });
});
