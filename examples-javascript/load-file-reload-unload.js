var Interfake = require('..');
var request = require('request'); // Let's use request for this example

var interfake = new Interfake();
var file = interfake.loadFile(require.resolve('./load-file-reload-unload.json')); // We can get a reference to the file we just loaded

interfake.listen(3030); // The server will listen on port 3030

request('http://localhost:3030/whattimeisit', function(error, response, body) {
    console.log(response.statusCode); // prints 200
    console.log(body); // prints { "theTime" : "Adventure Time" }
    file = file.reload(); // The file will be reloaded, in case you changed it

    request('http://localhost:3030/whattimeisit', function(error, response, body) {
        console.log(response.statusCode); // prints 200
        console.log(body); // prints { "theTime" : "Adventure Time" }
        file = file.unload(); // The file can be unloaded, but this won't affect other routes

        request('http://localhost:3030/whattimeisit', function(error, response, body) {
            console.log(response.statusCode); // prints 404
            console.log(body); // prints blank line
        });
    });
});