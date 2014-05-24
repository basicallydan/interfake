#! /usr/bin/env node

var program = require('commander');
var Interfake = require('./lib/server');
var packageInfo = require('./package.json');
var fs = require('fs');
var PEG = require('pegjs');
var grammar, parser, endpoints;
program
	.version(packageInfo.version)
	.option('-f, --file [file]', 'Load an API from a JSON file [file]')
	.option('-p --port [port]', 'Specify a port for Interfake to listen on', 3000)
	.option('-d --debug', 'Debug mode, turns on console messages')
	.parse(process.argv);

// console.log(program.args[0]);

var opts = {
	debug: false
};

if (program.debug) {
	opts.debug = true;
}

var interfake = new Interfake(opts);

if (program.file) {
	interfake.loadFile(program.file);
}

function addFluentEndpoint(endpoint) {
	var e = interfake[endpoint.method](endpoint.path).status(endpoint.status);
	if (endpoint.creates) {
		endpoint.creates.forEach(function (c) {
			e.creates[c.method](c.path).status(c.status);
		});
	}
}

if (['get', 'put', 'post', 'del'].indexOf(program.args[0]) !== -1) {
	// Fluent command line mode
	// console.log('Fluent command line mode!');
	// This should be refined using http://pegjs.majda.cz/online
	grammar = fs.readFileSync('./lib/grammar.pegjs') + '';
	parser = PEG.buildParser(grammar);
	endpoints = parser.parse(program.args.join(' '));
	endpoints.forEach(addFluentEndpoint);
}

interfake.listen(program.port);