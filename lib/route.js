var util = require('core-util-is');
var url = require('url');
var merge = require('merge');
var deepmerge = require('deepmerge');

function Route(descriptor, o) {
	var path;
	o = o || { debug: false };
	this.debug = require('./debug')('interfake-route', o.debug);
	this.request = descriptor.request;
	this.response = descriptor.response;
	this.afterResponse = descriptor.afterResponse;
	this.o = o;

	if (!this.response) {
		this.response = {
			delay: 0,
			code: 200,
			body: {},
			echo: false,
			headers: {}
		};
	} else {
		this.response = merge({
			delay: 0,
			code: 200,
			body: {},
			echo: false,
			headers: {}
		}, this.response);
	}

	this.response.query = {};

	if (!util.isRegExp(this.request.url) && util.isObject(this.request.url) && this.request.url.regexp) {
		this.debug('RegExp specified for URL', this.request.url.pattern);
		this.request.url = new RegExp(this.request.url.pattern);
	}

	if (util.isString(this.request.url)) {
		path = url.parse(this.request.url, true);
		this.request.url = path.pathname;
		this.setQueryStrings(path.query);
	}

	if (this.afterResponse && util.isArray(this.afterResponse.endpoints)) {
		this.afterResponse.endpoints = (this.afterResponse.endpoints || []).map(function (descriptor) {
			return new Route(descriptor);
		});
	}

	if (this.afterResponse && util.isArray(this.afterResponse.modifications)) {
		this.afterResponse.modifications = (this.afterResponse.modifications || []).map(function (descriptor) {
			return {
				routeDescriptor: descriptor.request,
				body: descriptor.response.body,
				echo: descriptor.response.echo,
				code: descriptor.response.code,
				delay: descriptor.response.delay,
				responseHeaders: descriptor.response.headers
			};
		}.bind(this));
	}

	if (!this.afterResponse) {
		this.afterResponse = {
			endpoints: [],
			modifications: []
		};
	}

	if (!this.afterResponse.endpoints) {
		this.afterResponse.endpoints = [];
	}

	if (!this.afterResponse.modifications) {
		this.afterResponse.modifications = [];
	}


	this.debug('Creating route', this);
	this.debug('Creating route: ' + this.request.method + ' ' + this.request.url + ' to return ' + this.response.code + ' with a body of length ' + JSON.stringify(this.response.body).length + ' and ' + this.afterResponse.endpoints.length + ' after-responses');
}

Route.prototype.setQueryStrings = function (query) {
	this.request.query = merge(this.request.query, query || {});
};

Route.prototype.setStatusCode = function (statusCode) {
	this.debug('Now returning', statusCode);
	this.response.code = statusCode;
};

Route.prototype.setResponseBody = function (body) {
	this.debug('Now returning body of length', JSON.stringify(body).length);
	this.response.body = body;
};

Route.prototype.setProxyURL = function (url) {
	this.debug('The route is now a proxy of', this.request.method, url);
	this.response.proxy = url;
};

Route.prototype.mergeResponseBody = function (body) {
	this.debug('Merging', body, 'into', this.response.body);
	this.response.body = deepmerge(this.response.body, body, { alwaysPush: true });
	this.debug('Response body is now', this.response.body);
};

Route.prototype.mergeResponseHeaders = function (headers) {
	this.debug('Merging', headers, 'into', this.response.headers);
	this.response.headers = deepmerge(this.response.headers, headers);
	this.debug('Response headers is now', this.response.headers);
};

Route.prototype.setResponseDelay = function (delay) {
	this.debug('New delay is', delay);
	this.response.delay = delay;
};

Route.prototype.setResponseHeaders = function (headers) {
	this.debug('Setting response headers to', headers);
	this.response.headers = headers;
};

Route.prototype.setEcho = function (echo) {
	this.response.echo = echo;
};

Route.prototype.addAfterResponse = function (descriptors) {
	var newRoute = new Route(descriptors, this.o);
	this.debug('Adding after response', newRoute.hash());
	this.afterResponse.endpoints.push(newRoute);
	return newRoute;
};

Route.prototype.addModification = function (modifyDescriptor) {
	if (!this.afterResponse.modifications) {
		this.afterResponse.modifications = [];
	}

	this.afterResponse.modifications.push(modifyDescriptor);
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

Route.prototype.hasRegexpURL = function () {
	return util.isRegExp(this.request.url);
};

Route.prototype.simpleHash = function () {
	var routeHash = this.request.method.toUpperCase() + ' ' + this.request.url;
	return routeHash;
};

Route.prototype.queryKeys = function () {
	var queryKeys = Object.keys(this.request.query || {}).filter(function (key) {
		return key !== 'callback';
	});
	return queryKeys;
};

Route.prototype.hash = function () {
	var routeHash;
	if (util.isString(this.request.url)) {
		routeHash = this.request.method.toUpperCase() + ' ' + this.request.url;
	} else {
		routeHash = new RegExp(this.request.method.toUpperCase() + ' ' + this.request.url);
	}
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
	var queryKeys;
	var routeQueryKeys;
	var same = true;

	if (this.hasRegexpURL()) {
		this.debug('1. Testing', route.simpleHash(), 'matches', this.simpleHash());
		return this.request.url.test(route.request.url) && this.request.method.toLowerCase() === route.request.method.toLowerCase();
	} else if (route.simpleHash() !== this.simpleHash()) {
		this.debug('1. Comparing', route.simpleHash(), 'and', this.simpleHash());
		this.debug('No match');
		return false;
	}

	this.debug('2. Testing', route.request.url, 'matches', this.request.url);
	if (util.isRegExp(this.request.url)) {
		if (!this.request.url.test(route.request.url)) {
			this.debug('No match.');
			return false;
		}
	}

	queryKeys = this.queryKeys();
	routeQueryKeys = route.queryKeys();

	this.debug('3. Comparing', queryKeys.length, 'and', routeQueryKeys.length);
	if (queryKeys.length !== routeQueryKeys.length) {
		this.debug('No match');
		return false;
	}

	this.debug('4. Comparing', this.request.query, 'and', route.request.query);
	queryKeys.forEach(function (key) {
		var routeQueryValue = route.request.query[key];
		if (util.isRegExp(this.request.query[key])) {
			this.debug('4b. Testing', routeQueryValue, 'matches', this.request.query[key]);
			same = same && this.request.query[key].test(routeQueryValue);
			this.debug('4c. Result is', same);
		} else if (util.isArray(this.request.query[key])) {
			this.debug('4b. Testing', routeQueryValue, 'matches', this.request.query[key]);
			same = same && JSON.stringify(this.request.query[key].sort()) ===  JSON.stringify(routeQueryValue.sort());
			this.debug('4c. Result is', same);
		} else {
			// Not checking type because 1 and '1' are the same in this case
			this.debug('4b. Comparing', this.request.query[key], 'and', routeQueryValue);
			same = same && this.request.query[key] == routeQueryValue;
			this.debug('4c. Result is', same);
		}
	}.bind(this));

	return same;
};

module.exports = Route;
