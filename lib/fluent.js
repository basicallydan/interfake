var url = require('url');

function FluentInterface(server, o) {
	o = o || { debug: false };
	var debug = require('./debug')('interfake-fluent', o.debug);

	function forMethod(method, parent, top) {
		return function (originalPath) {
			path = url.parse(originalPath, true);
			var route = {
				request: {
					url: path.pathname,
					method: method,
					query: path.query
				},
				response: {
					code: 200,
					body: {}
				}
			};

			if (!parent) {
				server.createRoute(route);
			} else {
				if (!parent.afterResponse) {
					parent.afterResponse = {
						endpoints: []
					};
				}
				parent.afterResponse.endpoints.push(route);
				if (top) {
					server.createRoute(top);
				} else {
					server.createRoute(parent);
				}
			}

			return {
				status: function (status) {
					debug('Replacing status for', originalPath, 'with', status);
					route.response.code = status;
					return this;
				},
				body: function (body) {
					debug('Replacing body for', originalPath, 'with', body);
					route.response.body = body;
					return this;
				},
				delay: function(delay) {
					debug('Replacing delay for', path, 'with', delay);
					route.response.delay = delay;
					return this;
				},
				creates: {
					get: forMethod('get', route, top || route),
					put: forMethod('put', route, top || route),
					post: forMethod('post', route, top || route),
					delete: forMethod('delete', route, top || route)
				}
			};
		};
	}

	this.forMethod = forMethod;
}

module.exports = FluentInterface;