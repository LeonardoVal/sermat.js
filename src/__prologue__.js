/** Library wrapper and layout.
*/
function __init__() { "use strict";
	/** Some utility functions used in the library.
	*/
	function raise(context, message, data) {
		var error = new Error("Sermat."+ context +': '+ message);
		if (data) {
			error.data = data;
		}
		throw error;
	}

	function member(obj, id, value, flags) {
		flags = flags|0;
		Object.defineProperty(obj, id, {
			value: value,
			writable: flags & 0x4, 
			configurable: flags & 0x2, 
			enumerable: flags & 0x1
		});
	}

	function coalesce(v1, v2) {
		return typeof v1 === 'undefined' ? v2 : v1;		
	}
	
/** See `__epilogue__.js`.
*/