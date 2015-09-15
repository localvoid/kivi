goog.provide('kivi.utils.parseQueryString');
goog.require('kivi.utils.EMPTY_OBJECT');

/**
 * Parse a query string.
 *
 * @param {string} qs
 * @returns {!Object<string, string>}
 */
kivi.utils.parseQueryString = function(qs) {
  if (!qs) {
    return kivi.utils.EMPTY_OBJECT;
  }

  /** @type {!Object<string, string>} */
  var result = {};
  var qsLength = qs.length;
  /** @type {!Array<string>} */
  var k = [];
  /** @type {!Array<string>} */
  var v = [];
  // 0 - key
  // 1 - value
  var state = 0;

  for(var i = 0; i < qsLength; i++) {
    var c = /** @type {string} */(qs[i]);

    if (c === '=' && i !== 0 && state === 0) {
      state = 1;
    } else if (c === '&' || c === ';' || i === (qsLength - 1)) {
      result[k.join('')] = decodeURIComponent(v.join(''));
      k = [];
      v = [];
      state = 0;
    } else {
      if(state === 0) {
        k.push(c);
      } else {
        v.push(c);
      }
    }
  }

  return result;
};
