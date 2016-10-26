import { Invalidator } from "../lib/invalidator";
import { scheduleMicrotask, scheduleMacrotask, clock } from "../lib/scheduler";

const expect = chai.expect;

describe("Invalidator", () => {
  it("should have mtime equal to scheduler clock when created", (done) => {
    const i1 = new Invalidator();
    expect(i1.mtime).to.equal(clock());
    scheduleMicrotask(() => {
      scheduleMacrotask(() => {
        const i2 = new Invalidator();
        expect(i2.mtime).to.equal(clock());
        done();
      });
    });
  });

  it("shouldn't have subscriptions when created", () => {
    const i = new Invalidator();
    expect(i.hasSubscriptions()).to.be.false;
  });

  it("should have subscriptions after subscription", () => {
    const i = new Invalidator();
    expect(i.hasSubscriptions()).to.be.false;
    i.subscribe(() => 0);
    expect(i.hasSubscriptions()).to.be.true;
  });

  it("should have subscriptions after transient subscription", () => {
    const i = new Invalidator();
    expect(i.hasSubscriptions()).to.be.false;
    i.transientSubscribe(() => 0);
    expect(i.hasSubscriptions()).to.be.true;
  });

  it("should have subscriptions after multiple subscriptions", () => {
    const i = new Invalidator();
    expect(i.hasSubscriptions()).to.be.false;
    i.subscribe(() => 0);
    i.subscribe(() => 0);
    expect(i.hasSubscriptions()).to.be.true;
  });

  it("should have subscriptions after multiple transient subscriptions", () => {
    const i = new Invalidator();
    expect(i.hasSubscriptions()).to.be.false;
    i.transientSubscribe(() => 0);
    i.transientSubscribe(() => 0);
    expect(i.hasSubscriptions()).to.be.true;
  });

  it("should update mtime when invalidated", (done) => {
    const i = new Invalidator();
    expect(i.mtime).to.equal(clock());
    scheduleMicrotask(() => {
      scheduleMacrotask(() => {
        expect(i.mtime).not.to.equal(clock());
        i.invalidate();
        expect(i.mtime).to.equal(clock());
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
    scheduleMicrotask(() => {
      scheduleMacrotask(() => {
        i.invalidate();
        i.invalidate();
        expect(k).to.equal(1);
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
    scheduleMicrotask(() => {
      scheduleMacrotask(() => {
        i.invalidate();
        i.invalidate();
        expect(k).to.equal(1);
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
    scheduleMicrotask(() => {
      scheduleMacrotask(() => {
        expect(i.hasSubscriptions()).to.be.true;
        i.invalidate();
        expect(i.hasSubscriptions()).to.be.true;
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
    scheduleMicrotask(() => {
      scheduleMacrotask(() => {
        expect(i.hasSubscriptions()).to.be.true;
        i.invalidate();
        expect(i.hasSubscriptions()).to.be.false;
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
    scheduleMicrotask(() => {
      scheduleMacrotask(() => {
        expect(i.hasSubscriptions()).to.be.true;
        i.invalidate();
        expect(i.hasSubscriptions()).to.be.false;
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
    expect(i.hasSubscriptions()).to.be.false;
    scheduleMicrotask(() => {
      scheduleMacrotask(() => {
        i.invalidate();
        expect(k).to.equal(0);
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
    expect(i.hasSubscriptions()).to.be.false;
    scheduleMicrotask(() => {
      scheduleMacrotask(() => {
        i.invalidate();
        expect(k).to.equal(0);
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
    scheduleMicrotask(() => {
      scheduleMacrotask(() => {
        i.invalidate();
        i.invalidate();
        expect(k).to.equal(1);
        expect(j).to.equal(1);
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
    scheduleMicrotask(() => {
      scheduleMacrotask(() => {
        i.invalidate();
        i.invalidate();
        expect(k).to.equal(1);
        expect(j).to.equal(1);
        done();
      });
    });
  });
});
