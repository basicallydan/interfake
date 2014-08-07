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
var del = Q.denodeify(request.del);

// The thing we're testing
var Interfake = require('..');
var interfake;

describe('Interfake JavaScript API', function () {
	beforeEach(function () {
		interfake = new Interfake();
	});
	afterEach(function () {
		if (interfake) {
			interfake.stop();
		}
	});
	describe('#listen', function() {
		it('should should support a callback', function(done){
			interfake.listen(3000, done);
		});
	});
	describe('#createRoute()', function () {
		it('should create one GET endpoint', function (done) {
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
			interfake.listen(3000);

			request({ url : 'http://localhost:3000/test/it/out', json : true }, function (error, response, body) {
				assert.equal(response.statusCode, 200);
				assert.equal(body.hi, 'there');
				done();
			});
		});

		it('should create one GET endpoint which returns custom headers', function (done) {
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

			request({ url : 'http://localhost:3000/test', json : true }, function (error, response, body) {
				assert.equal(response.statusCode, 200);
				assert.equal(response.headers['x-request-type'], 'test');
				assert.equal(response.headers['x-lol-test'], 'bleep');
				assert.equal(response.headers['x-undef'], undefined);
				assert.equal(body.hi, 'there');
				done();
			});
		});

		it('should create a GET endpoint that accepts a query parameter', function (done) {
			// interfake = new Interfake();
			interfake.createRoute({
				request: {
					url: '/wantsQueryParameter',
					query: { query: '1234' },
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

			request({ url : 'http://localhost:3000/wantsQueryParameter?query=1234', json : true }, function (error, response, body) {
				assert.equal(error, undefined);
				assert.equal(response.statusCode, 200);
				assert.equal(body.high, 'hoe');
				done();
			});
		});

		it('should create one GET endpoint accepting query parameters with different responses', function () {
			interfake.createRoute({
				request: {
					url: '/wantsQueryParameter',
					query: { query: '1234' },
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
					query: { query: '5678', anotherQuery: '4321' },
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

			return Q.all([get({url: 'http://localhost:3000/wantsQueryParameter?query=1234', json: true}),
					get({url: 'http://localhost:3000/wantsQueryParameter?anotherQuery=4321&query=5678', json: true}),
					get({url: 'http://localhost:3000/wantsQueryParameter', json: true})
			]).then(function (results) {
				assert.equal(results[0][0].statusCode, 200);
				assert.equal(results[0][1].high, 'hoe');
				assert.equal(results[1][0].statusCode, 200);
				assert.equal(results[1][1].loan, 'shark');
				assert.equal(results[2][0].statusCode, 404);
			});
		});

		it('should create one GET endpoint with a querystring in the url with different responses', function () {
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

			return Q.all([get({url: 'http://localhost:3000/wantsQueryParameter?query=1234', json: true}),
					get({url: 'http://localhost:3000/wantsQueryParameter?anotherQuery=5678', json: true}),
					get({url: 'http://localhost:3000/wantsQueryParameter', json: true})
			]).then(function (results) {
				assert.equal(results[0][0].statusCode, 200);
				assert.equal(results[0][1].high, 'hoe');
				assert.equal(results[1][0].statusCode, 200);
				assert.equal(results[1][1].loan, 'shark');
				assert.equal(results[2][0].statusCode, 404);
			});
		});

		it('should create one GET endpoint accepting query parameters using the url and options', function () {
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

			return Q.all([get({url: 'http://localhost:3000/wantsQueryParameter?query=1234&page=1', json: true}),
					get({url: 'http://localhost:3000/wantsQueryParameter?query=1234&page=2', json: true}),
					get({url: 'http://localhost:3000/wantsQueryParameter', json: true})
			]).then(function (results) {
				assert.equal(results[0][0].statusCode, 200);
				assert.equal(results[0][1].high, 'hoe');
				assert.equal(results[1][0].statusCode, 200);
				assert.equal(results[1][1].loan, 'shark');
				assert.equal(results[2][0].statusCode, 404);
			});
		});

		it('should create three GET endpoints with different status codes', function (done) {
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

			Q.all([get({url:'http://localhost:3000/test1',json:true}), get({url:'http://localhost:3000/test2',json:true}), get({url:'http://localhost:3000/test3',json:true})])
				.then(function (results) {
					assert.equal(results[0][0].statusCode, 200);
					assert.equal(results[0][1].its, 'one');
					assert.equal(results[1][0].statusCode, 300);
					assert.equal(results[1][1].its, 'two');
					assert.equal(results[2][0].statusCode, 500);
					assert.equal(results[2][1].its, 'three');
					done();
				});
		});

		it('should create a dynamic endpoint', function (done) {
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
					endpoints: [
						{
							request: {
								url: '/dynamic/1',
								method: 'get'
							},
							response: {
								code:200,
								body: {}
							}
						}
					]
				}
			});
			interfake.listen(3000);

			get('http://localhost:3000/dynamic/1')
				.then(function (results) {
					assert.equal(results[0].statusCode, 404);
					return post('http://localhost:3000/dynamic');
				})
				.then(function (results) {
					assert.equal(results[0].statusCode, 201);
					return get('http://localhost:3000/dynamic/1');
				})
				.then(function (results) {
					assert.equal(results[0].statusCode, 200);
					done();
				})
				.done();
		});

		it('should create a dynamic endpoint within a dynamic endpoint', function (done) {
			interfake.createRoute({
				request: {
					url: '/dynamic',
					method: 'post'
				},
				response: {
					code: 201,
					body: {
						all:'done'
					}
				},
				afterResponse: {
					endpoints: [
						{
							request: {
								url: '/dynamic/1',
								method: 'get'
							},
							response: {
								code:200,
								body: {
									yes: 'indeedy'
								}
							}
						},
						{
							request: {
								url: '/dynamic/1',
								method: 'put'
							},
							response: {
								code:200,
								body: {}
							},
							afterResponse: {
								endpoints: [
									{
										request: {
											url: '/dynamic/1',
											method: 'get'
										},
										response: {
											code:200,
											body: {
												yes: 'indiddly'
											}
										}
									}
								]
							}
						}
					]
				}
			});
			interfake.listen(3000);

			get({url:'http://localhost:3000/dynamic/1', json:true})
				.then(function (results) {
					assert.equal(results[0].statusCode, 404);
					return post({url:'http://localhost:3000/dynamic', json:true});
				})
				.then(function (results) {
					assert.equal(results[0].statusCode, 201);
					assert.equal(results[1].all, 'done');
					return get({url:'http://localhost:3000/dynamic/1', json:true});
				})
				.then(function (results) {
					assert.equal(results[0].statusCode, 200);
					assert.equal(results[1].yes, 'indeedy');
					return put({url:'http://localhost:3000/dynamic/1', json:true});
				})
				.then(function (results) {
					assert.equal(results[0].statusCode, 200);
					return get({url:'http://localhost:3000/dynamic/1', json:true});
				})
				.then(function (results) {
					assert.equal(results[0].statusCode, 200);
					assert.equal(results[1].yes, 'indiddly');
					done();
				});
		});

		it('should return JSONP if requested', function (done) {
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
				.then(function (results) {
					assert.equal('hello', 'yo(' + JSON.stringify({ stuff : 'hello' }) + ');');
					done();
				});

			request('http://localhost:3000/stuff?callback=yo', function (error, response, body) {
				assert.equal(body, 'yo(' + JSON.stringify({ stuff : 'hello' }) + ');');
				done();
			});
		});

		it('should create one GET endpoint with support for delaying the response', function (done) {
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
			request({ url : 'http://localhost:3000/test', json : true }, function (error, response, body) {
				assert.equal(response.statusCode, 200);
				assert.equal(body.hi, 'there');
				if(!enoughTimeHasPassed) {
					throw new Error('Response wasn\'t delay for long enough');
				}
				done();
			});
		});
		it('should create one GET endpoint with support for delaying the response with a delay range', function (done) {
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
			}, 55);
			request({ url : 'http://localhost:3000/test', json : true }, function (error, response, body) {
				clearTimeout(timeout);
				if(!enoughTimeHasPassed) {
					throw new Error('Response wasn\'t delay for long enough');
				}
				if(tookTooLong) {
					throw new Error('Response was delayed for too long');
				}
				done();
			});
		});
	});
	
	// Testing the API root stuff
	describe('#Interfake({ path: [String] })', function () {
		it('should set the root path of the API', function (done) {
			interfake = new Interfake({path:'/api'});
			interfake.get('/endpoint').status(200).creates.get('/moar-endpoints');
			interfake.listen(3000);

			Q.all([get({url:'http://localhost:3000/api/endpoint',json:true}), get({url:'http://localhost:3000/endpoint',json:true})])
				.then(function (results) {
					assert.equal(results[0][0].statusCode, 200);
					assert.equal(results[1][0].statusCode, 404);
					return get('http://localhost:3000/api/endpoint');
				})
				.then(function (results) {
					assert.equal(results[0].statusCode, 200);
					return get('http://localhost:3000/api/moar-endpoints');
				})
				.then(function (results) {
					assert.equal(results[0].statusCode, 200);
					done();
				});
		});
	});
	
	// Testing the fluent interface
	describe('#get()', function () {
		it('should create one GET endpoint', function (done) {
			interfake.get('/fluent');
			interfake.listen(3000);

			request({ url : 'http://localhost:3000/fluent', json : true }, function (error, response, body) {
				assert.equal(response.statusCode, 200);
				done();
			});
		});

		it('should create one GET endpoint with a querystring', function (done) {
			interfake.get('/fluent?query=1');
			interfake.listen(3000);

			request({ url : 'http://localhost:3000/fluent?query=1', json : true }, function (error, response, body) {
				assert.equal(response.statusCode, 200);
				done();
			});
		});

		describe('#responseHeaders()', function () {
			it('should create one GET endpoint which returns custom headers', function (done) {
				interfake.get('/fluent').responseHeaders({ 'X-Request-Type': 'test', 'X-lol-TEST': 'bleep' });
				interfake.listen(3000);

				request({ url : 'http://localhost:3000/fluent', json : true }, function (error, response) {
					assert.equal(response.statusCode, 200);
					assert.equal(response.headers['x-request-type'], 'test');
					assert.equal(response.headers['x-lol-test'], 'bleep');
					assert.equal(response.headers['x-undef'], undefined);
					done();
				});
			});

			describe('#status()', function () {
				it('should return a 300 status', function (done) {
					interfake.get('/fluent').responseHeaders({ 'X-Request-Type': 'test', 'X-lol-TEST': 'bleep' }).status(300);
					interfake.listen(3000);

					request({ url : 'http://localhost:3000/fluent', json : true }, function (error, response) {
						assert.equal(response.statusCode, 300);
						assert.equal(response.headers['x-request-type'], 'test');
						assert.equal(response.headers['x-lol-test'], 'bleep');
						assert.equal(response.headers['x-undef'], undefined);
						done();
					});
				});
			});
		});

		describe('#query()', function () {
			it('should use the query object as priority', function (done) {
				interfake.get('/fluent?query=1').query({ query: 2 }).status(200);
				interfake.listen(3000);

				Q.all([get({url:'http://localhost:3000/fluent?query=1',json:true}), get({url:'http://localhost:3000/fluent?query=2',json:true})])
					.then(function (results) {
						assert.equal(results[0][0].statusCode, 404);
						assert.equal(results[1][0].statusCode, 200);
						done();
					});
			});

			it('should use a RegExp to find a partially-matched query string param', function (done) {
				interfake.get('/fluent').query({ query: /[0-9]+/ }).status(200);
				interfake.listen(3000);

				Q.all([get({url:'http://localhost:3000/fluent?query=1',json:true}), get({url:'http://localhost:3000/fluent?query=2',json:true})])
					.then(function (results) {
						assert.equal(results[0][0].statusCode, 200);
						assert.equal(results[1][0].statusCode, 200);
						done();
					});
			});

			it('should use a RegExp to find a partially-matched query string param and a fully-matched one', function (done) {
				interfake.get('/fluent').query({ query: /[0-9]+/, page: 2 }).status(200);
				interfake.listen(3000);

				Q.all([get({url:'http://localhost:3000/fluent?query=1&page=5',json:true}), get({url:'http://localhost:3000/fluent?query=2&page=2',json:true})])
					.then(function (results) {
						assert.equal(results[0][0].statusCode, 404, 'The non-existent page should not be found');
						assert.equal(results[1][0].statusCode, 200, 'The existing page should be found');
						done();
					});
			});

			it('should use a RegExp to find a partially-matched query string param and a fully-matched one, when there is also a query-free endpoint', function (done) {
				interfake.get('/fluent').query({ query: /[0-9]+/, page: 2 }).status(200);
				interfake.get('/fluent').status(300);
				interfake.get('/fluent?page=8').status(512);
				interfake.listen(3000);

				Q.all([get({url:'http://localhost:3000/fluent?query=1&page=5',json:true}), get({url:'http://localhost:3000/fluent?query=2&page=2',json:true}), get({url:'http://localhost:3000/fluent',json:true}), get({url:'http://localhost:3000/fluent?page=8',json:true})])
					.then(function (results) {
						assert.equal(results[0][0].statusCode, 404, 'The non-existent page should not be found');
						assert.equal(results[1][0].statusCode, 200, 'The existing page should be found');
						assert.equal(results[2][0].statusCode, 300, 'The non-query-string page should be found');
						assert.equal(results[3][0].statusCode, 512, 'The query-string page without additional params should be found');
						done();
					});
			});

			describe('#status()', function () {
				it('should create a GET endpoint which accepts different querystrings using both methods of querystring specification', function (done) {
					interfake.get('/fluent?query=1').query({ page: 1 }).status(400);
					interfake.get('/fluent?query=1').query({ page: 2 }).status(500);
					interfake.listen(3000);


					Q.all([get({url:'http://localhost:3000/fluent?query=1&page=1',json:true}), get({url:'http://localhost:3000/fluent?query=1&page=2',json:true})])
						.then(function (results) {
							assert.equal(results[0][0].statusCode, 400);
							assert.equal(results[1][0].statusCode, 500);
							done();
						});
				});

				it('should create a GET endpoint which accepts and does not accept a query string', function (done) {
					interfake.get('/fluent');
					interfake.get('/fluent').query({ page: 2 }).status(500);
					interfake.listen(3000);


					Q.all([get({url:'http://localhost:3000/fluent',json:true}), get({url:'http://localhost:3000/fluent?page=2',json:true})])
						.then(function (results) {
							assert.equal(results[0][0].statusCode, 200);
							assert.equal(results[1][0].statusCode, 500);
							done();
						});
				});
			});

			describe('#creates', function () {
				it('should create a GET endpoint which creates another GET endpoint which accepts a query string', function (done) {
					interfake.get('/fluent').creates.get('/fluent').query({ page : 2 }).status(300);
					interfake.listen(3000);

					get('http://localhost:3000/fluent')
						.then(function (results) {
							assert.equal(results[0].statusCode, 200);
							return get('http://localhost:3000/fluent?page=2');
						})
						.then(function (results) {
							assert.equal(results[0].statusCode, 300);
							return get('http://localhost:3000/fluent');
						})
						.then(function (results) {
							assert.equal(results[0].statusCode, 200);
							done();
						})
						.done();
				});
				it('should create a GET endpoint which creates another GET endpoint which accepts a query string with a regex', function (done) {
					var first = interfake.get('/fluent');
					first.creates.get('/fluent').query({ page : 2 }).status(300);
					first.creates.get('/fluent').query({ page : 2, name : /[a-z]+/ }).status(202);
					interfake.listen(3000);

					get('http://localhost:3000/fluent')
						.then(function (results) {
							assert.equal(results[0].statusCode, 200);
							return get('http://localhost:3000/fluent?page=2');
						})
						.then(function (results) {
							assert.equal(results[0].statusCode, 300);
							return get('http://localhost:3000/fluent?page=2&name=whatever');
						})
						.then(function (results) {
							assert.equal(results[0].statusCode, 202);
							return get('http://localhost:3000/fluent');
						})
						.then(function (results) {
							assert.equal(results[0].statusCode, 200);
							done();
						})
						.done();
				});
			});
		});

		describe('#modifies', function () {
			it('should create a GET endpoint which modifies its own body when it gets called', function (done) {
				interfake = new Interfake({debug:true});
				interfake.get('/fluent').body({ hello : 'there', goodbye: 'for now' }).modifies.get('/fluent').body({ what: 'ever' });
				interfake.listen(3000);

				get({url:'http://localhost:3000/fluent',json:true})
					.then(function (results) {
						console.log('Results are', results[1]);
						assert.equal(results[0].statusCode, 200);
						assert.equal(results[1].hello, 'there');
						assert.equal(results[1].goodbye, 'for now');
						assert.equal(results[1].what, undefined);
						return get({url:'http://localhost:3000/fluent',json:true});
					})
					.then(function (results) {
						assert.equal(results[0].statusCode, 200);
						assert.equal(results[1].hello, 'there');
						assert.equal(results[1].goodbye, 'for now');
						assert.equal(results[1].what, 'ever');
						done();
					})
					.done();
			});

			describe('#creates', function () {
				it('should create a GET endpoint which modifies itself to create a new endpoint next time it is called', function (done) {
					interfake = new Interfake({debug:true});
					interfake
						.get('/fluent')
						.modifies.get('/fluent')
						.creates.get('/new-fluent');
					interfake.listen(3000);

					get({url:'http://localhost:3000/fluent',json:true})
						.then(function (results) {
							assert.equal(results[0].statusCode, 200);
							return get({url:'http://localhost:3000/new-fluent',json:true});
						})
						.then(function (results) {
							assert.equal(results[0].statusCode, 404);
							return get({url:'http://localhost:3000/fluent',json:true});
						})
						.then(function (results) {
							assert.equal(results[0].statusCode, 200);
							return get({url:'http://localhost:3000/new-fluent',json:true});
						})
						.then(function (results) {
							assert.equal(results[0].statusCode, 200);
							done();
						})
						.done();
				});
			});
		});
	
		describe('#status()', function () {
			it('should create one GET endpoint with a particular status code', function (done) {
				interfake.get('/fluent').status(300);
				interfake.listen(3000);

				request({ url : 'http://localhost:3000/fluent', json : true }, function (error, response, body) {
					assert.equal(response.statusCode, 300);
					done();
				});
			});

			it('should create a GET endpoint which accepts different querystrings', function (done) {
				interfake.get('/fluent?query=1').status(400);
				interfake.get('/fluent?query=2').status(500);
				interfake.listen(3000);


				Q.all([get({url:'http://localhost:3000/fluent?query=1',json:true}), get({url:'http://localhost:3000/fluent?query=2',json:true})])
					.then(function (results) {
						assert.equal(results[0][0].statusCode, 400);
						assert.equal(results[1][0].statusCode, 500);
						done();
					});
			});
		});
		
		describe('#body()', function () {
			it('should create one GET endpoint with a particular body', function (done) {
				interfake.get('/fluent').body({ fluency : 'isgreat' });
				interfake.listen(3000);

				request({ url : 'http://localhost:3000/fluent', json : true }, function (error, response, body) {
					assert.equal(response.statusCode, 200);
					assert.equal(body.fluency, 'isgreat');
					done();
				});
			});

			it('should create two similar GET endpoints with different querystrings and different bodies', function (done) {
				interfake.get('/fluent?query=1').body({ schfifty : 'five' });
				interfake.get('/fluent?query=2').body({ gimme : 'shelter' });
				interfake.listen(3000);


				Q.all([get({url:'http://localhost:3000/fluent?query=1',json:true}), get({url:'http://localhost:3000/fluent?query=2',json:true})])
					.then(function (results) {
						assert.equal(results[0][1].schfifty, 'five');
						assert.equal(results[1][1].gimme, 'shelter');
						done();
					});
			});
		
			describe('#status()', function () {
				it('should create one GET endpoint with a particular body and particular status', function (done) {
					interfake.get('/fluent').body({ fluency : 'isgreat' }).status(300);
					interfake.listen(3000);

					request({ url : 'http://localhost:3000/fluent', json : true }, function (error, response, body) {
						assert.equal(response.statusCode, 300);
						assert.equal(body.fluency, 'isgreat');
						done();
					});
				});

				it('should create two similar GET endpoints with different querystrings and different bodies and status codes', function (done) {
					interfake.get('/fluent?query=1&another=one').body({ schfifty : 'five' }).status(404);
					interfake.get('/fluent?query=2').body({ gimme : 'shelter' }).status(503);
					interfake.listen(3000);


					Q.all([get({url:'http://localhost:3000/fluent?query=1&another=one',json:true}), get({url:'http://localhost:3000/fluent?query=2',json:true})])
						.then(function (results) {
							assert.equal(results[0][1].schfifty, 'five');
							assert.equal(results[0][0].statusCode, 404);
							assert.equal(results[1][1].gimme, 'shelter');
							assert.equal(results[1][0].statusCode, 503);
							done();
						});
				});

				describe('#delay()', function() {
					it('should create one GET endpoint with a particular body, status and delay', function (done) {
						var enoughTimeHasPassed = false;
						var _this = this;
						this.slow(500);
						interfake.get('/fluent').body({ fluency : 'isgreat' }).status(300).delay(50);
						interfake.listen(3000);
						setTimeout(function() {
							enoughTimeHasPassed = true;
						}, 50);

						request({ url : 'http://localhost:3000/fluent', json : true }, function (error, response, body) {
							assert.equal(response.statusCode, 300);
							assert.equal(body.fluency, 'isgreat');
							if(!enoughTimeHasPassed) {
								throw new Error('Response wasn\'t delay for long enough');
							}
							done();
						});
					});
				});
			});
		});
		describe('#delay()', function() {
			it('should create one GET endpoint with a particular delay', function (done) {
				var enoughTimeHasPassed = false;
				this.slow(500);
				interfake.get('/fluent').delay(50);
				interfake.listen(3000);
				setTimeout(function() {
					enoughTimeHasPassed = true;
				}, 50);

				request({ url : 'http://localhost:3000/fluent', json : true }, function () {
					if(!enoughTimeHasPassed) {
						throw new Error('Response wasn\'t delay for long enough');
					}
					done();
				});
			});

			describe('#body()', function() {
				it('should create one GET endpoint with a particular delay and body', function (done) {
					var enoughTimeHasPassed = false;
					this.slow(500);
					interfake.get('/fluent').delay(50).body({
						ok: 'yeah'
					});
					interfake.listen(3000);
					setTimeout(function() {
						enoughTimeHasPassed = true;
					}, 50);

					request({ url : 'http://localhost:3000/fluent', json : true }, function (error, response, body) {
						if(!enoughTimeHasPassed) {
							throw new Error('Response wasn\'t delay for long enough');
						}
						assert.equal(body.ok, 'yeah');
						done();
					});
				});
			});
		});
	});

	describe('#post()', function () {
		it('should create one POST endpoint', function (done) {
			interfake.post('/fluent');
			interfake.listen(3000);

			request.post({ url : 'http://localhost:3000/fluent', json : true }, function (error, response, body) {
				assert.equal(response.statusCode, 200);
				done();
			});
		});
	
		describe('#status()', function () {
			it('should create one POST endpoint with a particular status code', function (done) {
				interfake.post('/fluent').status(300);
				interfake.listen(3000);

				request.post({ url : 'http://localhost:3000/fluent', json : true }, function (error, response, body) {
					assert.equal(response.statusCode, 300);
					done();
				});
			});
		});
		
		describe('#body()', function () {
			it('should create one POST endpoint with a particular body', function (done) {
				interfake.post('/fluent').body({ fluency : 'isgreat' });
				interfake.listen(3000);

				request.post({ url : 'http://localhost:3000/fluent', json : true }, function (error, response, body) {
					assert.equal(response.statusCode, 200);
					assert.equal(body.fluency, 'isgreat');
					done();
				});
			});
		
			describe('#status()', function () {
				it('should create one POST endpoint with a particular body and particular status', function (done) {
					interfake.post('/fluent').body({ fluency : 'isgreat' }).status(300);
					interfake.listen(3000);

					request.post({ url : 'http://localhost:3000/fluent', json : true }, function (error, response, body) {
						assert.equal(response.statusCode, 300);
						assert.equal(body.fluency, 'isgreat');
						done();
					});
				});
				describe('#delay()', function() {
					it('should create one POST endpoint with a particular body, status and delay', function (done) {
						var enoughTimeHasPassed = false;
						var _this = this;
						this.slow(500);
						interfake.post('/fluent').body({ fluency : 'isgreat' }).status(300).delay(50);
						interfake.listen(3000);
						setTimeout(function() {
							enoughTimeHasPassed = true;
						}, 50);

						request.post({ url : 'http://localhost:3000/fluent', json : true }, function (error, response, body) {
							assert.equal(response.statusCode, 300);
							assert.equal(body.fluency, 'isgreat');
							if(!enoughTimeHasPassed) {
								throw new Error('Response wasn\'t delay for long enough');
							}
							done();
						});
					});
				});
			});
		});

		describe('#delay()', function() {
			it('should create one POST endpoint with a particular delay', function (done) {
				var enoughTimeHasPassed = false;
				var tookTooLong = false;
				var _this = this;

				this.slow(500);

				interfake.post('/fluent').delay(50);
				interfake.listen(3000);

				setTimeout(function() {
					enoughTimeHasPassed = true;
				}, 50);

				request.post({ url : 'http://localhost:3000/fluent', json : true }, function (error, response, body) {
					if(!enoughTimeHasPassed) {
						throw new Error('Response wasn\'t delay for long enough');
					}
					done();
				});
			});

			it('should create one POST endpoint with a delay range', function (done) {
				var enoughTimeHasPassed = false;
				var _this = this;
				var tookTooLong = false;
				var timeout;
				this.slow(500);
				interfake.post('/fluent').delay('20..50');
				interfake.listen(3000);

				setTimeout(function() {
					enoughTimeHasPassed = true;
				}, 20);

				timeout = setTimeout(function() {
					tookTooLong = true;
				}, 55);

				request.post({ url : 'http://localhost:3000/fluent', json : true }, function (error, response, body) {
					clearTimeout(timeout);
					if(!enoughTimeHasPassed) {
						throw new Error('Response wasn\'t delay for long enough');
					}
					if(tookTooLong) {
						throw new Error('Response was delayed for too long');
					}
					done();
				});
			});
		});
		
		describe('#creates', function () {
			describe('#get()', function () {
				it('should create one POST endpoint with a particular body and afterResponse endpoint', function (done) {
					interfake.post('/fluent').creates.get('/fluent/1');
					interfake.listen(3000);

					get('http://localhost:3000/fluent/1')
						.then(function (results) {
							assert.equal(results[0].statusCode, 404);
							return post('http://localhost:3000/fluent');
						})
						.then(function (results) {
							assert.equal(results[0].statusCode, 200);
							return get('http://localhost:3000/fluent/1');
						})
						.then(function (results) {
							assert.equal(results[0].statusCode, 200);
							done();
						});
				});

				it('should create one POST endpoint with two afterResponse endpoints', function (done) {
					var postEndpoint = interfake.post('/fluent');
					postEndpoint.creates.get('/fluent/1');
					postEndpoint.creates.put('/fluent/1');
					interfake.listen(3000);

					get('http://localhost:3000/fluent/1')
						.then(function (results) {
							assert.equal(results[0].statusCode, 404);
							return post('http://localhost:3000/fluent');
						})
						.then(function (results) {
							assert.equal(results[0].statusCode, 200);
							return get('http://localhost:3000/fluent/1');
						})
						.then(function (results) {
							assert.equal(results[0].statusCode, 200);
							return put('http://localhost:3000/fluent/1');
						})
						.then(function (results) {
							assert.equal(results[0].statusCode, 200);
							done();
						});
				});

				it('should create one POST endpoint with two afterResponse endpoints which accept querystrings', function (done) {
					var postEndpoint = interfake.post('/fluent');
					postEndpoint.creates.get('/fluent?q=1');
					postEndpoint.creates.put('/fluent?q=1');
					interfake.listen(3000);

					get('http://localhost:3000/fluent?q=1')
						.then(function (results) {
							assert.equal(results[0].statusCode, 404);
							return post('http://localhost:3000/fluent');
						})
						.then(function (results) {
							assert.equal(results[0].statusCode, 200);
							return get('http://localhost:3000/fluent?q=1');
						})
						.then(function (results) {
							assert.equal(results[0].statusCode, 200);
							return put('http://localhost:3000/fluent?q=1');
						})
						.then(function (results) {
							assert.equal(results[0].statusCode, 200);
							done();
						});
				});

				describe('#query()', function () {
					it('should create multiple post-response GET endpoints which accept querystrings and also create endpoints (CRUD)', function (done) {
						// CREATE
						var postEndpoint = interfake.post('/fluent').status(201);
						// READ
						postEndpoint.creates.get('/fluent?q=1').status(200).body({ title : 'Hello!' });
						// UPDATE
						var putEndpoint = postEndpoint.creates.put('/fluent?q=1').status(200).body({ title : 'Hello again!' });
						putEndpoint.creates.get('/fluent?q=1').status(200).body({ title : 'Hello again!' });
						// DELETE
						var deleteEndpoint = postEndpoint.creates.delete('/fluent?q=1').status(200);
						deleteEndpoint.creates.get('/fluent?q=1').status(410);
						deleteEndpoint.creates.put('/fluent?q=1').status(410);
						interfake.listen(3000);

						get('http://localhost:3000/fluent?q=1')
							.then(function (results) {
								assert.equal(results[0].statusCode, 404, 'The GET should not exist yet');
								return post('http://localhost:3000/fluent');
							})
							.then(function (results) {
								assert.equal(results[0].statusCode, 201, 'The POST should report creation');
								return get({url: 'http://localhost:3000/fluent?q=1', json: true});
							})
							.then(function (results) {
								assert.equal(results[0].statusCode, 200, 'The GET should now exist');
								assert.equal(results[1].title, 'Hello!');
								return put({url: 'http://localhost:3000/fluent?q=1', json: true});
							})
							.then(function (results) {
								assert.equal(results[0].statusCode, 200, 'The PUT should have sucessfully updated');
								assert.equal(results[1].title, 'Hello again!');
								return get({url: 'http://localhost:3000/fluent?q=1', json: true});
							})
							.then(function (results) {
								assert.equal(results[0].statusCode, 200, 'The GET should still exist');
								assert.equal(results[1].title, 'Hello again!');
								return del({url: 'http://localhost:3000/fluent?q=1', json: true});
							})
							.then(function (results) {
								assert.equal(results[0].statusCode, 200, 'The DELETE should report successful deletion');
								return get({url: 'http://localhost:3000/fluent?q=1', json: true});
							})
							.then(function (results) {
								assert.equal(results[0].statusCode, 410, 'The GET should no longer exist');
								return put({url: 'http://localhost:3000/fluent?q=1', json: true});
							})
							.then(function (results) {
								assert.equal(results[0].statusCode, 410, 'The PUT should no longer exist');
								done();
							})
							.fail(done);
					});
				});

				describe('#status()', function () {
					it('should create a post-response GET with a particular status', function (done) {
						interfake.post('/fluent').creates.get('/fluent/1').status(300);
						interfake.listen(3000);

						get('http://localhost:3000/fluent/1')
							.then(function (results) {
								assert.equal(results[0].statusCode, 404);
								return post('http://localhost:3000/fluent');
							})
							.then(function (results) {
								assert.equal(results[0].statusCode, 200);
								return get('http://localhost:3000/fluent/1');
							})
							.then(function (results) {
								assert.equal(results[0].statusCode, 300);
								done();
							});
					});
				});

				describe('#body()', function () {
					it('should create a post-response GET with a particular body', function (done) {
						interfake.post('/fluent').creates.get('/fluent/1').body({ fluency : 'is badass' });
						interfake.listen(3000);

						get('http://localhost:3000/fluent/1')
							.then(function (results) {
								assert.equal(results[0].statusCode, 404);
								return post('http://localhost:3000/fluent');
							})
							.then(function (results) {
								assert.equal(results[0].statusCode, 200);
								return get({url:'http://localhost:3000/fluent/1', json:true});
							})
							.then(function (results) {
								assert.equal(results[1].fluency, 'is badass');
								done();
							});
					});

					describe('#status()', function() {
						it('should create a post-response GET with a particular and body and status', function (done) {
							interfake.post('/fluent').creates.get('/fluent/1').body({ fluency : 'is badass' }).status(500);
							interfake.listen(3000);

							get('http://localhost:3000/fluent/1')
								.then(function (results) {
									assert.equal(results[0].statusCode, 404);
									return post('http://localhost:3000/fluent');
								})
								.then(function (results) {
									assert.equal(results[0].statusCode, 200);
									return get({url:'http://localhost:3000/fluent/1', json:true});
								})
								.then(function (results) {
									assert.equal(results[0].statusCode, 500);
									assert.equal(results[1].fluency, 'is badass');
									done();
								});
						});
					});
				});

				describe('#creates', function () {
					it('should create a post-response GET with another post-response GET', function (done) {
						interfake.post('/fluent').creates.get('/fluent/1').creates.get('/fluent/2');
						interfake.listen(3000);

						get('http://localhost:3000/fluent/1')
							.then(function (results) {
								assert.equal(results[0].statusCode, 404);
								return post('http://localhost:3000/fluent');
							})
							.then(function (results) {
								assert.equal(results[0].statusCode, 200);
								return get('http://localhost:3000/fluent/1');
							})
							.then(function (results) {
								assert.equal(results[0].statusCode, 200);
								return get('http://localhost:3000/fluent/2');
							})
							.then(function (results) {
								assert.equal(results[0].statusCode, 200);
								done();
							});
					});
				});
			});
		});
	});
});
