goog.provide('vcss');

/**
 * vcss Property
 *
 * @param {string} name
 * @param {string} value
 * @constructor
 * @struct
 * @final
 */
vcss.Property = function(name, value) {
  this.name = name;
  this.value = value;
};

/**
 * vcss Rule Type
 *
 * @enum {number}
 */
vcss.RuleType = {
  selector:  0x0001,
  media:     0x0002,
  keyframes: 0x0004
};

/**
 * vcss Rule
 *
 * @param {number} flags
 * @param {*} data
 * @param {Array<!vcss.Property|!vcss.Rule>} children
 * @constructor
 * @struct
 * @final
 */
vcss.Rule = function(flags, data, children) {
  this.flags = flags;
  this.data = data;
  this.children = children;
};

/**
 * vcss Context
 *
 * @constructor
 * @struct
 * @final
 */
vcss.Context = function() {
  this.minify = true;

  /**
   * @type {Object<string,string>}
   * @private
   */
  this.ids = {};
  this._nextId = 0;
};

/**
 * Letters used to generate minified ids.
 *
 * @const {string}
 * @private
 */
vcss.Context._ID_LETTERS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/**
 * Minify id.
 *
 * @param {number} id
 * @returns {string}
 * @private
 */
vcss.Context._minifyId = function(id) {
  var letters = vcss.Context._ID_LETTERS;
  var llen = letters.length;
  var result = '';

  while (id > llen) {
    result += letters[id % llen];
    id = id / llen | 0;
  }
  result += letters[id % llen];

  return result;
};

/**
 * Returns id for the given name.
 *
 * @param {string} name
 * @returns {string}
 */
vcss.Context.prototype.id = function(name) {
  if (this.minify) {
    var id = this.ids[name];
    if (id === void 0) {
      id = this.ids[name] = vcss.Context._minifyId(this._nextId++);
    }
    return id;
  }
  return name;
};

/**
 * vcss StyleSheet
 *
 * @constructor
 * @struct
 * @final
 */
vcss.StyleSheet = function() {
  this.id = vcss.StyleSheet._nextId++;
  /** @type {Array<!vcss.StyleSheet>} */
  this.require = null;
  /** @type {function(!vcss.Context):Array<!vcss.Rule>} */
  this.rules = null;
};

/**
 * StyleSheet unique id.
 *
 * @type {number}
 * @private
 */
vcss.StyleSheet._nextId = 0;

/**
 * Build StyleSheet.
 *
 * @param {!vcss.StyleSheet} stylesheet
 * @param {!vcss.Context} context
 * @returns {string}
 */
vcss.build = function(stylesheet, context) {
  var result = '';
  var stylesheets = [];

  vcss.build._collectDependencies(stylesheet, stylesheets, {});

  for (var i = 0; i < stylesheets.length; i++) {
    var rules = stylesheets[i].rules(context);
    for (var j = 0; j < rules.length; j++) {
      result += vcss.build._ruleToString(rules[j], context, 0);
    }
  }

  return result;
};

/**
 *
 * @param {!vcss.Rule} rule
 * @param {!vcss.Context} context
 * @param {number} depth
 * @returns {string}
 * @protected
 */
vcss.build._ruleToString = function(rule, context, depth) {
  var flags = rule.flags;
  var children = rule.children;
  var i, c;
  var result = '';

  if ((flags & vcss.RuleType.selector) !== 0) {
    if (context.minify) {
      result = rule.data.map(function(r) { return vcss.build._minifyIds(r, context); }).join(',') + '{';
      for (i = 0; i < children.length - 1; i++) {
        c = children[i];
        result += c.name + ':' + c.value + ';';
      }
      c = children[children.length - 1];
      result += c.name + ':' + c.value + '}';
    } else {
      result = rule.data.join(', ') + ' {\n';
      for (i = 0; i < children.length; i++) {
        c = children[i];
        result += c.name + ': ' + c.value + ';\n';
      }
      result += '}\n';
    }
  } else if ((flags & vcss.RuleType.media) !== 0) {
    if (context.minify) {
      result = '@media ' + rule.data + '{';
      for (i = 0; i < children.length; i++) {
        result += vcss.build._ruleToString(children[i], depth + 1);
      }
      result += '}';
    } else {
      result = '@media ' + rule.data + ' {\n';
      for (i = 0; i < children.length; i++) {
        result += vcss.build._ruleToString(children[i], depth + 1) + '\n';
      }
      result += '}\n';
    }
  } else {
    if (context.minify) {
      result = '@keyframes ' + rule.data + '{';
      for (i = 0; i < children.length - 1; i++) {
        c = children[i];
        result += c.name + ':' + c.value + ';';
      }
      c = children[children.length - 1];
      result += c.name + ':' + c.value + '}';
    } else {
      result = '@keyframes ' + rule.data + ' {\n';
      for (i = 0; i < children.length; i++) {
        c = children[i];
        result += c.name + ': ' + c.value + ';\n';
      }
      result += '}\n';
    }
  }

  return result;
};

/**
 *
 * @param {!vcss.StyleSheet} stylesheet
 * @param {!Array<!vcss.StyleSheet>} result
 * @param {!Object<string,!vcss.StyleSheet>} visited
 * @protected
 */
vcss.build._collectDependencies = function(stylesheet, result, visited) {
  visited[stylesheet.id] = stylesheet;
  if (stylesheet.require != null) {
    for (var i = 0; i < stylesheet.require.length; i++) {
      var r = stylesheet.require[i];
      if (visited[r.id] === void 0) {
        vcss.build._collectDependencies(r, result, visited);
      }
    }
  }
  result.push(stylesheet);
};

/**
 * @const {RegExp}
 * @private
 */
vcss.build._SELECTOR_ID_REGEXP = new RegExp('\\.[a-zA-Z0-9]+|#[a-zA-Z0-9]+', 'g');

/**
 * Minify ids.
 *
 * @param {string} string
 * @param {!vcss.Context} context
 * @returns {string}
 * @private
 */
vcss.build._minifyIds = function(string, context) {
  return string.replace(vcss.build._SELECTOR_ID_REGEXP, function(s) {
    return s[0] + context.id(s.slice(1));
  });
};

/**
 * vcss Selector rule.
 *
 * @param {Array<string>|string} selectors
 * @param {Array<vcss.Property>} children
 * @returns {!vcss.Rule}
 */
vcss.select = function(selectors, children) {
  if (selectors.constructor !== Array) {
    selectors = [selectors];
  }
  return new vcss.Rule(vcss.RuleType.selector, selectors, children);
};

/**
 * vcss Media rule.
 *
 * @param {string} conditions
 * @param {Array<vcss.Rule>} children
 * @returns {!vcss.Rule}
 */
vcss.media = function(conditions, children) {
  return new vcss.Rule(vcss.RuleType.media, conditions, children);
};

/**
 * vcss Property.
 *
 * @param {string} name
 * @param {string} value
 */
vcss.prop = function(name, value) {
  return new vcss.Property(name, value);
};
