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