var fs = require('fs');

var onChange = function () {
	console.log('Changed');
	fs.watch(require.resolve('./load-file-reload-unload.json'), onChange);
};

fs.watch(require.resolve('./load-file-reload-unload.json'), onChange);