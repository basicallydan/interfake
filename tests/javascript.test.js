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
    var self = this;
    afterEach(function () {
        if (self.interfake) {
            self.interfake.stop();
        }
    });
	describe('#createRoute()', function () {
		it('should create one GET endpoint', function (done) {
			self.interfake = new Interfake();
			self.interfake.createRoute({
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
			self.interfake.listen(3000);

			request({ url : 'http://localhost:3000/test', json : true }, function (error, response, body) {
				assert.equal(response.statusCode, 200);
				assert.equal(body.hi, 'there');
				done();
			});
		});

        it('should create a GET endpoint that accepts a query parameter', function (done) {
            self.interfake = new Interfake();
            self.interfake.createRoute({
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
            self.interfake.listen(3000);

            request({ url : 'http://localhost:3000/wantsQueryParameter?query=1234', json : true }, function (error, response, body) {
                assert.equal(error, undefined);
                assert.equal(response.statusCode, 200);
                assert.equal(body.high, 'hoe');
                done();
            });
        });

        it('should create one GET endpoint accepting query parameters with different responses', function () {
            self.interfake = new Interfake();
            self.interfake.createRoute({
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
            self.interfake.createRoute({
                request: {
                    url: '/wantsQueryParameter',
                    query: { query: '5678' },
                    method: 'get'

                },
                response: {
                    code: 200,
                    body: {
                        loan: 'shark'
                    }
                }
            });
            self.interfake.listen(3000);

            return Q.all([get({url: 'http://localhost:3000/wantsQueryParameter?query=1234', json: true}),
                   get({url: 'http://localhost:3000/wantsQueryParameter?query=5678', json: true}),
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
			self.interfake = new Interfake();
			self.interfake.createRoute({
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
			self.interfake.createRoute({
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
			self.interfake.createRoute({
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
			self.interfake.listen(3000);

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
			self.interfake = new Interfake();
			self.interfake.createRoute({
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
			self.interfake.listen(3000);

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
				});
		});

		it('should create a dynamic endpoint within a dynamic endpoint', function (done) {
			self.interfake = new Interfake();
			self.interfake.createRoute({
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
			self.interfake.listen(3000);

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
			self.interfake = new Interfake();
			self.interfake.createRoute({
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
			self.interfake.listen(3000);

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
			self.interfake = new Interfake();
			var enoughTimeHasPassed = false;
			var _this = this;
			this.slow(500)
			self.interfake.createRoute({
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
			self.interfake.listen(3000);
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
			self.interfake = new Interfake();
			var enoughTimeHasPassed = false;
			var _this = this;
			var timeout;
			var tookTooLong = false;
			this.slow(500)
			self.interfake.createRoute({
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
			self.interfake.listen(3000);
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
	
	// Testing the fluent interface
	describe('#get()', function () {
		it('should create one GET endpoint', function (done) {
			self.interfake = new Interfake();
			self.interfake.get('/fluent');
			self.interfake.listen(3000);

			request({ url : 'http://localhost:3000/fluent', json : true }, function (error, response, body) {
				assert.equal(response.statusCode, 200);
				done();
			});
		});
	
		describe('#status()', function () {
			it('should create one GET endpoint with a particular status code', function (done) {
				self.interfake = new Interfake();
				self.interfake.get('/fluent').status(300);
				self.interfake.listen(3000);

				request({ url : 'http://localhost:3000/fluent', json : true }, function (error, response, body) {
					assert.equal(response.statusCode, 300);
					done();
				});
			});
		});
		
		describe('#body()', function () {
			it('should create one GET endpoint with a particular body', function (done) {
				self.interfake = new Interfake();
				self.interfake.get('/fluent').body({ fluency : 'isgreat' });
				self.interfake.listen(3000);

				request({ url : 'http://localhost:3000/fluent', json : true }, function (error, response, body) {
					assert.equal(response.statusCode, 200);
					assert.equal(body.fluency, 'isgreat');
					done();
				});
			});
		
			describe('#status()', function () {
				it('should create one GET endpoint with a particular body and particular status', function (done) {
					self.interfake = new Interfake();
					self.interfake.get('/fluent').body({ fluency : 'isgreat' }).status(300);
					self.interfake.listen(3000);

					request({ url : 'http://localhost:3000/fluent', json : true }, function (error, response, body) {
						assert.equal(response.statusCode, 300);
						assert.equal(body.fluency, 'isgreat');
						done();
					});
				});
				describe('#delay()', function() {
					it('should create one GET endpoint with a particular body, status and delay', function (done) {
						self.interfake = new Interfake();
						var enoughTimeHasPassed = false;
						var _this = this;
						this.slow(500)
						self.interfake.get('/fluent').body({ fluency : 'isgreat' }).status(300).delay(50);
						self.interfake.listen(3000);
						setTimeout(function() {
							enoughTimeHasPassed = true;
						}, 50)

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
				self.interfake = new Interfake();
				var enoughTimeHasPassed = false;
				var _this = this;
				this.slow(500)
				self.interfake.get('/fluent').delay(50);
				self.interfake.listen(3000);
				setTimeout(function() {
					enoughTimeHasPassed = true;
				}, 50)

				request({ url : 'http://localhost:3000/fluent', json : true }, function (error, response, body) {
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
			self.interfake = new Interfake();
			self.interfake.post('/fluent');
			self.interfake.listen(3000);

			request.post({ url : 'http://localhost:3000/fluent', json : true }, function (error, response, body) {
				assert.equal(response.statusCode, 200);
				done();
			});
		});
	
		describe('#status()', function () {
			it('should create one POST endpoint with a particular status code', function (done) {
				self.interfake = new Interfake();
				self.interfake.post('/fluent').status(300);
				self.interfake.listen(3000);

				request.post({ url : 'http://localhost:3000/fluent', json : true }, function (error, response, body) {
					assert.equal(response.statusCode, 300);
					done();
				});
			});
		});
		
		describe('#body()', function () {
			it('should create one POST endpoint with a particular body', function (done) {
				self.interfake = new Interfake();
				self.interfake.post('/fluent').body({ fluency : 'isgreat' });
				self.interfake.listen(3000);

				request.post({ url : 'http://localhost:3000/fluent', json : true }, function (error, response, body) {
					assert.equal(response.statusCode, 200);
					assert.equal(body.fluency, 'isgreat');
					done();
				});
			});
		
			describe('#status()', function () {
				it('should create one POST endpoint with a particular body and particular status', function (done) {
					self.interfake = new Interfake();
					self.interfake.post('/fluent').body({ fluency : 'isgreat' }).status(300);
					self.interfake.listen(3000);

					request.post({ url : 'http://localhost:3000/fluent', json : true }, function (error, response, body) {
						assert.equal(response.statusCode, 300);
						assert.equal(body.fluency, 'isgreat');
						done();
					});
				});
				describe('#delay()', function() {
					it('should create one POST endpoint with a particular body, status and delay', function (done) {
						self.interfake = new Interfake();
						var enoughTimeHasPassed = false;
						var _this = this;
						this.slow(500)
						self.interfake.post('/fluent').body({ fluency : 'isgreat' }).status(300).delay(50);
						self.interfake.listen(3000);
						setTimeout(function() {
							enoughTimeHasPassed = true;
						}, 50)

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
				self.interfake = new Interfake();
				var enoughTimeHasPassed = false;
				var tookTooLong = false;
				var _this = this;

				this.slow(500);

				self.interfake.post('/fluent').delay(50);
				self.interfake.listen(3000);

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
				self.interfake = new Interfake();
				var enoughTimeHasPassed = false;
				var _this = this;
				var tookTooLong = false;
				var timeout;
				this.slow(500);
				self.interfake.post('/fluent').delay('20..50');
				self.interfake.listen(3000);

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
		
		describe('#then', function () {
			describe('#get()', function () {
				it('should create one POST endpoint with a particular body and afterResponse endpoint', function (done) {
					self.interfake = new Interfake();
					self.interfake.post('/fluent').creates.get('/fluent/1');
					self.interfake.listen(3000);

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
					self.interfake = new Interfake();
					var postEndpoint = self.interfake.post('/fluent');
					postEndpoint.creates.get('/fluent/1');
					postEndpoint.creates.put('/fluent/1');
					self.interfake.listen(3000);

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

				describe('#status()', function () {
					it('should create a post-response GET with a particular status', function (done) {
						self.interfake = new Interfake();
						self.interfake.post('/fluent').creates.get('/fluent/1').status(300);
						self.interfake.listen(3000);

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
						self.interfake = new Interfake();
						self.interfake.post('/fluent').creates.get('/fluent/1').body({ fluency : 'is badass' });
						self.interfake.listen(3000);

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
							self.interfake = new Interfake();
							self.interfake.post('/fluent').creates.get('/fluent/1').body({ fluency : 'is badass' }).status(500);
							self.interfake.listen(3000);

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

				describe('#then()', function () {
					it('should create a post-response GET with another post-response GET', function (done) {
						self.interfake = new Interfake();
						self.interfake.post('/fluent').creates.get('/fluent/1').creates.get('/fluent/2');
						self.interfake.listen(3000);

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
