function Deformic(name, enabled) {
	this.enabled = enabled || false;
	this.log = function() {
		if (this.enabled) {
			var args = Array.prototype.concat.call([ '(' + name + ')' ], Array.prototype.slice.call(arguments));
			console.log.apply(console, args);
		}
	}.bind(this);
	this.log.enable = function () {
		console.log('Debugger enabled for', name);
		this.enabled = true;
	}.bind(this);
	return this.log;
}

function debug(name, enabled) {
	return new Deformic(name, enabled);
}

module.exports = debug;