describe("Sermat binary", function () { "use strict";
	var PRIME_BYTES = [2,3,5,7,11,13,17,19,23,29,31,37,41,43,47,53,59,61,67,71,73,79,83,89,97,101,
		103,107,109,113,127,131,137,139,149,151,157,163,167,173,179,181,191,193,197,199,211,223];

	it("encode85 and decode85.", function () { /////////////////////////////////////////////////////
		var sermat = new Sermat();
		expect(typeof sermat.encode85).toBe('function');
		expect(typeof sermat.decode85).toBe('function');
		
		var bytes, bytes2;
		for (var i = 0, len = PRIME_BYTES.length; i < len; i++) {
			bytes = PRIME_BYTES.slice(0, i);
			bytes2 = new Uint8Array(sermat.decode85(sermat.encode85((new Uint8Array(bytes).buffer))));
			for (var j = 0; j < i; j++) {
				expect(bytes2[j]).toBe(bytes[j]);
			}
		}
	});	
}); //// describe "Sermat".