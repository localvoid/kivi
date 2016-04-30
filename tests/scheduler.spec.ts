import {Scheduler} from '../lib/kivi';

describe('Scheduler', () => {
  describe('execution order', () => {
    it('should execute microtasks before macrotasks', (done) => {
      const s = new Scheduler();
      let i = 0;
      s.scheduleMacrotask(() => {
        expect(i).toBe(1);
        done();
      });
      s.scheduleMicrotask(() => {
        expect(i).toBe(0);
        i = 1;
      });
    });

    it('should batch read/write/after frame tasks', (done) => {
      const s = new Scheduler();
      s.nextFrame().write(() => {
        let i = 0;
        s.currentFrame().after(() => {
          expect(i).toBe(6);
          i = 7;
        });
        s.currentFrame().after(() => {
          expect(i).toBe(7);
          done();
        });
        s.currentFrame().read(() => {
          expect(i).toBe(1);
          i = 2;
        });
        s.currentFrame().read(() => {
          expect(i).toBe(2);
          i = 3;
          s.currentFrame().write(() => {
            expect(i).toBe(4);
            i = 5;
          });
          s.currentFrame().write(() => {
            expect(i).toBe(5);
            i = 6;
          });
          s.currentFrame().read(() => {
            expect(i).toBe(3);
            i = 4;
          });
        });
        s.currentFrame().write(() => {
          expect(i).toBe(0);
          i = 1;
        });
      });
    });
  });

  describe('monotonically increasing clock', () => {
    it('should have clock equal to 0 when created', () => {
      const s = new Scheduler();
      expect(s.clock).toBe(1);
    });

    it('should advance clock by 1 after microtask execution', (done) => {
      const s = new Scheduler();
      s.scheduleMicrotask(() => {
        expect(s.clock).toBe(1);
        setTimeout(() => {
          expect(s.clock).toBe(2);
          done();
        }, 10);
      });
    });

    it('should advance clock by 1 after macrotask execution', (done) => {
      const s = new Scheduler();
      s.scheduleMacrotask(() => {
        expect(s.clock).toBe(1);
        setTimeout(() => {
          expect(s.clock).toBe(2);
          done();
        }, 10);
      });
    });

    it('should advance clock by 1 after after next frame', (done) => {
      const s = new Scheduler();
      s.nextFrame().after(() => {
        expect(s.clock).toBe(1);
        setTimeout(() => {
          expect(s.clock).toBe(2);
          done();
        }, 10);
      });
    });

    it('should have the same clock when switching between read and write batches', (done) => {
      const s = new Scheduler();
      s.nextFrame().write(() => {
        expect(s.clock).toBe(1);
        s.currentFrame().read(() => {
          expect(s.clock).toBe(1);
          s.currentFrame().write(() => {
            expect(s.clock).toBe(1);
            setTimeout(() => {
              expect(s.clock).toBe(2);
              done();
            }, 10);
          })
        });
      });
    });
  });
});
