var Interfake = require('..');
var request = require('request');

// Example showing how a regular expression can be used for the URL without using a RegExp type (e.g. you're specifying the endpoints in JSON)

var interfake = new Interfake({ debug: true });
interfake.createRoute({
    request: {
        url: {
            pattern: '/what/the/.*',
            regexp: true
        },
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

request('http://localhost:3030/what/the/heck', function (error, response, body) {
    console.log(response.statusCode); // prints 200
    console.log(body); // prints { "next" : "more stuff" }
});

request('http://localhost:3030/what/the/fuzz', function (error, response, body) {
    console.log(response.statusCode); // prints 200
    console.log(body); // prints { "next" : "more stuff" }
});

request('http://localhost:3030/what/the/what', function (error, response, body) {
    console.log(response.statusCode); // prints 200
    console.log(body); // prints { "next" : "more stuff" }
});
