function FluentInterface(server, o) {
	o = o || { debug: false };
	var debug = require('./debug')('interfake-fluent', o.debug);

	function throwCreatesNotSupportedError () {
		throw new Error('Sorry, but modified routes cannot yet create new routes after their response. This is planned for a future version of Interfake.');
	}

	function throwExtendsNotSupportedError () {
		throw new Error('Sorry, but modified routes cannot yet modify existing routes after their response. This is planned for a future version of Interfake.');
	}

	function fluentModify(method, route) {
		return function (path) {
			var modifyDescriptor = {
				routeDescriptor: {
					method: method,
					url: path
				}
			};

			route.addModification(modifyDescriptor);

			return {
				query: function (query) {
					modifyDescriptor.routeDescriptor.query = query;
					return this;
				},
				status: function (status) {
					modifyDescriptor.code = status;
					return this;
				},
				body: function (body) {
					modifyDescriptor.body = body;
					return this;
				},
				echo: function (echo) {
					if (typeof echo === 'undefined') {
						echo = true;
					}
					modifyDescriptor.echo = echo;
					return this;
				},
				delay: function (delay) {
					modifyDescriptor.delay = delay;
					return this;
				},
				responseHeaders: function (headers) {
					modifyDescriptor.responseHeaders = headers;
					return this;
				},
				creates: {
					get: throwCreatesNotSupportedError,
					put: throwCreatesNotSupportedError,
					post: throwCreatesNotSupportedError,
					patch: throwCreatesNotSupportedError,
					delete: throwCreatesNotSupportedError
				},
				extends: {
					get: throwExtendsNotSupportedError,
					put: throwExtendsNotSupportedError,
					post: throwExtendsNotSupportedError,
					patch: throwCreatesNotSupportedError,
					delete: throwExtendsNotSupportedError
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
				echo: function (echo) {
					if (typeof echo === 'undefined') {
						echo = true;
					}
					route.setEcho(echo);
					return this;
				},
				proxy: function (url) {
					route.setProxyURL(url);
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
					patch: fluentCreate('patch', route),
					delete: fluentCreate('delete', route),
				},
				extends: {
					get: fluentModify('get', route),
					put: fluentModify('put', route),
					post: fluentModify('post', route),
					patch: fluentModify('patch', route),
					delete: fluentModify('delete', route),
				}
			};
			return fluentInterface;
		};
	}

	this.fluentCreate = fluentCreate;
}

module.exports = FluentInterface;
