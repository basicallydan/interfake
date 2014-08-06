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

			function cr() {
				if (!parent) {
					debug('Fluent setup called for', routeDescriptor.request.url);
					route = server.createRoute(routeDescriptor);
				} else {
					debug('Fluent setup called for', routeDescriptor.request.url, 'with parent', parent.request.url);
					route = parent.addAfterResponse(routeDescriptor);
					// parent.afterResponse.endpoints.push(routeDescriptor);
					// server.createRoute(top);
				}
			}

			cr();

			return {
				query: function (query) {
					route.setQueryStrings(query);
					// routeDescriptor.request.query = merge(routeDescriptor.request.query, query);
					// if (!parent) {
					// 	cr();
					// } else {
					// 	debug('Parent exists so not doing another cr yet');
					// }
					return this;
				},
				status: function (status) {
					route.setStatusCode(status);
					// debug('Replacing status for', originalPath, JSON.stringify(routeDescriptor.request.query), 'with', status);
					// routeDescriptor.response.code = status;
					return this;
				},
				body: function (body) {
					route.setResponseBody(body);
					// debug('Replacing body for', originalPath, JSON.stringify(routeDescriptor.request.query), 'with', body);
					// routeDescriptor.response.body = body;
					return this;
				},
				delay: function(delay) {
					route.setResponseDelay(delay);
					// debug('Replacing delay for', originalPath, JSON.stringify(routeDescriptor.request.query), 'with', delay);
					// routeDescriptor.response.delay = delay;
					return this;
				},
				responseHeaders: function (headers) {
					route.setResponseHeaders(headers);
					// debug('Replacing response headers for', originalPath, JSON.stringify(routeDescriptor.request.query), 'with', headers);
					// routeDescriptor.response.headers = headers;
					return this;
				},
				creates: {
					get: forMethod('get', parent || route),
					put: forMethod('put', parent || route),
					post: forMethod('post', parent || route),
					delete: forMethod('delete', parent || route)
				}
			};
		};
	}

	this.forMethod = forMethod;
}

module.exports = FluentInterface;