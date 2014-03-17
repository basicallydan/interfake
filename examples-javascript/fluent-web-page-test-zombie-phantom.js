var Interfake = require('..');
var Browser = require('zombie-phantom');
var assert = require('assert');
var path = require('path');
var filePath = path.join(__dirname, './');
console.log('Gonna open', filePath);

var interfake = new Interfake();
var browser = new Browser();

// Serve up this folder as a website so we can test it
interfake.serveStatic('/static', filePath);
// Create the /update endpoint
interfake.get('/update').body({ text : 'Updated text!'});
// Start the server
interfake.listen(3000);

var Q = require('q');

var browser = new Browser({
	site: 'http://localhost:3000'
});

// Current this library does not support promises, but you can use async.series
// to get something similar...

Q.ninvoke(browser, 'visit', ['/static/fluent-web-page-test.html'])
	.then(function () {
		return Q.ninvoke(browser, 'text', ['#target']);
	})
	.then(function () {
		console.log(t);
	});