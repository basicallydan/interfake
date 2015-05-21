var Interfake = require('..');
var request = require('request'); // Let's use request for this example

var interfake = new Interfake();
interfake.get(/\/*.?-time/).body({ time : 'It\'s something time!'});
// If you give it something more specific it'll respect that (see below)
interfake.get(/\/great-time/).body({ time : 'It\'s not regular expression time!'});
interfake.listen(3030); // The server will listen on port 3030

request('http://localhost:3030/adventure-time', function (error, response, body) {
    console.log(response.statusCode); // prints 200
    console.log(body); // prints { "time" : "It's something time!" }
});

request('http://localhost:3030/lunch-time', function (error, response, body) {
    console.log(response.statusCode); // prints 200
    console.log(body); // prints { "time" : "It's something time!" }
});

request('http://localhost:3030/whatever-time', function (error, response, body) {
    console.log(response.statusCode); // prints 200
    console.log(body); // prints { "time" : "It's something time!" }
});

request('http://localhost:3030/great-time', function (error, response, body) {
    console.log(response.statusCode); // prints 200
    console.log(body); // prints { "time" : "It's not regex time!" }
});
