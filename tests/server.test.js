var vows = require('vows');
var assert = require('assert');
var request = require('request');
var exec = require('child_process').exec;

// The thing we're testing
var Interfake = require('..');

// Create a Test Suite
vows.describe('new Interfake').addBatch({
	'when creating only one endpoint programmatically': {
		topic: function () {
			interfake = new Interfake();
			interfake.createRoute({
				request: {
					url: '/endpoint',
					method: 'get'
				},
				response: {
					code: 200,
					body: {}
				}
			});
			interfake.listen(3000);

			request('http://localhost:3000/endpoint', function (error, response, body) {
				this.callback(null, response.statusCode);
			}.bind(this));
		},

		'we get 200': function (topic) {
			assert.equal(topic, 200);
		}
	}
}).export(module);