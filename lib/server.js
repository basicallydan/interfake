var express = require('express');
var serveStatic = require('serve-static')
var path = require('path');
var FluentInterface = require('./fluent');
var corsMiddleware = require('./cors');
var util = require('core-util-is');
var url = require('url');
var connectJson = require('connect-json');
var bodyParser = require('body-parser');
var Route = require('./route');

function determineDelay(delayInput) {
	var result = 0, range, upper, lower;
	if(util.isNumber(delayInput)) {
		result = delayInput;
	} else if(util.isString(delayInput)) {
		range = /([0-9]+)..([0-9]+)/.exec(delayInput);
		upper = +range[2];
		lower = +range[1];
		result = Math.floor( Math.random() * (upper - lower + 1) + lower );
	}

	return result;
}

function Interfake(o) {
	o = o || { debug: false };
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

	app.post('/_requests?', function(req, res){
		try {
			debug('Being hit with a _request request');
			createRoute(req.body);
			debug('Returning');
			res.status(201).send({ done : true });
		} catch (e) {
			debug('Error: ', e);
			res.status(400).send(e);
		}
	});

	app.all(o.path + '*', function(req, res) {
		debug(req.method, 'request to', req.url);
		var hashData = {
			method: req.method,
			url: req.path,
			query: req.query
		};
		var rootPathRegex;

		if (o.path.length > 1) {
			rootPathRegex = new RegExp('^' + o.path);
			if (!rootPathRegex.test(hashData.url)) {
				return res.send(404);
			}
			hashData.url = hashData.url.replace(rootPathRegex, '');
		}

		var incomingRoute = new Route({
			request: hashData
		}, o);

		var expectData = expectationsLookup[incomingRoute.simpleHash()];
		var expectedRoute;

		if (!expectData || (util.isArray(expectData.length) && expectData.length === 0)) {
			debug('Couldn\'t find a route matching', incomingRoute.simpleHash());
			return res.status(404).end();
		}

		expectData = expectData.filter(function (route) {
			return route.compare(incomingRoute);
		});

		if (expectData.length > 0) {
			expectedRoute = expectData.pop();
		} else {
			return res.status(404).end();
		}

		var specifiedResponse = expectedRoute.response; // req.route.responseData;
		var afterSpecifiedResponse = expectedRoute.afterResponse; //req.route.afterResponseData;
		var responseDelay = determineDelay(specifiedResponse.delay);

		debug(req.method, 'request to', req.url, 'returning', specifiedResponse.code);
		debug(req.method, 'request to', req.url, 'will be delayed by', responseDelay, 'millis');
		debug('Expected route is', expectedRoute);

		var responseBody = specifiedResponse.body;

		res.setHeader('Content-Type', 'application/json');
		
		if (specifiedResponse.headers) {
			Object.keys(specifiedResponse.headers).forEach(function (k) {
				res.setHeader(k, specifiedResponse.headers[k]);
			});
		}

		if (req.query.callback) {
			debug('Request is asking for jsonp');
			if (typeof responseBody !== 'string') responseBody = JSON.stringify(responseBody);
			responseBody = req.query.callback.trim() + '(' + responseBody + ');';
		}

		setTimeout(function() {
			var modification;
			debug('Expected response is', specifiedResponse);

			res.status(specifiedResponse.code).send(responseBody);

			if (afterSpecifiedResponse && afterSpecifiedResponse.endpoints) {
				debug('Response sent, setting up', afterSpecifiedResponse.endpoints.length, 'endpoints');
				afterSpecifiedResponse.endpoints.forEach(function (route) {
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
	}.bind(this));

	function addRoute(route) {
		if (expectationsLookup[route.simpleHash()]) {
			expectationsLookup[route.simpleHash()].push(route);
		} else {
			expectationsLookup[route.simpleHash()] = [ route ];
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

	this.serveStatic = function (urlPath, directory) {
		urlPath = urlPath || '/_static';
		var directoryToUse = path.join(process.cwd(), directory);
		debug('Serving to', urlPath, 'with directory', directoryToUse);
		app.use(urlPath, serveStatic(directoryToUse + '', {'index': ['index.html', 'index.htm']}));
	};

	this.routeMatching = function (requestDescriptor) {
		var incomingRoute = new Route({
			request: requestDescriptor
		}, o);

		var expectData = expectationsLookup[incomingRoute.simpleHash()];

		if (!expectData || (util.isArray(expectData.length) && expectData.length === 0)) {
			return;
		}

		expectData = expectData.filter(function (route) {
			return route.compare(incomingRoute);
		});

		if (expectData.length > 0) {
			return expectData.pop();
		} else {
			return;
		}
	};

	this.listen = function (port, callback) {
		port = port || 3000;
		server = app.listen(port, function () {
			debug('Interfake is listening for requests on port', server.address().port);
			// debug('Interfake is listening for requests on port ' + port);
			if(util.isFunction(callback)) {
				callback();
			}
		});
	};

	this.stop = function () {
		if (server) {
			debug('Interfake is stopping');
			server.close(function () {
				debug('Interfake has stopped');
				server = undefined;
			});
		}
	};

	this.clearAllRoutes = function () {
		expectationsLookup = {};
	};
}

Interfake.prototype.loadFile = function (filePath) {
	var file;
	
	filePath = path.resolve(process.cwd(), filePath);

	file = require(filePath);

	file.forEach(function (endpoint) {
		this.createRoute(endpoint);
	}.bind(this));
};

module.exports = Interfake;
