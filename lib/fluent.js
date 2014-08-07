function FluentInterface(server, o) {
	o = o || { debug: false };
	var debug = require('./debug')('interfake-fluent', o.debug);

	function forMethod(method, parent) {
		return function (originalPath, modifyDescriptor) {
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
				debug('Parent is', parent, 'and mod is', modifyDescriptor);
				if (modifyDescriptor) {
					debug('Adding to the modify descriptor', routeDescriptor.request.url, 'for parent', parent.request.url);
					modifyDescriptor.afterResponse = {
						endpoints: [
							routeDescriptor
						]
					};
				} else {
					debug('Fluent setup called for', routeDescriptor.request.url, 'with parent', parent.request.url);
					route = parent.addAfterResponse(routeDescriptor);
				}
			}

			var fluentInterface = {
				query: function (query) {
					route.setQueryStrings(query);
					return this;
				},
				status: function (status) {
					if (modifyDescriptor) {
						modifyDescriptor.code = status;
					} else {
						route.setStatusCode(status);
					}
					return this;
				},
				body: function (body) {
					if (modifyDescriptor) {
						debug('Merging body for', route.simpleHash(), 'with', body);
						modifyDescriptor.body = body;
					} else {
						debug('Changing body of', route.simpleHash(), 'to', body);
						route.setResponseBody(body);
					}
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
					get: forMethod('get', route, modifyDescriptor),
					put: forMethod('put', route, modifyDescriptor),
					post: forMethod('post', route, modifyDescriptor),
					delete: forMethod('delete', route, modifyDescriptor)
				},
				modifies: {
					get: function (path) {
						modifyDescriptor = {};
						// TODO This needs its own set of methods for merge rather than replace. At least, body does.
						// It will need to be possible for modifies -> creates so a whole new set of methods is defo needed
						modifyDescriptor.route = server.routeMatching({
							method: 'get',
							url: path
						});
						route.addModification(modifyDescriptor);
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