"use strict";

// Polyfill (particularly for PhantomJS) ///////////////////////////////////////////////////////////

// See <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/bind>
if (!Function.prototype.bind) { 
	Function.prototype.bind = function bind(oThis) {
		if (typeof this !== 'function') {
			throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable');
		}
		var aArgs   = Array.prototype.slice.call(arguments, 1),
			fToBind = this,
			fNOP    = function() {},
			fBound  = function() {
				return fToBind.apply(this instanceof fNOP ? this 
					: oThis, aArgs.concat(Array.prototype.slice.call(arguments))
				);
			};
		fNOP.prototype = this.prototype;
		fBound.prototype = new fNOP();
		return fBound;
	};
}

// Testing environment extensions and custom definitions. //////////////////////////////////////////

beforeEach(function() { // Add custom matchers.
	this.addMatchers({
		toBeOfType: function(type) {
			switch (typeof type) {
				case 'function': return this.actual instanceof type;
				case 'string': return typeof this.actual === type;
				default: throw new Error('Unknown type '+ type +'!');
			}
		}
	});
});

