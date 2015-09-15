goog.provide('kivi.router.Handler');
goog.provide('kivi.router.Route');
goog.provide('kivi.router.dispatch');
goog.provide('kivi.router.setup');

/**
 * @typedef {function(...string)}
 */
kivi.router.Handler;

/**
 * @typedef {{path: (!RegExp|string), handler: !kivi.router.Handler}}
 */
kivi.router.Route;

/**
 * Create a route.
 *
 * @param {!RegExp|string} path
 * @param {!kivi.router.Handler} handler
 * @returns {!kivi.router.Route}
 */
kivi.router.route = function(path, handler) {
  return {path: path, handler: handler};
};

/**
 * Dispatch.
 *
 * @param {!Array<!kivi.router.Route>} routes
 * @param {string} path
 * @returns {boolean}
 */
kivi.router.dispatch = function(routes, path) {
  if (path[0] === '#') {
    if (path[1] === '!') {
      path = path.substr(2);
    } else {
      return false;
    }
  }

  for (var i = 0; i < routes.length; i++) {
    var r = routes[i];
    var p = r.path;
    if (typeof p === 'string') {
      if (path === p) {
        r.handler();
        return true;
      }
    } else {
      var match = path.match(p);
      if (match) {
        if (match.length > 1) {
          r.handler.apply(r, match.slice(1));
        } else {
          r.handler();
        }
        return true;
      }
    }
  }
  return false;
};

/**
 * Simple URL Router.
 *
 * @param {!Array<!kivi.router.Route>} routes
 * @param {!function()} notFound
 */
kivi.router.setup = function(routes, notFound) {
  var loc = window.location;
  var prevHash = decodeURIComponent(loc.hash);

  window.addEventListener('hashchange', function() {
    var newHash = decodeURIComponent(loc.hash);
    if (prevHash !== newHash) {
      prevHash = newHash;
      if (!kivi.router.dispatch(routes, newHash)) {
        notFound();
      }
    }
  });

  if (!kivi.router.dispatch(routes, prevHash)) {
    notFound();
  }
};
