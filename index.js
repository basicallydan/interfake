#! /usr/bin/env node

var program = require('commander');
var Interfake = require('./lib/server');
var packageInfo = require('./package.json');
program
	.version(packageInfo.version)
	.option('-f, --file [file]', 'Load an API from a JSON file [file]')
	.option('-p --port [port]', 'Specify a port for Interfake to listen on', 3000)
	.option('-d --debug', 'Debug mode, turns on console messages')
	.parse(process.argv);

var opts = {
	debug: false
};

if (program.debug) {
	opts.debug = true;
	console.log('Debugging is ON');
}

var interfake = new Interfake(opts);

if (program.file) {
	interfake.loadFile(program.file);
}

interfake.listen(program.port, function () { console.log('Listening'); });