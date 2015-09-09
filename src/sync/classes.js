goog.provide('kivi.sync.classes');

/**
 * Synchronize classes in the classList.
 *
 * @param {?Array<string>} a Old classes.
 * @param {?Array<string>} b New classes.
 * @param {!DOMTokenList} classList
 */
kivi.sync.classes = function(a, b, classList) {
  var i;
  var aCls, bCls;
  var unchangedPosition;

  if (a !== null && a.length !== 0) {
    if (b === null || b.length === 0) {
      // b is empty, remove all classes from a.
      for (i = 0; i < a.length; i++) {
        classList.remove(a[i]);
      }
    } else {
      if (a.length === 1 && b.length === 1) {
        // Fast path when a and b have only one class.
        aCls = a[0];
        bCls = b[0];

        if (aCls !== bCls) {
          classList.remove(aCls);
          classList.add(bCls);
        }
      } else if (a.length === 1) {
        // Fast path when a have 1 class.
        aCls = a[0];
        unchangedPosition = -1;
        for (i = 0; i < b.length; i++) {
          bCls = b[i];
          if (aCls === bCls) {
            unchangedPosition = i;
            break;
          } else {
            classList.add(bCls);
          }
        }
        if (unchangedPosition !== -1) {
          for (i = unchangedPosition + 1; i < b.length; i++) {
            classList.add(b[i]);
          }
        } else {
          classList.remove(aCls);
        }
      } else if (b.length === 1) {
        // Fast path when b have 1 class.
        bCls = b[0];
        unchangedPosition = -1;
        for (i = 0; i < a.length; i++) {
          aCls = a[i];
          if (aCls === bCls) {
            unchangedPosition = i;
            break;
          } else {
            classList.remove(aCls);
          }
        }
        if (unchangedPosition !== -1) {
          for (i = unchangedPosition + 1; i < a.length; i++) {
            classList.remove(a[i]);
          }
        } else {
          classList.add(bCls);
        }
      } else {
        // a and b have more than 1 class.
        var aStart = 0;
        var bStart = 0;
        var aEnd = a.length - 1;
        var bEnd = b.length - 1;
        var removed = false;
        var j;

        while (aStart <= aEnd && bStart <= bEnd) {
          if (a[aStart] !== b[bStart]) {
            break;
          }

          aStart++;
          bStart++;
        }

        while (aStart <= aEnd && bStart <= bEnd) {
          if (a[aEnd] !== b[bEnd]) {
            break;
          }

          aEnd--;
          bEnd--;
        }

        var visited = new Array(bEnd - bStart + 1);

        for (i = aStart; i <= aEnd; i++) {
          aCls = a[i];
          removed = true;

          for (j = bStart; j <= bEnd; j++) {
            bCls = b[j];

            if (aCls === bCls) {
              removed = false;
              visited[j - bStart] = true;
              break;
            }
          }

          if (removed) {
            classList.remove(aCls);
          }
        }

        for (i = bStart; i <= bEnd; i++) {
          if (!visited[i - bStart]) {
            classList.add(b[i]);
          }
        }
      }
    }
  } else if (b !== null && b.length > 0) {
    // a is empty, insert all classes from b.
    for (i = 0; i < b.length; i++) {
      classList.add(b[i]);
    }
  }
};
