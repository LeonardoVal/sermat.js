import { Sermat } from '../../src/index';
import {
  randomInt, randomNumber, randomString, randomValue,
} from '../test-utils';

describe('Random tests', () => {
  function checkUtilities(testCase) {
    const clone = Sermat.clone(testCase);
    expect(clone).toEqual(testCase); // Clones must be equal.
    const hashCode = Sermat.hashCode(testCase);
    expect(Math.floor(hashCode)).toBe(hashCode); // hashCode must be an integer.
    expect(Sermat.hashCode(clone)).toBe(hashCode); // hashCodes for clones must be equal.
  }

  it('with number.', () => {
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

  it('with strings.', () => {
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

  it('with tree-like structures.', () => {
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
          expect(() => Sermat.ser(testCase)).toThrow(TypeError);
          testCount += 1;
          modes.forEach((sermat) => {
            const serialized = sermat.ser(testCase);
            const materialized = sermat.mat(serialized);
            expect(materialized).toEqual(testCase);
            checkUtilities(testCase);
          });
        }
      }
    }
    expect(testCount).toBeGreaterThan(30); // Unhappy issues of dealing with randomness :-/
  });
}); // describe "Random tests".
