define(['sermat'], function (Sermat) {

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
	
	function randomInt(n, negative) {
		return Math.floor((negative ? random() * 2 - 1 : random()) * (+n));
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
	
	function randomObject(min, max, loopChance) {
		var obj = {}, values = [];
		for (var i = 0, len = randomInt(10 * min); i < len; i++) {
			if (i && random() <= loopChance) {
				obj[randomIdentifier(randomInt(15))] = values[randomInt(values.length)];
			} else {
				values.push(obj[randomIdentifier(randomInt(15))] = randomValue(min, max));
			}
		}
		return obj;
	}
	
	function randomArray(min, max, loopChance) {
		var array = [];
		for (var i = 0, len = randomInt(15 * min) ; i < len; i++) {
			array.push(i && random() <= loopChance ? array[randomInt(i)] :
				randomValue(min, max, loopChance));
		}
		return array;
	}
	
	function randomConstruction(min, max, loopChance) {
		switch (randomInt(4)) {
			case 0: return new Date(randomInt(Math.pow(2, 45), true));
			case 1: return new Number(random() * Math.pow(2, 20));
			case 2: return new String(randomString(10 * Math.max(1, max), 32, 127));
			case 3: return new Error(randomIdentifier(randomInt(15)));
		}		
	}
	
	function randomValue(min, max, loopChance) {
		switch (randomInt(max <= 0 ? 4 : min > 0 ? 2 : 6) + (min > 0 ? 4 : 0)) {
			case 1: return random() < 0.5; // boolean
			case 2: return randomNumber(); // number
			case 3: return randomString(10 * Math.max(1, max), 32, 127);
			case 4: return randomObject(min - 1, max - 1, loopChance);
			case 5: return randomArray(min - 1, max - 1, loopChance);
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
	
	function checkUtilities(testCase) {
		var clone = Sermat.clone(testCase);
		expect(clone).toEqual(testCase); // Clones must be equal.
		var hashCode = Sermat.hashCode(testCase);
		expect(Math.floor(hashCode)).toBe(hashCode); // hashCode must be an integer.
		expect(Sermat.hashCode(clone)).toBe(hashCode); // hashCodes for clones must be equal.
	}
	
	it("with number.", function () { ///////////////////////////////////////////////////////////////
		var testCase, serialized, materialized,
			i, clone, hashCode;
		for (i = 0; i < 60; i++) {
			testCase = i % 2 ? randomNumber() : randomInt();
			serialized = Sermat.ser(testCase);
			materialized = Sermat.mat(serialized);
			if (isNaN(testCase)) { // NaN is ... complicated.
				expect(isNaN(materialized)).toBe(true);
				expect(isNaN(Sermat.clone(testCase))).toBe(true);
			} else {
				expect(materialized).toBe(testCase);
				checkUtilities(testCase);
			}
		}
	});
	
	it("with strings.", function () { //////////////////////////////////////////////////////////////
		var testCase, serialized, materialized,
			size, i, clone, hashCode;
		for (size = 1; size <= 0x2000; size *= 2) {
			for (i = 0; i < 30; i++) {
				testCase = randomString(size, 0, 256);
				serialized = Sermat.ser(testCase);
				materialized = Sermat.mat(serialized);
				expect(materialized).toBe(testCase);
				checkUtilities(testCase);
			}
		}
	});

	it("with tree-like structures.", function () { /////////////////////////////////////////////////
		var testCase, serialized, materialized,
			min, max, i, clone, hashCode;
		for (min = 0; min < 4; min++) {
			for (max = min; max < min + 4; max++) {
				for (i = 0; i < 30; i++) {
					testCase = randomValue(min, max, 0);
					serialized = Sermat.ser(testCase);
					materialized = Sermat.mat(serialized);
					expect(materialized).toEqual(testCase);
					checkUtilities(testCase);
				}
			}
		}
	});
	
	it("with DAG-like structures.", function () { //////////////////////////////////////////////////
		var testCount = 0,
			testCase, serialized, materialized,
			min, max, i, clone, hashCode,
			modes = [
				new Sermat({ mode: Sermat.REPEAT_MODE }),
				new Sermat({ mode: Sermat.BINDING_MODE }),
				new Sermat({ mode: Sermat.CIRCULAR_MODE })
			];
		for (min = 2; min < 4; min++) {
			for (max = min; max < min + 4; max++) {
				for (i = 0; i < 30; i++) {
					testCase = randomValue(min, max, 0.5);
					try {
						serialized = Sermat.ser(testCase);
					} catch (err) {
						testCount++;
						expect(err instanceof TypeError).toBe(true);
						modes.forEach(function (sermat) {
							serialized = sermat.ser(testCase);
							materialized = sermat.mat(serialized);
							expect(materialized).toEqual(testCase);
							checkUtilities(testCase);
						});
					}
				}
			}
		}
		expect(testCount).toBeGreaterThan(30); // Unhappy issues of dealing with randomness :-/
	});
}); //// describe "Random tests".

}); //// define