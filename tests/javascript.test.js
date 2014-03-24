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

describe('Interfake JavaScript API', function () {
	describe('#createRoute()', function () {
		it('should create one GET endpoint', function (done) {
			var interfake = new Interfake();
			interfake.createRoute({
				request: {
					url: '/test',
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

			request({ url : 'http://localhost:3000/test', json : true }, function (error, response, body) {
				assert.equal(response.statusCode, 200);
				assert.equal(body.hi, 'there');
				interfake.stop();
				done();
			});
		});

		it('should create three GET endpoints with different status codes', function (done) {
			var interfake = new Interfake();
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
					interfake.stop();
					done();
				});
		});

		it('should create a dynamic endpoint', function (done) {
			var interfake = new Interfake();
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
					interfake.stop();
					done();
				});
		});

		it('should create a dynamic endpoint within a dynamic endpoint', function (done) {
			var interfake = new Interfake();
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
					interfake.stop();
					done();
				});
		});

		it('should return JSONP if requested', function (done) {
			var interfake = new Interfake();
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
					interfake.stop();
					done();
				});

			request('http://localhost:3000/stuff?callback=yo', function (error, response, body) {
				assert.equal(body, 'yo(' + JSON.stringify({ stuff : 'hello' }) + ');');
				interfake.stop();
				done();
			});
		});

		it('should create one GET endpoint with support for delaying the response', function (done) {
			var interfake = new Interfake();
			var enoughTimeHasPassed = false;
			var _this = this;
			this.slow(500)
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
			timer = setTimeout(function() {
				enoughTimeHasPassed = true;
			}, 50)
			request({ url : 'http://localhost:3000/test', json : true }, function (error, response, body) {
				assert.equal(response.statusCode, 200);
				assert.equal(body.hi, 'there');
				interfake.stop();
				if(!enoughTimeHasPassed) {
					throw new Error('Response wasn\'t delay for long enough');
				}
				done();
			});
		});
		it('should create one GET endpoint with support for delaying the response with a delay range', function (done) {
			var interfake = new Interfake();
			var enoughTimeHasPassed = false;
			var _this = this;
			this.slow(500)
			interfake.createRoute({
				request: {
					url: '/test',
					method: 'get'
				},
				response: {
					code: 200,
					delay: "20..50",
					body: {
						hi: 'there'
					}
				}
			});
			interfake.listen(3000);
			timer = setTimeout(function() {
				enoughTimeHasPassed = true;
			}, 20)
			request({ url : 'http://localhost:3000/test', json : true }, function (error, response, body) {
				assert.equal(response.statusCode, 200);
				assert.equal(body.hi, 'there');
				interfake.stop();
				if(!enoughTimeHasPassed) {
					throw new Error('Response wasn\'t delay for long enough');
				}
				done();
			});
		});
	});
	
	// Testing the fluent interface
	describe('#get()', function () {
		it('should create one GET endpoint', function (done) {
			var interfake = new Interfake();
			interfake.get('/fluent');
			interfake.listen(3000);

			request({ url : 'http://localhost:3000/fluent', json : true }, function (error, response, body) {
				assert.equal(response.statusCode, 200);
				interfake.stop();
				done();
			});
		});
	
		describe('#status()', function () {
			it('should create one GET endpoint with a particular status code', function (done) {
				var interfake = new Interfake();
				interfake.get('/fluent').status(300);
				interfake.listen(3000);

				request({ url : 'http://localhost:3000/fluent', json : true }, function (error, response, body) {
					assert.equal(response.statusCode, 300);
					interfake.stop();
					done();
				});
			});
		});
		
		describe('#body()', function () {
			it('should create one GET endpoint with a particular body', function (done) {
				var interfake = new Interfake();
				interfake.get('/fluent').body({ fluency : 'isgreat' });
				interfake.listen(3000);

				request({ url : 'http://localhost:3000/fluent', json : true }, function (error, response, body) {
					assert.equal(response.statusCode, 200);
					assert.equal(body.fluency, 'isgreat');
					interfake.stop();
					done();
				});
			});
		
			describe('#status()', function () {
				it('should create one GET endpoint with a particular body and particular status', function (done) {
					var interfake = new Interfake();
					interfake.get('/fluent').body({ fluency : 'isgreat' }).status(300);
					interfake.listen(3000);

					request({ url : 'http://localhost:3000/fluent', json : true }, function (error, response, body) {
						assert.equal(response.statusCode, 300);
						assert.equal(body.fluency, 'isgreat');
						interfake.stop();
						done();
					});
				});
				describe('#delay()', function() {
					it('should create one GET endpoint with a particular body, status and delay', function (done) {
						var interfake = new Interfake();
						var enoughTimeHasPassed = false;
						var _this = this;
						this.slow(500)
						interfake.get('/fluent').body({ fluency : 'isgreat' }).status(300).delay(50);
						interfake.listen(3000);
						setTimeout(function() {
							enoughTimeHasPassed = true;
						}, 50)

						request({ url : 'http://localhost:3000/fluent', json : true }, function (error, response, body) {
							assert.equal(response.statusCode, 300);
							assert.equal(body.fluency, 'isgreat');
							interfake.stop();
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
				var interfake = new Interfake();
				var enoughTimeHasPassed = false;
				var _this = this;
				this.slow(500)
				interfake.get('/fluent').delay(50);
				interfake.listen(3000);
				setTimeout(function() {
					enoughTimeHasPassed = true;
				}, 50)

				request({ url : 'http://localhost:3000/fluent', json : true }, function (error, response, body) {
					interfake.stop();
					if(!enoughTimeHasPassed) {
						throw new Error('Response wasn\'t delay for long enough');
					}
					done();
				});
			});
		});
	});

	describe('#post()', function () {
		it('should create one POST endpoint', function (done) {
			var interfake = new Interfake();
			interfake.post('/fluent');
			interfake.listen(3000);

			request.post({ url : 'http://localhost:3000/fluent', json : true }, function (error, response, body) {
				assert.equal(response.statusCode, 200);
				interfake.stop();
				done();
			});
		});
	
		describe('#status()', function () {
			it('should create one POST endpoint with a particular status code', function (done) {
				var interfake = new Interfake();
				interfake.post('/fluent').status(300);
				interfake.listen(3000);

				request.post({ url : 'http://localhost:3000/fluent', json : true }, function (error, response, body) {
					assert.equal(response.statusCode, 300);
					interfake.stop();
					done();
				});
			});
		});
		
		describe('#body()', function () {
			it('should create one POST endpoint with a particular body', function (done) {
				var interfake = new Interfake();
				interfake.post('/fluent').body({ fluency : 'isgreat' });
				interfake.listen(3000);

				request.post({ url : 'http://localhost:3000/fluent', json : true }, function (error, response, body) {
					assert.equal(response.statusCode, 200);
					assert.equal(body.fluency, 'isgreat');
					interfake.stop();
					done();
				});
			});
		
			describe('#status()', function () {
				it('should create one POST endpoint with a particular body and particular status', function (done) {
					var interfake = new Interfake();
					interfake.post('/fluent').body({ fluency : 'isgreat' }).status(300);
					interfake.listen(3000);

					request.post({ url : 'http://localhost:3000/fluent', json : true }, function (error, response, body) {
						assert.equal(response.statusCode, 300);
						assert.equal(body.fluency, 'isgreat');
						interfake.stop();
						done();
					});
				});
				describe('#delay()', function() {
					it('should create one POST endpoint with a particular body, status and delay', function (done) {
						var interfake = new Interfake();
						var enoughTimeHasPassed = false;
						var _this = this;
						this.slow(500)
						interfake.post('/fluent').body({ fluency : 'isgreat' }).status(300).delay(50);
						interfake.listen(3000);
						setTimeout(function() {
							enoughTimeHasPassed = true;
						}, 50)

						request.post({ url : 'http://localhost:3000/fluent', json : true }, function (error, response, body) {
							assert.equal(response.statusCode, 300);
							assert.equal(body.fluency, 'isgreat');
							interfake.stop();
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
				var interfake = new Interfake();
				var enoughTimeHasPassed = false;
				var _this = this;
				this.slow(500)
				interfake.post('/fluent').delay(50);
				interfake.listen(3000);
				setTimeout(function() {
					enoughTimeHasPassed = true;
				}, 50)

				request.post({ url : 'http://localhost:3000/fluent', json : true }, function (error, response, body) {
					interfake.stop();
					if(!enoughTimeHasPassed) {
						throw new Error('Response wasn\'t delay for long enough');
					}
					done();
				});
			});
			it('should create one POST endpoint with a delay range', function (done) {
				var interfake = new Interfake();
				var enoughTimeHasPassed = false;
				var _this = this;
				this.slow(500)
				interfake.post('/fluent').delay("20..50");
				interfake.listen(3000);
				setTimeout(function() {
					enoughTimeHasPassed = true;
				}, 20)

				request.post({ url : 'http://localhost:3000/fluent', json : true }, function (error, response, body) {
					interfake.stop();
					if(!enoughTimeHasPassed) {
						throw new Error('Response wasn\'t delay for long enough');
					}
					done();
				});
			});
		});
		
		describe('#then', function () {
			describe('#get()', function () {
				it('should create one POST endpoint with a particular body and afterResponse endpoint', function (done) {
					var interfake = new Interfake();
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
							interfake.stop();
							done();
						});
				});

				it('should create one POST endpoint with two afterResponse endpoints', function (done) {
					var interfake = new Interfake();
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
							interfake.stop();
							done();
						});
				});

				describe('#status()', function () {
					it('should create a post-response GET with a particular status', function (done) {
						var interfake = new Interfake();
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
								interfake.stop();
								done();
							});
					});
				});

				describe('#body()', function () {
					it('should create a post-response GET with a particular body', function (done) {
						var interfake = new Interfake();
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
								interfake.stop();
								done();
							});
					});

					describe('#status()', function() {
						it('should create a post-response GET with a particular and body and status', function (done) {
							var interfake = new Interfake();
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
									interfake.stop();
									done();
								});
						});
					});
				});

				describe('#then()', function () {
					it('should create a post-response GET with another post-response GET', function (done) {
						var interfake = new Interfake();
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
								interfake.stop();
								done();
							});
					});
				});
			});
		});
	});
});