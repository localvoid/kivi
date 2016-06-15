import {Scheduler} from "../lib/scheduler";

const expect = chai.expect;

describe("Scheduler", () => {
  describe("execution order", () => {
    it("should execute microtasks before macrotasks", (done) => {
      const s = new Scheduler();
      let i = 0;
      s.scheduleMacrotask(() => {
        expect(i).to.equal(1);
        done();
      });
      s.scheduleMicrotask(() => {
        expect(i).to.equal(0);
        i = 1;
      });
    });

    it("should batch read/write/after frame tasks", (done) => {
      const s = new Scheduler();
      s.nextFrame().write(() => {
        let i = 0;
        s.currentFrame().after(() => {
          expect(i).to.equal(6);
          i = 7;
        });
        s.currentFrame().after(() => {
          expect(i).to.equal(7);
          done();
        });
        s.currentFrame().read(() => {
          expect(i).to.equal(1);
          i = 2;
        });
        s.currentFrame().read(() => {
          expect(i).to.equal(2);
          i = 3;
          s.currentFrame().write(() => {
            expect(i).to.equal(4);
            i = 5;
          });
          s.currentFrame().write(() => {
            expect(i).to.equal(5);
            i = 6;
          });
          s.currentFrame().read(() => {
            expect(i).to.equal(3);
            i = 4;
          });
        });
        s.currentFrame().write(() => {
          expect(i).to.equal(0);
          i = 1;
        });
      });
    });
  });

  describe("monotonically increasing clock", () => {
    it("should have clock equal to 1 when created", () => {
      const s = new Scheduler();
      expect(s.clock).to.equal(1);
    });

    it("should advance clock by 1 after microtask execution", (done) => {
      const s = new Scheduler();
      s.scheduleMicrotask(() => {
        expect(s.clock).to.equal(1);
        setTimeout(() => {
          expect(s.clock).to.equal(2);
          done();
        }, 10);
      });
    });

    it("should advance clock by 1 after macrotask execution", (done) => {
      const s = new Scheduler();
      s.scheduleMacrotask(() => {
        expect(s.clock).to.equal(1);
        setTimeout(() => {
          expect(s.clock).to.equal(2);
          done();
        }, 10);
      });
    });

    it("should advance clock by 1 after after next frame", (done) => {
      const s = new Scheduler();
      s.nextFrame().after(() => {
        expect(s.clock).to.equal(1);
        setTimeout(() => {
          expect(s.clock).to.equal(2);
          done();
        }, 10);
      });
    });

    it("should have the same clock when switching between read and write batches", (done) => {
      const s = new Scheduler();
      s.nextFrame().write(() => {
        expect(s.clock).to.equal(1);
        s.currentFrame().read(() => {
          expect(s.clock).to.equal(1);
          s.currentFrame().write(() => {
            expect(s.clock).to.equal(1);
            setTimeout(() => {
              expect(s.clock).to.equal(2);
              done();
            }, 10);
          });
        });
      });
    });
  });
});
