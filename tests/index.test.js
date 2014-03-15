var vows = require('vows');
var assert = require('assert');
var request = require('request');
var exec = require('child_process').exec;

// The thing we're testing
var interfake = require('..');

// Create a Test Suite
vows.describe('new Interfake').addBatch({
	'when creating endpoints with files': {
		topic: function () {
			exec('node ./index.js --file ./tests/testSimpleGet.json');

			request('http://localhost:3000/whattimeisit', function (error, response, body) {
				this.callback(null, response.statusCode);
			}.bind(this));
		},

		'we get 201': function (topic) {
			assert.equal(topic, 201);
		}
	}
}).export(module);