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
	jasmine.addMatchers({
		toBeOfType: function () {
			return {
				compare: function(actual, type) {
					switch (typeof type) {
						case 'function': return { pass: actual instanceof type };
						case 'string': return { pass: (typeof actual) === type };
					}
					throw new Error('Cannot compare with type '+ type +'!');
				}
			};
		}
	});
});

