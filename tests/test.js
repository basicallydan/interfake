var vows = require('vows');
var assert = require('assert');
var request = require('request');

// The thing we're testing
var interfake = require('..');

// Create a Test Suite
vows.describe('new EventedLoop').addBatch({
	'when setting only one interval': {
		topic: function () {
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