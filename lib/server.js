var express = require('express');
var serveStatic = require('serve-static');
var path = require('path');
var FluentInterface = require('./fluent');
var corsMiddleware = require('./cors');
var util = require('core-util-is');
var filter = require('lodash/filter');
var each = require('lodash/each');
var last = require('lodash/last');
var url = require('url');
var connectJson = require('connect-json');
var bodyParser = require('body-parser');
var Route = require('./route');
var watchr = require('watchr');
var fs = require('fs');
var request = require('request');
var supportedNonOptionsMethods = ['get','post','put','patch','delete'];

function determineDelay(delayInput) {
	var result = 0,
		range, upper, lower;
	if (util.isNumber(delayInput)) {
		result = delayInput;
	} else if (util.isString(delayInput)) {
		range = /([0-9]+)..([0-9]+)/.exec(delayInput);
		upper = +range[2];
		lower = +range[1];
		result = Math.floor(Math.random() * (upper - lower + 1) + lower);
	}

	return result;
}

function Interfake(o) {
	o = o || {
		debug: false
	};
	this.o = o;
	var app = express();
	var router = express.Router();
	var fluentInterface = new FluentInterface(this, o);
	var debug = require('./debug')('interfake-server', o.debug);
	var expectationsLookup = {};
	var server;

	o.path = url.resolve('/', o.path || '');

	debug('Root path is', o.path);

	app.use(connectJson());
	app.use(bodyParser.urlencoded({
		extended: true
	}));
	app.use(bodyParser.json());
	app.use(corsMiddleware);

	app.post('/_requests?', function(req, res) {
		try {
			debug('Being hit with a _request request');
			createRoute(req.body);
			debug('Returning');
			res.status(201).send({
				done: true
			});
		} catch (e) {
			debug('Error: ', e);
			res.status(400).send(e);
		}
	});

	app.all(o.path + '*', function(req, res, next) {
		debug(req.method, 'request to', req.url);
		if (o.onRequest && typeof(o.onRequest) === 'function') {
			o.onRequest(req);
		}
		var hashData = {
			method: req.method,
			url: req.path,
			query: req.query
		};
		var rootPathRegex, responseBody, responseStatusCode, responseHeaders, expectedRoute, expectedRoutes;
		var proxyQueryStrings;
		var sendResponse = function () {
			var responseBodyLength = 0;
			if (responseBody) {
				responseBodyLength = JSON.stringify(responseBody).length;
				responseBody = JSON.parse(JSON.stringify(responseBody));
			}
			debug('Sending a', responseStatusCode, 'response with a body whose length is', responseBodyLength);
			if (responseHeaders) {
				Object.keys(responseHeaders).forEach(function(k) {
					res.setHeader(k, responseHeaders[k]);
				});
			}

			if (req.query.callback) {
				debug('Request is asking for jsonp');
				if (typeof responseBody !== 'string') responseBody = JSON.stringify(responseBody);
				responseBody = req.query.callback.trim() + '(' + responseBody + ');';
			}

			debug('Sending response now');

			res.status(responseStatusCode).send(responseBody);
		};

		if (o.path.length > 1) {
			rootPathRegex = new RegExp('^' + o.path);
			if (!rootPathRegex.test(hashData.url)) {
				return res.send(404);
			}
			hashData.url = hashData.url.replace(rootPathRegex, '');
		}

		if (req.method.toLowerCase() === 'options') {
			expectedRoutes = this.routesMatchingPartial({
				url : hashData.url,
				query : hashData.query
			});
			if (!expectedRoutes.length) {
				debug('Couldn\'t find any routes for', hashData.url);
				return next();
			}

			responseStatusCode = 200;
			responseHeaders = {
				'Access-Control-Allow-Methods' : expectedRoutes.map(function (route) {
					return route.request.method.toUpperCase();
				}).join(', ') + ', OPTIONS'
			};

			debug('Response headers are now', responseHeaders);

			return sendResponse();
		}

		expectedRoute = this.routeMatching(hashData);

		if (!expectedRoute) {
			debug('Couldn\'t find a route for', hashData.method, hashData.url);
			return next();
			// return res.status(404).end();
		}

		var specifiedResponse = expectedRoute.response; // req.route.responseData;
		var afterSpecifiedResponse = expectedRoute.afterResponse; //req.route.afterResponseData;
		var responseDelay = determineDelay(specifiedResponse.delay);

		if (specifiedResponse.proxy) {
			proxyQueryStrings = {};
			if (req.query) {
				Object.keys(req.query).forEach(function(key) {
					if (key !== 'callback') {
						proxyQueryStrings[key] = req.query[key];
					}
				});
			}
			debug('Proxy query strings are', proxyQueryStrings);
			request[req.method.toLowerCase()]({ url : specifiedResponse.proxy.url || specifiedResponse.proxy, json : true, body : req.body, qs: proxyQueryStrings, headers : specifiedResponse.proxy.headers || {} }, function (error, response, body) {
				debug('Response from ', specifiedResponse.proxy, 'is', body, 'with headers', response.headers);
				responseBody = body;
				responseStatusCode = response.statusCode;
				responseHeaders = response.headers;
				delete responseHeaders['content-length'];
				sendResponse();
			});
		} else {
			responseBody = specifiedResponse.body;
			responseStatusCode = specifiedResponse.code;
			responseHeaders = specifiedResponse.headers;

			debug('specifiedResponse is', specifiedResponse);

			if (specifiedResponse.echo) {
				debug('Echo! Gonna return', req.body);
				responseBody = req.body;
			}

			debug(req.method, 'request to', req.url, 'returning', responseStatusCode);
			debug(req.method, 'request to', req.url, 'will be delayed by', responseDelay, 'millis');
			debug('Expected route is', expectedRoute);

			res.setHeader('Content-Type', 'application/json');

			setTimeout(function() {
				var modification;
				debug('Expected response is', specifiedResponse);

				sendResponse();

				if (afterSpecifiedResponse && afterSpecifiedResponse.endpoints) {
					debug('Response sent, setting up', afterSpecifiedResponse.endpoints.length, 'endpoints');
					afterSpecifiedResponse.endpoints.forEach(function(route) {
						debug('Setting up route', route.hash());
						addRoute(route);
					});
				}

				if (afterSpecifiedResponse && afterSpecifiedResponse.modifications) {
					debug('Response sent, making', afterSpecifiedResponse.modifications.length, 'modifications');
					while (afterSpecifiedResponse.modifications.length > 0) {
						modification = afterSpecifiedResponse.modifications.pop();

						modification.route = this.routeMatching(modification.routeDescriptor);

						if (!modification.route) {
							throw new Error('No route matching', modification.routeDescriptor, 'was found');
						}

						if (modification.body) {
							debug('Modifying body');
							modification.route.mergeResponseBody(modification.body);
						}

						if (!util.isNullOrUndefined(modification.echo)) {
							debug('Modifying echo to', modification.echo);
							modification.route.setEcho(modification.echo);
						}

						if (modification.code) {
							debug('Modifying code to', modification.code);
							modification.route.setStatusCode(modification.code);
						}

						if (modification.delay) {
							debug('Modifying delay to', modification.delay);
							modification.route.setResponseDelay(modification.delay);
						}

						if (modification.responseHeaders) {
							debug('Modifying response headers');
							modification.route.mergeResponseHeaders(modification.responseHeaders);
						}
					}
				}
			}.bind(this), responseDelay);
		}
	}.bind(this));

	function addRoute(route) {
		if (expectationsLookup[route.simpleHash()]) {
			expectationsLookup[route.simpleHash()].push(route);
		} else {
			expectationsLookup[route.simpleHash()] = [route];
		}
	}

	function createRoute(data) {
		var newRoute;

		debug('Setting up new route');

		newRoute = new Route(data, o);

		addRoute(newRoute);

		debug('Setup complete');

		return newRoute;
	}

	function removeRoute(route) {
		var indexInLookup;

		if (!route.simpleHash) {
			route = new Route(route, o);
		}

		if (expectationsLookup[route.simpleHash()]) {
			indexInLookup = expectationsLookup[route.simpleHash()].indexOf(route);
			expectationsLookup[route.simpleHash()].splice(indexInLookup, 1);
		} else {
			debug('No route could be found with the hash', route.simpleHash(), 'so no route was removed');
		}
	}

	this.createRoute = createRoute;
	this.removeRoute = removeRoute;

	this.get = fluentInterface.fluentCreate('get');
	this.post = fluentInterface.fluentCreate('post');
	this.put = fluentInterface.fluentCreate('put');
	this.patch = fluentInterface.fluentCreate('patch');
	this.delete = fluentInterface.fluentCreate('delete');
	this.options = fluentInterface.fluentCreate('options');

	this.expressApp = app;

	this.serveStatic = function(urlPath, directory) {
		urlPath = urlPath || '/_static';
		var directoryToUse = path.resolve(process.cwd(), directory);
		debug('Serving to', urlPath, 'with directory', directoryToUse);
		app.use(urlPath, express.static(directoryToUse + ''));
	};

	// Returns an array of routes matching the descriptor where the method is blank
	this.routesMatchingPartial = function(partialRequestDescriptor) {
		var routes = [];
		supportedNonOptionsMethods.forEach(function (method) {
			var fullDescriptor = {
				url : partialRequestDescriptor.url,
				method : method,
				query : partialRequestDescriptor.query
			};
			var route = this.routeMatching(fullDescriptor);
			if (route) {
				routes.push(route);
			}
		}.bind(this));
		return routes;
	};

	this.routeMatching = function(requestDescriptor) {
		var incomingRoute = new Route({
			request: requestDescriptor
		}, o);

		var expectData = expectationsLookup[incomingRoute.simpleHash()];

		if (util.isArray(expectData)) {
			expectData = expectData.filter(function(route) {
				return route.compare(incomingRoute);
			});
		} else if (!expectData) {
			// Nothing matched, but there may be a regex in there
			expectData = last(filter(expectationsLookup, function (routes) {
				var route = last(routes);
				return route.compare(incomingRoute);
			})) || [];
		}

		if (expectData.length) {
			return last(expectData);
		}

		return;
	};

	this.listen = function(port, callback) {
		port = port || 3000;
		server = app.listen(port, function() {
			debug('Interfake is listening for requests on port', server.address().port);
			if (util.isFunction(callback)) {
				callback();
			}
		});
	};

	this.stop = function() {
		if (server) {
			debug('Interfake is stopping');
			server.close(function() {
				debug('Interfake has stopped');
				server = undefined;
			});
		}
	};

	this.clearAllRoutes = function() {
		expectationsLookup = {};
	};
}

Interfake.prototype.loadFile = function(filePath, opts) {
	var file;
	var debug = require('./debug')('interfake-server-load-file', this.o.debug);

	filePath = path.resolve(process.cwd(), filePath);

	delete require.cache[require.resolve(filePath)];
	file = require(filePath);

	file.forEach(function(endpoint) {
		this.createRoute(endpoint);
	}.bind(this));

	var unload = function() {
		file.forEach(function(endpoint) {
			this.removeRoute(endpoint);
		}.bind(this));
	}.bind(this);

	var reload = function() {
		unload();
		return this.loadFile(filePath, opts);
	}.bind(this);

	var onFileChange = function (type) {
		reload();
		if (opts && opts.watch) {
			debug('Watching for changes at', filePath);
			fs.watch(filePath, onFileChange);
		}
	};

	if (opts && opts.watch) {
		debug('Watching for changes at', filePath);
		fs.watch(filePath, onFileChange);
	}

	return {
		unload: unload,
		reload: reload
	};
};

module.exports = Interfake;