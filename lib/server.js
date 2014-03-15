var express = require('express');
var path = require('path');

function createInvalidDataException(data) {
	return new Error('You have to provide a JSON object with the following structure: \n' + JSON.stringify({ request : { method : '[GET|PUT|POST|DELETE]', url : '(relative URL e.g. /hello)' }, response : { code : '(HTTP Response code e.g. 200/400/500)', body : '(a JSON object)' } }, null, 4) + ' but you provided: \n' + JSON.stringify(data, null, 4));
}

function Interfake(o) {
	o = o || { debug: false };
	var app = express();
	var server;

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

	function debug() {
		if (o.debug) {
			console.log.apply(console, arguments);
		}
	}

	this.debug = debug;

	function clearRouteForRequest(request) {
		var i,j;
		if (!app.routes[request.method]) return;
		for (i = app.routes[request.method].length - 1; i >= 0; i--) {
			if (app.routes[request.method][i].path === request.url) {
				debug('Clearing existing route at', request.method + ':', request.url);
				app.routes[request.method].shift(i);
				break;
			}
		}
	}

	function createRoute(data) {
		var specifiedRequest, specifiedResponse, afterSpecifiedResponse;
		if (!data.request || !data.request.method || !data.request.url || !data.response || !data.response.code) {
			throw createInvalidDataException(data);
		}

		if (data.response.body) {
			debug('Setting up ' + data.request.method + ' ' + data.request.url + ' to return ' + data.response.code + ' with a body of length ' + JSON.stringify(data.response.body).length);
		} else {
			debug('Setting up ' + data.request.method + ' ' + data.request.url + ' to return ' + data.response.code + ' with no body');
		}
		// debug('ROUTER obj: \n' + JSON.stringify(app._router.map));

		specifiedRequest = data.request;
		specifiedResponse = data.response;
		afterSpecifiedResponse = data.afterResponse;

		clearRouteForRequest(specifiedRequest);

		app[specifiedRequest.method](specifiedRequest.url, function (req, res) {
			var responseBody = specifiedResponse.body;
			debug('Request to ' + specifiedRequest.url);

			res.setHeader('Content-Type', 'application/json');
			
			if (req.query.callback) {
				debug('Request is asking for jsonp');
				if (typeof responseBody !== 'string') responseBody = JSON.stringify(responseBody);
				responseBody = req.query.callback.trim() + '(' + responseBody + ');';
			}

			res.send(specifiedResponse.code, responseBody);

			if (afterSpecifiedResponse && afterSpecifiedResponse.endpoints) {
				afterSpecifiedResponse.endpoints.forEach(function (endpoint) {
					createRoute(endpoint);
				});
			}
		});
	}

	this.createRoute = createRoute;

	this.get = function (url) {
		this.createRoute({
			request: {
				url: url,
				method: 'get'
			},
			response: {
				code: 200,
				body: {}
			}
		});
		return {
			status: function (status) {
				debug('Replacing status for', url, 'with', status);
				createRoute({
					request: {
						url: url,
						method: 'get'
					},
					response: {
						code: status,
						body: {}
					}
				});
			},
			body: function (body) {
				debug('Replacing body for', url, 'with', body);
				createRoute({
					request: {
						url: url,
						method: 'get'
					},
					response: {
						code: 200,
						body: body
					}
				});
			}
		};
	};

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