function FluentInterface(server, o) {
	o = o || { debug: false };
	var debug = require('./debug')('interfake-fluent', o.debug);

	function fluentModify(method, route) {
		return function (path) {
			var modifyDescriptor = {
				afterResponse: {
					endpoints: []
				}
			};
			// TODO This needs its own set of methods for merge rather than replace. At least, body does.
			// It will need to be possible for modifies -> creates so a whole new set of methods is defo needed
			modifyDescriptor.route = server.routeMatching({
				method: method,
				url: path
			});

			route.addModification(modifyDescriptor);

			return {
				status: function (status) {
					modifyDescriptor.code = status;
					return this;
				},
				body: function (body) {
					modifyDescriptor.body = body;
					return this;
				},
				delay: function (delay) {
					modifyDescriptor.delay = delay;
					return this;
				}
			};
		};
	}

	function fluentCreate(method, parent) {
		return function (originalPath) {
			var route;
			var routeDescriptor = {
				request: {
					url: originalPath,
					method: method
				}
			};

			if (!parent) {
				debug('Fluent setup called for', routeDescriptor.request.url);
				route = server.createRoute(routeDescriptor);
			} else {
				debug('Fluent setup called for', routeDescriptor.request.url, 'with parent', parent.request.url);
				route = parent.addAfterResponse(routeDescriptor);
			}

			var fluentInterface = {
				query: function (query) {
					route.setQueryStrings(query);
					return this;
				},
				status: function (status) {
					route.setStatusCode(status);
					return this;
				},
				body: function (body) {
					debug('Changing body of', route.simpleHash(), 'to', body);
					route.setResponseBody(body);
					return this;
				},
				delay: function (delay) {
					route.setResponseDelay(delay);
					return this;
				},
				responseHeaders: function (headers) {
					route.setResponseHeaders(headers);
					return this;
				},
				creates: {
					get: fluentCreate('get', route),
					put: fluentCreate('put', route),
					post: fluentCreate('post', route),
					delete: fluentCreate('delete', route)
				},
				modifies: {
					get: fluentModify('get', route)
				}
			};
			return fluentInterface;
		};
	}

	this.fluentCreate = fluentCreate;
}

module.exports = FluentInterface;