var Interfake = require('..');
var assert = require('assert');
var path = require('path');
var filePath = path.join(__dirname, './');
console.log('Gonna open', filePath);

var interfake = new Interfake();
// var browser = new Browser();

// Serve up this folder as a website so we can test it
interfake.serveStatic('/static', filePath);
// Create the /update endpoint
interfake.get('/update').body({ text : 'Updated text!'});
// Start the server
interfake.listen(3000);

// Zombie is annoyingly buggy and unreliable but if you can get it to work you can use this script below...
// Use zombie to visit the page
// browser.visit('http://localhost:3000/static/fluent-web-page-test.html')
// 	.then(function() {
// 		// When we start, the text of the #target element is 'Not updated!'
// 		assert.equal(browser.text("#target"), 'Not updated!');
// 	})
// 	.then(function() {
// 		// The 'Update' link will trigger an XHR call to /update and update the text with the response data
// 		return browser.clickLink('Update');
// 	})
// 	.then(function () {
// 		// Give it a sec...
// 		return browser.wait(150);
// 	})
// 	.then(function () {
// 		// Voila! It has updated. Magic.
// 		assert.equal(browser.text('#target'), 'Updated text!');
// 	})
// 	.fail(function(error) {
// 		console.log('Error', error);
// 		browser.close();
// 	})
// 	.done(function() {
// 		console.log('All asserts passed just fine!');
// 		browser.close();
// 	});