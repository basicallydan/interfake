/* globals describe, beforeEach, afterEach, it */
var assert = require('assert');
var request = require('request');
var Q = require('q');

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

describe('Interfake Fluent JavaScript API', function () {
	beforeEach(function () {
		interfake = new Interfake();
	});
	afterEach(function () {
		if (interfake) {
			interfake.stop();
		}
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

		it('should create one GET endpoint with a RegExp path', function (done) {
			interfake = new Interfake();
			interfake.get(/\/fluent\/.*/);
			interfake.listen(3000);

			request({ url : 'http://localhost:3000/fluent/whatever', json : true }, function (error, response, body) {
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

		describe('#proxy()', function () {
			it('should create one GET endpoint which acts as a proxy for another', function (done) {
				var proxiedInterfake = new Interfake();
				proxiedInterfake.get('/whatever').status(404).body({
					message: 'This is something you proxied!'
				});
				proxiedInterfake.listen(3051);
				interfake.get('/proxy').proxy('http://localhost:3051/whatever');
				interfake.listen(3000);

				request('http://localhost:3000/proxy', function (error, response, body) {
					assert.equal(response.statusCode, 404);
					assert.equal(body.message, 'This is something you proxied!');
					proxiedInterfake.stop();
					done();
				});
			});

			it('should create one GET endpoint which acts as a proxy for another and sends the specified header', function (done) {
				var proxiedInterfake = new Interfake({
					onRequest: function (req) {
						assert.equal(req.get('Authorization'), 'Basic username:password');
						proxiedInterfake.stop();
						done();
					}
				});
				proxiedInterfake.get('/whatever').status(404).body({
					message: 'This is something you proxied!'
				});
				proxiedInterfake.listen(3051);
				interfake.get('/proxy').proxy({
					url: 'http://localhost:3051/whatever',
					headers: {
						'Authorization': 'Basic username:password'
					}
				});
				interfake.listen(3000);

				request('http://localhost:3000/proxy', function (error, response, body) {
					assert.equal(response.statusCode, 404);
					assert.equal(body.message, 'This is something you proxied!');
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

			describe('when a query parameter has an array value', function () {
				it('should use an array to find array query string params regardless of order', function (done) {
					interfake.get('/fluent').query({ pages: [ '1', '2' ]}).status(200);
					interfake.listen(3000);

					Q.all([get({url:'http://localhost:3000/fluent?pages=1&pages=2',json:true}), get({url:'http://localhost:3000/fluent?pages=2&pages=1',json:true})])
						.then(function (results) {
							assert.equal(results[0][0].statusCode, 200);
							assert.equal(results[1][0].statusCode, 200);
							done();
						});
				});

				it('should use an array to find array query string params using the older square-bracket syntax', function (done) {
					interfake.get('/fluent').query({ pages: [ '1', '2' ]}).status(200);
					interfake.listen(3000);

					Q.all([get({url:'http://localhost:3000/fluent?pages[]=1&pages[]=2',json:true}), get({url:'http://localhost:3000/fluent?pages[]=2&pages[]=1',json:true})])
						.then(function (results) {
							assert.equal(results[0][0].statusCode, 200);
							assert.equal(results[1][0].statusCode, 200);
							done();
						});
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
	
		describe('#status()', function () {
			it('should create one GET endpoint with a particular status code', function (done) {
				interfake.get('/fluent').status(300);
				interfake.listen(3000);

				request({ url : 'http://localhost:3000/fluent', json : true }, function (error, response) {
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

		describe('#echo()', function () {
			it('should return the request body', function (done) {
				interfake.post('/stuff').echo();

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

				request.post({ url : 'http://localhost:3000/fluent', json : true }, function () {
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

	describe('#patch()', function () {
		it('should create one PATCH endpoint', function (done) {
			interfake.patch('/fluent');
			interfake.listen(3000);

			request.patch({ url : 'http://localhost:3000/fluent', json : true }, function (error, response, body) {
				assert.equal(response.statusCode, 200);
				done();
			});
		});

		describe('#extends', function () {
			it('should create a PATCH endpoint which allows itself to be extended', function (done) {
				interfake.get('/users').body([
					{
						name: 'Max Headroom'
					}
				]);

				interfake.patch('/users').extends.get('/users').body([{
						name: 'Min Headroom'
					}
				]);

				interfake.listen(3000);

				get({ url : 'http://localhost:3000/users', json : true })
					.then(function (results) {
						assert.equal(results[0].statusCode, 200);
						assert.equal(results[1].length, 1);
						return patch({ url : 'http://localhost:3000/users', json : true });
					})
					.then(function (results) {
						assert.equal(results[0].statusCode, 200);
						return get({ url : 'http://localhost:3000/users', json : true });
					})
					.then(function (results) {
						assert.equal(results[0].statusCode, 200);
						assert.equal(results[1].length, 2);
						done();
					})
					.catch(done);
			});
		});
	});
	
	// Testing #extends stuff
	describe('#extends', function () {
		describe('#get()', function() {
			describe('#body()', function () {
				it('should create a GET endpoint which extends its own body when it gets called', function (done) {
					interfake.get('/fluent').body({ hello : 'there', goodbye: 'for now' }).extends.get('/fluent').body({ what: 'ever' });
					interfake.listen(3000);

					get({url:'http://localhost:3000/fluent',json:true})
						.then(function (results) {
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

				it('should create a POST endpoint which adds to a GET endpoint with deep array when it gets called', function (done) {
					interfake.get('/items').body({ items : [ { id: 1 } ] });
					interfake.post('/items').status(201).extends.get('/items').body({ items : [ { id : 2 } ] });
					interfake.listen(3000);

					get({url:'http://localhost:3000/items',json:true})
						.then(function (results) {
							assert.equal(results[0].statusCode, 200);
							assert.equal(results[1].items[0].id, 1);
							assert.equal(results[1].items.length, 1);
							return post({url:'http://localhost:3000/items',json:true});
						})
						.then(function (results) {
							assert.equal(results[0].statusCode, 201);
							return get({url:'http://localhost:3000/items',json:true});
						})
						.then(function (results) {
							assert.equal(results[0].statusCode, 200);
							assert.equal(results[1].items[0].id, 1);
							assert.equal(results[1].items[1].id, 2);
							assert.equal(results[1].items.length, 2);
							done();
						})
						.done();
				});

				it('should create a POST endpoint which adds to a GET endpoint with top-level array when it gets called', function (done) {
					interfake.get('/items').body([ { id: 1 } ]);
					interfake.post('/items').status(201).extends.get('/items').body([ { id : 2 } ]);
					interfake.listen(3000);

					get({url:'http://localhost:3000/items',json:true})
						.then(function (results) {
							assert.equal(results[0].statusCode, 200);
							assert.equal(results[1][0].id, 1);
							assert.equal(results[1][1], undefined);
							return post({url:'http://localhost:3000/items',json:true});
						})
						.then(function (results) {
							assert.equal(results[0].statusCode, 201);
							return get({url:'http://localhost:3000/items',json:true});
						})
						.then(function (results) {
							assert.equal(results[0].statusCode, 200);
							assert.equal(results[1][0].id, 1);
							assert.equal(results[1][1].id, 2);
							done();
						})
						.done();
				});
			});

			describe('#status()', function () {
				it('should create a GET endpoint which extends its own status when it gets called', function (done) {
					interfake.get('/fluent').body({ hello : 'there', goodbye: 'for now' }).extends.get('/fluent').status(401);
					interfake.listen(3000);

					get({url:'http://localhost:3000/fluent',json:true})
						.then(function (results) {
							assert.equal(results[0].statusCode, 200);
							assert.equal(results[1].hello, 'there');
							assert.equal(results[1].goodbye, 'for now');
							assert.equal(results[1].what, undefined);
							return get({url:'http://localhost:3000/fluent',json:true});
						})
						.then(function (results) {
							assert.equal(results[0].statusCode, 401);
							assert.equal(results[1].hello, 'there');
							assert.equal(results[1].goodbye, 'for now');
							assert.equal(results[1].what, undefined);
							done();
						})
						.done();
				});
			});

			describe('#responseHeaders()', function () {
				it('should create a GET endpoint which extends its own response headers when it gets called', function (done) {
					interfake.get('/fluent').responseHeaders({ 'Awesome-Header' : 'Awesome Value' }).extends.get('/fluent').responseHeaders({ 'Lame-Header' : 'Lame Value' });
					interfake.listen(3000);

					get({url:'http://localhost:3000/fluent',json:true})
						.then(function (results) {
							assert.equal(results[0].headers['awesome-header'], 'Awesome Value');
							assert.equal(results[0].headers['lame-header'], undefined);
							return get({url:'http://localhost:3000/fluent',json:true});
						})
						.then(function (results) {
							assert.equal(results[0].headers['awesome-header'], 'Awesome Value');
							assert.equal(results[0].headers['lame-header'], 'Lame Value');
							done();
						})
						.done();
				});
			});

			describe('#delay()', function () {
				it('should create a GET endpoint which adds a delay to itself when it gets called', function (done) {
					var enoughTimeHasPassed;
					interfake.get('/fluent').body({ hello : 'there', goodbye: 'for now' }).extends.get('/fluent').delay(50);
					interfake.listen(3000);

					setTimeout(function() {
						enoughTimeHasPassed = true;
					}, 50);

					get({url:'http://localhost:3000/fluent',json:true})
						.then(function (results) {
							assert.equal(results[0].statusCode, 200);
							assert.equal(results[1].hello, 'there');
							assert.equal(results[1].goodbye, 'for now');
							assert.equal(results[1].what, undefined);
							return get({url:'http://localhost:3000/fluent',json:true});
						})
						.then(function (results) {
							if(!enoughTimeHasPassed) {
								throw new Error('Response wasn\'t delay for long enough');
							}
							assert.equal(results[0].statusCode, 200);
							assert.equal(results[1].hello, 'there');
							assert.equal(results[1].goodbye, 'for now');
							assert.equal(results[1].what, undefined);
							done();
						})
						.done();
				});

				it('should create a GET endpoint which adds a delay to a different endpoint when it gets called', function (done) {
					var enoughTimeHasPassed, tookTooLong;
					interfake.get('/fluent').extends.get('/needs-delay').delay(50);
					interfake.get('/needs-delay');
					interfake.listen(3000);

					setTimeout(function() {
						tookTooLong = true;
					}, 50);

					get({url:'http://localhost:3000/needs-delay', json:true})
						.then(function (results) {
							assert.equal(results[0].statusCode, 200);
							if (tookTooLong) {
								throw new Error('The response took too long the first time');
							}
							return get({url:'http://localhost:3000/fluent', json:true});
						})
						.then(function (results) {
							assert.equal(results[0].statusCode, 200);
							setTimeout(function() {
								enoughTimeHasPassed = true;
							}, 50);
							return get({url:'http://localhost:3000/needs-delay', json:true});
						})
						.then(function (results) {
							assert.equal(results[0].statusCode, 200);
							if(!enoughTimeHasPassed) {
								throw new Error('Response wasn\'t delay for long enough');
							}
							done();
						})
						.done();
				});
			});

			describe('#query()', function () {
				it('should create a GET endpoint with a query which extends its own status', function (done) {
					interfake.get('/fluent').query({ page : 2 }).status(200).extends.get('/fluent').query({ page : 2 }).status(300);
					interfake.listen(3000);

					get('http://localhost:3000/fluent?page=2')
						.then(function (results) {
							assert.equal(results[0].statusCode, 200);
							return get('http://localhost:3000/fluent?page=2');
						})
						.then(function (results) {
							assert.equal(results[0].statusCode, 300);
							done();
						})
						.done();
				});
			});

			describe('#creates', function () {
				describe('#get', function () {
					it('should produce a useful error when trying to spawn a GET endpoint from a modified endpoint', function (done) {
						assert.throws(function () {
							interfake.get('/fluent').extends.get('/fluent').creates.get('/error');
						}, function (err) {
							assert.equal(err.message, 'Sorry, but modified routes cannot yet create new routes after their response. This is planned for a future version of Interfake.');
							done();
							return true;
						});
					});
				});
				describe('#post', function () {
					it('should produce a useful error when trying to spawn a POST endpoint from a modified endpoint', function (done) {
						assert.throws(function () {
							interfake.get('/fluent').extends.get('/fluent').creates.post('/error');
						}, function (err) {
							assert.equal(err.message, 'Sorry, but modified routes cannot yet create new routes after their response. This is planned for a future version of Interfake.');
							done();
							return true;
						});
					});
				});
				describe('#put', function () {
					it('should produce a useful error when trying to spawn a PUT endpoint from a modified endpoint', function (done) {
						assert.throws(function () {
							interfake.get('/fluent').extends.get('/fluent').creates.put('/error');
						}, function (err) {
							assert.equal(err.message, 'Sorry, but modified routes cannot yet create new routes after their response. This is planned for a future version of Interfake.');
							done();
							return true;
						});
					});
				});
				describe('#delete', function () {
					it('should produce a useful error when trying to spawn a DELETE endpoint from a modified endpoint', function (done) {
						assert.throws(function () {
							interfake.get('/fluent').extends.get('/fluent').creates.delete('/error');
						}, function (err) {
							assert.equal(err.message, 'Sorry, but modified routes cannot yet create new routes after their response. This is planned for a future version of Interfake.');
							done();
							return true;
						});
					});
				});
			});

			describe('#extends', function () {
				describe('#get', function () {
					it('should produce a useful error when trying to modify an existing GET endpoint from a modified endpoint', function (done) {
						assert.throws(function () {
							interfake.get('/fluent').extends.get('/fluent').extends.get('/error');
						}, function (err) {
							assert.equal(err.message, 'Sorry, but modified routes cannot yet modify existing routes after their response. This is planned for a future version of Interfake.');
							done();
							return true;
						});
					});
				});
				describe('#post', function () {
					it('should produce a useful error when trying to modify an existing POST endpoint from a modified endpoint', function (done) {
						assert.throws(function () {
							interfake.get('/fluent').extends.get('/fluent').extends.post('/error');
						}, function (err) {
							assert.equal(err.message, 'Sorry, but modified routes cannot yet modify existing routes after their response. This is planned for a future version of Interfake.');
							done();
							return true;
						});
					});
				});
				describe('#put', function () {
					it('should produce a useful error when trying to modify an existing PUT endpoint from a modified endpoint', function (done) {
						assert.throws(function () {
							interfake.get('/fluent').extends.get('/fluent').extends.put('/error');
						}, function (err) {
							assert.equal(err.message, 'Sorry, but modified routes cannot yet modify existing routes after their response. This is planned for a future version of Interfake.');
							done();
							return true;
						});
					});
				});
				describe('#delete', function () {
					it('should produce a useful error when trying to modify an existing DELETE endpoint from a modified endpoint', function (done) {
						assert.throws(function () {
							interfake.get('/fluent').extends.get('/fluent').extends.delete('/error');
						}, function (err) {
							assert.equal(err.message, 'Sorry, but modified routes cannot yet modify existing routes after their response. This is planned for a future version of Interfake.');
							done();
							return true;
						});
					});
				});
			});
		});

		describe('#put()', function () {
			describe('#body()', function () {
				it('should create a PUT endpoint which extends its own body when it gets called', function (done) {
					interfake.put('/fluent').body({ version : 1 }).extends.put('/fluent').body({ version: 2 });
					interfake.listen(3000);

					put({url:'http://localhost:3000/fluent',json:true})
						.then(function (results) {
							assert.equal(results[0].statusCode, 200);
							assert.equal(results[1].version, 1);
							return put({url:'http://localhost:3000/fluent',json:true});
						})
						.then(function (results) {
							assert.equal(results[0].statusCode, 200);
							assert.equal(results[1].version, 2);
							done();
						})
						.done();
				});
			});
		});

		describe('#post()', function () {
			describe('#body()', function () {
				it('should create a POST endpoint which extends its own body when it gets called', function (done) {
					interfake.post('/fluent').body({ version : 1 }).extends.post('/fluent').body({ version: 2 });
					interfake.listen(3000);

					post({url:'http://localhost:3000/fluent',json:true})
						.then(function (results) {
							assert.equal(results[0].statusCode, 200);
							assert.equal(results[1].version, 1);
							return post({url:'http://localhost:3000/fluent',json:true});
						})
						.then(function (results) {
							assert.equal(results[0].statusCode, 200);
							assert.equal(results[1].version, 2);
							done();
						})
						.done();
				});
			});

			describe('#echo()', function () {
				it('should create a POST endpoint which becomes an echo endpoint when it gets called', function (done) {
					interfake.post('/fluent').body({ version : 1 }).extends.post('/fluent').echo();
					interfake.listen(3000);

					post({url:'http://localhost:3000/fluent',json:true})
						.then(function (results) {
							assert.equal(results[0].statusCode, 200);
							assert.equal(results[1].version, 1);
							return post({ url:'http://localhost:3000/fluent', json : true, body : { version : 5 } });
						})
						.then(function (results) {
							assert.equal(results[0].statusCode, 200);
							assert.equal(results[1].version, 5);
							done();
						})
						.done();
				});

				it('should create a POST endpoint which was an echo endpoint but becomes a non-echo endpoint when it gets called', function (done) {
					interfake.post('/fluent').echo().extends.post('/fluent').body({ version : 2 }).echo(false);
					interfake.listen(3000);

					post({ url:'http://localhost:3000/fluent', json : true, body : { version : 5 } })
						.then(function (results) {
							assert.equal(results[0].statusCode, 200);
							assert.equal(results[1].version, 5);
							return post({ url:'http://localhost:3000/fluent', json : true, body : { version : 5 } });
						})
						.then(function (results) {
							assert.equal(results[0].statusCode, 200);
							assert.equal(results[1].version, 2);
							done();
						})
						.done();
				});
			});
		});

		describe('#delete()', function () {
			describe('#body()', function () {
				it('should create a DELETE endpoint which extends its own body when it gets called', function (done) {
					interfake.delete('/fluent').body({ version : 1 }).extends.delete('/fluent').body({ version: 2 });
					interfake.listen(3000);

					del({url:'http://localhost:3000/fluent',json:true})
						.then(function (results) {
							assert.equal(results[0].statusCode, 200);
							assert.equal(results[1].version, 1);
							return del({url:'http://localhost:3000/fluent',json:true});
						})
						.then(function (results) {
							assert.equal(results[0].statusCode, 200);
							assert.equal(results[1].version, 2);
							done();
						})
						.done();
				});
			});
		});
	});
});