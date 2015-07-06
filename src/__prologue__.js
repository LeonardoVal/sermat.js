/** Package wrapper and layout.
*/
(function (global, init) { "use strict"; // Universal Module Definition. See <https://github.com/umdjs/umd>.
	if (typeof define === 'function' && define.amd) {
		define([], init); // AMD module.
	} else if (typeof exports === 'object' && module.exports) {
		module.exports = init(); // CommonJS module.
	} else { // Browser or web worker (probably).
		global.Sermat = init();
	}
})(this, function __init__() { "use strict";

/** Some utility functions used in the library.
*/

function raise(message, properties) {
	if (properties.context) {
		message = properties.context +': '+ message;
	}
	var error = new Error(message);
	for (var id in properties) {
		error[id] = properties[id];
	}
	throw error;
}

function member(obj, id, value) {
	Object.defineProperty(obj, id, {
		value: value,
		writable: false, 
		configurable: false, 
		enumerable: false
	});
}

/** See __epilogue__.js
*/