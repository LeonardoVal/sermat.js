/** Library wrapper and layout.
*/
function __init__() { "use strict";
	
/** Utility functions used in the library.
*/
	function member(obj, id, value, flags) {
		flags = flags|0;
		Object.defineProperty(obj, id, {
			value: value,
			writable: flags & 4, 
			configurable: flags & 2, 
			enumerable: flags & 1
		});
	}

	function ownPropDefault(obj, prop, defaultValue) {
		return obj.hasOwnProperty(prop) ? obj[prop] : defaultValue;		
	}
	
	var _getProto = Object.getPrototypeOf || function _getProto(obj) {
			return obj.__proto__;
		},
		_setProto = Object.setPrototypeOf || function _setProto(obj, proto) {
			obj.__proto__ = proto;
			return obj;
		},
		_assign = Object.assign || function _assign(objTo, objFrom) {
			Object.keys(objFrom).forEach(function (k) {
				objTo[k] = objFrom[k];
			});
			return r;
		};
/** See `__epilogue__.js`.
*/