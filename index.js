#! /usr/bin/env node

var program = require('commander');
var Interfake = require('./lib/server');
var packageInfo = require('./package.json');
var path = require('path');

program
	.version(packageInfo.version)
	.option('-f, --file [file]', 'Load an API from a JSON file [file]')
	.option('-p --port [port]', 'Specify a port for Interfake to listen on', 3000)
	.option('-d --debug', 'Debug mode, turns on console messages')
	.option('-w --watch', 'If a loaded file changes, it will be re-loaded')
	.option('-m --middlewares', 'Paths to middleware files')
	.parse(process.argv);

// console.log(program.args[0]);

var opts = {
	debug: false
};

if (program.debug) {
	opts.debug = true;
}

if (program.watch) {
	opts.watch = true;
}

if (program.middlewares) {
	var middlewares = program.middlewares.map(function (middleware) {
		console.log('Loading middleware:', middleware);

		return require(path.resolve(middleware));
	});

	if (middlewares.length) {
        opts.middlewares = middlewares;
	}
}

var interfake = new Interfake(opts);

if (program.file) {
	interfake.loadFile(program.file, opts);
}

interfake.listen(program.port);