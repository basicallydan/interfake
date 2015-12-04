/* globals describe, beforeEach, afterEach, it */
var assert = require('assert');
var request = require('request');
var Q = require('q');
var fs = require('fs');

request = request.defaults({
	json: true
});

var get = Q.denodeify(request.get);
var post = Q.denodeify(request.post);
var put = Q.denodeify(request.put);
var del = Q.denodeify(request.del);
var patch = Q.denodeify(request.patch);

// The thing we're testing
var Interfake = require('..');
var interfake;

describe('Interfake File Response Tests', function() {
	beforeEach(function() {
		interfake = new Interfake();
	});
	afterEach(function() {
		if (interfake) {
			interfake.stop();
		}
	});

	describe('#get()', function() {
		describe('#image()', function() {
			it('should respond with a jpg image', function(done) {
				interfake.get('/image').image('./tests/assets/10x10-imagejpg.jpg');
				interfake.listen(3000);

				request({
					url: 'http://localhost:3000/image',
					json: true
				}, function(error, response, body) {
					assert.equal(response.statusCode, 200);
					assert.equal(response.headers['content-type'], 'image/jpeg');
					fs.readFile('./tests/assets/10x10-imagejpg.jpg', function(err, correctData) {
						if (err) throw err;
						assert.equal(correctData, body);
						fs.readFile('./tests/assets/20x20-image-redpng.png', function(err, incorrectData) {
							if (err) throw err;
							assert.notEqual(incorrectData, body);
							done();
						});
					});
				});
			});

			it('should respond with a png image', function(done) {
				interfake.get('/image').image('./tests/assets/20x20-image-redpng.png');
				interfake.listen(3000);

				request({
					url: 'http://localhost:3000/image',
					json: true
				}, function(error, response, body) {
					assert.equal(response.statusCode, 200);
					assert.equal(response.headers['content-type'], 'image/png');
					fs.readFile('./tests/assets/20x20-image-redpng.png', function(err, correctData) {
						if (err) throw err;
						assert.equal(correctData, body);
						fs.readFile('./tests/assets/10x10-imagejpg.jpg', function(err, incorrectData) {
							if (err) throw err;
							assert.notEqual(incorrectData, body);
							done();
						});
					});
				});
			});
		});

		describe('#file()', function() {
			it('should respond with a jpg image as a file rather than as an image', function(done) {
				interfake.get('/image').file('./tests/assets/10x10-imagejpg.jpg');
				interfake.listen(3000);

				request({
					url: 'http://localhost:3000/image',
					json: true
				}, function(error, response, body) {
					assert.equal(response.statusCode, 200);
					assert.equal(response.headers['content-type'], 'image/jpeg');
					fs.readFile('./tests/assets/10x10-imagejpg.jpg', function(err, correctData) {
						if (err) throw err;
						assert.equal(correctData, body);
						fs.readFile('./tests/assets/20x20-image-redpng.png', function(err, incorrectData) {
							if (err) throw err;
							assert.notEqual(incorrectData, body);
							done();
						});
					});
				});
			});
		});
	});
});