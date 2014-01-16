#! /usr/bin/env node

var program = require('commander');
var interfake = require('./lib/server');
program
	.version('0.0.2')
	.option('-f, --file [file]', 'Load an API from a JSON file [file]')
	.option('-p --port [port]', 'Specify a port for Interfake to listen on', 3000)
	.parse(process.argv);
var file;

if (program.file) {
	interfake.loadFile(program.file);
}

interfake.listen(program.port);