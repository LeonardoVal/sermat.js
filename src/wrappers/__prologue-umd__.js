/** Package wrapper and layout using [_Universal Module Definition_ a.k.a. UMD](https://github.com/umdjs/umd).
*/
(function (global, init) { "use strict";
	if (typeof define === 'function' && define.amd) {
		define([], init); // AMD module.
	} else if (typeof exports === 'object' && module.exports) {
		module.exports = init(); // CommonJS module.
	} else {
		global.Sermat = init(); // Browser.
	}
})(this, function __init__() { "use strict";
/** See `__epilogue-umd__.js`.
*/