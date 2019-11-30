/* global describe, it, xit, expect, fail */
import Sermat from '../../src/index';

describe('Random tests', () => {
  // Timing ////////////////////////////////////////////////////////////////////////////////////////

  function testTime(cases, f, name) {
    const count = cases.length;
    let time = Date.now();
    for (let i = 0; i < count * 10; i += 1) {
      try {
        f(cases[i % count]);
      } catch (err) {
        throw new Error(`${name} failed for ${cases[i]} (with ${err})!`);
      }
    }
    time = (Date.now() - time) / 5;
    expect(time).toBeGreaterThan(0);
    return time;
  }

  // Random case generation ////////////////////////////////////////////////////////////////////////

  function linearCongruential(seed) {
    let i = seed || 0;
    return () => {
      i = 1664525 * i + 1013904223;
      return (i % 0xFFFFFFFF) / 0xFFFFFFFF;
    };
  }
  const random = linearCongruential(123456789);

  function randomInt(n, negative) {
    return Math.floor((negative ? random() * 2 - 1 : random()) * (+n));
  }

  function randomNumber() {
    const number = random() * (2 ** randomInt(100)) * (random() < 0.5 ? +1 : -1);
    return random() < 0.5 ? Math.floor(number) : number;
  }

  function randomString(size, rangeMin, rangeMax) {
    let string = '';
    for (let i = 0; i < size; i += 1) {
      string += String.fromCharCode(randomInt(rangeMax - rangeMin + 1) + rangeMin);
    }
    return string;
  }

  const VALID_IDENTIFIER_STARTS = '$ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz';
  const VALID_IDENTIFIER_CONTINUES = `${VALID_IDENTIFIER_STARTS}0123456789`;
  function randomIdentifier(size) {
    let string = VALID_IDENTIFIER_STARTS.charAt(randomInt(VALID_IDENTIFIER_STARTS.length));
    for (let i = 1; i < size; i += 1) {
      string += VALID_IDENTIFIER_CONTINUES.charAt(randomInt(VALID_IDENTIFIER_CONTINUES.length));
    }
    return string;
  }

  function randomObject(min, max, loopChance) {
    const obj = {};
    const values = [];
    const len = randomInt(10 * min);
    for (let i = 0; i < len; i += 1) {
      if (i && random() <= loopChance) {
        obj[randomIdentifier(randomInt(15))] = values[randomInt(values.length)];
      } else {
        values.push(obj[randomIdentifier(randomInt(15))] = randomValue(min, max));
      }
    }
    return obj;
  }

  function randomArray(min, max, loopChance) {
    const array = [];
    const len = randomInt(15 * min);
    for (let i = 0; i < len; i += 1) {
      array.push(i && random() <= loopChance ? array[randomInt(i)]
        : randomValue(min, max, loopChance));
    }
    return array;
  }

  function randomConstruction(min, max, loopChance) {
    switch (randomInt(4)) {
      case 0: return new Date(randomInt(2 ** 45, true));
      case 1: return new Number(random() * (2 ** 20));
      case 2: return new String(randomString(10 * Math.max(1, max), 32, 127));
      default: return new Error(randomIdentifier(randomInt(15)));
    }    
  }

  function randomValue(min, max, loopChance) {
    // eslint-disable-next-line no-nested-ternary
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
    const array = [];
    for (let i = 0; i < size; i += 1) {
      array.push(randomInt(256));
    }
    return new Uint8Array(array).buffer;
  }

  // Tests /////////////////////////////////////////////////////////////////////////////////////////

  function checkUtilities(testCase) {
    const clone = Sermat.clone(testCase);
    expect(clone).toEqual(testCase); // Clones must be equal.
    const hashCode = Sermat.hashCode(testCase);
    expect(Math.floor(hashCode)).toBe(hashCode); // hashCode must be an integer.
    expect(Sermat.hashCode(clone)).toBe(hashCode); // hashCodes for clones must be equal.
  }

  xit('with number.', () => {
    for (let i = 0; i < 60; i += 1) {
      const testCase = i % 2 ? randomNumber() : randomInt();
      const serialized = Sermat.ser(testCase);
      const materialized = Sermat.mat(serialized);
      if (Number.isNaN(testCase)) { // NaN is ... complicated.
        expect(Number.isNaN(materialized)).toBe(true);
        expect(Number.isNaN(Sermat.clone(testCase))).toBe(true);
      } else {
        expect(materialized).toBe(testCase);
        checkUtilities(testCase);
      }
    }
  });

  xit('with strings.', () => {
    for (let size = 1; size <= 0x2000; size *= 2) {
      for (let i = 0; i < 30; i += 1) {
        const testCase = randomString(size, 0, 256);
        const serialized = Sermat.ser(testCase);
        const materialized = Sermat.mat(serialized);
        expect(materialized).toBe(testCase);
        checkUtilities(testCase);
      }
    }
  });

  xit('with tree-like structures.', () => {
    for (let min = 0; min < 4; min += 1) {
      for (let max = min; max < min + 4; max += 1) {
        for (let i = 0; i < 30; i += 1) {
          const testCase = randomValue(min, max, 0);
          const serialized = Sermat.ser(testCase);
          const materialized = Sermat.mat(serialized);
          expect(materialized).toEqual(testCase);
          checkUtilities(testCase);
        }
      }
    }
  });

  xit('with DAG-like structures.', () => {
    let testCount = 0;
    const modes = [
      new Sermat({ mode: Sermat.REPEAT_MODE }),
      new Sermat({ mode: Sermat.BINDING_MODE }),
      new Sermat({ mode: Sermat.CIRCULAR_MODE }),
    ];
    for (let min = 2; min < 4; min += 1) {
      for (let max = min; max < min + 4; max += 1) {
        for (let i = 0; i < 30; i += 1) {
          const testCase = randomValue(min, max, 0.5);
          try {
            Sermat.ser(testCase);
          } catch (err) {
            testCount += 1;
            expect(err instanceof TypeError).toBe(true);
            modes.forEach((sermat) => {
              const serialized = sermat.ser(testCase);
              const materialized = sermat.mat(serialized);
              expect(materialized).toEqual(testCase);
              checkUtilities(testCase);
            });
          }
        }
      }
    }
    expect(testCount).toBeGreaterThan(30); // Unhappy issues of dealing with randomness :-/
  });
}); // describe "Random tests".
