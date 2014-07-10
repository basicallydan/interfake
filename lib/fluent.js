var url = require('url');
var merge = require('merge');

function FluentInterface(server, o) {
	o = o || { debug: false };
	var debug = require('./debug')('interfake-fluent', o.debug);

	function forMethod(method, parent, top) {
		return function (originalPath) {
			var lookupHash;
			var route = {
				request: {
					url: originalPath,
					method: method
				},
				response: {
					code: 200,
					body: {}
				}
			};

			function cr() {
				if (!parent && !top) {
					debug('Fluent setup called for', route.request.url);
					lookupHash = server.createRoute(route, lookupHash);
				} else if (parent && top) {
					debug('Fluent setup called for', route.request.url, 'with parent', parent.request.url, 'and top', top.request.url);
					if (!parent.afterResponse) {
						parent.afterResponse = {
							endpoints: []
						};
					}
					parent.afterResponse.endpoints.push(route);
					server.createRoute(top);
				} else {
					throw new Error('You cannot specify a parent without a top, dummy!');
				}
			}

			cr();

			return {
				query: function (query) {
					route.request.query = merge(route.request.query, query);
					if (!parent) {
						cr();
					} else {
						debug('Parent exists so not doing another cr yet');
					}
					return this;
				},
				status: function (status) {
					debug('Replacing status for', originalPath, JSON.stringify(route.request.query), 'with', status);
					route.response.code = status;
					return this;
				},
				body: function (body) {
					debug('Replacing body for', originalPath, JSON.stringify(route.request.query), 'with', body);
					route.response.body = body;
					return this;
				},
				delay: function(delay) {
					debug('Replacing delay for', originalPath, JSON.stringify(route.request.query), 'with', delay);
					route.response.delay = delay;
					return this;
				},
				responseHeaders: function (headers) {
					debug('Replacing response headers for', originalPath, JSON.stringify(route.request.query), 'with', headers);
					route.response.headers = headers;
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