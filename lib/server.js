var express = require('express');
var app = express();
var path = require('path');

app.configure(function(){
    app.use(express.bodyParser());
	app.use(app.router);
});

function createInvalidDataException(data) {
	return new Error('You have to provide a JSON object with the following structure: \n' + JSON.stringify({ request : { method : '[GET|PUT|POST|DELETE]', url : '(relative URL e.g. /hello)' }, response : { code : '(HTTP Response code e.g. 200/400/500)', body : '(a JSON object)' } }, null, 4) + ' but you provided: \n' + JSON.stringify(data, null, 4));
}

function clearRouteForRequest(request) {
	var i,j;
	if (!app.routes[request.method]) return;
	for (i = app.routes[request.method].length - 1; i >= 0; i--) {
		if (app.routes[request.method][i].path === request.url) {
			console.log('Clearing existing route at ' + request.method + ': ' + request.url + ' (1/2)');
			app.routes[request.method].shift(i);
			break;
		}
	}
}

function createRoute(data) {
	var specifiedRequest, specifiedResponse, afterSpecifiedResponse;
	if (!data.request || !data.request.method || !data.request.url || !data.response || !data.response.code || !data.response.body) {
		throw createInvalidDataException(data);
	}

	console.log('Setting up ' + data.request.method + ' ' + data.request.url + ' to return ' + data.response.code + ' with a body of length ' + JSON.stringify(data.response.body).length);
	// console.log('ROUTER obj: \n' + JSON.stringify(app._router.map));

	specifiedRequest = data.request;
	specifiedResponse = data.response;
	afterSpecifiedResponse = data.afterResponse;

	clearRouteForRequest(specifiedRequest);

	app[specifiedRequest.method](specifiedRequest.url, function (req, res) {
		console.log('Request to ' + specifiedRequest.url);

		res.setHeader('Content-Type', 'application/json');
		
		res.send(specifiedResponse.code, specifiedResponse.body);

		if (afterSpecifiedResponse && afterSpecifiedResponse.endpoints) {
			afterSpecifiedResponse.endpoints.forEach(function (endpoint) {
				createRoute(endpoint);
			});
		}
	});
}

app.post('/_request', function(req, res){
	try {
		createRoute(req.body);
		res.send(200, { done : true });
	} catch (e) {
		console.log('Error: ', e);
		res.send(400, e);
	}
});

module.exports = {
	loadFile: function (filePath) {
		filePath = path.resolve(process.cwd(), filePath);

		file = require(filePath);

		file.forEach(function (endpoint) {
			createRoute(endpoint);
		});
	},
	createRoute: createRoute,
	listen: function (port) {
		port = port || 3000;
		app.listen(port);
		console.log('Interfake is listening for requests on port ' + port);
	}
};