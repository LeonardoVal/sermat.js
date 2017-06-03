describe("Random tests", function () { "use strict";

// Timing //////////////////////////////////////////////////////////////////////////////////////////

	function testTime(cases, f, name) {
		var count = cases.length,
			time = Date.now();
		for (var i = 0; i < count * 10; i++) {
			try {
				f(cases[i % count]);
			} catch (err) {
				throw new Error(name +" failed for "+ cases[i] +" (with "+ err +")!");
			}
		}
		time = (Date.now() - time) / 5;
		expect(time).toBeGreaterThan(0);
		return time;
	}

// Random case generation //////////////////////////////////////////////////////////////////////////

	function linearCongruential(seed) {
		var i = seed || 0;
		return function random() {
			return (i = (1664525 * i + 1013904223) % 0xFFFFFFFF) / 0xFFFFFFFF;
		};
	}
	var random = linearCongruential(123456789);
	
	function randomInt(n) {
		return Math.floor(random() * (+n));
	}

	function randomNumber() {
		var number = random() * Math.pow(2, randomInt(100)) * (random() < 0.5 ? +1 : -1);
		return random() < 0.5 ? Math.floor(number) : number;
	}

	function randomString(size, rangeMin, rangeMax) {
		var string = '';
		for (var i = 0; i < size; i++) {
			string += String.fromCharCode(randomInt(rangeMax - rangeMin + 1) + rangeMin);
		}
		return string;
	}

	var VALID_IDENTIFIER_STARTS = '$ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz',
		VALID_IDENTIFIER_CONTINUES = VALID_IDENTIFIER_STARTS +'0123456789';
	function randomIdentifier(size) {
		var string = VALID_IDENTIFIER_STARTS.charAt(randomInt(VALID_IDENTIFIER_STARTS.length));
		for (var i = 1; i < size; i++) {
			string += VALID_IDENTIFIER_CONTINUES.charAt(randomInt(VALID_IDENTIFIER_CONTINUES.length));
		}
		return string;
	}
	
	function randomObject(min, max) {
		var obj = {};
		for (var i = 0, len = randomInt(10 * min); i < len; i++) {
			obj[randomIdentifier(randomInt(15))] = randomValue(min, max);
		}
		return obj;
	}
	
	function randomArray(min, max) {
		var array = [];
		for (var i = 0, len = randomInt(15 * min) ; i < len; i++) {
			array.push(randomValue(min, max))
		}
		return array;
	}
	
	function randomValue(min, max) {
		switch (randomInt(max <= 0 ? 4 : min > 0 ? 2 : 6) + (min > 0 ? 4 : 0)) {
			case 1: return random() < 0.5; // boolean
			case 2: return randomNumber(); // number
			case 3: return randomString(10 * Math.max(1, max), 32, 127);
			case 4: return randomObject(min - 1, max - 1);
			case 5: return randomArray(min - 1, max - 1);
			default: return null;
		}
	}
	
	function randomArrayBuffer(size) {
		var array = [];
		for (var i = 0; i < size; i++) {
			array.push(randomInt(256));
		}
		return new Uint8Array(array).buffer;
	}
	
// Tests ///////////////////////////////////////////////////////////////////////////////////////////
	
	it("with strings.", function () { //////////////////////////////////////////////////////////////
		var testCase, serialized, materialized,
			size, i;
		for (size = 1; size <= 0x2000; size *= 2) {
			for (i = 0; i < 30; i++) {
				testCase = randomString(size, 0, 256);
				serialized = Sermat.ser(testCase);
				materialized = Sermat.mat(serialized);
				expect(materialized).toBe(testCase);
			}
		}
	});

	it("with structured values.", function () { ////////////////////////////////////////////////////
		var testCase, serialized, materialized,
			min, max, i;
		for (min = 0; min < 4; min++) {
			for (max = min; max < min + 4; max++) {
				for (i = 0; i < 50; i++) {
					testCase = randomValue(min, max);
					serialized = Sermat.ser(testCase);
					materialized = Sermat.mat(serialized);
					expect(materialized).toEqual(testCase);
				}
			}
		}
	});
}); //// describe "Random tests".
