var url = require('url');
var merge = require('merge');

function FluentInterface(server, o) {
	o = o || { debug: false };
	var debug = require('./debug')('interfake-fluent', o.debug);

	function forMethod(method, parent, top) {
		return function (originalPath) {
			var lookupHash, route;
			var routeDescriptor = {
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
					debug('Fluent setup called for', routeDescriptor.request.url);
					route = server.createRoute(routeDescriptor);
				} else if (parent && top) {
					debug('Fluent setup called for', routeDescriptor.request.url, 'with parent', parent.request.url, 'and top', top.request.url);
					if (!parent.afterResponse) {
						parent.afterResponse = {
							endpoints: []
						};
					}
					parent.afterResponse.endpoints.push(routeDescriptor);
					server.createRoute(top);
				} else {
					throw new Error('You cannot specify a parent without a top, dummy!');
				}
			}

			cr();

			return {
				query: function (query) {
					routeDescriptor.request.query = merge(routeDescriptor.request.query, query);
					if (!parent) {
						cr();
					} else {
						debug('Parent exists so not doing another cr yet');
					}
					return this;
				},
				status: function (status) {
					debug('Replacing status for', originalPath, JSON.stringify(routeDescriptor.request.query), 'with', status);
					routeDescriptor.response.code = status;
					return this;
				},
				body: function (body) {
					debug('Replacing body for', originalPath, JSON.stringify(routeDescriptor.request.query), 'with', body);
					routeDescriptor.response.body = body;
					return this;
				},
				delay: function(delay) {
					debug('Replacing delay for', originalPath, JSON.stringify(routeDescriptor.request.query), 'with', delay);
					routeDescriptor.response.delay = delay;
					return this;
				},
				responseHeaders: function (headers) {
					debug('Replacing response headers for', originalPath, JSON.stringify(routeDescriptor.request.query), 'with', headers);
					routeDescriptor.response.headers = headers;
					return this;
				},
				creates: {
					get: forMethod('get', routeDescriptor, top || routeDescriptor),
					put: forMethod('put', routeDescriptor, top || routeDescriptor),
					post: forMethod('post', routeDescriptor, top || routeDescriptor),
					delete: forMethod('delete', routeDescriptor, top || routeDescriptor)
				}
			};
		};
	}

	this.forMethod = forMethod;
}

module.exports = FluentInterface;