var Interfake = require('..');
var request = require('request'); // Let's use request for this example

var interfake = new Interfake();

// We start with an empty set of items
interfake.get('/items').body({ items: [] });

// When an item is created, update the items set request
var postRequest = interfake.post('/items').status(201);
postRequest.creates.get('/items').body({ items: [
	{ id: 1, name: 'Item 1' }
]});

// And also create an endpoint for our new item
postRequest.creates.get('/items/1').body({ id: 1, name: 'Item 1' });

// Also create a PUT request for our new item so we can edit it
var putRequest = postRequest.creates.put('/items/1').body({ items: [
	{ id: 1, name: 'Item One' }
]});
var deleteRequest = postRequest.creates.delete('/items/1').status(204);

// But when the put request is hit we need to edit both
putRequest.extends.get('/items').body({ items: {
	0 : { name: 'Item One' }
}});

// And also create an endpoint for our new item
putRequest.extends.get('/items/1').body({ name: 'Item One' });

deleteRequest.creates.get('/items/1').status(410);

interfake.listen(3030); // The server will listen on port 3030

function printStatusAndBody(error, response, body) {
	console.log(response.statusCode);
	console.log(body);
}

request('http://localhost:3030/items', function (error, response, body) {
	console.log('1. No items from GET /items.');
	printStatusAndBody.apply(null, arguments);
	request.post('http://localhost:3030/items', function () {
		console.log('2. Create an item with POST /items.');
		printStatusAndBody.apply(null, arguments);
		request.get('http://localhost:3030/items', function() {
			console.log('3. New item in GET /items.');
			printStatusAndBody.apply(null, arguments);
			request.get('http://localhost:3030/items/1', function () {
				console.log('4. New item at GET /items/1.');
				printStatusAndBody.apply(null, arguments);
				request.put('http://localhost:3030/items/1', function () {
					console.log('5. Update item with PUT /items/1.');
					printStatusAndBody.apply(null, arguments);
					request.get('http://localhost:3030/items/1', function () {
						console.log('6. Updated item at GET /items/1.');
						printStatusAndBody.apply(null, arguments);
						request.del('http://localhost:3030/items/1', function () {
							console.log('7. Deleted item at GET /items/1.');
							printStatusAndBody.apply(null, arguments);
							request.get('http://localhost:3030/items/1', function () {
								console.log('7. Can no longer request item at GET /items/1.');
								printStatusAndBody.apply(null, arguments);
							});
						});
					});
				});
			});
		});
	});
});
