# Interfake: Quick JSON APIs

Interfake is a tool which allows developers of client-side applications of *any* platform to easily create dummy HTTP APIs to develop against. Let's get started with a simple example.

## Get started

If you don't want to use the JavaScript method to create your Interfake API, go read up on [all the methods](#three-ways-to-use-interfake). Otherwise, read on.

Install Interfake in your project.

```
npm install interfake --save
```

Let's write a simple fake API:

```js
var Interfake = require('interfake');
var interfake = new Interfake();
interfake.get('/whats-next').body({ next : 'more stuff '});
interfake.listen(3000); // The server will listen on port 3000
```

Now go to http://localhost:3000/whats-next in your browser (or [`curl`](http://curl.haxx.se)), and you will see the following:

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
interfake.listen(3000);

/*
# Request:
curl http://localhost:3000/whats-next -X GET
# Response:
400
{
	"error":"such a bad request"
}
*/
```

You can use different HTTP methods:

```js
var Interfake = require('interfake');
var interfake = new Interfake();
interfake.post('/next-items').status(201).body({ created : true });
interfake.listen(3000);

/*
# Request:
curl http://localhost:3000/next-items -X POST
# Response:
201
{
	"created":true
}
*/
```

And you can specify endpoints which should only be created once other ones have been hit (conditional endpoints):

```js
var Interfake = require('interfake');
var interfake = new Interfake();
var postResponse = interfake.post('/next-items').status(201).body({ created : true });
postResponse.creates.get('/items/1').status(200).body({ id: 1, name: 'Item 1' });
postResponse.creates.get('/next-items').status(200).body({ items: [ { id: 1, name: 'Item 1' } ] });
interfake.listen(3000);

/*
# Request:
curl http://localhost:3000/next-items -X POST
# Response:
201
{
	"created":true
}


# Request:
curl http://localhost:3000/items/1 -X GET
# Response:
200
{
	"id":1
	"name":"Item 1"
}
*/
```

There's more options, though, including delays, custom response headers, and handling query string parameters.

---

## Three ways to use Interfake

Interfake can handle complex API structures, mutable endpoints and has three interfaces: the [JavaScript API](#method-1-javascript) (useful for NodeJS-based tests), the [command line](#method-2-command-line) (useful for non-NodeJS tests), or on-the-fly using Interfake's [HTTP meta-API](#method-2-command-line) (also useful for non-NodeJS tests). Based on [express](https://github.com/visionmedia/express).

## Method 1: JavaScript

Make sure you've installed Interfake as a local module using `npm install interfake --save`. If you `var Interfake = require('interfake')` in your JavaScript file, you can use the following API to spin up the Interfake server.

### Example ([more examples](/examples-javascript))

```javascript
var Interfake = require('interfake');

var interfake = new Interfake();

// Create endpoints using the fluent interface
interfake.post('/items').status(201).body({ created: true }).creates.get('/next-items').status(200).body([ { id: 1, name: 'the thing' } ]);

// Or using the more verbose JSON syntax (more on this below under 'command line')
interfake.createRoute({
	request: {
		url: '/whats-next',
		method: 'get',
		query: { // Optional querystring parameters
			page: 2
		}
	},
	response: {
		code: 200, // HTTP Status Code
		delay: 50, // Delay in milliseconds
		body: { // JSON Body Response
			next:'more stuff'
		},
		headers: { // Optional headers
			'X-Powered-By': 'Interfake'
		}
	}
});

interfake.listen(3000); // The server will listen on port 3000
```

### API

* `new Interfake(options)`: creates an Interfake object. Options are:
  * `debug`: If `true`, outputs lots of annoying but helpful log messages. Default is `false`.
* `#createRoute(route)`: Takes a JSON object with the following:
  * `request`
  * `response`
  * `afterResponse` (optional)
* `#listen(port)`: Takes a port and starts the server
* `#stop()`: Stops the server if it's been started
* `#serveStatic(path, directory)`: Serve static (usually a website) files from a certain path. This is useful for testing [SPAs](http://en.wikipedia.org/wiki/Single-page_application). ([Example use.](/examples-javascript/fluent-web-page-test.js))

#### Fluent Interface

* `#get|post|put|delete(url)`: Create an endpoint at the specified URL. Can then be followed by each of the following, which can follow each other too e.g. `get().query().body().status().body().creates.get()` etc.
  * `#query(queryParameters)`: An object containing query parameters to accept. Overwrites matching URL params. E.g. `get('/a?b=1').query({b:2})` means `/a?b=2` will work but `/a?b=1` will not.
  * `#status(statusCode)`: Set the response status code for the endpoint
  * `#body(body)`: Set the JSON response body of the end point
  * `#delay(milliseconds)`: Set the number of milliseconds to delay the response by to mimic network of processing lag
    * Also accepts a delay range in the format 'ms..ms' e.g. '50..100'
  * `#responseHeaders(headers)`: An object containing response headers. The keys are header names.
  * `#creates#get|post|put|delete(url)`: Specify an endpoint to create *after* the first execution of this one. API is the same as above.

## Method 2: Command line

Interfake must be install globally for the command line interface to work:

```
npm install interfake -g
```

A JSON array of request/response pairs ("endpoints") you can write APIs and run them multiple times using the global `interfake` executable, and the JSON syntax.

### Example ([more examples](/examples-command-line))

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
			"delay": 100,
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

Now go to http://localhost:3000/whattimeisit in your web browser.

The above example will create a endpoint at `http://localhost:3000/whattimeisit` which returns a `200` and the body specified in the `response` object.

The top-level array should contain a list of endpoints (represented by request/response objects). The `request` object contains a URL and HTTP Method (GET/POST/PUT/DELETE/etc) to match against, and the `response` object contains an [HTTP Status Code](http://en.wikipedia.org/wiki/List_of_HTTP_status_codes) (`code`) and `body` object, which is in itself a JSON object, and optional. This `body` is what will be returned in the body of the response for the request you're creating.

You can create as many HTTP request/response pairs as you like. I've put some simple examples below for your copy & paste pleasure, or you can look in `/examples-command-line` for some more complex examples.

Run `interfake --help` for a full list of command-line options.

### Conditional endpoints

When the API needs to mutate responses, such as after a POST, PUT or DELETE request, there is an `afterResponse` property available for any existing endpoint, which specifies endpoints to create after the parent has been hit for the first time.

```JSON
[
	{
		"request": {
			"url": "/items",
			"method": "post"
		},
		"response": {
			"code": 201,
			"body": {}
		},
		"afterResponse": {
			"endpoints": [
				{
					"request": {
						"url": "/items",
						"method": "get"
					},
					"response": {
						"code": 200,
						"body": { items : [] }
					}
				}
			]
		}
	}
]
```

The `afterResponse` property can be used as deep as you like in the endpoint hierarchy. For a complex example of the use of post-response endpoints, see the `/examples-command-line/crud.json` file in this repository.

## Method 3: HTTP

While the server is running, you can create new endpoints on-the-fly. You can make a POST request to `/_requests` with the same JSON structure that the command line interface accepts.

### Example

While Interfake is running, make this request using `curl`.

```
curl -X POST -d '{ "request":{"url":"/whattimeisit", "method":"get"}, "response":{"code":200,"body":{ "theTime" : "Adventure Time!" } } }' http://localhost:3000/_requests --header "Content-Type:application/json"
```

## JSONP

Interfake supports [JSONP](http://en.wikipedia.org/wiki/JSONP). Just put `?callback` on the end of the URLs being called.

```
curl http://localhost:3000/whattimeisit?callback=handleSomeJson
```

## Use Cases

### Backend for a Mobile Application

If you'd like to develop an API-driven mobile application you might not yet have a finished API available. This is a perfect example of where Interfake is useful. You can quickly mock up some dummy APIs and work on the mobile application. In parallel, perhaps another developer will be creating the real API, or you could create it later.

### Automated Testing

You can use Interfake to create dummy APIs which use data from your test setup with the HTTP method above, or by using a static set of test data. If you're writing your test suite using a NodeJS library, you can use the JavaScript API.

The HTTP API is particularly useful for developing iOS Applications which uses Automated tests written in JavaScript, or developing Node.js applications which rely on external APIs.

For an example of how to do this, please see the [web page test example](/examples-javascript/fluent-web-page-test.js).

### Creating a static API

If you have a website or mobile application which only needs static data, deploy Interfake to a server somewhere with a JSON file serving up the data, and point your application at it.

## Compatibility

I tested this on my Mac. If you have trouble on Windows or any other platform, [raise an issue](https://github.com/basicallydan/interfake/issues).

## Version History

* 1.6.1: Upgraded to Express 4.0.0 (thanks to [Sebastian Schürmann](https://github.com/sebs)).
* 1.6.0: Custom response headers (thanks to [Sebastian Schürmann](https://github.com/sebs)).
* 1.5.0: Can now use query strings (thanks to [rajit](https://github.com/rajit)). Massive.
* 1.4.0: Can specify delay range using `delay(10..50)` (by [bruce-one](https://github.com/bruce-one))
* 1.3.0: Can mimic slow responses using `delay()` (by [bruce-one](https://github.com/bruce-one))
* 1.2.0: Added ability to do static files
* 1.1.1: Fixed the response to `POST /_request` to be a 201, and `POST /_requests` is now the path used
* 1.1.0: Added the fluent interface for easier creation of endpoints
* 1.0.0: Backwards-incompatible changes for JavaScript API, now creating an `Interfake` instance
* 0.2.0: Added JSONP support
* 0.1.0: Support for creating mocked JSON APIs using HTTP, JavaScript or command line

## Contribute

Interfake is a labour of love, created for front-end and mobile developers to increase their prototyping and development speeds. If you can contribute by getting through some issues, I would be very grateful.

If you make any pull requests, please do try to write tests, or at the very least ensure they're still passing by running `npm test` before you do so.

<3 Open Source!

[![I Love Open Source](http://www.iloveopensource.io/images/logo-lightbg.png)](http://www.iloveopensource.io/projects/5319884587659fce66000943)

## Dependencies

* [express](https://github.com/visionmedia/express)
* [commander](https://github.com/visionmedia/commander.js/)

## Works well with

* [Mocha](http://visionmedia.github.io/mocha/) - the test framework
* [Zombie.js](http://zombie.labnotes.org/) - the Node.js-powered headless web browser

## Thank yous

[Alun](https://github.com/4lun) for reading this readme.

## Author & Contributors

[Dan Hough](https://github.com/basicallydan) ([Twitter](https://twitter.com/basicallydan) | [Website](http://danielhough.co.uk))
[bruce-one](https://github.com/bruce-one)
[rajit](https://github.com/rajit)
[Sebastian Schürmann](https://github.com/sebs)

## Future work

* Create a guide/some examples for how to integrate this with existing test frameworks, whether written in JavaScript or not
* Improve the templating, so that a response might include a repeated structure with an incrementing counter or randomized data
* Allow custom headers to be set
