/* eslint-disable camelcase, no-nested-ternary, no-plusplus, no-unused-vars */
const Sermat = require('../../dist/sermat');

// Random test generation //////////////////////////////////////////////////////

function linearCongruential(seed) {
  let i = seed || 0;
  return function random() {
    i = (1664525 * i + 1013904223) % 0xFFFFFFFF;
    return i / 0xFFFFFFFF;
  };
}
const random = linearCongruential(123456789);

function randomInt(n) {
  return Math.floor(random() * (+n));
}

function randomNumber() {
  const number = random() * (2 ** randomInt(100)) * (random() < 0.5 ? +1 : -1);
  return random() < 0.5 ? Math.floor(number) : number;
}

function randomString(size, rangeMin, rangeMax) {
  let string = '';
  for (let i = 0; i < size; i++) {
    string += String.fromCharCode(randomInt(rangeMax - rangeMin + 1) + rangeMin);
  }
  return string;
}

const VALID_IDENTIFIER_STARTS = '$ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz';
const VALID_IDENTIFIER_CONTINUES = `${VALID_IDENTIFIER_STARTS}0123456789`;
function randomIdentifier(size) {
  let string = VALID_IDENTIFIER_STARTS.charAt(randomInt(VALID_IDENTIFIER_STARTS.length));
  for (let i = 1; i < size; i++) {
    string += VALID_IDENTIFIER_CONTINUES.charAt(randomInt(VALID_IDENTIFIER_CONTINUES.length));
  }
  return string;
}

function randomObject(min, max) {
  const obj = {};
  for (let i = 0, len = randomInt(10 * min); i < len; i++) {
    obj[randomIdentifier(randomInt(15))] = randomValue(min, max);
  }
  return obj;
}

function randomArray(min, max) {
  const array = [];
  for (let i = 0, len = randomInt(15 * min); i < len; i++) {
    array.push(randomValue(min, max));
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
  const array = [];
  for (let i = 0; i < size; i++) {
    array.push(randomInt(256));
  }
  return new Uint8Array(array).buffer;
}

// Test cases //////////////////////////////////////////////////////////////////////////////////////

function testSermat_ser(cases) {
  for (let i = 0, len = cases.length; i < len; i++) {
    Sermat.ser(cases[i]);
  }
}

function testSermat_full(cases) {
  let s;
  let m;
  for (let i = 0, len = cases.length; i < len; i++) {
    s = Sermat.ser(cases[i]);
    m = Sermat.mat(s);
  }
}

function testJSON_stringify(cases) {
  for (let i = 0, len = cases.length; i < len; i++) {
    JSON.stringify(cases[i]);
  }
}

function testJSON_full(cases) {
  let s;
  let m;
  for (let i = 0, len = cases.length; i < len; i++) {
    s = JSON.stringify(cases[i]);
    m = JSON.parse(s);
  }
}

function testSermat_clone(cases) {
  let m;
  for (let i = 0, len = cases.length; i < len; i++) {
    Sermat.clone(cases[i]);
  }
}

function testSermat_hashCode(cases) {
  let m;
  for (let i = 0, len = cases.length; i < len; i++) {
    Sermat.hashCode(cases[i]);
  }
}

const NUMBER_TEST_CASES = (function () {
  const cases = [NaN, Infinity, -Infinity, 0, -0];
  for (let count = 1; count <= 1000; count++) {
    cases.push(randomNumber());
  }
  return cases;
}());

const STRING_TEST_CASES = (function () {
  const cases = [''];
  for (let size = 1; size <= 0x2000; size *= 2) {
    for (let i = 0; i < 30; i++) {
      cases.push(randomString(size, 0, 256));
    }
  }
  return cases;
}());

const VALUE_TEST_CASES = (function () {
  const cases = [null, {}];
  for (let min = 0; min < 4; min++) {
    for (let max = min; max < min + 4; max++) {
      for (let i = 0; i < 50; i++) {
        cases.push(randomValue(min, max));
      }
    }
  }
  return cases;
}());

module.exports = {
  name: 'Sermat benchmarks',
  tests: {
    // Serializations.
    'JSON.stringify(boolean)': function () { testJSON_stringify([true, false]); },
    'Sermat.ser(boolean)': function () { testSermat_ser([true, false]); },
    'JSON.stringify(number)': function () { testJSON_stringify(NUMBER_TEST_CASES); },
    'Sermat.ser(number)': function () { testSermat_ser(NUMBER_TEST_CASES); },
    'JSON.stringify(string)': function () { testJSON_stringify(STRING_TEST_CASES); },
    'Sermat.ser(string)': function () { testSermat_ser(STRING_TEST_CASES); },
    'JSON.stringify(value)': function () { testJSON_stringify(VALUE_TEST_CASES); },
    'Sermat.ser(value)': function () { testSermat_ser(VALUE_TEST_CASES); },
    // Full.
    'JSON.parse(JSON.stringify(boolean))': function () { testJSON_full([true, false]); },
    'Sermat.mat(Sermat.ser(boolean))': function () { testSermat_full([true, false]); },
    'JSON.parse(JSON.stringify(number))': function () { testJSON_full(NUMBER_TEST_CASES); },
    'Sermat.mat(Sermat.ser(number))': function () { testSermat_full(NUMBER_TEST_CASES); },
    'JSON.parse(JSON.stringify(string))': function () { testJSON_full(STRING_TEST_CASES); },
    'Sermat.mat(Sermat.ser(string))': function () { testSermat_full(STRING_TEST_CASES); },
    'JSON.parse(JSON.stringify(value))': function () { testJSON_full(VALUE_TEST_CASES); },
    'Sermat.mat(Sermat.ser(value))': function () { testSermat_full(VALUE_TEST_CASES); },
    // Utilities.
    'Sermat.clone(value)': function () { testSermat_clone(VALUE_TEST_CASES); },
    'Sermat.hashCode(value)': function () { testSermat_hashCode(VALUE_TEST_CASES); },
  },
};
