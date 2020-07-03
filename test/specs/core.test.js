/* global describe, it, expect, fail */
import { Sermat } from '../../src/index';
import { addMatchers } from '../jest-utils';

describe('Sermat', () => {
  addMatchers(expect);

  function checkSermat(value, text, sermat, modifiers) {
    expect(value).toSerializeAs(text, sermat, modifiers);
    expect(text).toMaterializeAs(value, sermat, modifiers);
  }

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
      checkSermat(true, 'true', sermat);
      checkSermat(false, 'false', sermat);
      checkSermat(null, 'null', sermat);
    });
  });

  it('with undefined values.', () => {
    [Sermat, new Sermat()].forEach((sermat) => {
      expect(() => sermat.ser(undefined))
        .toThrow(new TypeError('Cannot serialize undefined value!'));
      expect(undefined).toSerializeAs('null', sermat, { onUndefined: null });
      expect(undefined).toSerializeAs('123', sermat, { onUndefined: 123 });
      expect(undefined).toSerializeAs('false', sermat, { onUndefined: () => false });
      expect(sermat.ser.bind(sermat, undefined, { onUndefined: SyntaxError }))
        .toThrow(new SyntaxError('Cannot serialize undefined value!'));
    });
  });

  it('with numbers.', () => {
    [Sermat, new Sermat()].forEach((sermat) => {
      [
        0, 1, -1, 0.5, 123, 123.4, -123, -123.4,
        NaN, Infinity, -Infinity,
      ].forEach((num) => {
        checkSermat(num, `${num}`, sermat);
      });
      [
        '1e3', '2e-4', '33e2', '-7e-2', '123.45678e9',
        '+Infinity',
      ].forEach((str) => {
        expect(str).toMaterializeAs(+str, sermat);
      });
    });
  });

  it('with strings.', () => {
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
        // eslint-disable-next-line quote-props
        '\u1234': '"\\u1234"',
      }).forEach(([text, literal]) => {
        expect(literal).toMaterializeAs(text, sermat);
      });
      //TODO Check fails, like '"\\"'.
    });
  });

  it('with arrays.', () => {
    [Sermat, new Sermat()].forEach((sermat) => {
      const array = [];
      let serialized = sermat.ser(array);
      expect(serialized).toMaterializeAs(array, sermat);
      [
        1, 'a', '\n', true, null, [1],
      ].forEach((value) => {
        array.push(value);
        serialized = sermat.ser(array);
        expect(serialized).toMaterializeAs(array, sermat);
        // Superflous ending commas.
        expect(serialized.replace(']', ',]')).toMaterializeAs(array, sermat);
      });
    });
  });

  it('with object literals.', () => {
    [Sermat, new Sermat()].forEach((sermat) => {
      let serialized = sermat.ser({});
      expect(serialized).toMaterializeAs({}, sermat);
      [
        { a: 1 },
        { a: 1, b: 'x' },
        { a: 1, b: 'x', c: true },
        { a: { b: 1 } },
        { a: { b: 1 }, c: { d: 'x' } },
        { a: { b: { c: null } } },
        { true1: true },
        { NaNa: NaN },
        { 0: 0 },
        { 0: 0, 1: 1, 2: 2 },
        { 0: 0, 1: 1, a: 'a' },
      ].forEach((obj) => {
        serialized = sermat.ser(obj);
        expect(serialized).toMaterializeAs(obj, sermat);
        expect(serialized.replace('}', ',}')).toMaterializeAs(obj, sermat);
      });
    });
  });

  it('with backtick literals.', () => {
    [Sermat, new Sermat()].forEach((sermat) => {
      Object.entries({
        '': '``',
        '?': '`?`',
        '123abc': '`123abc`',
        '\\': '`\\\\`',
        '\\\\': '`\\\\\\\\`',
        'a`b': '`a\\`b`',
        '\f': '`\\f`',
        '\\f': '`\\\\f`',
        '\n': '`\\n`',
        '\r': '`\\r`',
        '\t': '`\\t`',
        '\v': '`\\v`',
        // eslint-disable-next-line quote-props
        '\u1234': '`\\u1234`',
        '`': '`\\``',
        '1`1': '`1\\`1`',
      }).forEach(([text, literal]) => {
        expect(literal).toMaterializeAs(text, sermat);
      });
      //TODO Check fails, like '`\\`'.
    });
  });

  it('with comments.', () => {
    [Sermat, new Sermat()].forEach((sermat) => {
      expect('1 /* comment */').toMaterializeAs(1, sermat);
      expect('/* comment */ true').toMaterializeAs(true, sermat);
      expect('/* [ */ null /* ] */').toMaterializeAs(null, sermat);
      expect('[1 /*, 2 */, 3]').toMaterializeAs([1, 3], sermat);
    });
  });

  it('with errors.', () => {
    ['', ' \n\t', '// comment ', '/* comment */', 'TRUE', 'False', 'NuLL',
      '- 1', '1 2', '1 e+2', '+.1', '1.', '-e-1', '1e+',
      "'null'", '"a', '"\\"', '"\\u12"',
      '[', ']', '[,1]', '[,]',
      '{', '}', '{,a:1}', '{,}', '{a:,1}', '{a,:1}', '{a::1}', '{:a:1}', '{a:1:}',
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

    expect(Sermat.ser([obj, obj], { mode: Sermat.REPEAT_MODE }))
      .toBe('[{},{}]');
    expect(Sermat.ser({ a: obj, b: obj }, { mode: Sermat.REPEAT_MODE }))
      .toBe('{a:{},b:{}}');
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

    serialized = Sermat.ser(
      [obj, { a: obj, b: { c: obj } }],
      { mode: Sermat.BINDING_MODE },
    );
    materialized = Sermat.mat(serialized);
    expect(Array.isArray(materialized)).toBe(true);
    expect(materialized[0]).toBe(materialized[1].a);
    expect(materialized[0]).toBe(materialized[1].b.c);
  });
}); // describe "Sermat".
