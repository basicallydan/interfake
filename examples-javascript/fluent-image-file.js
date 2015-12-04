var Interfake = require('..');
var request = require('request'); // Let's use request for this example

var interfake = new Interfake({ debug: true });
interfake.get('/jay-peg').status(200).file('./examples-javascript/assets/20x20-image-redjpg.jpg');
interfake.get('/pee-en-gee').status(200).file('./examples-javascript/assets/20x20-image-redpng.png');
interfake.listen(3030); // The server will listen on port 3030

request('http://localhost:3030/jay-peg', function (error, response, body) {
    console.log(response.statusCode); // prints 200
    console.log(response.headers['content-disposition']); // prints attachment; 20x20-image-redjpg.jpg
    console.log(response.headers['content-type']); // prints image/jpeg
});

request('http://localhost:3030/pee-en-gee', function (error, response, body) {
    console.log(response.statusCode); // prints 200
    console.log(response.headers['content-disposition']); // prints attachment; 20x20-image-redpng.png
    console.log(response.headers['content-type']); // prints image/png
});
