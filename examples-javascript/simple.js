var Interfake = require('..');
var request = require('request'); // Let's use request for this example

var interfake = new Interfake({ debug: true });
interfake.createRoute({
    request: {
        url: '/whats-next',
        method: 'get'
    },
    response: {
        code: 200,
        body: {
            next:'more stuff'
        }
    }
});

interfake.listen(3030); // The server will listen on port 3030

request('http://localhost:3030/whats-next', function (error, response, body) {
    console.log(response.statusCode); // prints 200
    console.log(body); // prints { "next" : "more stuff" }
});
