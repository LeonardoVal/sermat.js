/** Random test case generation.
*/
export function linearCongruential(seed) {
  let i = seed || 0;
  return () => {
    i = 1664525 * i + 1013904223;
    return (i % 0xFFFFFFFF) / 0xFFFFFFFF;
  };
}

export const random = linearCongruential(123456789);

export function randomInt(n, negative) {
  return Math.floor((negative ? random() * 2 - 1 : random()) * (+n));
}

export function randomNumber() {
  const number = random() * (2 ** randomInt(100)) * (random() < 0.5 ? +1 : -1);
  return random() < 0.5 ? Math.floor(number) : number;
}

export function randomString(size, rangeMin, rangeMax) {
  let string = '';
  for (let i = 0; i < size; i += 1) {
    string += String.fromCharCode(randomInt(rangeMax - rangeMin + 1) + rangeMin);
  }
  return string;
}

export const VALID_IDENTIFIER_STARTS = '$ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz';

export const VALID_IDENTIFIER_CONTINUES = `${VALID_IDENTIFIER_STARTS}0123456789`;

export function randomIdentifier(size) {
  let string = VALID_IDENTIFIER_STARTS.charAt(randomInt(VALID_IDENTIFIER_STARTS.length));
  for (let i = 1; i < size; i += 1) {
    string += VALID_IDENTIFIER_CONTINUES.charAt(randomInt(VALID_IDENTIFIER_CONTINUES.length));
  }
  return string;
}

export function randomObject(min, max, loopChance) {
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

export function randomArray(min, max, loopChance) {
  const array = [];
  const len = randomInt(15 * min);
  for (let i = 0; i < len; i += 1) {
    array.push(i && random() <= loopChance ? array[randomInt(i)]
      : randomValue(min, max, loopChance));
  }
  return array;
}

// eslint-disable-next-line no-unused-vars
export function randomConstruction(_min, _max, _loopChance) {
  switch (randomInt(4)) {
    case 0: return new Date(randomInt(2 ** 45, true));
    // case 1: return new Number(random() * (2 ** 20));
    // case 2: return new String(randomString(10 * Math.max(1, max), 32, 127));
    default: return new Error(randomIdentifier(randomInt(15)));
  }
}

export function randomValue(min, max, loopChance) {
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

export function randomArrayBuffer(size) {
  const array = [];
  for (let i = 0; i < size; i += 1) {
    array.push(randomInt(256));
  }
  return new Uint8Array(array).buffer;
}

export function testTime(cases, f, name) {
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
