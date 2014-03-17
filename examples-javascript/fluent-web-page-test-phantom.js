var Interfake = require('..');
var phantom = require('node-phantom');
var assert = require('assert');
var path = require('path');
var filePath = path.join(__dirname, './');
var screenshots = path.join(__dirname, './screenshots');
console.log('Gonna open', filePath);

var interfake = new Interfake();

// Serve up this folder as a website so we can test it
interfake.serveStatic('/static', filePath);
// Create the /update endpoint
interfake.get('/update').body({ text : 'Updated text!'});
// Start the server
interfake.listen(3000);

phantom.create(function (err, ph) {
	ph.createPage(function (err, page) {
		function screenshot(filename, delay) {
			filename = path.join(screenshots, filename);
			if (!delay || delay < 1) {
				page.render(filename);
			} else {
				setTimeout(function () {
					page.render(filename);
				}, delay);
			}
		}
		page.open('http://localhost:3000/static/fluent-web-page-test.html', function(status) {
			console.log('Status',status);
			screenshot('before.png');
			page.evaluate(function() {
				return $('#target').text();
			}, function (err, result) {
				assert.equal(result, 'Not updated!');
			});
			// assert.equal(text, 'Not updated!');
			page.evaluate(function (s) {
				$('#update').click();
			});
			setTimeout(function () {
				page.evaluate(function() {
					return $('#target').text();
				}, function (err, result) {
					screenshot('after.png', 500);
					assert.equal(result, 'Not updated!');
				});
			});
		});
	});
});