# Interfake: Quick JSON APIs

[![Gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/basicallydan/interfake?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

Interfake is a tool which allows developers of client-side applications of *any* platform to easily create dummy HTTP APIs to develop against. Let's get started with a simple example.

## Get started

If you don't want to use the JavaScript method to create your Interfake API, go read up on [all the methods](https://github.com/basicallydan/interfake/wiki). Otherwise, read on.

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
$ curl http://localhost:3000/whats-next -X GET
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
$ curl http://localhost:3000/next-items -X POST
# Response:
201
{
	"created":true
}
*/
```

You can specify endpoints which should only be **created** once other ones have been hit.

```js
var Interfake = require('interfake');
var interfake = new Interfake();
var postResponse = interfake.post('/next-items').status(201).body({ created : true });
postResponse.creates.get('/items/1').status(200).body({ id: 1, name: 'Item 1' });
postResponse.creates.get('/next-items').status(200).body({ items: [ { id: 1, name: 'Item 1' } ] });
interfake.listen(3000);

/*
# Request:
$ curl http://localhost:3000/next-items -X POST
# Response:
201
{
	"created":true
}


# Request:
$ curl http://localhost:3000/items/1 -X GET
# Response:
200
{
	"id":1
	"name":"Item 1"
}
*/
```

You can even specify how endpoints should be **extended** once others have been hit.

```js
var Interfake = require('interfake');
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
```

There's more options, though, including delays, custom response headers, and handling query string parameters.

---

## API

The majority of Interfake users will probably be interested in the JavaScript API, which is covered below. However, there are in fact [three ways to use Interfake: JavaScript, on the Command Line (using static JSON files), or using an HTTP meta-API](https://github.com/basicallydan/interfake/wiki). These are covered in detail in [the Wiki](https://github.com/basicallydan/interfake/wiki).

### JavaScript

* `new Interfake(options)`: creates an Interfake object. Options are:
  * `debug`: If `true`, outputs lots of annoying but helpful log messages. Default is `false`.
  * `path`: Sets the API root path. E.g. if `api` is used then the route at `/users` will be accessible at `/api/path`
* `#createRoute(route)`: Takes a JSON object with the following:
  * `request`
  * `response`
  * `afterResponse` (optional)
* `#listen(port, callback)`: Takes a port and starts the server, and a callback which executes when the server is running
* `#stop()`: Stops the server if it's been started
* `#serveStatic(path, directory)`: Serve static (usually a website) files from a certain path. This is useful for testing [SPAs](http://en.wikipedia.org/wiki/Single-page_application). ([Example use.](/examples-javascript/fluent-web-page-test.js))
* `#loadFile(path, options)`: Load a JSON file containing an Interfake-shaped API configuration. Options includes `watch`, which, if true, means that the file loaded there will be reloaded when it changes.

#### Fluent Interface

* `#get|post|put|patch|delete(url)`: Create an endpoint at the specified URL. Can then be followed by each of the following, which can follow each other too e.g. `get().query().body().status().body().creates.get()` etc.
  * `#query(queryParameters)`: An object containing query parameters to accept. Overwrites matching URL params. E.g. `get('/a?b=1').query({b:2})` means `/a?b=2` will work but `/a?b=1` will not. You can also use arrays as the value, e.g. `.query({b:[1,2]})` or even a valid ```RegExp```. All values which will be matched regardless of order.
  * `#status(statusCode)`: Set the response status code for the endpoint
  * `#body(body)`: Set the JSON response body of the end point
  * `#echo(true|false)`: The response body should be the same as the request body. Can be used after `extends` too. ([Example use](/examples-javascript/fluent-echo.js))
  * `#proxy(url|options)`: The response should be a proxy of another URL. Currently, options accepts both `url` and `headers` properties. The `headers` property specifies the headers which should be sent in the request to the proxy URL
  * `#delay(milliseconds)`: Set the number of milliseconds to delay the response by to mimic network of processing lag
    * Also accepts a delay range in the format 'ms..ms' e.g. '50..100'
  * `#responseHeaders(headers)`: An object containing response headers. The keys are header names.
  * `#creates#get|post|put|patch|delete(url)`: Specify an endpoint to create *after* the first execution of this one. API is the same as above.
  * `#extends#get|post|put|patch|delete(url)`: Specify an endpoint to modify *after* the first execution of this one. API is the same as above. The endpoints you extend are matched based on `url` and `query`. The `status`, `body`, `delay` and `responseHeaders` are the extendable bits. Keep in mind that keys will be replaced, and arrays will be added to.

## JSONP

Interfake supports [JSONP](http://en.wikipedia.org/wiki/JSONP). Just put `?callback` on the end of the URLs being called.

```
$ curl http://localhost:3000/whattimeisit?callback=handleSomeJson
```

## Use Cases

### Backend/API Prototype for a Single-Page Application (SPA)

By using Interfake's `.serveStatic()` method, you can serve some front-end HTML, JavaScript and CSS which uses the API you've created as the backend. Not only does this massively speed up development time by not having to have a real API, it serves as a great prototype for the real API, and avoids having to mock requests. This is my most common use for Interfake.

### Backend for a Mobile Application

If you'd like to develop an API-driven mobile application you might not yet have a finished API available. This is a perfect example of where Interfake is useful. You can quickly mock up some dummy APIs and work on the mobile application. In parallel, perhaps another developer will be creating the real API, or you could create it later.

### Automated Testing

You can use Interfake to create dummy APIs which use data from your test setup with the HTTP method above, or by using a static set of test data. If you're writing your test suite using a NodeJS library, you can use the JavaScript API.

The HTTP API is particularly useful for developing iOS Applications which uses Automated tests written in JavaScript, or developing Node.js applications which rely on external APIs.

For an example of how to do this, please see the [web page test example](/examples-javascript/fluent-web-page-test.js).

### Regular Expressions for URLs

Regular expressions can be used to specify endpoint URLs in two different ways depending on which interface you use. For the fluent API, you simply put a JavaScript regular expression as the URL, e.g.

```javascript
interfake.get(/\/regular\/expression/).status(200);
```

This is also supported when using `createRoute`, but since JSON does not support regular expressions, a different method must be used here:

```json
[
	{
		"request": {
			"url": {
				"pattern" : "/what/the/.*",
				"regexp" : true
			},
			"method": "get"
		},
		"response": {
			"code": 200
		}
	}
]
```

The pattern specified in the `request.url.pattern` string will be parsed and treated as a regular expression.

### Proxying another API

There are a number of reasons you might want to proxy another API. Three of the more common ones are:

* It requires some authorization options which you want to hide from a client-side script but nonetheless want to use every time you make a request
* There is a [cross-origin request sharing (CORS)](http://en.wikipedia.org/wiki/Cross-origin_resource_sharing) issue which prevents your client-side code from using the API
* It requires some tedious header setup

Interfake allows you to proxy another URL quite easily and also specify any headers you like while doing so, using the `proxy` option.

```js
interfake.get('/github-issues').proxy('https://api.github.com/repos/basicallydan/interfake/tags');
```

The example above creates a simple proxy against the URL `https://api.github.com/repos/basicallydan/interfake/tags` and will return whatever a public, non-authorized user will see. However, consider an endpoint which requires authorization.

```js
interfake.get('/github-issues').proxy({
	url: 'https://api.github.com/repos/basicallydan/interfake/tags',
	headers: {
		'Authorization': 'Token qoinfiu13jfcikwkhf1od091dj0'
	}
});
```

This example uses an authorization token to authorize the request. This is one of the common use-cases. However, the first one will easily solve CORS issues, and any other headers apart from `Authorization` can be specified instead.

### Echoing the request body

This can be easily achieved using the `.echo()` method in the fluent interface, or by specifying the following for route options:

```json
{
	request : {
		url : '/echo',
		method: 'post'
	},
	response : {
		echo : true	
	}
}
```

A request to the `/echo` endpint will return whatever body it is sent. You can see more examples of this in the [examples folder](/examples-javascript/).

### Creating a static API

If you have a website or mobile application which only needs static data, deploy Interfake to a server somewhere with a JSON file serving up the data, and point your application at it.

## Compatibility

I tested this on my Mac. If you have trouble on Windows or any other platform, [raise an issue](https://github.com/basicallydan/interfake/issues).

## Version History

* 1.19.0: Using the npm version of `deepmerge`, not my fork on gh. Exposing underlying express app as instance variable `expressApp`
* 1.18.0: Array support in query string params added thanks to [@roychoo](https://github.com/roychoo). Also, fixed a couple of tests which broke in Node 5.0.
* 1.17.0: Regular expressions can now be specified in JSON route files and in the normal JavaScript API (`.createRoute()`) using `{ url : { pattern : '', regexp : true } }`
* 1.16.0: Added automatic `OPTIONS` support for any routes specified (e.g. if `GET` has been defined then `OPTIONS` will say so. Also includes `access-control-allow-origin`)
* 1.15.0: Added `.echo` or `{ echo : true }` support for response. Now, the response body can an echo of the request body.
* 1.14.0: Fixed `serveStatic` but also accidental new feature. Now, 404 responses include some text: the default express text too.
* 1.13.0: Regex URL support
* 1.12.1: Bug fix from [Alexander Pope](https://github.com/popeindustries), proxy and query params not playing well together
* 1.12.0: Proxy support
* 1.11.0: Config reload
* 1.10.0: Support for PATCH
* 1.9.2: Updated deepmerge dependency, since it included a bug
* 1.9.1: Updated dependencies, and fixed a bug where `.serveStatic` was not working on Windows because of the directory being wrong.
* 1.9.0: Created the `.extends` methods to extend existing endpoints
* 1.8.2: Bug fix for Windows - paths were screwed up
* 1.8.1: Bug fix for responseheaders
* 1.8.0: Querystring parameter values can now be regular expressions
* 1.7.2: Fixed a bug where `.delay()` was not allowing chaining
* 1.7.1: Added ability to set a root path for the API only (skipped 1.7.0 which was a bit broken)
* 1.6.2: Can add a callback to `listen` so that you know when the server has started (by [bruce-one](https://github.com/bruce-one))
* 1.6.1: Upgraded to Express 4.0.0 (thanks to [Sebastian Schürmann](https://github.com/sebs)).
* 1.6.0: Custom response headers (thanks to [Sebastian Schürmann](https://github.com/sebs)).
* 1.5.0: Can now use querystring params (thanks to [rajit](https://github.com/rajit)). Massive.
* 1.4.0: Can specify delay range using `delay(10..50)` (by [bruce-one](https://github.com/bruce-one))
* 1.3.0: Can mimic slow responses using `delay()` (by [bruce-one](https://github.com/bruce-one))
* 1.2.0: Added ability to do static files
* 1.1.1: Fixed the response to `POST /_request` to be a 201, and `POST /_requests` is now the path used
* 1.1.0: Added the fluent interface for easier creation of endpoints
* 1.0.0: Backwards-incompatible changes for JavaScript API, now creating an `Interfake` instance
* 0.2.0: Added JSONP support
* 0.1.0: Support for creating mocked JSON APIs using HTTP, JavaScript or command line

## Contribute

Interfake is a labour of love, created for front-end and mobile developers to increase their prototyping and development speeds. If you can contribute by getting through some issues, I would be very grateful. Please read more about how to contribute in the [CONTRIBUTING.md](https://github.com/basicallydan/interfake/blob/master/CONTRIBUTING.md) document.

It's important that the tests all pass so we can keep this little badge green:

[![Travis](http://img.shields.io/travis/basicallydan/interfake.svg)](https://travis-ci.org/basicallydan/interfake)

<3 Open Source!

[![I Love Open Source](http://www.iloveopensource.io/images/logo-lightbg.png)](http://www.iloveopensource.io/projects/5319884587659fce66000943)

## Dependencies

* [express](https://github.com/visionmedia/express)
* [express body-parser](https://github.com/expressjs/body-parser)
* [connect-json](https://github.com/dtinth/connect-json)
* [commander](https://github.com/visionmedia/commander.js/)
* [core-util-is](https://github.com/isaacs/core-util-is)
* [merge](https://github.com/yeikos/js.merge)
* [basicallydan/deepmerge](https://github.com/basicallydan/deepmerge) forked from [nrf110/deepmerge](https://github.com/nrf110/deepmerge)

## Works well with

* [Mocha](http://mochajs.org/) - the test framework
* [Zombie.js](http://zombie.labnotes.org/) - the Node.js-powered headless web browser

## Thank yous

[Alun](https://github.com/4lun) for reading this readme.

## Author & Contributors

* [Dan Hough](https://github.com/basicallydan) ([Twitter](https://twitter.com/basicallydan) | [Website](http://danielhough.co.uk))
* [bruce-one](https://github.com/bruce-one)
* [rajit](https://github.com/rajit)
* [Sebastian Schürmann](https://github.com/sebs)
* [roychoo](https://github.com/roychoo)

## Future work

* Create a guide/some examples for how to integrate this with existing test frameworks, whether written in JavaScript or not
* Improve the templating, so that a response might include a repeated structure with an incrementing counter or randomized data
