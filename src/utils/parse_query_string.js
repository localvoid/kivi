goog.provide('kivi.utils.parseQueryString');

kivi.utils.parseQueryString = function(qs) {
  if (!qs) {
    return {};
  }

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
    var c = qs[i];

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
