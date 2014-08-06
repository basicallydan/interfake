var util = require('core-util-is');
var url = require('url');
var merge = require('merge');

function Route(descriptor, o) {
	o = o || { debug: false };
	this.debug = require('./debug')('interfake-route', o.debug);
	this.request = descriptor.request;
	this.response = descriptor.response;
	this.afterResponse = descriptor.afterResponse;
	this.o = o;

	if (!this.response) {
		this.response = {
			delay: 0,
			status: 200,
			body: {},
			headers: {}
		};
	} else {
		this.response = merge(this.response, {
			delay: 0,
			status: 200,
			body: {},
			headers: {}
		});
	}

	this.response.query = {};

	var path = url.parse(this.request.url, true);

	this.request.url = path.pathname;

	this.setQueryStrings(path.query);

	if (this.afterResponse && util.isArray(this.afterResponse.endpoints)) {
		this.afterResponse.endpoints = (this.afterResponse.endpoints || []).map(function (descriptor) {
			return new Route(descriptor);
		});
	} else {
		this.afterResponse = {
			endpoints: []
		};
	}

	this.debug('Setting up ' + this.request.method + ' ' + this.request.url + ' to return ' + this.response.code + ' with a body of length ' + JSON.stringify(this.response.body).length + ' and ' + this.afterResponse.endpoints.length + ' after-responses');
}

Route.prototype.setQueryStrings = function (query) {
	this.request.query = merge(this.request.query, query || {});
};

Route.prototype.setStatusCode = function (statusCode) {
	this.response.status = statusCode;
};

Route.prototype.setResponseBody = function (body) {
	this.response.body = body;
};

Route.prototype.setResponseDelay = function (delay) {
	this.response.delay = delay;
};

Route.prototype.setResponseHeaders = function (headers) {
	this.response.headers = headers;
};

Route.prototype.addAfterResponse = function (descriptors) {
	var newRoute = new Route(descriptors, this.o);
	this.afterResponse.endpoints.push(newRoute);
	return newRoute;
};

Route.prototype.creates = function (routeDescriptor) {
	var newRoute = new Route(routeDescriptor, this.o);
	if (!this.afterResponse) {
		this.afterResponse = {};
	}
	if (!this.afterResponse.endpoints) {
		this.afterResponse.endpoints = [];
	}
	this.afterResponse.endpoints.push(newRoute);
	return newRoute;
};

Route.prototype.simpleHash = function () {
	var routeHash = this.request.method.toUpperCase() + ' ' + this.request.url;

	this.debug('Simple lookup hash key will be: ' + routeHash);
	return routeHash;
};

Route.prototype.queryKeys = function () {
	var queryKeys = Object.keys(this.request.query || {}).filter(function (key) {
		return key !== 'callback';
	});
	return queryKeys;
};

Route.prototype.hash = function () {
	var routeHash = this.request.method.toUpperCase() + ' ' + this.request.url;
	var fullQuerystring, querystringArray = [];
	if (this.request.query) {
		var queryKeys = this.queryKeys();

		if (queryKeys.length) {
			this.debug('Query keys are', queryKeys);

			fullQuerystring = this.request.query;
			delete fullQuerystring.callback;

			queryKeys.sort().forEach(function (k) {
				querystringArray.push(k + '=' + fullQuerystring[k]);
			});

			this.debug('Full query string items are', querystringArray);

			routeHash += '?' + querystringArray.join('&');
			this.debug('Final route is', routeHash);
		}
	}

	this.debug('Lookup hash key will be: ' + routeHash);
	return routeHash;
};

Route.prototype.compare = function (route) {

	this.debug('Comparing', this.request.query, 'and', route.request.query);

	var queryKeys;
	var routeQueryKeys;
	var same = true;

	this.debug('First comparing', route.simpleHash(), 'and', this.simpleHash());
	if (route.simpleHash() !== this.simpleHash()) {
		return false;
	}

	queryKeys = this.queryKeys();
	routeQueryKeys = route.queryKeys();

	if (queryKeys.length !== routeQueryKeys.length) {
		return false;
	}

	queryKeys.forEach(function (key) {
		var routeQueryValue = route.request.query[key];
		if (util.isRegExp(routeQueryValue)) {
			same = same && routeQueryValue.test(this.request.query[key]);
		} else {
			// Not checking type because 1 and '1' are the same in this case
			same = same && this.request.query[key] == routeQueryValue;
		}
	}.bind(this));

	return same;
};

module.exports = Route;
