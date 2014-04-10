/* globals describe, beforeEach, afterEach, it */
var assert = require('assert');
var request = require('request');
var Q = require('q');

request.defaults({
	json:true
});

var get = Q.denodeify(request.get);
var post = Q.denodeify(request.post);
var put = Q.denodeify(request.put);

var spawn = require('child_process').spawn;
var interfake;

describe('Interfake command-line API', function () {
	afterEach(function () {
		if (interfake) {
			interfake.kill();
		}
	});
	describe('POST /_request', function () {
		it('should create one GET endpoint', function (done) {
			var endpoint = {
				request: {
					url: '/test',
					method: 'get'
				},
				response: {
					code: 200,
					body: {
						hi: 'there'
					},
                    headers: {
                      'foo': 'bar'
                    }
				}
			};


			interfake = spawn('./index.js', ['-d']);

			interfake.stdout.on('data', function (data) {
				console.log(data.toString());
			}.bind(this));

			interfake.stderr.on('data', function (data) {
				console.log('Error: ' + data);
			});

			interfake.on('started', function () {
				console.log('Okay!');
				post({url: 'http://localhost:3000/_request', json: true, body: endpoint})
					.then(function (results) {
						assert.equal(results[0].statusCode, 201);
						assert.equal(results[1].done, true);
						return get({url:'http://localhost:3000/test', json: true});
					})
					.then(function (results) {
	                    assert.equal(results[0].headers['foo'], 'bar');
	                    // console.log(results[0].cookies)
						assert.equal(results[0].statusCode, 200);
						assert.equal(results[1].hi, 'there');
						interfake.kill();
						done();
					})
					.fail(done);
			});
		});
	});
});