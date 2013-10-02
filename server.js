var express = require('express');
var app = express();
var program = require('commander');
program
	.version('0.0.1')
	.option('-f, --file [file]', 'Load an API from a JSON file [file]', 'file')
	.parse(process.argv);
var file;

app.configure(function(){
    app.use(express.bodyParser());
	app.use(app.router);
});

function createInvalidDataException() {
	return new Exception('You have to provide a JSON object with the following structure: \n' + JSON.stringify({ request : { method : '[GET|PUT|POST|DELETE]', url : '(relative URL e.g. /hello)' }, response : { code : '(HTTP Response code e.g. 200/400/500)', body : '(a JSON object)' } } ));
}

function createEndpoint(data) {
	var specifiedRequest, specifiedResponse;
	if (!data.request || !data.request.method || !data.request.url || !data.response || !data.response.code || !data.response.body) {
		throw createInvalidDataException();
	}

	console.log('Setting up ' + data.request.method + ' ' + data.request.url + ' to return ' + data.response.code + ' with a body of length ' + JSON.stringify(data.response.body).length);

	specifiedRequest = data.request;
	specifiedResponse = data.response;

	app[specifiedRequest.method](specifiedRequest.url, function (req, res) {
		res.send(specifiedResponse.code, specifiedResponse.body);
	});
}

app.post('/_request', function(req, res){
	try {
		createEndpoint(req.body);
		res.send(200, { done : true });
	} catch (e) {
		console.log('Error: ', e);
		res.send(400, e);
	}
});

if (program.file) {
	file = require(program.file);

	file.forEach(function (endpoint) {
		createEndpoint(endpoint);
	});
}

app.listen(3000);
console.log('Listening on port 3000');