var Interfake = require('..');
var request = require('request'); // Let's use request for this example

var interfake = new Interfake({  });
var file = interfake.loadFile(require.resolve('./load-file-reload-unload.json'), { watch : true });

interfake.listen(3000);

console.log('Try changing the file load-file-reload-unload.json and then make reuqests to it, at http://localhost:3000/whattimeisit');