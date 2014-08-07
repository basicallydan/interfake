var url = require('url');
var merge = require('merge');

function FluentInterface(server, o) {
	o = o || { debug: false };
	var debug = require('./debug')('interfake-fluent', o.debug);

	function forMethod(method, parent) {
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
				delay: function(delay) {
					route.setResponseDelay(delay);
					return this;
				},
				responseHeaders: function (headers) {
					route.setResponseHeaders(headers);
					return this;
				},
				creates: {
					get: forMethod('get', route),
					put: forMethod('put', route),
					post: forMethod('post', route),
					delete: forMethod('delete', route)
				},
				modifies: {
					get: function (path) {
						// TODO This needs its own set of methods for merge rather than replace. At least, body does.
						route = server.routeMatching({
							method: 'get',
							url: path
						});
						return fluentInterface;
					}
				}
			};
			return fluentInterface;
		};
	}

	this.forMethod = forMethod;
}

module.exports = FluentInterface;