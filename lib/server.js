var express = require('express');
var path = require('path');
var FluentInterface = require('./fluent');

function createInvalidDataException(data) {
	return new Error('You have to provide a JSON object with the following structure: \n' + JSON.stringify({ request : { method : '[GET|PUT|POST|DELETE]', url : '(relative URL e.g. /hello)' }, response : { code : '(HTTP Response code e.g. 200/400/500)', body : '(a JSON object)' } }, null, 4) + ' but you provided: \n' + JSON.stringify(data, null, 4));
}

function Interfake(o) {
	o = o || { debug: false };
	var debug = require('./debug')('interfake-server', o.debug);
	var app = express();
	var server;
	var fluentInterface = new FluentInterface(this, o);

	app.configure(function(){
		app.use(express.json());
		app.use(express.urlencoded());
		app.use(app.router);
	});
	
	app.post('/_request', function(req, res){
		try {
			createRoute(req.body);
			res.send(200, { done : true });
		} catch (e) {
			debug('Error: ', e);
			res.send(400, e);
		}
	});

	function indexOfRequestRoute(request) {
		var i;
		if (!app.routes[request.method]) return -1;

		for (i = app.routes[request.method].length - 1; i >= 0; i--) {
			if (app.routes[request.method][i].path === request.url) {
				return i;
			}
		}
		return -1;
	}

	function clearRouteForRequest(request) {
		var i = indexOfRequestRoute(request);

		if (i === -1) {
			return;
		}

		app.routes[request.method].splice(i);
	}

	function setRouteProperty(request, property, value) {
		var i = indexOfRequestRoute(request);

		if (i === -1) {
			return;
		}

		app.routes[request.method][i][property] = value;
	}

	function createRoute(data) {
		var specifiedRequest, specifiedResponse, afterSpecifiedResponse;
		if (!data.request || !data.request.method || !data.request.url || !data.response || !data.response.code) {
			throw createInvalidDataException(data);
		}

		// debug('Setup time', JSON.stringify(data, null, 4));

		if (data.response.body) {
			debug('Setting up ' + data.request.method + ' ' + data.request.url + ' to return ' + data.response.code + ' with a body of length ' + JSON.stringify(data.response.body).length);
		} else {
			debug('Setting up ' + data.request.method + ' ' + data.request.url + ' to return ' + data.response.code + ' with no body');
		}
		debug('After response data set?', !!data.afterResponse);

		specifiedRequest = data.request;

		clearRouteForRequest(specifiedRequest);

		app[specifiedRequest.method](specifiedRequest.url, function (req, res) {
			var specifiedResponse = req.route.responseData;
			var afterSpecifiedResponse = req.route.afterResponseData;

			debug(req.method, 'request to', req.url, 'returning', specifiedResponse.code);
			// debug('After response is', afterSpecifiedResponse);

			var responseBody = specifiedResponse.body;

			res.setHeader('Content-Type', 'application/json');
			
			if (req.query.callback) {
				debug('Request is asking for jsonp');
				if (typeof responseBody !== 'string') responseBody = JSON.stringify(responseBody);
				responseBody = req.query.callback.trim() + '(' + responseBody + ');';
			}

			res.send(specifiedResponse.code, responseBody);

			if (afterSpecifiedResponse && afterSpecifiedResponse.endpoints) {
				debug('Response sent, setting up', afterSpecifiedResponse.endpoints.length, 'endpoints');
				afterSpecifiedResponse.endpoints.forEach(function (endpoint) {
					createRoute(endpoint);
				});
			}
		});

		setRouteProperty(specifiedRequest, 'responseData', data.response);
		setRouteProperty(specifiedRequest, 'afterResponseData', data.afterResponse);

		if (data.response.body) {
			debug('Setup complete: ' + data.request.method + ' ' + data.request.url + ' to return ' + data.response.code + ' with a body of length ' + JSON.stringify(data.response.body).length);
		} else {
			debug('Setup complete: ' + data.request.method + ' ' + data.request.url + ' to return ' + data.response.code + ' with no body');
		}
		debug('After response data set?', !!data.afterResponse);
	}

	this.createRoute = createRoute;

	this.get = fluentInterface.forMethod('get');
	this.post = fluentInterface.forMethod('post');
	this.put = fluentInterface.forMethod('put');
	this.delete = fluentInterface.forMethod('delete');

	this.listen = function (port) {
		port = port || 3000;
		server = app.listen(port, function () {
			debug('Interfake is listening for requests on port ' + port);
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
	filePath = path.resolve(process.cwd(), filePath);

	file = require(filePath);

	file.forEach(function (endpoint) {
		this.createRoute(endpoint);
	}.bind(this));
};

module.exports = Interfake;