Interfake is a tool which allows developers of client-side applications to create fake APIs to test against.

Interfake gives you two ways to create new endpoints for your APIs: using a JSON file, or using an HTTP interface.

**Once you've cloned it please** run `npm install`.

## JSON File

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

What you see there is an array of endpoints. An endpoint needs the `request` and `response` properties, which are JSON objects. The first one, `request` respectively needs the `url` and `method` properties, which are both strings. The second, `response`, needs the `code` property which is an integer which corresponds to an HTTP status code, and `body` which corresponds to a JSON-structured response body. See below for some relevant examples.

Then, run the server like so:

```
node server.js -f ./path/to/file.json
```

### Example

The following examples assume that Interfake is running at http://localhost:3000, so replace where appropriate.

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
			"body" {
				"theTime": "Adventure Time!"
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

Then run the server:

```
node server.js -f ./adventuretime.json
```

The above example will create a endpoint at `http://localhost:3000/whattimeisit` which returns a `200`

## HTTP

While this thing is running, you can create new endpoints on-the-fly. You can make a POST request to `/_request` with a string containing the same JSON structure as above. If you were using `curl`, this is an example (smaller, for brevity).

In this instance, we don't need to specify a file.

### Example

Run the server:

```
node server.js
```

Then make the request:

```
curl -X POST -d '{ "request":{"url":"/whattimeisit", "method":"get"}, "response":{"code":200,"body":{ "theTime" : "Adventure Time!" } } }' http://localhost:3000/_request --header "Content-Type:application/json"
```

## Plans for this module

The plan is to turn this into a global node module which can be run from anywhere, using any template it is given. Furthermore, more complex endpoints will be able to be created.
