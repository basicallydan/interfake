# Interfake: Mocked JSON APIs for any platform

Interfake is a tool which allows developers of client-side applications to easily create dummy APIs to develop against. Let's get started with a simple example.

## Get Started

Install Interfake in your project

```
npm install interfake --save
```

Let's write a simple fake API:

```js
var Interfake = require('interfake');
var interfake = new Interfake();
interfake.get('/whats-next').body({ next : 'more stuff '});
interfake.listen(3030); // The server will listen on port 3030
```

Now go to http://localhost:3030/whats-next in your browser (or [`curl`](http://curl.haxx.se)), and you will see the following:

```json
{
	"next":"more stuff"
}
```

You can also chain response properties:

```js
var Interfake = require('interfake');
var interfake = new Interfake();
interfake.get('/whats-next').status(400).body({ error : 'such a bad request'});
interfake.listen(3030); // The server will listen on port 3030

/*
# Request:
GET http://localhost:3030/whats-next
# Response:
400
{
	"error":"such a bad request"
}
*/
```

You can use different HTTP methods

```js
var Interfake = require('interfake');
var interfake = new Interfake();
interfake.post('/next-items').status(201).body({ created : true });
interfake.listen(3030); // The server will listen on port 3030

/*
# Request:
POST http://localhost:3030/next-items
# Response:
201
{
	"created":true
}
*/
```

And you can specify endpoints which should only be created once other ones have been hit

```js
var Interfake = require('interfake');
var interfake = new Interfake();
var postResponse = interfake.post('/next-items').status(201).body({ created : true });
postResponse.creates.get('/items/1').status(200).body({ id: 1, name: 'Item 1' });
postResponse.creates.get('/next-items').status(200).body({ items: [ { id: 1, name: 'Item 1' } ] });
interfake.listen(3030); // The server will listen on port 3030

/*
# Request:
curl http://localhost:3030/next-items -X POST
# Response:
201
{
	"created":true
}


# Request:
curl http://localhost:3030/items/1 -X GET
# Response:
200
{
	"id":1
	"name":"Item 1"
}
*/
```

---

Interfake can handle complex API structures, mutable endpoints and has three interfaces: the [JavaScript API](#method-1-javascript) (useful for NodeJS-based tests), the [command line](#method-2-command-line) (useful for non-NodeJS tests), or on-the-fly using Interfake's [HTTP meta-API](#method-2-command-line) (also useful for non-NodeJS tests). Based on [express](https://github.com/visionmedia/express).

## Method 1: JavaScript

Make sure you've install Interfake as a local module using `npm install interfake --save`. Then, you can start doing things like this:

```javascript
var Interfake = require('interfake');
var request = require('request'); // Let's use request for this example

var interfake = new Interfake();

// Create endpoints using the fluent interface
interfake.post('/items').status(201).body({ created: true }).creates.get('/next-items').status(200).body([ { id: 1, name: 'the thing' } ]);

// Or using the more verbose functional interface which accepts a JSON object
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
	console.log(body); // prints { next: "more stuff" }
});

request.post('http://localhost:3030/items', function (error, response, body) {
	console.log(response.statusCode); // prints 200
	console.log(body); // prints { created: true }
});
```

### API

* `new Interfake(options)`: creates an Interfake object. Options are:
  * `debug`: If `true`, outputs lots of annoying but helpful log messages. Default is `false`.
* `#createRoute(route)`: Takes a JSON object with `request`, `response` and optionally `afterResponse` properties
* `#listen(port)`: Takes a port and starts the server
* `#stop()`: Stops the server if it's been started

#### Fluent Interface

* `#get|post|put|delete(url)`: Create an endpoint at the specified URL. Can then be followed by each of the following, which can follow each other too e.g. `get().body().status().body()`
  * `#status(statusCode)`: Set the response status code for the endpoint
  * `#body(body)`: Set the JSON response body of the end point
  * `#create#get|post|put|delete(url)`: Specify an endpoint to create *after* the first execution of this one. API is the same as above.

## Method 2: Command line

Interfake must be install globally for this:

```
npm install interfake -g
```

Create a file from this template:

```JSON
[
	{
		"request": {
			"url": "",
			"method": ""
		},
		"response": {
			"code": 200,
			"body": {}
		}
	}
]
```

The top-level array should contain a list of endpoints (represented by request/response objects). The `request` object contains a URL and HTTP Method (GET/POST/PUT/DELETE/etc) to match against, and the `response` object contains an [HTTP Status Code](http://en.wikipedia.org/wiki/List_of_HTTP_status_codes) (`code`) and `body` object, which is in itself a JSON object, and optional. This `body` is what will be returned in the body of the response for the request you're creating.

You can create as many HTTP request/response pairs as you like. I've put some simple examples below for your copy & paste pleasure, or you can look in `/examples-command-line` for some more complex examples.

Then, run the server like so:

```
interfake ./path/to/file.json
```

### Example

Create a file called `adventuretime.json`:

```JSON
[
	{
		"request": {
			"url": "/whattimeisit",
			"method": "get"
		},
		"response": {
			"code": 200,
			"body": {
				"theTime": "Adventure Time!",
				"starring": [
					"Finn",
					"Jake"
				],
				"location": "ooo"
			}
		}
	}
]
```

Then run Interfake against it:

```
interfake --file ./adventuretime.json
```

Then using [`curl`](http://curl.haxx.se):

```
curl http://localhost:3000/whattimeisit --verbose
```

Or go to http://localhost:3000/whattimeisit in your web browser.

The above example will create a endpoint at `http://localhost:3000/whattimeisit` which returns a `200` and the body specified in the `response` object.

Run `interfake -?` for a full list of command-line options.

### Mutable endpoints

For situations where the API needs to react to mutated data, such as after a POST, PUT or DELETE request, there is an `afterResponse` property available for any existing endpoint. In this object, create another array of endpoints to be created after the original one has been created, like so:

```JSON
[
	{
		"request": {
			"url": "",
			"method": ""
		},
		"response": {
			"code": 200,
			"body": {}
		},
		"afterResponse": {
			"endpoints": [
				{
					"request": {
						"url": "",
						"method": ""
					},
					"response": {
						"code": 200,
						"body": {}
					}
				}
			]
		}
	}
]
```

The `afterResponse` property can be used as deep as you like in the endpoint hierarchy. For a complex example of the use of post-response endpoints, see the `/example-apis/crud.json` file in this repository.

## Method 3: HTTP

While the server is running, you can create new endpoints on-the-fly. You can make a POST request to `/_request` with the same JSON structure as what the command-line interface accepts.

### Example

While Interfake is running, make this request using `curl`.

```
curl -X POST -d '{ "request":{"url":"/whattimeisit", "method":"get"}, "response":{"code":200,"body":{ "theTime" : "Adventure Time!" } } }' http://localhost:3000/_request --header "Content-Type:application/json"
```

## JSONP

If you'd like the response to come back as [JSONP](http://en.wikipedia.org/wiki/JSONP) (so, for example you are trying to make a cross-origin request without using CORS) then specify a `callback` query parameter, like so:

```
curl http://localhost:3000/whattimeisit?callback=handleSomeJson --verbose
```

If you inject this code into your webpage the `handleSomeJson` method will be called with the data.

## Use Cases

### Backend for a Mobile Application

If you'd like to develop an API-driven mobile application you might not yet have a finished API available. This is a perfect example of where Interfake is useful. You can quickly mock up some dummy APIs and work on the mobile application. In parallel, perhaps another developer will be creating the real API, or you could create it later.

### Automated Testing

You can use Interfake to create dummy APIs which use data from your test setup with the HTTP method above, or by using a static set of test data. If you're writing your test suite using a NodeJS library, you can use the JavaScript API.

The HTTP API is particularly useful for developing iOS Applications which uses Automated tests written in JavaScript, or developing Node.js applications which rely on external APIs.

### Creating a static API

If you have a website or mobile application which only needs static data, deploy Interfake to a server somewhere with a JSON file serving up the data, and point your application at it.

## Compatibility

I tested this on my Mac. If you have trouble on Windows or any other platform, [raise an issue](https://github.com/basicallydan/interfake/issues).

## Version History

* 1.1.0: Added the fluent interface for easier creation of endpoints
* 1.0.0: Backwards-incompatible changes for JavaScript API, now creating an `Interfake` instance
* 0.2.0: Added JSONP support
* 0.1.0: Support for creating mocked JSON APIs using HTTP, JavaScript or command line

## Contribute

Interfake is a labour of love, created for front-end and mobile developers to increase their prototyping and development speeds. If you can contribute by getting through some issues, I would be very grateful. <3 Open Source!

[![I Love Open Source](http://www.iloveopensource.io/images/logo-lightbg.png)](http://www.iloveopensource.io/projects/5319884587659fce66000943)

## Future work

* Create a guide/some examples for how to integrate this with existing test frameworks, whether written in JavaScript or not
* Improve the templating, so that a response might include a repeated structure with an incrementing counter or randomized data
* Create a way to add static files in case you'd like to run a JavaScript application against it
