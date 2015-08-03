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

// The thing we're testing
var Interfake = require('..');

describe('Interfake HTTP API', function () {
	describe('POST /_request', function () {
		it('should create one GET endpoint', function (done) {
			var interfake = new Interfake(/*{debug:true}*/);
			interfake.listen(3000);

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
					interfake.stop();
					done();
				});
		});
	});
});