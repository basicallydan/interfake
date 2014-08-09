var Interfake = require('..');
var interfake = new Interfake();
interfake.get('/items').status(200).body({ items: [ { id: 1, name: 'Item 1' } ] });
interfake.get('/items/1').status(200).body({ id: 1, name: 'Item 1' });
var postResponse = interfake.post('/items').status(201).body({ created : true });
postResponse.creates.get('/items/2').status(200).body({ id: 2, name: 'Item 2' });
postResponse.extends.get('/items').status(200).body({ items: [ { id: 2, name: 'Item 2' } ] });
interfake.listen(3000);

/*
# Request:
$ curl http://localhost:3000/items -X GET
# Response:
200
{
	"items" : [
		{
			"id":1
			"name":"Item 1"
		}
	]
}

# Request:
$ curl http://localhost:3000/items -X POST
# Response:
201
{
	"created":true
}


# Request:
$ curl http://localhost:3000/items -X GET
# Response:
200
{
	"items" : [
		{
			"id":1
			"name":"Item 1"
		},
		{
			"id":2
			"name":"Item 2"
		}
	]
}
*/