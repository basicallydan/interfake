var Interfake = require('..');
var request = require('request'); // Let's use request for this example

var interfake = new Interfake({ debug: true });
interfake.get('/interfake-tags').proxy({
	url: 'https://api.github.com/repos/basicallydan/interfake/tags',
	headers: {
		'User-Agent': 'Interfake Proxy Whoop',
		'Accept': 'application/vnd.github.full+json'
	}
});
interfake.listen(3030); // The server will listen on port 3030

request('http://localhost:3030/interfake-tags', function (error, response, body) {
	console.log(error);
    console.log(response.statusCode); // prints 200
    console.log(body); // prints { "next" : "more stuff" }
});
