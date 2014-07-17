var express = require('express');
var path = require('path');
var FluentInterface = require('./fluent');
var corsMiddleware = require('./cors');
var util = require('core-util-is');
var url = require('url');
var merge = require('merge');
var connectJson = require('connect-json');
var bodyParser = require('body-parser');
var querystring = require('querystring');

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

function Route(descriptor, o) {
	this.debug = require('./debug')('interfake-route', o.debug);
	this.request = descriptor.request;
	this.response = descriptor.response;
	this.o = o;

	if (!this.response) {
		this.response = {
			delay: 0,
			status: 200,
			body: {}
		};
	}

	this.response.query = {};

	var path = url.parse(this.request.url, true);

	this.request.url = path.pathname;

	this.setQueryStrings(path.query);

	if (this.afterResponse && util.isArray(this.afterResponse.endpoints)) {
		this.afterResponse.endpoints = (this.afterResponse.endpoints || []).map(function (descriptor) {
			return new Route(descriptor);
		});
	}
}

Route.prototype.setQueryStrings = function (query) {
	this.request.query = merge(this.request.query, query || {});
};

Route.prototype.creates = function (routeDescriptor) {
	var newRoute = new Route(routeDescriptor, this.o);
	if (!this.afterResponse) {
		this.afterResponse = {};
	}
	if (!this.afterResponse.endpoints) {
		this.afterResponse.endpoints = [];
	}
	this.afterResponse.endpoints.push(newRoute);
	return newRoute;
};

Route.prototype.simpleHash = function () {
	var routeHash = this.request.method.toUpperCase() + ' ' + this.request.url;

	this.debug('Simple lookup hash key will be: ' + routeHash);
	return routeHash;
};

Route.prototype.queryKeys = function () {
	var queryKeys = Object.keys(this.request.query || {}).filter(function (key) {
		return key !== 'callback';
	});
	return queryKeys;
};

Route.prototype.hash = function () {
	var routeHash = this.request.method.toUpperCase() + ' ' + this.request.url;
	var fullQuerystring, querystringArray = [];
	if (this.request.query) {
		var queryKeys = this.queryKeys();

		if (queryKeys.length) {
			this.debug('Query keys are', queryKeys);

			fullQuerystring = this.request.query;
			delete fullQuerystring.callback;

			queryKeys.sort().forEach(function (k) {
				querystringArray.push(k + '=' + fullQuerystring[k]);
			});

			this.debug('Full query string items are', querystringArray);

			routeHash += '?' + querystringArray.join('&');
			this.debug('Final route is', routeHash);
		}
	}

	this.debug('Lookup hash key will be: ' + routeHash);
	return routeHash;
};

Route.prototype.compare = function (route) {

	this.debug('Comparing', this.request.query, 'and', route.request.query);

	var queryKeys;
	var routeQueryKeys;
	var same = true;

	this.debug('First comparing', route.simpleHash(), 'and', this.simpleHash());
	if (route.simpleHash() !== this.simpleHash()) {
		return false;
	}

	queryKeys = this.queryKeys();
	routeQueryKeys = route.queryKeys();

	if (queryKeys.length !== routeQueryKeys.length) {
		return false;
	}

	queryKeys.forEach(function (key) {
		var routeQueryValue = route.request.query[key];
		if (util.isRegExp(routeQueryValue)) {
			same = same && routeQueryValue.test(this.request.query[key]);
		} else {
			// Not checking type because 1 and '1' are the same in this case
			same = same && this.request.query[key] == routeQueryValue;
		}
	}.bind(this));

	return same;
};

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
		// debug('After response is', afterSpecifiedResponse);

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
			res.send(specifiedResponse.code, responseBody);

			if (afterSpecifiedResponse && afterSpecifiedResponse.endpoints) {
				debug('Response sent, setting up', afterSpecifiedResponse.endpoints.length, 'endpoints');
				afterSpecifiedResponse.endpoints.forEach(function (route) {
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
		if (!data.request || !data.request.method || !data.request.url || !data.response || !data.response.code) {
			throw createInvalidDataException(data);
		}

		if (data.response.body) {
			debug('Setting up ' + data.request.method + ' ' + data.request.url + ' to return ' + data.response.code + ' with a body of length ' + JSON.stringify(data.response.body).length);
		} else {
			debug('Setting up ' + data.request.method + ' ' + data.request.url + ' to return ' + data.response.code + ' with no body');
		}

		newRoute = new Route(data, o);

		addRoute(newRoute);

		var numAfterResponse = (data.afterResponse && data.afterResponse.endpoints) ? data.afterResponse.endpoints.length : 0;

		if (data.response.body) {
			debug('Setup complete: ' + data.request.method + ' ' + data.request.url + ' to return ' + data.response.code + ' with a body of length ' + JSON.stringify(data.response.body).length + ' and ' + numAfterResponse + ' after-responses');
		} else {
			debug('Setup complete: ' + data.request.method + ' ' + data.request.url + ' to return ' + data.response.code + ' with no body and ' + numAfterResponse + ' after-responses');
		}

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
