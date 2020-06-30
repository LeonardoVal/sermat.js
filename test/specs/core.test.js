/* global describe, it, expect, fail */
import Sermat from '../../src/index';

describe('Sermat', () => {
  it('core definitions.', () => {
    expect(Sermat).toBeOfType('function');
    const newSermat = new Sermat();
    ['serialize', 'ser', 'materialize', 'mat', 'sermat'].forEach((id) => {
      expect(Sermat[id]).toBeOfType('function');
      expect(newSermat[id]).toBeOfType('function');
    });
    // expect(Sermat.identifier).toBeOfType('function');
    // expect(Sermat.register).toBeOfType('function');
  });

  it('with simple values.', () => {
    [Sermat, new Sermat()].forEach((sermat) => {
      expect(sermat.serialize(true)).toBe('true');
      expect(sermat.serialize(false)).toBe('false');
      expect(sermat.serialize(null)).toBe('null');
      expect(sermat.materialize('true')).toBe(true);
      expect(sermat.materialize('false')).toBe(false);
      expect(sermat.materialize('null')).toBe(null);
    });
  });

  xit('with undefined values.', () => {
    [Sermat, new Sermat()].forEach((sermat) => {
      expect(() => sermat.serialize(undefined))
        .toThrow(new TypeError('Cannot serialize undefined value!'));
      expect(sermat.serialize(undefined, { onUndefined: null })).toBe('null');
      expect(sermat.serialize(undefined, { onUndefined: 123 })).toBe('123');
      expect(sermat.serialize.bind(sermat, undefined, { onUndefined: SyntaxError }))
        .toThrow(new SyntaxError('Cannot serialize undefined value!'));
      expect(sermat.serialize(undefined, { onUndefined: () => false }))
        .toBe('false');
    });
  });

  it('with numbers.', () => {
    [Sermat, new Sermat()].forEach((sermat) => {
      let num;
      for (let i = 0; i < 30; i += 1) {
        num = (Math.random() * 2000) - 1000;
        expect(sermat.serialize(num)).toBe(`${num}`);
        expect(sermat.materialize(`${num}`)).toBe(num);
      }
      ['1e3', '2e-4', '33e2', '-7e-2', '123.45678e9',
        'Infinity', '+Infinity', '-Infinity',
      ].forEach((str) => {
        expect(sermat.materialize(str)).toBe(+str);
      });
      expect(Number.isNaN(sermat.materialize('NaN'))).toBe(true);
      expect(sermat.serialize(Infinity)).toBe('Infinity');
      expect(sermat.serialize(-Infinity)).toBe('-Infinity');
      expect(sermat.serialize(NaN)).toBe('NaN');
    });
  });

  xit('with strings.', () => {
    const checkString = (sermat, text) => {
      const serialized = sermat.serialize(text);
      try {
        expect(sermat.materialize(serialized)).toBe(text);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`Materializing string ${serialized} (${
          text.split('').map((chr) => chr.charCodeAt(0)).join(',')}) failed!`);
        throw err;
      }
    };
    [Sermat, new Sermat()].forEach((sermat) => {
      ['', 'a', 'abcdef', '"', 'a"b',
        '\\', '\\\\', '\f', '\\f', '\n', '\\n', '\r', '\\r', '\t', '\\t', '\v', '\\v', '\u1234',
      ].forEach((str) => {
        checkString(sermat, str);
      });
      for (let i = 0; i < 1024; i += 1) {
        checkString(sermat, String.fromCharCode(i));
      }
    });
  });

  it('with arrays.', () => {
    [Sermat, new Sermat()].forEach((sermat) => {
      const array = [];
      let serialized = sermat.serialize(array);
      expect(sermat.serialize(sermat.materialize(serialized))).toBe(serialized);
      [
        1, 'a', '\n', true, null, [1],
      ].forEach((value) => {
        array.push(value);
        serialized = sermat.serialize(array);
        try {
          expect(sermat.serialize(sermat.materialize(serialized))).toBe(serialized);
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
        const serialized = sermat.serialize(obj);
        const materialized = sermat.materialize(serialized);
        expect(sermat.serialize(materialized)).toBe(serialized);
        for (const k in obj) {
          expect(Object.prototype.hasOwnProperty.call(materialized, k)).toBe(true,
            `Materialized object ${serialized} should have had a member ${k} with value ${obj[k]} (test #${i})!`);
        }
      });
    });
  });

  xit('with backtick literals.', () => {
    const checkValue = (sermat, serialized, value) => {
      try {
        expect(sermat.materialize(serialized)).toEqual(value);
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
      expect(sermat.materialize('1 /* comment */')).toBe(1);
      expect(sermat.materialize('/* comment */ true')).toBe(true);
      expect(sermat.materialize('/* [ */ null /* ] */')).toBe(null);
      expect(sermat.serialize(sermat.materialize('[1 /*, 2 */, 3]'))).toBe('[1,3]');
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
          sermat.materialize(wrongInput);
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
    expect(Sermat.serialize.bind(Sermat, obj)).toThrow();
    expect(Sermat.serialize.bind(Sermat, obj, { mode: Sermat.REPEAT_MODE })).toThrow();
    expect(Sermat.serialize(obj, { mode: Sermat.CIRCULAR_MODE })).toBe('$0={x:$0}');
  });

  it('with repeated objects.', () => {
    const obj = {};
    expect(Sermat.serialize.bind(Sermat, [obj, obj])).toThrow();
    expect(Sermat.serialize.bind(Sermat, { a: obj, b: obj })).toThrow();

    expect(Sermat.serialize([obj, obj], { mode: Sermat.REPEAT_MODE })).toBe('[{},{}]');
    expect(Sermat.serialize({ a: obj, b: obj }, { mode: Sermat.REPEAT_MODE })).toBe('{a:{},b:{}}');
  });

  it('with bindings.', () => {
    const obj = { x: 88 };
    let serialized = Sermat.serialize([obj, obj], { mode: Sermat.BINDING_MODE });
    let materialized = Sermat.materialize(serialized);
    expect(Array.isArray(materialized)).toBe(true);
    expect(materialized[0]).toBe(materialized[1]);
    materialized[0].x = 17;
    expect(materialized[1].x).toBe(17);

    serialized = Sermat.serialize({ a: obj, b: obj }, { mode: Sermat.BINDING_MODE });
    materialized = Sermat.materialize(serialized);
    expect(materialized.a).toBe(materialized.b);
    materialized.a.x = 93;
    expect(materialized.b.x).toBe(93);

    serialized = Sermat.serialize([obj, { a: obj, b: { c: obj } }], { mode: Sermat.BINDING_MODE });
    materialized = Sermat.materialize(serialized);
    expect(Array.isArray(materialized)).toBe(true);
    expect(materialized[0]).toBe(materialized[1].a);
    expect(materialized[0]).toBe(materialized[1].b.c);
  });
}); // describe "Sermat".
