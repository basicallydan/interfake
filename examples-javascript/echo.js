var Interfake = require('..');
var request = require('request'); // Let's use request for this example

var interfake = new Interfake({ debug: true });
interfake.createRoute({
    request: {
        url: '/echo',
        method: 'post'
    },
    response: {
        code: 200,
        echo: true
    }
});

interfake.listen(3030); // The server will listen on port 3030

request({ method : 'post', url : 'http://localhost:3030/echo', json : true, body : { echo : 'Echo!' } }, function (error, response, body) {
    console.log(response.statusCode); // prints 200
    console.log(body); // prints { "echo" : "Echo!" }
});
