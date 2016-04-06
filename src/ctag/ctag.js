goog.provide('kivi.CTag');
goog.require('kivi.CTagFlags');
goog.require('kivi.sync.setAttr');

/**
 * Custom Tag
 *
 * @param {number} flags
 * @param {string} tag
 * @constructor
 * @struct
 * @final
 */
kivi.CTag = function(flags, tag) {
  this.flags = flags;
  this.tag = tag;

  /** @type {?Object<string,*>} */
  this.props_ = null;
  /** @type {?Object<string,string>} */
  this.attrs_ = null;
  /** @type {?string} */
  this.style_ = null;
  /** @type {?string} */
  this.classes_ = null;
  /** @type {?function(!Node, *, *)} */
  this.update_ = null;
  /** @type {?Element} */
  this.ref = null;
};

/**
 * Create a CTag.
 *
 * @param {string} tag
 * @returns {!kivi.CTag}
 */
kivi.CTag.create = function(tag) {
  return new kivi.CTag(0, tag);
};

/**
 * Create a Svg CTag.
 *
 * @param {string} tag
 * @returns {!kivi.CTag}
 */
kivi.CTag.createSvg = function(tag) {
  return new kivi.CTag(kivi.CTagFlags.SVG, tag);
};

/**
 * Create an Element from CTag.
 *
 * @returns {!Element}
 */
kivi.CTag.prototype.createElement = function() {
  var i, il;
  var keys;
  var key;
  var ref;

  if (this.ref === null) {
    if ((this.flags & kivi.CTagFlags.SVG) === 0) {
      ref = document.createElement(this.tag);
    } else {
      ref = document.createElementNS(kivi.HtmlNamespace.SVG, this.tag);
    }

    if (this.props_ !== null) {
      keys = Object.keys(this.props_);
      for (i = 0, il = keys.length; i < il; i++) {
        key = keys[i];
        ref[key] = this.props_[key];
      }
    }

    if (this.attrs_ !== null) {
      keys = Object.keys(this.attrs_);
      for (i = 0, il = keys.length; i < il; i++) {
        key = keys[i];
        kivi.sync.setAttr(ref, key, this.attrs_[key]);
      }
    }

    if (this.style_ !== null) {
      ref.style.cssText = this.style_;
    }

    if (this.classes_ !== null) {
      ref.className = this.classes_;
    }

    if ((this.flags & kivi.CTagFlags.ENABLE_CLONING) !== 0) {
      this.ref = ref;
    }

    return ref;
  } else {
    return this.ref.cloneNode(false);
  }
};

/**
 *
 * @param {!Object<string, *>} props
 * @returns {!kivi.CTag}
 */
kivi.CTag.prototype.props = function(props) {
  this.props_ = props;
  return this;
};

/**
 *
 * @param {!Object<string, string>} attrs
 * @returns {!kivi.CTag}
 */
kivi.CTag.prototype.attrs = function(attrs) {
  this.attrs_ = attrs;
  return this;
};

/**
 *
 * @param {string} style
 * @returns {!kivi.CTag}
 */
kivi.CTag.prototype.style = function(style) {
  this.style_ = style;
  return this;
};

/**
 *
 * @param {string} classes
 * @returns {!kivi.CTag}
 */
kivi.CTag.prototype.classes = function(classes) {
  this.classes_ = classes;
  return this;
};

/**
 * Enable cloning of element.
 *
 * Cloning is disabled by default because initial rendering is slower.
 *
 * @returns {!kivi.CTag}
 */
kivi.CTag.prototype.enableCloning = function() {
  this.flags |= kivi.CTagFlags.ENABLE_CLONING;
  return this;
};

/**
 * Set update function.
 *
 * @param {function(!Node, *, *)} fn
 * @returns {!kivi.CTag}
 */
kivi.CTag.prototype.update = function(fn) {
  this.update_ = fn;
  return this;
};
