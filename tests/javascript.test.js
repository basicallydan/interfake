/* globals describe, beforeEach, afterEach, it */
var assert = require('assert');
var Q = require('q');
var request = require('request');
var path = require('path');

request = request.defaults({
	json: true
});

var get = Q.denodeify(request.get);
var post = Q.denodeify(request.post);
var put = Q.denodeify(request.put);
var del = Q.denodeify(request.del);

// The thing we're testing
var Interfake = require('..');
var interfake;

describe('Interfake JavaScript API', function() {
	beforeEach(function() {
		interfake = new Interfake();
	});
	afterEach(function() {
		if (interfake) {
			interfake.stop();
		}
	});
	describe('#listen', function() {
		it('should should support a callback', function(done) {
			interfake.listen(3000, done);
		});
	});
	describe('#createRoute()', function() {
		describe('when a GET endpoint is specified', function () {
			beforeEach(function (done) {
				interfake.createRoute({
					request: {
						url: '/test/it/out',
						method: 'get'
					},
					response: {
						code: 200,
						body: {
							hi: 'there'
						}
					}
				});
				interfake.listen(3000, done);
			});

			it('should not create unexpected endpoints', function(done) {
				request({ url : 'http://localhost:3000/donottest/it/out', json : false }, function(error, response, body) {
					assert.equal(response.statusCode, 404);
					assert(body.match('Cannot GET /donottest/it/out'));
					done();
				});
			});

			it('should not advertise unexpected endpoints', function(done) {
				request({ method : 'options', url : 'http://localhost:3000/donottest/it/out', json : false }, function(error, response, body) {
					assert.equal(response.statusCode, 404);
					assert(body.match('Cannot OPTIONS /donottest/it/out'));
					done();
				});
			});

			it('should create one GET endpoint', function(done) {
				request('http://localhost:3000/test/it/out', function(error, response, body) {
					assert.equal(response.statusCode, 200);
					assert.equal(body.hi, 'there');
					done();
				});
			});

			it('should advertise the GET in an OPTIONS request', function(done) {
				request({ method : 'options', url : 'http://localhost:3000/test/it/out' }, function(error, response, body) {
					assert.equal(response.statusCode, 200);
					assert.equal(response.headers['access-control-allow-methods'], 'GET, OPTIONS');
					assert.equal(response.headers['access-control-allow-origin'], '*');
					done();
				});
			});

			describe('when a POST option is added to the same endpoint', function () {
				beforeEach(function () {
					interfake.createRoute({
						request: {
							url: '/test/it/out',
							method: 'post'
						},
						response: {
							code: 200,
							body: {
								hi: 'there'
							}
						}
					});
				});

				it('should advertise the GET and the POST in an OPTIONS request', function(done) {
					request({ method : 'options', url : 'http://localhost:3000/test/it/out' }, function(error, response, body) {
						assert.equal(response.statusCode, 200);
						assert.equal(response.headers['access-control-allow-methods'], 'GET, POST, OPTIONS');
						assert.equal(response.headers['access-control-allow-origin'], '*');
						done();
					});
				});

				describe('when a POST option is added to the same endpoint', function () {
					beforeEach(function () {
						interfake.createRoute({
							request: {
								url: '/test/it/out',
								method: 'patch'
							},
							response: {
								code: 200,
								body: {
									hi: 'there'
								}
							}
						});
					});

					it('should advertise the GET, POST and PATCH in an OPTIONS request', function(done) {
						request({ method : 'options', url : 'http://localhost:3000/test/it/out' }, function(error, response, body) {
							assert.equal(response.statusCode, 200);
							assert.equal(response.headers['access-control-allow-methods'], 'GET, POST, PATCH, OPTIONS');
							assert.equal(response.headers['access-control-allow-origin'], '*');
							done();
						});
					});
				});
			});
		});

		describe('when the URL is flagged as being a regular expression (in string format)', function () {
			beforeEach(function (done) {
				interfake.createRoute({
					request: {
						url: {
							pattern : '/test/it/(up|out)',
							regexp : true
						},
						method: 'get'
					},
					response: {
						code: 200,
						body: {
							hi: 'there'
						}
					}
				});
				interfake.listen(3000, done);
			});

			it('should not create unexpected endpoints', function(done) {
				request({ url : 'http://localhost:3000/donottest/it/out', json : false }, function(error, response, body) {
					assert.equal(response.statusCode, 404);
					assert(body.match('Cannot GET /donottest/it/out'))
					done();
				});
			});

			it('should not advertise unexpected endpoints', function(done) {
				request({ method : 'options', url : 'http://localhost:3000/donottest/it/out', json : false }, function(error, response, body) {
					assert.equal(response.statusCode, 404);
					assert(body.match('Cannot OPTIONS /donottest/it/out'))
					done();
				});
			});

			it('should allow requests to one varition on the regular expression', function(done) {
				request('http://localhost:3000/test/it/out', function(error, response, body) {
					assert.equal(response.statusCode, 200);
					assert.equal(body.hi, 'there');
					done();
				});
			});

			it('should allow requests to another varition on the regular expression', function(done) {
				request('http://localhost:3000/test/it/up', function(error, response, body) {
					assert.equal(response.statusCode, 200);
					assert.equal(body.hi, 'there');
					done();
				});
			});

			it('should advertise the GET in an OPTIONS request for the first variation', function(done) {
				request({ method : 'options', url : 'http://localhost:3000/test/it/out' }, function(error, response, body) {
					assert.equal(response.statusCode, 200);
					assert.equal(response.headers['access-control-allow-methods'], 'GET, OPTIONS');
					assert.equal(response.headers['access-control-allow-origin'], '*');
					done();
				});
			});

			it('should advertise the GET in an OPTIONS request for the second variation', function(done) {
				request({ method : 'options', url : 'http://localhost:3000/test/it/up' }, function(error, response, body) {
					assert.equal(response.statusCode, 200);
					assert.equal(response.headers['access-control-allow-methods'], 'GET, OPTIONS');
					assert.equal(response.headers['access-control-allow-origin'], '*');
					done();
				});
			});
		});

		describe('when the URL is already a regular expression', function () {
			beforeEach(function (done) {
				interfake.createRoute({
					request: {
						url: /\/test\/it\/(up|out)/,
						method: 'get'
					},
					response: {
						code: 200,
						body: {
							hi: 'there'
						}
					}
				});
				interfake.listen(3000, done);
			});

			it('should not create unexpected endpoints', function(done) {
				request({ url : 'http://localhost:3000/donottest/it/out', json : false }, function(error, response, body) {
					assert.equal(response.statusCode, 404);
					assert(body.match('Cannot GET /donottest/it/out'))
					done();
				});
			});

			it('should not advertise unexpected endpoints', function(done) {
				request({ method : 'options', url : 'http://localhost:3000/donottest/it/out', json : false }, function(error, response, body) {
					assert.equal(response.statusCode, 404);
					assert(body.match('Cannot OPTIONS /donottest/it/out'))
					done();
				});
			});

			it('should allow requests to one varition on the regular expression', function(done) {
				request('http://localhost:3000/test/it/out', function(error, response, body) {
					assert.equal(response.statusCode, 200);
					assert.equal(body.hi, 'there');
					done();
				});
			});

			it('should allow requests to another varition on the regular expression', function(done) {
				request('http://localhost:3000/test/it/up', function(error, response, body) {
					assert.equal(response.statusCode, 200);
					assert.equal(body.hi, 'there');
					done();
				});
			});

			it('should advertise the GET in an OPTIONS request for the first variation', function(done) {
				request({ method : 'options', url : 'http://localhost:3000/test/it/out' }, function(error, response, body) {
					assert.equal(response.statusCode, 200);
					assert.equal(response.headers['access-control-allow-methods'], 'GET, OPTIONS');
					assert.equal(response.headers['access-control-allow-origin'], '*');
					done();
				});
			});

			it('should advertise the GET in an OPTIONS request for the second variation', function(done) {
				request({ method : 'options', url : 'http://localhost:3000/test/it/up' }, function(error, response, body) {
					assert.equal(response.statusCode, 200);
					assert.equal(response.headers['access-control-allow-methods'], 'GET, OPTIONS');
					assert.equal(response.headers['access-control-allow-origin'], '*');
					done();
				});
			});
		});

		it('should create one GET endpoint which returns custom headers', function(done) {
			interfake.createRoute({
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
						'X-Request-Type': 'test',
						'X-lol-TEST': 'bleep'
					}
				}
			});
			interfake.listen(3000);

			request('http://localhost:3000/test', function(error, response, body) {
				assert.equal(response.statusCode, 200);
				assert.equal(response.headers['x-request-type'], 'test');
				assert.equal(response.headers['x-lol-test'], 'bleep');
				assert.equal(response.headers['x-undef'], undefined);
				assert.equal(body.hi, 'there');
				done();
			});
		});

		it('should create a GET endpoint that accepts a query parameter', function(done) {
			// interfake = new Interfake();
			interfake.createRoute({
				request: {
					url: '/wantsQueryParameter',
					query: {
						query: '1234'
					},
					method: 'get'

				},
				response: {
					code: 200,
					body: {
						high: 'hoe'
					}
				}
			});
			interfake.listen(3000);

			request('http://localhost:3000/wantsQueryParameter?query=1234', function(error, response, body) {
				assert.equal(error, undefined);
				assert.equal(response.statusCode, 200);
				assert.equal(body.high, 'hoe');
				done();
			});
		});

		it('should create a GET endpoint that accepts a query array parameter', function(done) {
			interfake.createRoute({
				request: {
					url: '/wantsQueryArrayParameter',
					query: {
						pages: ['1', '2']
					},
					method: 'get'
				},
				response: {
        			code: 200,
					body: {
						high: 'hoe'
					}
				}
			});
			interfake.listen(3000);

			request('http://localhost:3000/wantsQueryArrayParameter?pages=1&pages=2', function(error, response, body) {
				assert.equal(error, undefined);
				assert.equal(response.statusCode, 200);
				assert.equal(body.high, 'hoe');
				done();
			});
		});

		it('should create one GET endpoint accepting query parameters with different responses', function() {
			interfake.createRoute({
				request: {
					url: '/wantsQueryParameter',
					query: {
						query: '1234'
					},
					method: 'get'

				},
				response: {
					code: 200,
					body: {
						high: 'hoe'
					}
				}
			});
			interfake.createRoute({
				request: {
					url: '/wantsQueryParameter',
					query: {
						query: '5678',
						anotherQuery: '4321'
					},
					method: 'get'
				},
				response: {
					code: 200,
					body: {
						loan: 'shark'
					}
				}
			});
			interfake.listen(3000);

			return Q.all([get('http://localhost:3000/wantsQueryParameter?query=1234'),
				get('http://localhost:3000/wantsQueryParameter?anotherQuery=4321&query=5678'),
				get('http://localhost:3000/wantsQueryParameter')
			]).then(function(results) {
				assert.equal(results[0][0].statusCode, 200);
				assert.equal(results[0][1].high, 'hoe');
				assert.equal(results[1][0].statusCode, 200);
				assert.equal(results[1][1].loan, 'shark');
				assert.equal(results[2][0].statusCode, 404);
			});
		});

		it('should create one GET endpoint with a querystring in the url with different responses', function() {
			interfake.createRoute({
				request: {
					url: '/wantsQueryParameter?query=1234',
					method: 'get'
				},
				response: {
					code: 200,
					body: {
						high: 'hoe'
					}
				}
			});
			interfake.createRoute({
				request: {
					url: '/wantsQueryParameter?anotherQuery=5678',
					method: 'get'
				},
				response: {
					code: 200,
					body: {
						loan: 'shark'
					}
				}
			});
			interfake.listen(3000);

			return Q.all([get('http://localhost:3000/wantsQueryParameter?query=1234'),
				get('http://localhost:3000/wantsQueryParameter?anotherQuery=5678'),
				get('http://localhost:3000/wantsQueryParameter')
			]).then(function(results) {
				assert.equal(results[0][0].statusCode, 200);
				assert.equal(results[0][1].high, 'hoe');
				assert.equal(results[1][0].statusCode, 200);
				assert.equal(results[1][1].loan, 'shark');
				assert.equal(results[2][0].statusCode, 404);
			});
		});

		it('should create one GET endpoint accepting query parameters using the url and options', function() {
			interfake.createRoute({
				request: {
					url: '/wantsQueryParameter?query=1234',
					query: {
						page: 1
					},
					method: 'get'
				},
				response: {
					code: 200,
					body: {
						high: 'hoe'
					}
				}
			});
			interfake.createRoute({
				request: {
					url: '/wantsQueryParameter?query=1234',
					query: {
						page: 2
					},
					method: 'get'
				},
				response: {
					code: 200,
					body: {
						loan: 'shark'
					}
				}
			});
			interfake.listen(3000);

			return Q.all([get('http://localhost:3000/wantsQueryParameter?query=1234&page=1'),
				get('http://localhost:3000/wantsQueryParameter?query=1234&page=2'),
				get('http://localhost:3000/wantsQueryParameter')
			]).then(function(results) {
				assert.equal(results[0][0].statusCode, 200);
				assert.equal(results[0][1].high, 'hoe');
				assert.equal(results[1][0].statusCode, 200);
				assert.equal(results[1][1].loan, 'shark');
				assert.equal(results[2][0].statusCode, 404);
			});
		});

		it('should create three GET endpoints with different status codes', function(done) {
			interfake.createRoute({
				request: {
					url: '/test1',
					method: 'get'
				},
				response: {
					code: 200,
					body: {
						its: 'one'
					}
				}
			});
			interfake.createRoute({
				request: {
					url: '/test2',
					method: 'get'
				},
				response: {
					code: 300,
					body: {
						its: 'two'
					}
				}
			});
			interfake.createRoute({
				request: {
					url: '/test3',
					method: 'get'
				},
				response: {
					code: 500,
					body: {
						its: 'three'
					}
				}
			});
			interfake.listen(3000);

			Q.all([get('http://localhost:3000/test1'), get('http://localhost:3000/test2'), get('http://localhost:3000/test3')])
				.then(function(results) {
					assert.equal(results[0][0].statusCode, 200);
					assert.equal(results[0][1].its, 'one');
					assert.equal(results[1][0].statusCode, 300);
					assert.equal(results[1][1].its, 'two');
					assert.equal(results[2][0].statusCode, 500);
					assert.equal(results[2][1].its, 'three');
					done();
				});
		});

		it('should create a dynamic endpoint', function(done) {
			interfake.createRoute({
				request: {
					url: '/dynamic',
					method: 'post'
				},
				response: {
					code: 201,
					body: {}
				},
				afterResponse: {
					endpoints: [{
						request: {
							url: '/dynamic/1',
							method: 'get'
						},
						response: {
							code: 200,
							body: {}
						}
					}]
				}
			});
			interfake.listen(3000);

			get('http://localhost:3000/dynamic/1')
				.then(function(results) {
					assert.equal(results[0].statusCode, 404);
					return post('http://localhost:3000/dynamic');
				})
				.then(function(results) {
					assert.equal(results[0].statusCode, 201);
					return get('http://localhost:3000/dynamic/1');
				})
				.then(function(results) {
					assert.equal(results[0].statusCode, 200);
					done();
				})
				.done();
		});

		it('should create a dynamic endpoint within a dynamic endpoint', function(done) {
			interfake.createRoute({
				request: {
					url: '/dynamic',
					method: 'post'
				},
				response: {
					code: 201,
					body: {
						all: 'done'
					}
				},
				afterResponse: {
					endpoints: [{
						request: {
							url: '/dynamic/1',
							method: 'get'
						},
						response: {
							code: 200,
							body: {
								yes: 'indeedy'
							}
						}
					}, {
						request: {
							url: '/dynamic/1',
							method: 'put'
						},
						response: {
							code: 200,
							body: {}
						},
						afterResponse: {
							endpoints: [{
								request: {
									url: '/dynamic/1',
									method: 'get'
								},
								response: {
									code: 200,
									body: {
										yes: 'indiddly'
									}
								}
							}]
						}
					}]
				}
			});
			interfake.listen(3000);

			get('http://localhost:3000/dynamic/1')
				.then(function(results) {
					assert.equal(results[0].statusCode, 404);
					return post('http://localhost:3000/dynamic');
				})
				.then(function(results) {
					assert.equal(results[0].statusCode, 201);
					assert.equal(results[1].all, 'done');
					return get('http://localhost:3000/dynamic/1');
				})
				.then(function(results) {
					assert.equal(results[0].statusCode, 200);
					assert.equal(results[1].yes, 'indeedy');
					return put('http://localhost:3000/dynamic/1');
				})
				.then(function(results) {
					assert.equal(results[0].statusCode, 200);
					return get('http://localhost:3000/dynamic/1');
				})
				.then(function(results) {
					assert.equal(results[0].statusCode, 200);
					assert.equal(results[1].yes, 'indiddly');
					done();
				});
		});

		it('should return JSONP if requested', function(done) {
			interfake.createRoute({
				request: {
					url: '/stuff',
					method: 'get'
				},
				response: {
					code: 200,
					body: {
						stuff: 'hello'
					}
				}
			});
			interfake.listen(3000);

			get('http://localhost:3000/stuff?callback=yo')
				.then(function(results) {
					assert.equal('hello', 'yo(' + JSON.stringify({
						stuff: 'hello'
					}) + ');');
					done();
				});

			request('http://localhost:3000/stuff?callback=yo', function(error, response, body) {
				assert.equal(body, 'yo(' + JSON.stringify({
					stuff: 'hello'
				}) + ');');
				done();
			});
		});

		it('should create a proxy endpoint with a GET method', function(done) {
			var proxiedInterfake = new Interfake();
			proxiedInterfake.get('/whatever').status(404).body({
				message: 'This is something you proxied!'
			}).responseHeaders({
				'loving-you':'Isnt the right thing to do'
			});
			proxiedInterfake.listen(3050);
			interfake.createRoute({
				request: {
					url: '/stuff',
					method: 'get'
				},
				response: {
					proxy: 'http://localhost:3050/whatever'
				}
			});
			interfake.listen(3000);

			request('http://localhost:3000/stuff', function (error, response, body) {
				assert.equal(response.statusCode, 404);
				assert.equal(body.message, 'This is something you proxied!');
				assert.equal(response.headers['loving-you'], 'Isnt the right thing to do');
				done();
			});
			afterEach(function () {
				proxiedInterfake.stop();
			});
		});

		it('should create a proxy endpoint with a GET method which sends the specified headers', function(done) {
			var proxiedInterfake = new Interfake({
				onRequest: function (req) {
					assert.equal(req.get('Authorization'), 'Basic username:password');
					done();
				}
			});
			proxiedInterfake.get('/whatever').status(404).body({
				message: 'This is something you proxied!'
			}).responseHeaders({
				'loving-you':'Isnt the right thing to do'
			});
			proxiedInterfake.listen(3050);
			interfake.createRoute({
				request: {
					url: '/stuff',
					method: 'get'
				},
				response: {
					proxy: {
						url:'http://localhost:3050/whatever',
						headers:{
							'Authorization': 'Basic username:password'
						}
					}
				}
			});
			interfake.listen(3000);

			request('http://localhost:3000/stuff', function (error, response, body) {
				assert.equal(response.statusCode, 404);
				assert.equal(body.message, 'This is something you proxied!');
				assert.equal(response.headers['loving-you'], 'Isnt the right thing to do');
			});

			afterEach(function () {
				proxiedInterfake.stop();
			});
		});

		it('should create a proxy endpoint with a GET method and retain query parameters', function(done) {
			var proxiedInterfake = new Interfake();
			proxiedInterfake.get('/whatever').query({
				q: /\w+/,
				isit: /\w+/,
				youre: /\w+/
			}).status(404).body({
				message: 'I can see it in your eyes'
			});
			proxiedInterfake.listen(3050);
			interfake.createRoute({
				request: {
					url: '/stuff',
					method: 'get',
					query: {
						q: /\w+/,
						isit: /\w+/,
						youre: /\w+/
					}
				},
				response: {
					proxy: 'http://localhost:3050/whatever'
				}
			});
			interfake.listen(3000);

			request('http://localhost:3000/stuff?q=hello&isit=me&youre=lookingfor', function (error, response, body) {
				assert.equal(response.statusCode, 404);
				assert.equal(body.message, 'I can see it in your eyes');
				done();
			});
			afterEach(function () {
				proxiedInterfake.stop();
			});
		});

		it('should create a proxy endpoint with a GET method and retain query parameters and their value', function(done) {
			var proxiedInterfake = new Interfake();
			proxiedInterfake.get('/whatever').query({
				q: 'hello',
				isit: 'me',
				youre: 'lookingfor'
			}).status(404).body({
				message: 'I can see it in your eyes'
			});
			proxiedInterfake.listen(3050);
			interfake.createRoute({
				request: {
					url: '/stuff',
					method: 'get',
					query: {
						q: /\w+/,
						isit: /\w+/,
						youre: /\w+/
					}
				},
				response: {
					proxy: 'http://localhost:3050/whatever'
				}
			});
			interfake.listen(3000);

			request('http://localhost:3000/stuff?q=hello&isit=me&youre=lookingfor', function (error, response, body) {
				assert.equal(response.statusCode, 404);
				assert.equal(body.message, 'I can see it in your eyes');
				done();
			});
			afterEach(function () {
				proxiedInterfake.stop();
			});
		});

		it('should create a proxy endpoint with a POST method', function(done) {
			var proxiedInterfake = new Interfake();
			proxiedInterfake.post('/whatever').status(404).body({
				message: 'This is something you proxied!'
			}).responseHeaders({
				'loving-you':'Isnt the right thing to do'
			});
			proxiedInterfake.listen(3050);
			interfake.createRoute({
				request: {
					url: '/stuff',
					method: 'post'
				},
				response: {
					proxy: 'http://localhost:3050/whatever'
				}
			});
			interfake.listen(3000);

			request.post('http://localhost:3000/stuff', function (error, response, body) {
				assert.equal(response.statusCode, 404);
				assert.equal(body.message, 'This is something you proxied!');
				assert.equal(response.headers['loving-you'], 'Isnt the right thing to do');
				done();
			});
			afterEach(function () {
				proxiedInterfake.stop();
			});
		});

		it('should create a proxy endpoint which supports JSONP', function(done) {
			var proxiedInterfake = new Interfake();
			proxiedInterfake.get('/whatever').status(404).body({
				message: 'This is something you proxied!'
			});
			proxiedInterfake.listen(3050);
			interfake.createRoute({
				request: {
					url: '/stuff',
					method: 'get'
				},
				response: {
					proxy: 'http://localhost:3050/whatever'
				}
			});
			interfake.listen(3000);

			request('http://localhost:3000/stuff?callback=whatever', function (error, response, body) {
				assert.equal(response.statusCode, 404);
				assert.equal(body, 'whatever(' + JSON.stringify({
					message: 'This is something you proxied!'
				}) + ');');
				proxiedInterfake.stop();
				done();
			});
		});

		it('should create one GET endpoint with support for delaying the response', function(done) {
			var enoughTimeHasPassed = false;
			var _this = this;
			this.slow(500);
			interfake.createRoute({
				request: {
					url: '/test',
					method: 'get'
				},
				response: {
					code: 200,
					delay: 50,
					body: {
						hi: 'there'
					}
				}
			});
			interfake.listen(3000);
			setTimeout(function() {
				enoughTimeHasPassed = true;
			}, 50);
			request('http://localhost:3000/test', function(error, response, body) {
				assert.equal(response.statusCode, 200);
				assert.equal(body.hi, 'there');
				if (!enoughTimeHasPassed) {
					throw new Error('Response wasn\'t delay for long enough');
				}
				done();
			});
		});

		it('should create one GET endpoint with support for delaying the response with a delay range', function(done) {
			var enoughTimeHasPassed = false;
			var _this = this;
			var timeout;
			var tookTooLong = false;
			this.slow(500);
			interfake.createRoute({
				request: {
					url: '/test',
					method: 'get'
				},
				response: {
					code: 200,
					delay: '20..50',
					body: {
						hi: 'there'
					}
				}
			});
			interfake.listen(3000);
			setTimeout(function() {
				enoughTimeHasPassed = true;
			}, 20);
			timeout = setTimeout(function() {
				tookTooLong = true;
			}, 60);
			request('http://localhost:3000/test', function(error, response, body) {
				clearTimeout(timeout);
				if (!enoughTimeHasPassed) {
					throw new Error('Response wasn\'t delay for long enough');
				}
				if (tookTooLong) {
					throw new Error('Response was delayed for too long');
				}
				done();
			});
		});

		describe('response with { echo : true }', function () {
			it('should return the request body', function (done) {
				interfake.createRoute({
					request: {
						url: '/stuff',
						method: 'post'
					},
					response: {
						echo : true
					}
				});

				interfake.listen(3000);

				request.post({
					url :'http://localhost:3000/stuff',
					json : true,
					body : {
						message : 'Echo!'
					},
				},
				function (error, response, body) {
					assert.equal(response.statusCode, 200);
					assert.equal(body.message, 'Echo!');
					done();
				});
			});
		});

		describe('#removeRoute', function () {
			it('should remove a created route based on a reference to the Route object', function (done) {
				var route = interfake.createRoute({
					request: {
						url: '/remove/me',
						method: 'get'
					},
					response: {
						code: 200,
						body: {
							please: 'remove'
						}
					}
				});
				interfake.createRoute({
					request: {
						url: '/keep/me',
						method: 'get'
					},
					response: {
						code: 200,
						body: {
							please: 'keep'
						}
					}
				});
				interfake.listen(3000);

				get('http://localhost:3000/remove/me')
					.then(function(results) {
						assert.equal(results[0].statusCode, 200);
						assert.equal(results[1].please, 'remove');
						interfake.removeRoute(route);
						return get('http://localhost:3000/remove/me');
					})
					.then(function (results) {
						assert.equal(results[0].statusCode, 404);
						assert(results[1].match('Cannot GET /remove/me'))
						return get('http://localhost:3000/keep/me');
					})
					.then(function (results) {
						assert.equal(results[0].statusCode, 200);
						assert.equal(results[1].please, 'keep');
						done();
					})
					.done();
			});

			it('should remove a created route based on the descriptor', function (done) {
				var routeDescriptor = {
					request: {
						url: '/remove/me',
						method: 'get'
					},
					response: {
						code: 200,
						body: {
							please: 'remove'
						}
					}
				};

				interfake.createRoute(routeDescriptor);

				interfake.createRoute({
					request: {
						url: '/keep/me',
						method: 'get'
					},
					response: {
						code: 200,
						body: {
							please: 'keep'
						}
					}
				});

				interfake.listen(3000);

				get('http://localhost:3000/remove/me')
					.then(function(results) {
						assert.equal(results[0].statusCode, 200);
						assert.equal(results[1].please, 'remove');
						interfake.removeRoute(routeDescriptor);
						return get('http://localhost:3000/remove/me');
					})
					.then(function (results) {
						assert.equal(results[0].statusCode, 404);
						assert(results[1].match('Cannot GET /remove/me'))
						return get('http://localhost:3000/keep/me');
					})
					.then(function (results) {
						assert.equal(results[0].statusCode, 200);
						assert.equal(results[1].please, 'keep');
						done();
					})
					.done();
			});
		});
	});

	// Testing the API root stuff
	describe('#Interfake({ path: [String] })', function() {
		it('should set the root path of the API', function(done) {
			interfake = new Interfake({
				path: '/api'
			});
			interfake.get('/endpoint').status(200).creates.get('/moar-endpoints');
			interfake.listen(3000);

			Q.all([get('http://localhost:3000/api/endpoint'), get('http://localhost:3000/endpoint')])
				.then(function(results) {
					assert.equal(results[0][0].statusCode, 200);
					assert.equal(results[1][0].statusCode, 404);
					return get('http://localhost:3000/api/endpoint');
				})
				.then(function(results) {
					assert.equal(results[0].statusCode, 200);
					return get('http://localhost:3000/api/moar-endpoints');
				})
				.then(function(results) {
					assert.equal(results[0].statusCode, 200);
					done();
				});
		});
	});

	describe('#loadFile()', function() {
		it('should load a JSON file and the routes within it', function(done) {
			interfake = new Interfake();
			interfake.loadFile('./tests/loadFileTest-1.json');
			interfake.listen(3000);

			get('http://localhost:3000/whattimeisit')
				.then(function(results) {
					assert.equal(results[0].statusCode, 200);
					assert.equal(results[1].theTime, 'Adventure Time!');
					done();
				})
				.done();
		});

		it('should load a JSON file and the with regex routes in it', function(done) {
			interfake = new Interfake();
			interfake.loadFile('./tests/loadFileTest-3.json');
			interfake.listen(3000);

			get('http://localhost:3000/whostheboss')
				.then(function(results) {
					assert.equal(results[0].statusCode, 200);
					assert.equal(results[1].theBoss, 'Angela');
					return get('http://localhost:3000/whostheleader');
				})
				.then(function(results) {
					assert.equal(results[0].statusCode, 200);
					assert.equal(results[1].theBoss, 'Angela');
					done();
				})
				.done();
		});

		describe('#unload', function () {
			it('should unload a single file', function (done) {
				interfake = new Interfake();
				var firstFile = interfake.loadFile('./tests/loadFileTest-1.json');
				interfake.loadFile('./tests/loadFileTest-2.json');
				interfake.listen(3000);

				get('http://localhost:3000/whattimeisit')
					.then(function(results) {
						assert.equal(results[0].statusCode, 200);
						assert.equal(results[1].theTime, 'Adventure Time!');
						firstFile.unload();
						return get('http://localhost:3000/whattimeisit');
					})
					.then(function (results) {
						assert.equal(results[0].statusCode, 404);
						assert(results[1].match('Cannot GET /whattimeisit'))
						interfake.loadFile('./tests/loadFileTest-2.json');
						return get('http://localhost:3000/whostheboss');
					})
					.then(function (results) {
						assert.equal(results[0].statusCode, 200);
						assert.equal(results[1].theBoss, 'Angela');
						done();
					})
					.done();
			});
		});

		describe('#unload', function () {
			it('should be able to unload a single file (note, this cannot actually test functionality, just make sure nothing breaks)', function (done) {
				interfake = new Interfake();
				var firstFile = interfake.loadFile('./tests/loadFileTest-1.json');
				interfake.loadFile('./tests/loadFileTest-2.json');
				interfake.listen(3000);

				get('http://localhost:3000/whattimeisit')
					.then(function(results) {
						assert.equal(results[0].statusCode, 200);
						assert.equal(results[1].theTime, 'Adventure Time!');
						firstFile.reload();
						return get('http://localhost:3000/whattimeisit');
					})
					.then(function (results) {
						assert.equal(results[0].statusCode, 200);
						assert.equal(results[1].theTime, 'Adventure Time!');
						interfake.loadFile('./tests/loadFileTest-2.json');
						return get('http://localhost:3000/whostheboss');
					})
					.then(function (results) {
						assert.equal(results[0].statusCode, 200);
						assert.equal(results[1].theBoss, 'Angela');
						done();
					})
					.done();
			});
		});

		describe('#clearAllRoutes()', function() {
			it('should load a file and then clear the routes out', function(done) {
				interfake = new Interfake();
				interfake.loadFile('./tests/loadFileTest-1.json');
				interfake.listen(3000);

				get('http://localhost:3000/whattimeisit')
					.then(function(results) {
						assert.equal(results[0].statusCode, 200);
						assert.equal(results[1].theTime, 'Adventure Time!');
						interfake.clearAllRoutes();
						return get('http://localhost:3000/whattimeisit');
					})
					.then(function (results) {
						assert.equal(results[0].statusCode, 404);
						assert(results[1].match('Cannot GET /whattimeisit'))
						done();
					})
					.done();
			});

			it('should load a file and clear the routes out then load another one', function(done) {
				interfake = new Interfake();
				interfake.loadFile('./tests/loadFileTest-1.json');
				interfake.listen(3000);

				get('http://localhost:3000/whattimeisit')
					.then(function(results) {
						assert.equal(results[0].statusCode, 200);
						assert.equal(results[1].theTime, 'Adventure Time!');
						interfake.clearAllRoutes();
						return get('http://localhost:3000/whattimeisit');
					})
					.then(function (results) {
						assert.equal(results[0].statusCode, 404);
						assert(results[1].match('Cannot GET /whattimeisit'))
						interfake.loadFile('./tests/loadFileTest-2.json');
						return get('http://localhost:3000/whostheboss');
					})
					.then(function (results) {
						assert.equal(results[0].statusCode, 200);
						assert.equal(results[1].theBoss, 'Angela');
						done();
					})
					.done();
			});
		});
	});

	describe('#serveStatic()', function () {
		it('should serve up a file in the given folder', function (done) {
			var filePath = path.join(__dirname, './');
			interfake.serveStatic('/static', filePath);
			interfake.listen(3000);

			request({ url : 'http://localhost:3000/static/static-test.txt', json : false }, function(error, response, body) {
				assert.equal(response.statusCode, 200);
				assert.equal(body, 'Testing');
				done();
			});
		});
	});
});
