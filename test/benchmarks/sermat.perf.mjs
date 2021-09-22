/* eslint-disable camelcase, no-nested-ternary, no-plusplus, no-unused-vars */
/* import {
  randomNumber, randomString, randomValue,
} from '../test-utils'; */
import { performance } from 'perf_hooks';
// eslint-disable-next-line import/extensions
import { Sermat } from '../../dist/index.js';

// Performance /////////////////////////////////////////////////////////////////

class Performance {
  constructor() {
    this.entries = new Map();
  }

  log(mark, startStamp, endStamp) {
    const { entries } = this;
    let entry;
    if (entries.has(mark)) {
      entry = entries.get(mark);
    } else {
      entry = { mark, min: NaN, max: NaN, sum: 0, count: 0 };
      entries.set(mark, entry);
    }
    const duration = endStamp - startStamp;
    entry.min = entry.count > 0 ? Math.min(entry.min, duration) : duration;
    entry.max = entry.count > 0 ? Math.max(entry.max, duration) : duration;
    entry.sum += duration;
    entry.count += 1;
    return entry;
  }

  measure(tests) {
    let startStamp = performance.now();
    for (const { mark } of tests) {
      const endStamp = performance.now();
      this.log(mark, startStamp, endStamp);
      startStamp = performance.now();
    }
  }
}

// Test cases //////////////////////////////////////////////////////////////////

function* testSerialization(mark, cases) {
  for (const c of cases) {
    const json = JSON.stringify(c);
    yield { mark: `JSON.stringify(${mark})`, data: json };
    const sermat = Sermat.ser(c);
    yield { mark: `Sermat.ser(${mark})`, data: sermat };
  }
}

function main() {
  const perf = new Performance();
  perf.measure(testSerialization('boolean', [false, true]));
  // eslint-disable-next-line no-console
  console.log(perf.entries);
}
main();

/*
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

const NUMBER_TEST_CASES = (() => {
  const cases = [NaN, Infinity, -Infinity, 0, -0];
  for (let count = 1; count <= 1000; count++) {
    cases.push(randomNumber());
  }
  return cases;
})();

const STRING_TEST_CASES = (() => {
  const cases = [''];
  for (let size = 1; size <= 0x2000; size *= 2) {
    for (let i = 0; i < 30; i++) {
      cases.push(randomString(size, 0, 256));
    }
  }
  return cases;
})();

const VALUE_TEST_CASES = (() => {
  const cases = [null, {}];
  for (let min = 0; min < 4; min++) {
    for (let max = min; max < min + 4; max++) {
      for (let i = 0; i < 50; i++) {
        cases.push(randomValue(min, max));
      }
    }
  }
  return cases;
})();

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
*/
