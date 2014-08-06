var express = require('express');
var path = require('path');
var FluentInterface = require('./fluent');
var corsMiddleware = require('./cors');
var util = require('core-util-is');
var connectJson = require('connect-json');
var bodyParser = require('body-parser');
var Route = require('./route');

function createInvalidDataException(data) {
	return new Error('You have to provide a JSON object with the following structure: \n' + JSON.stringify({ request : { method : '[GET|PUT|POST|DELETE]', url : '(relative URL e.g. /hello)' }, response : { code : '(HTTP Response code e.g. 200/400/500)', body : '(a JSON object)' } }, null, 4) + ' but you provided: \n' + JSON.stringify(data, null, 4));
}

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

	o.path = path.join('/', o.path || '');

	debug('Root path is', o.path);

	app.use(o.path, router);
	app.use(connectJson());
	app.use(bodyParser());
	app.use(corsMiddleware);

	app.post('/_requests?', function(req, res){
		try {
			debug('Being hit with a _request request');
			createRoute(req.body);
			debug('Returning');
			res.send(201, { done : true });
		} catch (e) {
			debug('Error: ', e);
			res.send(400, e);
		}
	});

	app.all('/*', function(req, res) {
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
			return res.send(404);
		}

		expectData = expectData.filter(function (route) {
			return route.compare(incomingRoute);
		});

		if (expectData.length > 0) {
			expectedRoute = expectData.pop();
		} else {
			return res.send(404);
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
			debug('Expected response is', specifiedResponse);

			res.send(specifiedResponse.code, responseBody);

			if (afterSpecifiedResponse && afterSpecifiedResponse.endpoints) {
				debug('Response sent, setting up', afterSpecifiedResponse.endpoints.length, 'endpoints');
				afterSpecifiedResponse.endpoints.forEach(function (route) {
					debug('Setting up route', route.hash());
					addRoute(route);
				});
			}
		}, responseDelay);
	});

	function addRoute(route) {
		if (expectationsLookup[route.simpleHash()]) {
			expectationsLookup[route.simpleHash()].push(route);
		} else {
			expectationsLookup[route.simpleHash()] = [ route ];
		}
	}

	function createRoute(data) {
		var newRoute;
		// This may no longer be necessary
		// if (!data.request || !data.request.method || !data.request.url || !data.response || !data.response.code) {
		// 	throw createInvalidDataException(data);
		// }

		// var numAfterResponse = (data.afterResponse && data.afterResponse.endpoints) ? data.afterResponse.endpoints.length : 0;

		// if (data.response.body) {
		// 	debug('Setting up ' + data.request.method + ' ' + data.request.url + ' to return ' + data.response.code + ' with a body of length ' + JSON.stringify(data.response.body).length + ' and ' + numAfterResponse + ' after-responses');
		// } else {
		// 	debug('Setting up ' + data.request.method + ' ' + data.request.url + ' to return ' + data.response.code + ' with no body');
		// }

		debug('Setting up new route');

		newRoute = new Route(data, o);

		addRoute(newRoute);

		debug('Setup complete');

		// if (data.response.body) {
		// 	debug('Setup complete: ' + data.request.method + ' ' + data.request.url + ' to return ' + data.response.code + ' with a body of length ' + JSON.stringify(data.response.body).length + ' and ' + numAfterResponse + ' after-responses');
		// } else {
		// 	debug('Setup complete: ' + data.request.method + ' ' + data.request.url + ' to return ' + data.response.code + ' with no body and ' + numAfterResponse + ' after-responses');
		// }

		return newRoute;
	}

	this.createRoute = createRoute;

	this.get = fluentInterface.forMethod('get');
	this.post = fluentInterface.forMethod('post');
	this.put = fluentInterface.forMethod('put');
	this.delete = fluentInterface.forMethod('delete');

	this.serveStatic = function (path, directory) {
		path = path || '/_static';
		app.use(path, express.static(directory));
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
			debug('Interfake is listening for requests on port ' + port);
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
