function FluentInterface(server, o) {
	o = o || { debug: false };
	var debug = require('./debug')('interfake-fluent', o.debug);

	function forMethod(method, parent, top) {
		return function (url) {
			var route = {
				request: {
					url: url,
					method: method
				},
				response: {
					code: 200,
					body: {}
				}
			};

			function cr() {
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
			}

			cr();

			return {
				status: function (status) {
					debug('Replacing status for', url, 'with', status);
					route.response.code = status;
					cr();
					return this;
				},
				body: function (body) {
					debug('Replacing body for', url, 'with', body);
					route.response.body = body;
					cr();
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