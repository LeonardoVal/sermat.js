/* eslint-disable quote-props */
/* global describe, it, expect, fail */
import { Sermat } from '../../src/index';
import { addMatchers } from '../jest-utils';

describe('Sermat', () => {
  addMatchers(expect);

  it('core definitions.', () => {
    expect(Sermat).toBeOfType('function');
    const newSermat = new Sermat();
    [
      'include', 'construction',
      'serialize', 'ser', 'materialize', 'mat', 'sermat',
    ].forEach((id) => {
      expect(Sermat[id]).toBeOfType('function');
      expect(newSermat[id]).toBeOfType('function');
    });
  });

  it('with simple values.', () => {
    [Sermat, new Sermat()].forEach((sermat) => {
      expect(true).toSerializeAs('true', sermat);
      expect(false).toSerializeAs('false', sermat);
      expect(null).toSerializeAs('null', sermat);
      expect('true').toMaterializeAs(true, sermat);
      expect('false').toMaterializeAs(false, sermat);
      expect('null').toMaterializeAs(null, sermat);
    });
  });

  it('with undefined values.', () => {
    [Sermat, new Sermat()].forEach((sermat) => {
      expect(() => sermat.ser(undefined))
        .toThrow(new TypeError('Cannot serialize undefined value!'));
      expect(sermat.ser(undefined, { onUndefined: null })).toBe('null');
      expect(sermat.ser(undefined, { onUndefined: 123 })).toBe('123');
      expect(sermat.ser.bind(sermat, undefined, { onUndefined: SyntaxError }))
        .toThrow(new SyntaxError('Cannot serialize undefined value!'));
      expect(sermat.ser(undefined, { onUndefined: () => false }))
        .toBe('false');
    });
  });

  it('with numbers.', () => {
    [Sermat, new Sermat()].forEach((sermat) => {
      let num;
      for (let i = 0; i < 30; i += 1) {
        num = (Math.random() * 2000) - 1000;
        expect(sermat.ser(num)).toBe(`${num}`);
        expect(sermat.mat(`${num}`)).toBe(num);
      }
      ['1e3', '2e-4', '33e2', '-7e-2', '123.45678e9',
        'Infinity', '+Infinity', '-Infinity',
      ].forEach((str) => {
        expect(sermat.mat(str)).toBe(+str);
      });
      expect(Number.isNaN(sermat.mat('NaN'))).toBe(true);
      expect(sermat.ser(Infinity)).toBe('Infinity');
      expect(sermat.ser(-Infinity)).toBe('-Infinity');
      expect(sermat.ser(NaN)).toBe('NaN');
    });
  });

  it('with strings.', () => {
    const checkString = (sermat, literal, text) => {
      try {
        expect(sermat.mat(literal)).toBe(text);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`Materializing ${literal} didn't resulted in ${text}!`);
        throw err;
      }
    };
    [Sermat, new Sermat()].forEach((sermat) => {
      Object.entries({
        '': '""',
        '?': '"?"',
        '123abc': '"123abc"',
        '\\': '"\\\\"',
        '\\\\': '"\\\\\\\\"',
        '"': '"\\""',
        'a"b': '"a\\"b"',
        '\f': '"\\f"',
        '\\f': '"\\\\f"',
        '\n': '"\\n"',
        '\r': '"\\r"',
        '\t': '"\\t"',
        '\v': '"\\v"',
        '\u1234': '"\\u1234"',
      }).forEach(([text, literal]) => {
        checkString(sermat, literal, text);
      });
      //TODO Check fails, like '"\\"'.
    });
  });

  it('with arrays.', () => {
    [Sermat, new Sermat()].forEach((sermat) => {
      const array = [];
      let serialized = sermat.ser(array);
      expect(sermat.ser(sermat.mat(serialized))).toBe(serialized);
      [
        1, 'a', '\n', true, null, [1],
      ].forEach((value) => {
        array.push(value);
        serialized = sermat.ser(array);
        try {
          expect(sermat.ser(sermat.mat(serialized))).toBe(serialized);
        } catch (err) {
          fail(`matser failed for ${serialized} with ${err}`);
        }
      });
    });
  });

  it('with object literals.', () => {
    [{}, { a: 1 }, { a: 1, b: 'x' }, { a: 1, b: 'x', c: true },
      { a: { b: 1 } }, { a: { b: 1 }, c: { d: 'x' } }, { a: { b: { c: null } } },
      { true1: true }, { NaNa: NaN },
      { 0: 0 }, { 0: 0, 1: 1, 2: 2 }, { 0: 0, 1: 1, a: 'a' },
    ].forEach((obj, i) => {
      [Sermat, new Sermat()].forEach((sermat) => {
        const serialized = sermat.ser(obj);
        const materialized = sermat.mat(serialized);
        expect(sermat.ser(materialized)).toBe(serialized);
        for (const k in obj) {
          expect(Object.prototype.hasOwnProperty.call(materialized, k)).toBe(true,
            `Materialized object ${serialized} should have had a member ${k} with value ${obj[k]} (test #${i})!`);
        }
      });
    });
  });

  xit('with backtick literals.', () => {
    const checkValue = (sermat, literal, text) => {
      try {
        expect(sermat.mat(serialized)).toEqual(value);
      } catch (err) {
        fail(`Materializing (${serialized}) failed with ${err}!`);
      }
    };
    ['', 'a', 'abcdef', '"', 'a"b',
      '\\\\\\\\', '\\f', '\\\\f', '\\n', '\\\\n', '\\r', '\\\\r', '\\t', '\\\\t',
      '\\u1234', '\\\\u1234',
      //'`', // '`1', '`1`', '1`1',
    ].forEach((str) => {
      const lit = `\`${str}\``;
      [Sermat, new Sermat()].forEach((sermat) => {
        checkValue(sermat, lit, str);
      });
    });
    [Sermat, new Sermat()].forEach((sermat) => {
      checkValue(sermat, '[``]', ['']);
      checkValue(sermat, '[`a`, `b`]', ['a', 'b']);
      checkValue(sermat, '{x:`123`}', { x: '123' });
      checkValue(sermat, '{x:`one`,y:`two`}', { x: 'one', y: 'two' });
      checkValue(sermat, '[$x=`??`,$x]', ['??', '??']);
    });
  });

  it('with comments.', () => {
    [Sermat, new Sermat()].forEach((sermat) => {
      expect(sermat.mat('1 /* comment */')).toBe(1);
      expect(sermat.mat('/* comment */ true')).toBe(true);
      expect(sermat.mat('/* [ */ null /* ] */')).toBe(null);
      expect(sermat.ser(sermat.mat('[1 /*, 2 */, 3]'))).toBe('[1,3]');
    });
  });

  it('with errors.', () => {
    ['', ' \n\t', '// comment ', '/* comment */', 'TRUE', 'False', 'NuLL',
      '- 1', '1 2', '1 e+2', '+.1', '1.', '-e-1', '1e+',
      "'null'", '"a', '"\\"', '"\\u12"',
      '[', ']', '[,1]', '[1,]', '[,]',
      '{', '}', '{,a:1}', '{a:1,}', '{,}', '{a:,1}', '{a,:1}', '{a::1}', '{:a:1}', '{a:1:}',
    ].forEach((wrongInput) => {
      [Sermat, new Sermat()].forEach((sermat) => {
        try {
          sermat.mat(wrongInput);
          fail(`Parsing \`${wrongInput}\` should have failed!`);
        } catch (err) {
          // Do nothing. This is expected.
        }
      });
    });
  });

  it('with circular references.', () => {
    const obj = {};
    obj.x = obj;
    expect(Sermat.ser.bind(Sermat, obj)).toThrow();
    expect(Sermat.ser.bind(Sermat, obj, { mode: Sermat.REPEAT_MODE })).toThrow();
    expect(Sermat.ser(obj, { mode: Sermat.CIRCULAR_MODE })).toBe('$0={x:$0}');
  });

  it('with repeated objects.', () => {
    const obj = {};
    expect(Sermat.ser.bind(Sermat, [obj, obj])).toThrow();
    expect(Sermat.ser.bind(Sermat, { a: obj, b: obj })).toThrow();

    expect(Sermat.ser([obj, obj], { mode: Sermat.REPEAT_MODE })).toBe('[{},{}]');
    expect(Sermat.ser({ a: obj, b: obj }, { mode: Sermat.REPEAT_MODE })).toBe('{a:{},b:{}}');
  });

  it('with bindings.', () => {
    const obj = { x: 88 };
    let serialized = Sermat.ser([obj, obj], { mode: Sermat.BINDING_MODE });
    let materialized = Sermat.mat(serialized);
    expect(Array.isArray(materialized)).toBe(true);
    expect(materialized[0]).toBe(materialized[1]);
    materialized[0].x = 17;
    expect(materialized[1].x).toBe(17);

    serialized = Sermat.ser({ a: obj, b: obj }, { mode: Sermat.BINDING_MODE });
    materialized = Sermat.mat(serialized);
    expect(materialized.a).toBe(materialized.b);
    materialized.a.x = 93;
    expect(materialized.b.x).toBe(93);

    serialized = Sermat.ser([obj, { a: obj, b: { c: obj } }], { mode: Sermat.BINDING_MODE });
    materialized = Sermat.mat(serialized);
    expect(Array.isArray(materialized)).toBe(true);
    expect(materialized[0]).toBe(materialized[1].a);
    expect(materialized[0]).toBe(materialized[1].b.c);
  });
}); // describe "Sermat".
